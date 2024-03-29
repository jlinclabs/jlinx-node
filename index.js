const Debug = require('debug')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const jtil = require('jlinx-util')
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
    if (!opts.keyPair || !jtil.validateSigningKeyPair(opts.keyPair)) {
      throw new Error('invaid keyPair')
    }
    this.id = opts.keyPair.publicKey.toString('hex')
    debug(`[${this.id}]`, 'bootstrap', opts.bootstrap)
    this.swarm = new Hyperswarm({
      keyPair: opts.keyPair,
      bootstrap: opts.bootstrap,
      debug: true
    })
    this._ready = this._open()
  }

  // get swarmId () { return this.swarm.keyPair.publicKey.toString('hex') }

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
    debug(`[${this.id}]`, 'connecting to swarm as', this.id)
    // await this.swarm.listen()

    const { default: exitHook } = await exitHookImport
    this._undoExitHook = exitHook(() => { this.destroy() })

    this.swarm.on('connection', (conn) => {
      debug(
        `[${this.id}]`,
        'new peer connection from',
        conn.remotePublicKey.toString('hex')
      )
      debug(`[${this.id}] replicating cores. replicationSteams.length=${this.cores._replicationStreams.length}`)
      // Is this what we want?
      this.cores.replicate(conn, {
        live: true,
        keepAlive: true,
        ondiscoverykey (...x) {
          console.log('corestore replication ondiscoverykey', x)
        }
      })
      debug(`[${this.id}] replicated cores. replicationSteams.length=${this.cores._replicationStreams.length}`)
    })

    debug(`[${this.id}]`, `joining topic: "${this.topic}"`)
    this.discovery = this.swarm.join(this.topic)

    debug(`[${this.id}]`, 'flushing discovery…')
    this._connected = this.discovery.flushed().then(async () => {
      debug(`[${this.id}]`, 'discovery flushed')
      let refreshCount = 0
      debug(`[${this.id}]`, 'this.swarm.peers.size=', this.swarm.peers.size)
      while (this.swarm.peers.size === 0) {
        refreshCount++
        debug(`[${this.id}]`, 'refreshing discovery', this.swarm.peers.size)
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
    debug(`[${this.id}]`, 'destroying!')
    this.destroyed = true
    if (this._undoExitHook) this._undoExitHook()
    if (this.swarm) {
      debug(`[${this.id}]`, 'disconnecting from swarm')
      await this.swarm.flush()
      await this.swarm.destroy()
      for (const conn of this.swarm.connections) {
        debug(`[${this.id}]`, 'disconnecting dangling connection')
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

  createIdAndSecret () {
    const kp = jtil.createSigningKeyPair()
    kp.id = jtil.publicKeyToJlinxId(kp.publicKey)
    return kp
  }

  async get (id, secretKey, opts = {}) {
    const core = this.cores.get({
      ...opts,
      key: jtil.jlinxIdToPublicKey(id),
      secretKey
    })

    const doc = new Document(id, core, this)
    await doc.ready()
    return doc
  }
}

class Document {
  constructor (id, core, node) {
    this.id = id
    this.core = core
    this.node = node
  }

  get publicKey () { return this.core.key }
  get length () { return this.core.length }
  get writable () { return this.core.writable }
  get (...args) { return this.core.get(...args) }
  on (...args) { return this.core.on(...args) }
  once (...args) { return this.core.once(...args) }
  ready (...args) { return this.core.ready(...args) }
  append (...args) { return this.core.append(...args) }
  close (...args) { return this.core.close(...args) }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }

    return this.constructor.name + '(\n' +
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  length: ' + opts.stylize(this.length, 'number') + '\n' +
      // indent + '  host: ' + opts.stylize(this.node.host.url, 'string') + '\n' +
      indent + ')'
  }

  async update (opts) {
    await this.ready()
    // await updateHarder(this.core)
    const done = this.core.findingPeers()
    await this.node.swarm.flush()
    await this.core.update(opts)
    done()
  }

  waitForLength (minLength = 0) {
    return new Promise(resolve => {
      if (this.length >= minLength) return resolve(this.length)
      const onAppend = () => {
        if (this.length >= minLength) {
          this.removeListener('append', onAppend)
          resolve(this.length)
        }
      }
      this.on('append', onAppend)
    })
  }
}

// // TODO move to utils
// function updateHarder (core, ms = 20000) {
//   return new Promise((resolve, reject) => {
//     core.once('append', (error) => {
//       if (error) reject(error); else resolve()
//     })
//     core.update()
//     setTimeout(() => { resolve() }, ms)
//   })
// }
