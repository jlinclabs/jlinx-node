import { createSigningKeyPair, keyToBuffer, keyToDid, didToKey } from 'jlinx-core/util.js'
import HypercoreClient from './HypercoreClient.js'
import DidDocument from './DidDocument.js'

// AKA LocalJlinxServer
// AKA JlinxHypercoreClient
export default class JlinxServer {

  constructor(opts){
    this.storagePath = opts.storagePath
    if (!this.storagePath)
      throw new Error(`JlinxServer requires a storagePath`)
        // this.server = opts.servers // get from config
    this.keystore = opts.keystore || new Keystore({
      storagePath: Path.join(this.storagePath, 'keys'),
    })
    this.hypercore = new HypercoreClient({
      storagePath: this.storagePath,
    })
    // super({ storagePath })
  }

  [Symbol.for('nodejs.util.inspect.custom')](depth, opts){
    let indent = ''
    if (typeof opts.indentationLvl === 'number')
      while (indent.length < opts.indentationLvl) indent += ' '
    return this.constructor.name + '(\n' +
      indent + '  storagePath: ' + opts.stylize(this.storagePath, 'string') + '\n' +
      // indent + '  cores: ' + opts.stylize(this.corestore.cores.size, 'number') + '\n' +
      // indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      indent + ')'
  }

  async ready(){
    await this.hypercore.ready()
  }

  async resolveDid(did, secretKey){
    // const publicKey = didToPublicKey(did)
    await this.ready()
    console.log('this.hypercore.getCore', this.hypercore.getCore)
    const core = await this.hypercore.getCore(didToKey(did), secretKey)
    await core.update()
    const didDocument = new DidDocument(did, core)
    // await didDocument.update() // ??
    if (await didDocument.exists()) return didDocument
  }

  async createDid(){
    const { publicKey, secretKey } = await this.keystore.createSigningKeyPair()
    const did = keyToDid(publicKey)
    const core = await this.hypercore.getCore(publicKey, secretKey)

    // initialize the core
    await core.append([
      JSON.stringify({
        jlinx: '1.0.0',
        type: 'jlinx-did-document-v1',
        created: new Date,
      })
    ])
    await core.update()
    return { did }
    // // await this.ready()
    // // const didSigningKeyPair = createKeyPair() // when do we do this if its doable on another machine?
    // // const hypercoreKeyPair = createSigningKeyPair()
    // const did = keyToDid(didKeyPair.publicKey)
    // const core = await this.hypercore.getCore(didKeyPair.publicKey, didKeyPair.secretKey)
    // const didDocument = new DidDocument(did, { server: this })
    // await didDocument.create()
    // return didDocument
  }

  async updateDid(did, value){
    const publicKey = didToKey(did)
    const secretKey = await this.keystore.get(publicKey)
    const core = await this.hypercore.getCore(publicKey, secretKey)
    core.append([JSON.stringify(value)])
  }

}

