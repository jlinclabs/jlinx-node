import test from 'tape'
import { isJlinxDid, keyToMultibase } from 'jlinx-util/util.js'
import { generateInstance } from './helpers/index.js'

test('creating a MicroLedger', async t => {
  const jlinx = await generateInstance()

  const events1 = await jlinx.create('MicroLedger')
  t.same(events1.writable, true)
  t.same(events1.length, 0)
  t.deepEqual(await events1.all(), [])

  await events1.append([
    { eventOne: 1 }
  ])
  t.same(events1.length, 1)
  t.deepEqual(await events1.all(), [
    { eventOne: 1 }
  ])

  await events1.append([
    { eventTwo: 2 },
    { eventThree: 3 }
  ])

  t.same(events1.length, 3)
  t.deepEqual(await events1.all(), [
    { eventOne: 1 },
    { eventTwo: 2 },
    { eventThree: 3 }
  ])

  t.end()
})

test('creating a KeyValueStore', async t => {
  const jlinx = await generateInstance()
  const db = await jlinx.create('KeyValueStore')
  t.same(db.writable, true)
  t.same(db.version, 1)
  t.deepEqual(await db.all(), {})

  await db.set({
    name: 'Larry David'
  })
  t.same(await db.get('name'), 'Larry David')
  t.deepEqual(await db.all(), {
    name: 'Larry David'
  })

  await db.set({
    age: 84,
    favoriteColor: 'orange'
  })

  t.deepEqual(await db.all(), {
    name: 'Larry David',
    age: 84,
    favoriteColor: 'orange'
  })

  const db2 = await jlinx.get(db.id)
  t.notSame(db, db2)

  t.deepEqual(await db2.all(), {
    name: 'Larry David',
    age: 84,
    favoriteColor: 'orange'
  })

  t.end()
})

test('creating a DidDocument', async t => {
  const jlinx = await generateInstance()
  const didDocument = await jlinx.create('DidDocument')
  await didDocument.update()

  t.ok(isJlinxDid(didDocument.did))
  t.ok(didDocument.did.endsWith(didDocument.id))

  t.deepEqual(didDocument.value, {
    '@context': 'https://www.w3.org/ns/did/v1',
    id: didDocument.did,
    created: didDocument.created
  })

  const signingKeyPair = await jlinx.keys.createSigningKeyPair()
  const encryptingKeyPair = await jlinx.keys.createEncryptingKeyPair()
  await didDocument.addKeys(
    { type: 'signing', publicKey: signingKeyPair.publicKey },
    { type: 'encrypting', publicKey: encryptingKeyPair.publicKey }
  )

  await didDocument.update()

  t.deepEqual(didDocument.value, {
    '@context': 'https://www.w3.org/ns/did/v1',
    id: didDocument.did,
    created: didDocument.created,
    verificationMethod: [
      {
        id: `${didDocument.did}#signing`,
        type: 'Ed25519VerificationKey2020',
        controller: `${didDocument.did}`,
        publicKeyMultibase: keyToMultibase(signingKeyPair.publicKey)
      }
    ],
    authentication: [
      `${didDocument.did}#signing`
    ],
    keyAgreement: [
      {
        id: `${didDocument.did}#encrypting`,
        type: 'X25519KeyAgreementKey2019',
        controller: `${didDocument.did}`,
        publicKeyMultibase: keyToMultibase(encryptingKeyPair.publicKey)
      }
    ]
  })
})
