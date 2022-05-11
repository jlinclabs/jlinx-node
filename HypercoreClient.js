import Debug from 'debug'
import Path from 'path'
import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import dht from '@hyperswarm/dht'
import { keyToString, keyToBuffer, keyToDid } from 'jlinx-core/util.js'
import topic from 'jlinx-core/topic.js'

const debug = Debug('jlinx:hypercore')

export default class HypercoreClient {
  constructor(opts = {}){
    this.keyPair = opts.keyPair
    if (!this.keyPair) throw new Error(`${this.constructor.name} requires 'keyPair'`)
    this.storagePath = opts.storagePath
    if (!this.storagePath) throw new Error(`${this.constructor.name} requires 'storagePath'`)
    this.seed = dht.hash(Buffer.from(this.storagePath)) // TODO add more uniqueness here
    this.corestore = new Corestore(this.storagePath)
  }

  async connect(){
    if (this._connecting) return await this._connecting

    if (this.destroyed) {
      console.trace(`ALREADY DESTROYED`)
      throw new Error(`ALREADY DESTROYED`)
    }

    debug(`HypercoreClient connecting to hyperswarm`)
    this.swarm = new Hyperswarm({
      keyPair: this.keyPair,
      // seed: this.seed,
      // bootstrap: [
      //   { host: '127.0.0.1', port: 49736 },
      // ]
    })
    this.swarmKey = keyToString(this.swarm.keyPair.publicKey)

    debug(`connecting to swarm as`, this.swarmKey)

    process.on('SIGTERM', () => { this.destroy() })

    this.swarm.on('connection', (conn) => {
      debug(
        'new peer connection from',
        keyToString(conn.remotePublicKey)
      )
      // Is this what we want?
      this.corestore.replicate(conn, {
        keepAlive: true,
        // live?
      })
    })

    debug(`joining topic: "${topic}"`)
    this.discovery = this.swarm.join(topic)

    debug('flushing discovery…')
    this._connecting = this.discovery.flushed()
    // debug('.listed')
    // await this.swarm.listen()
    // debug('listening…')
  }

  async connected(){
    if (!this._connecting) await this.connect()
    await this._connecting
  }

  async hasPeers(){
    debug('has peers (called)')
    await this.connected()
    debug('has peers?', this.swarm.connections.size)
    if (this.swarm.connections.size > 0) return
    debug('waiting for more peers!')
    await this.swarm.flush()
  }

  async ready(){
    if (!this._ready) await this.connect()
    await this._ready
  }

  async destroy(){
    if (this.destroyed) return
    debug('destroying!')
    this.destroyed = true
    if (this.swarm){
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
      for (const conn of this.swarm.connections){
        debug('disconnecting dangling connection')
        conn.destroy()
      }
    }
  }

  async status(){
    const status = {}
    status.numberOfCores = this.corestore.cores.size
    if (this.swarm){
      if (this.swarm.peers){
        status.numberOfPeers = this.swarm.peers.size
        status.connected = this.swarm.peers.size > 0
      }
      const keys = [...this.corestore.cores.keys()]
      status.cores = keys.map(key => {
        const core = this.corestore.cores.get(key)
        return {
          key: keyToString(core.key),
          length: core.length,
        }
      })
    }
    return status
  }

  async getCore(key, secretKey){
    const core = this.corestore.get({ key: keyToBuffer(key), secretKey })
    // await core.update()
    return core
  }
}
