import Debug from 'debug'
import Path from 'path'
import { createRandomString, keyToDid, didToKey } from 'jlinx-core/util.js'
import HypercoreClient from './HypercoreClient.js'
import Ledger from './Ledger.js'

const debug = Debug('jlinx:agent')

// AKA LocalJlinxServer
// AKA JlinxHypercoreClient
export default class JlinxAgent {

  constructor(opts){
    this.publicKey = opts.publicKey
    if (!this.publicKey) throw new Error(`${this.constructor.name} requires 'publicKey'`)
    this.storagePath = opts.storagePath
    if (!this.storagePath) throw new Error(`${this.constructor.name} requires 'storagePath'`)
    this.keys = opts.keys || new KeyStore(Path.join(this.storagePath, 'keys'))
    this.dids = opts.dids || new DidStore(Path.join(this.storagePath, 'dids'))
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

  ready(){
    if (!this._ready) this._ready = (async () => {
      const keyPair = await this.keys.get(this.publicKey)
      if (!keyPair || !keyPair.secretKey)
        throw new Error(`unable to get agents secret key for ${this.publicKey}`)
      this.hypercore = new HypercoreClient({
        storagePath: Path.join(this.storagePath, 'cores'),
        keyPair: await this.keys.get(this.publicKey),
      })
      debug('ready')
    })()
    return this._ready
  }

  async connected(){
    await this.ready()
    await this.hypercore.connected()
  }

  async destroy(){
    this.hypercore.destroy()
  }

  async getLedger(did){
    await this.ready()
    const publicKey = didToKey(did)
    const keyPair = await this.keys.get(publicKey)
    const secretKey = keyPair && keyPair.type === 'signing'
      ? keyPair.secretKey : undefined
    const core = await this.hypercore.getCore(publicKey, secretKey)
    const ledger = new Ledger(did, core)
    await ledger.ready()
    return ledger
  }

  async resolveDid(did){
    await this.ready()
    debug('resolving did', { did })
    const ledger = await this.getLedger(did)
    debug(ledger)
    if (await ledger.exists())
      return await ledger.getValue()
    await this.connected()
    await this.hypercore.hasPeers()
    debug('resolving did via swarm', { did })
    if (await ledger.exists())
      return await ledger.getValue()
  }

  async createDid(){
    const { publicKey } = await this.keys.createSigningKeyPair()
    const did = keyToDid(publicKey)
    debug(`creating did=${did}`)
    const didDocument = await this.getLedger(did)
    const secret = createRandomString(32)
    await didDocument.initialize({
      type: 'jlinx-did-document-v1',
      secret,
    })
    debug('created did', { did, didDocument, secret })
    return { did, secret }
  }

  async amendDid({did, secret, value}){
    debug('amendDid', { did, secret, value })
    const didDocument = await this.getLedger(did)
    debug('amendDid', { didDocument })
    await didDocument.update()
    debug('HEADER', didDocument.header)
    if (didDocument.header.secret !== secret)
      throw new Error(`new did secret mismatch!`)
    const before = await didDocument.getValue()
    await didDocument.setValue(value)
    const after = await didDocument.getValue()
    debug('amended did', { did, before, after })
    return after
  }



}


// async function isDidCore(core){
//   try{
//     await core.update()
//     if (core.length === 0) {
//       debug('isDidCore empty')
//       return false
//     }
//     let header = await core.get(0)
//     header = JSON.parse(header)
//     debug({ header })
//     return header.jlinx && header.type.startsWith('jlinx-did-document-')
//   }catch(error){
//     debug('isDidCore error', error)
//     return false
//   }
// }
