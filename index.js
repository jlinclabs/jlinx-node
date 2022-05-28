const Debug = require('debug')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const {
  keyToString,
  keyToBuffer,
  createSigningKeyPair,
  validateSigningKeyPair
} = require('jlinx-util')

const debug = Debug('jlinx:node')

const DEFAULT_TOPIC = process.env.NODE_ENV === 'production'
  ? Buffer.from('thedefault_jlinx_hypercore_topic')
  : Buffer.from('thetesting_jlinx_hypercore_topic')

module.exports = class JlinxNode {
  constructor (opts) {
    this.topic = opts.topic || DEFAULT_TOPIC
    this.storagePath = opts.storagePath
    this.cores = new Corestore(this.storagePath)
    if (!opts.keyPair || !validateSigningKeyPair(opts.keyPair)) {
      throw new Error('invaid keyPair')
    }
    this.swarm = new Hyperswarm({
      keyPair: opts.keyPair,
      bootstrap: opts.bootstrap
    })
    this._ready = this._open()
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  swarmKey: ' + opts.stylize(this.swarmKey, 'string') + '\n' +
      indent + '  storagePath: ' + opts.stylize(this.storagePath, 'string') + '\n' +
      indent + ')'
  }

  ready () { return this._ready }

  async _open () {
    await this.cores.ready()
    debug('connecting to swarm as', this.publicKey)

    process.on('SIGTERM', () => { this.destroy() })

    this.swarm.on('connection', (conn) => {
      debug(
        'new peer connection from',
        keyToString(conn.remotePublicKey)
      )
      // Is this what we want?
      this.cores.replicate(conn, {
        keepAlive: true
        // live?
      })
    })

    debug(`joining topic: "${this.topic}"`)
    this.discovery = this.swarm.join(this.topic)

    debug('flushing discovery…')
    this._connected = this.discovery.flushed()
  }

  async connected () {
    await this.ready()
    await this._connected
  }

  async hasPeers () {
    debug('has peers (called)')
    await this.connected()
    debug('has peers?', this.swarm.connections.size)
    if (this.swarm.connections.size > 0) return
    debug('waiting for more peers!')
    await this.swarm.flush()
  }

  async destroy () {
    if (this.destroyed) return
    debug('destroying!')
    this.destroyed = true
    if (this.swarm) {
      debug('disconnecting from swarm')
      // debug('connections.size', this.swarm.connections.size)
      // debug('swarm.flush()')
      await this.swarm.flush()
      // debug('flushed!')
      // debug('connections.size', this.swarm.connections.size)
      // // await this.swarm.clear()
      // debug('swarm.destroy()')
      await this.swarm.destroy()
      // debug('swarm destroyed. disconnected?')
      // debug('connections.size', this.swarm.connections.size)
      for (const conn of this.swarm.connections) {
        debug('disconnecting dangling connection')
        conn.destroy()
      }
    }
  }

  async status () {
    const status = {}
    if (this.swarm) {
      if (this.swarm.peers) {
        status.numberOfPeers = this.swarm.peers.size
        status.connected = this.swarm.peers.size > 0
      }
    }
    return status
  }

  async get (id, secretKey) {
    debug('get', { id, secretKey: !!secretKey })
    const publicKey = keyToBuffer(id)
    await this.ready()
    const core = this.cores.get({ key: publicKey, secretKey })
    await core.update()
    if (core.length === 0 && !secretKey) return
    return new Document(this, core, secretKey)
  }

  async create () {
    const { publicKey, secretKey } = createSigningKeyPair()
    return await this.get(publicKey, secretKey)
  }
}

class Document {
  constructor (node, core, secretKey) {
    this.node = node
    this.core = core
    this.secretKey = secretKey
    this.id = keyToString(core.key)
    this._subs = new Set()
    this.core.on('close', () => this._close())
    this.core.on('append', () => this._onAppend())
  }

  get key () { return this.core.key }
  get publicKey () { return keyToBuffer(this.core.key) }
  get writable () { return this.core.writable }
  get length () { return this.core.length }
  ready () { return this.core.ready() }
  _close () {
    console.log('??_close', this.key)
  }

  _onAppend () {
    this._subs.forEach(handler => {
      Promise.resolve()
        .then(() => handler(this))
        .catch(error => {
          console.error(error)
        })
    })
  }

  get (index) { return this.core.get(index) }
  append (blocks) { return this.core.append(blocks) }
  sub (handler) {
    this._subs.add(handler)
    return () => { this._subs.delete(handler) }
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      indent + '  length: ' + opts.stylize(this.length, 'number') + '\n' +
      indent + ')'
  }
}
