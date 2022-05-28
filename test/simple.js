const b4a = require('b4a')
const { test } = require('./helpers/index.js')
const { validateSigningKeyPair } = require('jlinx-util')

test('creating a document', async (t, createNode) => {
  const node1 = await createNode()

  const doc1 = await node1.create()
  t.same(doc1.writable, true)
  t.same(doc1.length, 0)
  t.same(doc1.secretKey.length, 64)

  t.ok(
    validateSigningKeyPair({
      publicKey: doc1.publicKey,
      secretKey: doc1.secretKey
    }),
    'valid key pair'
  )

  await doc1.append([
    b4a.from('one'),
    b4a.from('two')
  ])
  t.same(doc1.length, 2)
  t.same(await doc1.get(0), b4a.from('one'))
  t.same(await doc1.get(1), b4a.from('two'))
  t.end()
})

test('replicating a document', async (t, createNode) => {
  const node1 = await createNode()
  const node2 = await createNode()

  const doc1 = await node1.create()
  t.same(doc1.writable, true)
  t.ok(doc1.secretKey)
  t.same(doc1.length, 0)

  await doc1.append([b4a.from('one')])
  t.same(doc1.length, 1)
  t.same(await doc1.get(0), b4a.from('one'))

  const doc1copy = await node2.get(doc1.id)
  t.same(doc1copy.writable, false)
  t.same(doc1copy.secretKey, undefined)
  t.same(doc1copy.length, 1)
  t.same(await doc1copy.get(0), b4a.from('one'))

  await doc1.append([b4a.from('two')])
  t.same(doc1.length, 2)
  t.same(await doc1.get(1), b4a.from('two'))

  t.same(doc1copy.writable, false)
  t.same(doc1copy.length, 1)
  t.same(await doc1copy.get(1), b4a.from('two'))

  t.end()
})

test('subscribing to changes', async (t, createNode) => {
  const node1 = await createNode()

  const doc1 = await node1.create()

  const doc1SubCalls = []
  doc1.sub((...args) => {
    doc1SubCalls.push(args)
  })
  t.same(doc1SubCalls.length, 0, 'expect doc1SubCalls to have not been called')

  await doc1.append([b4a.from('three')])

  t.same(doc1SubCalls.length, 1, 'expect doc1SubCalls to have been called once')
  t.deepEqual(doc1SubCalls[0], [doc1], 'expect doc1SubCalls to have been called with doc1')

  t.end()
})

test('getting a non-existant document', async (t, createNode) => {
  const node1 = await createNode()
  const node2 = await createNode()

  t.equal(
    await node1.get('StxBUrJtmwV1PG_zTgbd7wTNP849XyEYfJl_OOhESXp'),
    undefined
  )

  const doc1 = await node1.create()
  t.same(doc1.length, 0)

  t.equal(
    await node1.get(doc1.id),
    undefined
  )

  await doc1.append([b4a.from('not empty')])
  t.same(doc1.length, 1)

  const doc1copy = await node2.get(doc1.id)
  t.same(doc1copy.length, 1)
})
