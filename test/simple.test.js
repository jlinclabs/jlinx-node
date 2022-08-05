const {
  test,
  createTestnet,
  timeout,
  createSigningKeyPair
} = require('./helpers/index.js')

test('peer connect', async (t) => {
  const { createJlinxNodes } = await createTestnet(t)
  const [node1, node2] = await createJlinxNodes(2)

  const skp1 = createSigningKeyPair()
  const core1 = await node1.get(skp1.publicKey, skp1.secretKey)

  t.alike(core1.length, 0)
  t.ok(core1.writable)
  await core1.append([
    'block one',
    'block two'
  ])
  t.alike(core1.length, 2)

  const core1copy = await node2.get(skp1.publicKey)
  await core1copy.update()
  t.alike(core1copy.length, 2)

  t.alike(
    (await core1.get(0)).toString(),
    (await core1copy.get(0)).toString()
  )
  t.alike(
    (await core1.get(1)).toString(),
    (await core1copy.get(1)).toString()
  )

  const appendEvent = t.test('appendEvent')
  appendEvent.plan(2)

  core1copy.on('append', (...x) => {
    appendEvent.pass()
    t.is(core1copy.length, core1.length)
  })

  await core1.append(['block three'])
  await timeout(100) // space out the two report
  await core1.append(['block four'])

  await appendEvent

  t.alike(
    (await core1copy.get(2)).toString(),
    'block three'
  )
  t.alike(
    (await core1copy.get(3)).toString(),
    'block four'
  )

  t.alike(core1copy.length, 4)
})

test('document ids', async (t) => {
  const { createJlinxNodes } = await createTestnet(t)
  const [node1] = await createJlinxNodes(2)

  const publicKeyAsHex = 'cdd0ae3ddae68928a13f07a6f3544442dd6b5a616a98f2b8e37f64c95d88f425'
  const publicKeyMultibase = 'f' + publicKeyAsHex
  const jlinxId = 'jlinx:' + publicKeyMultibase
  const publicKey = Buffer.from(publicKeyAsHex, 'hex')

  for (const format of [publicKeyMultibase, jlinxId, publicKey]) {
    const doc = await node1.get(format)
    t.is(doc.id.toString(), jlinxId)
    t.is(doc.id, jlinxId)
    t.alike(doc.publicKey, publicKey)
  }
})

// test.solo('invalid keyPair', async (t) => {
//   t.exception.all(() => { new JlinxNode({}) }, /this.storage is not a function/)

//   t.exception.all(() => {
//     new JlinxNode({
//       storage: () => {},
//     })
//   }, /ass face/)

// })

// test('creating a document', async (t, createNode) => {
//   const node1 = await createNode()

//   const doc1 = await node1.create()
//   t.is(doc1.writable, true)
//   t.is(doc1.length, 0)
//   t.is(doc1.secretKey.length, 64)

//   t.ok(
//     validateSigningKeyPair({
//       publicKey: doc1.publicKey,
//       secretKey: doc1.secretKey
//     }),
//     'valid key pair'
//   )

//   await doc1.append([
//     b4a.from('one'),
//     b4a.from('two')
//   ])
//   t.is(doc1.length, 2)
//   t.is(await doc1.get(0), b4a.from('one'))
//   t.is(await doc1.get(1), b4a.from('two'))
//   t.end()
// })

// test('replicating a document', async (t, createNode) => {
//   const node1 = await createNode()
//   const node2 = await createNode()

//   const doc1 = await node1.create()
//   t.is(doc1.writable, true)
//   t.ok(doc1.secretKey)
//   t.is(doc1.length, 0)

//   await doc1.append([b4a.from('one')])
//   t.is(doc1.length, 1)
//   t.is(await doc1.get(0), b4a.from('one'))

//   const doc1copy = await node2.get(doc1.id)
//   t.is(doc1copy.writable, false)
//   t.is(doc1copy.secretKey, undefined)
//   t.is(doc1copy.length, 1)
//   t.is(await doc1copy.get(0), b4a.from('one'))

//   await doc1.append([b4a.from('two')])
//   t.is(doc1.length, 2)
//   t.is(await doc1.get(1), b4a.from('two'))

//   t.is(doc1copy.writable, false)
//   t.is(doc1copy.length, 1)
//   t.is(await doc1copy.get(1), b4a.from('two'))

//   t.end()
// })

// test('subscribing to changes', async (t, createNode) => {
//   const node1 = await createNode()

//   const doc1 = await node1.create()

//   const doc1SubCalls = []
//   doc1.sub((...args) => {
//     doc1SubCalls.push(args)
//   })
//   t.is(doc1SubCalls.length, 0, 'expect doc1SubCalls to have not been called')

//   await doc1.append([b4a.from('three')])

//   t.is(doc1SubCalls.length, 1, 'expect doc1SubCalls to have been called once')
//   t.deepEqual(doc1SubCalls[0], [doc1], 'expect doc1SubCalls to have been called with doc1')

//   t.end()
// })

// test('getting a non-existant document', async (t, createNode) => {
//   const node1 = await createNode()
//   const node2 = await createNode()

//   t.alike(
//     await node1.get('StxBUrJtmwV1PG_zTgbd7wTNP849XyEYfJl_OOhESXp'),
//     undefined
//   )

//   const doc1 = await node1.create()
//   t.is(doc1.length, 0)

//   t.alike(
//     await node1.get(doc1.id),
//     undefined
//   )

//   await doc1.append([b4a.from('not empty')])
//   t.is(doc1.length, 1)

//   const doc1copy = await node2.get(doc1.id)
//   t.is(doc1copy.length, 1)
// })
