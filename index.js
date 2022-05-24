import Debug from 'debug'
import Path from 'path'
import KeyStore from 'jlinx-util/KeyStore.js'
import DidStore from 'jlinx-util/DidStore.js'
import { didToKey } from 'jlinx-util/util.js'
import HypercoreClient from './HypercoreClient.js'
import JlinxDocument from './JlinxDocument/index.js'

const debug = Debug('jlinx:agent')

export default class JlinxServer {
  constructor (opts) {
    this.publicKey = opts.publicKey
    if (!this.publicKey) throw new Error(`${this.constructor.name} requires 'publicKey'`)
    this.storagePath = opts.storagePath
    if (!this.storagePath) throw new Error(`${this.constructor.name} requires 'storagePath'`)
    this.keys = opts.keys || new KeyStore(Path.join(this.storagePath, 'keys'))
    this.dids = opts.dids || new DidStore(Path.join(this.storagePath, 'dids'))
  }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  publicKey: ' + opts.stylize(this.publicKey, 'string') + '\n' +
      indent + '  storagePath: ' + opts.stylize(this.storagePath, 'string') + '\n' +
      // indent + '  cores: ' + opts.stylize(this.corestore.cores.size, 'number') + '\n' +
      // indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      indent + ')'
  }

  ready () {
    if (!this._ready) {
      this._ready = (async () => {
        const keyPair = await this.keys.get(this.publicKey)
        if (!keyPair || !keyPair.secretKey) { throw new Error(`unable to get agents secret key for ${this.publicKey}`) }
        this.hypercore = new HypercoreClient({
          storagePath: Path.join(this.storagePath, 'cores'),
          keyPair: await this.keys.get(this.publicKey)
        })
        debug('ready')
      })()
    }
    return this._ready
  }

  async connected () {
    await this.ready()
    await this.hypercore.connected()
  }

  async destroy () {
    this.hypercore.destroy()
  }

  async getCore (publicKey) {
    await this.ready()
    let secretKey
    const keyPair = await this.keys.get(publicKey)
    if (keyPair && keyPair.type === 'signing') secretKey = keyPair.secretKey
    return this.hypercore.getCore(publicKey, secretKey)
  }

  async createCore () {
    const { publicKeyAsString: publicKey } = await this.keys.createSigningKeyPair()
    const core = await this.getCore(publicKey)
    await core.update()
    return core
  }

  async create (type) {
    const core = await this.createCore()
    return await JlinxDocument.create({ core, type })
  }

  async get (publicKey) {
    await this.ready()
    const core = await this.getCore(publicKey)
    if (core) return await JlinxDocument.get({ core })
  }

  async resolveDid (did) {
    const didDocument = await this.get(didToKey(did))
    if (didDocument) {
      await didDocument.update()
      return didDocument.value
    }
  }

  async createDid () {
    const didDocument = await this.create('DidDocument')
    await didDocument.update()
    debug('created did document', { didDocument })
    return didDocument
  }
}
