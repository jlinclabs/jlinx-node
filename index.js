const Debug = require('debug')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const {
  keyToString,
  keyToBuffer,
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
    this.id = keyToString(opts.keyPair.publicKey)
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
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  storagePath: ' + opts.stylize(this.storagePath, 'string') + '\n' +
      indent + ')'
  }

  ready () { return this._ready }

  async _open () {
    await this.cores.ready()
    debug('connecting to swarm as', this.id)

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

  // async create (publicKey, secretKey) {
  //   const { publicKey, secretKey } = createSigningKeyPair()
  //   // return await this.get(publicKey, secretKey)
  // }
  async get (id, secretKey) {
    return this.cores.get({ key: keyToBuffer(id), secretKey })
  }

  // async getLength (id) {
  //   const core = this.cores.get({ key: keyToBuffer(id) })
  //   await core.update()
  //   return core.length
  // }

  // async getEntry (id, index) {
  //   const core = this.cores.get({ key: keyToBuffer(id) })
  //   await core.update()
  //   return await core.get(index)
  // }

  // async append (id, secretKey, blocks) {
  //   const core = this.cores.get({ key: keyToBuffer(id), secretKey })
  //   await core.update() // skip?
  //   await core.append(blocks)
  //   return core.length
  // }

  // async waitForUpdate(id, length){
  //   debug('waitForUpdate', { id })
  //   const core = this.cores.get({ key: keyToBuffer(id) })
  //   await core.update()
  //   if (length > core.length){
  //     throw Error(`length given cannot be greater then the current length`)
  //   }
  //   if (length < core.length){
  //     return core.length
  //   }
  //   if (length >= core.length){
  //     return new Promise((resolve, reject) => {
  //       core.on('append', () => {
  //         // await core.update()  // ??
  //         resolve(core.length)
  //       })
  //       // setTimeout(reject, 2000)
  //     })
  //   }
  // }
}
