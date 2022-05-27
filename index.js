import Debug from 'debug'
import Path from 'path'
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import { keyToString, keyToBuffer, createSigningKeyPair } from 'jlinx-util'
import topic from 'jlinx-util/topic.js'

const debug = Debug('jlinx:node')

export default class JlinxNode {
  constructor (opts) {
    this.publicKey = opts.publicKey
    this.storagePath = opts.storagePath
    if (!this.storagePath) throw new Error(`${this.constructor.name} requires 'storagePath'`)
    this.bootstrap = opts.bootstrap
    this.cores = opts.cores || new Corestore(Path.join(this.storagePath, 'cores'))
    this.ready = this._ready
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  swarmKey: ' + opts.stylize(this.swarmKey, 'string') + '\n' +
      indent + '  storagePath: ' + opts.stylize(this.storagePath, 'string') + '\n' +
      // indent + '  cores: ' + opts.stylize(this.corestore.cores.size, 'number') + '\n' +
      // indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      indent + ')'
  }

  async _ready () {
    if (this.swarm) return
    // await this.keys.ready()
    await this.cores.ready()

    // generates the same keypair every time based on cores.primaryKey
    const keyPair = await this.cores.createKeyPair('keypair')
    this.publicKey = keyPair.publicKey

    this.swarm = new Hyperswarm({
      keyPair,
      bootstrap: this.bootstrap,
    })

    debug('connecting to swarm as', this.publicKey)

    process.on('SIGTERM', () => { this.destroy() })

    this.swarm.on('connection', (conn) => {
      debug(
        'new peer connection from',
        keyToString(conn.remotePublicKey)
      )
      // Is this what we want?
      // TODO ensure not replicating internal stores like keys db
      this.cores.replicate(conn, {
        keepAlive: true
        // live?
      })
    })

    debug(`joining topic: "${topic}"`)
    this.discovery = this.swarm.join(topic)

    debug('flushing discovery…')
    this._connected = this.discovery.flushed()
  }

  async connected () {
    if (!this._connected) await this.connect()
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

  async get (publicKey, secretKey) {
    publicKey = keyToBuffer(publicKey)
    await this.ready()
    debug('get', { publicKey })
    const core = this.cores.get({ key: publicKey, secretKey })
    await core.update()
    return new Document(this, core, secretKey)
  }

  async create(){
    const { publicKey, secretKey } = createSigningKeyPair()
    return await this.get(publicKey, secretKey)
  }

}


class Document {
  constructor(node, core, secretKey){
    this.node = node
    this.core = core
    this.secretKey = secretKey
    this.id = keyToString(core.key)
    this._subs = new Set();
    this.core.on('close', () => this._close())
    this.core.on('append', () => this._onAppend())
  }
  get key () { return this.core.key }
  get keyPair () { return this.core.keyPair }
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

  get(index){ return this.core.get(index) }
  append(blocks){ return this.core.append(blocks) }
  sub(handler){
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
