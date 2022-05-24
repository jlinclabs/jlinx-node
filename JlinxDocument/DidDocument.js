
import { keyToDid, keyToMultibase } from 'jlinx-util'
import MicroLedger from './MicroLedger.js'

export default class DidDocument extends MicroLedger {
  static contextUrl = 'https://www.w3.org/ns/did/v1'

  constructor (opts) {
    super(opts)
    this.did = keyToDid(this.id)
  }

  get value () {
    if (this.loaded) return this._value
    throw new Error('cannot get value before loaded')
  }

  // get eventTypes () {
  //   return {
  //     addedKey(event){
  //       if (!event.publicKeyMultibase)
  //         throw new Error(`event.publicKeyMultibase is required`)
  //       if (!['signing', 'encrypting'].includes(event.keyType))
  //         throw new Error(`invalid event.keyType ${event.keyType}`)
  //     }
  //   }
  // }

  async update () {
    await this.core.update()
    this._value = await this._projectValue()
    this.loaded = true
  }

  async _projectValue () {
    const events = await this.all()
    const value = {
      '@context': DidDocument.contextUrl,
      id: this.did,
      created: this.created
    }
    for (const event of events) applyEvent(value, event)
    return value
  }

  async addKeys (...keys) {
    await this.append(
      keys.map(({ type, publicKey }) => {
        // TODO validate: type
        // TODO validate: publicKey
        return {
          eventType: 'addedKey',
          keyType: type,
          publicKeyMultibase: keyToMultibase(publicKey)
        }
      })
    )
  }
}

function applyEvent (didDocument, event) {
  const did = didDocument.id
  if (event.eventType === 'addedKey') {
    if (event.keyType === 'signing') {
      createAndAppendArray(didDocument, 'verificationMethod', {
        id: `${did}#signing`,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase: event.publicKeyMultibase
      })

      createAndAppendArray(didDocument, 'authentication', `${did}#signing`)
    } else if (event.keyType === 'encrypting') {
      createAndAppendArray(didDocument, 'keyAgreement', {
        id: `${did}#encrypting`,
        type: 'X25519KeyAgreementKey2019',
        controller: did,
        publicKeyMultibase: event.publicKeyMultibase
      })
    } else {
      throw new Error(`unknown key type "${event.keyType}"`)
    }
  } else {
    throw new Error(`unknown event type "${event.eventType}"`)
  }
  return didDocument
}

function createAndAppendArray (object, key, value) {
  object[key] = object[key] || []
  object[key].push(value)
}
