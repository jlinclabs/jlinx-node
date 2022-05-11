

import { didToKey, keyToString, keyToMultibase } from 'jlinx-core/util.js'

export default class DidDocument {

  constructor(did, core){
    this.did = did
    this.publicKey = didToKey(did)
    this.core = core
  }

  [Symbol.for('nodejs.util.inspect.custom')](depth, opts){
    let indent = ''
    if (typeof opts.indentationLvl === 'number')
      while (indent.length < opts.indentationLvl) indent += ' '
    return this.constructor.name + '(\n' +
      indent + '  did: ' + opts.stylize(this.did, 'string') + '\n' +
      // indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      // indent + '  published: ' + opts.stylize(this.published, 'boolean') + '\n' +
      // indent + '  loaded: ' + opts.stylize(this.loaded, 'boolean') + '\n' +
      // indent + '  publicKey: ' + opts.stylize(this.publicKey, 'string') + '\n' +
      // indent + '  value: ' + opts.stylize(this.value ? JSON.stringify(this.value) : '', 'string') + '\n' +
      indent + ')'
  }

  get writable(){ return this.core.writable }

  get published(){ return false /* TBD */}

  get value(){
    if (this.loaded) return this._value
    throw new Error(`cannot get value before loaded`)
  }

  async update(){
    await this.core.update()
    if (keyToString(this.core.key) !== this.publicKey)
      throw new Error(`key mismatch ${[keyToString(this.core.key), this.publicKey]}`)
    this.loaded = true
    if (this.core.length > 0){
      const json = await this.core.get(this.core.length - 1)
      this._value = JSON.parse(json)
    }
  }

  async exists(){
    await this.update()
    return this.core.length > 0
  }

  async amend(value){
    return await this.core.append([JSON.stringify(value)])
  }
}

DidDocument.generate = function(opts){
  const {
    did,
    signingPublicKey,
    encryptingPublicKey,
  } = opts

  // TODO https://www.w3.org/TR/did-core/#did-document-metadata

  return {
    '@context': this.contextUrl,
    id: did,
    created:  new Date().toISOString(),
    verificationMethod: [
      {
        id: `${did}#signing`,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase: keyToMultibase(signingPublicKey),
      },
    ],
    "keyAgreement": [
      {
        id: `${did}#encrypting`,
        type: 'X25519KeyAgreementKey2019',
        controller: did,
        publicKeyMultibase: keyToMultibase(encryptingPublicKey),
      },
    ],
    "authentication": [
      `${did}#signing`,
    ],
  }
}
