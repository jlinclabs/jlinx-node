const Debug = require('debug')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const {
  keyToString,
  keyToBuffer,
  validateSigningKeyPair
} = require('jlinx-util')
const exitHookImport = import('exit-hook')

const debug = Debug('jlinx:node')

const DEFAULT_TOPIC = process.env.NODE_ENV === 'production'
  ? Buffer.from('thedefault_jlinx_hypercore_topic')
  : Buffer.from('thetesting_jlinx_hypercore_topic')

module.exports = class JlinxNode {
  constructor (opts) {
    this.topic = opts.topic || DEFAULT_TOPIC
    this.storagePath = opts.storagePath
    this.cores = new Corestore(this.storagePath)
    this.id = keyToString(opts.keyPair.publicKey)
    if (!opts.keyPair || !validateSigningKeyPair(opts.keyPair)) {
      throw new Error('invaid keyPair')
    }
    debug('bootstrap', opts.bootstrap)
    this.swarm = new Hyperswarm({
      keyPair: opts.keyPair,
      bootstrap: opts.bootstrap,
      debug: true
    })
    this._ready = this._open()
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }

    return this.constructor.name + '(\n' +
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  storagePath: ' + opts.stylize(this.storagePath, 'string') + '\n' +
      indent + '  topic: ' + opts.stylize(this.topic, 'string') + '\n' +
      indent + '  peers: ' + opts.stylize(this.numberOfPeers, 'number') + '\n' +
      indent + ')'
  }

  ready () { return this._ready }

  async _open () {
    await this.cores.ready()
    debug('connecting to swarm as', this.id)

    const { default: exitHook } = await exitHookImport
    this._undoExitHook = exitHook(() => { this.destroy() })

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
    this._connected = this.discovery.flushed().then(async () => {
      let refreshCount = 0
      while (this.swarm.peers.size === 0) {
        refreshCount++
        await this.discovery.refresh()
        if (this.swarm.peers.size > 0) return
        if (refreshCount > 10) {
          throw new Error(`timeout waiting for peers id=${this.id}`)
        }
      }
    })
  }

  async connected () {
    await this.ready()
    await this._connected
  }

  get peers () {
    return this.swarm ? this.swarm.peers : new Map()
  }

  get numberOfPeers () {
    return this.peers.size
  }

  async destroy () {
    if (this.destroyed) return
    debug('destroying!')
    this.destroyed = true
    if (this._undoExitHook) this._undoExitHook()
    if (this.swarm) {
      debug('disconnecting from swarm')
      await this.swarm.flush()
      await this.swarm.destroy()
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
    return this.cores.get({ key: keyToBuffer(id), secretKey })
  }
}
