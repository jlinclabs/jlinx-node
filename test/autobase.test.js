const b4a = require('b4a')
const Autobase = require('autobase')
const { timeout } = require('nonsynchronous')
const { test, coreValues } = require('./helpers/index.js')
const {
  createSigningKeyPair,
  keyToString,
  // validateSigningKeyPair
} = require('jlinx-util')

test('autobase', async (t, createNode) => {


  async function createWriter(){
    const node = await createNode()
    // await node.connected()
    const { publicKey, secretKey } = createSigningKeyPair()
    const core = await node.get(
      keyToString(publicKey),
      secretKey
    )
    await core.ready()
    t.same(core.writable, true)
    core.jlinxNode = node
    return core
  }

  const [writerA, writerB, writerC] = await Promise.all([
    createWriter(),
    createWriter(),
    createWriter(),
  ])

  console.log({
    writerA: writerA.key.toString('hex'),
    writerB: writerB.key.toString('hex'),
    writerC: writerC.key.toString('hex'),
  })

  await Promise.all([
    writerA.jlinxNode.connected(),
    writerB.jlinxNode.connected(),
    writerC.jlinxNode.connected(),
  ])

  async function apply(){
    throw new Error('APPLY NOT READY')
  }

  async function createBaseFor(writer){
    const node = writer.jlinxNode
    const inputs = await Promise.all([
      writer === writerA ? writerA : node.get(writerA.key),
      writer === writerB ? writerB : node.get(writerB.key),
      writer === writerC ? writerC : node.get(writerC.key)
    ])
    await Promise.all(inputs.map(i => i.ready()))
    const base = new Autobase({
      inputs,
      // localOutput,
      apply,
    })
    base.writer = writer
    return base
  }

  const [baseA, baseB, baseC] = await Promise.all([
    createBaseFor(writerA),
    createBaseFor(writerB),
    createBaseFor(writerC),
  ])

  async function getValues(base){
    // await base.view.update()
    const stream = base.createCausalStream()
    const buf = []
    for await (const node of stream) {
      buf.push(node.value.toString())
    }
    return buf
  }

  t.same(await getValues(baseA), [])
  t.same(await getValues(baseB), [])
  t.same(await getValues(baseC), [])

  await baseA.append(
    'a.1',
    await baseA.latest(),
    baseA.writer
  )
  // MAGIC!?: not doing this breaks things
  await coreValues(baseA.writer)
  // t.same(await coreValues(baseA.writer), ['a.1'])

  const baseBsBaseA = baseB.inputs.find(i => i.key === baseA.writer.key)
  t.same(baseBsBaseA.key, baseA.writer.key)
  await baseBsBaseA.update()
  t.same(baseBsBaseA.length, baseA.writer.length)

  // await timeout(250)

  // MAGIC!?: not doing this breaks things
  // t.same(await coreValues(writerA), ['a.1'])

  // await baseA.writer.flush()
  // await coreValues(baseA.writer) // MAGIC!

  // t.same(writerA.length, 1)
  // t.same(await coreValues(writerA), ['a.1'])
  // t.same(writerB.length, 0)
  // t.same(writerC.length, 0)

  console.log('baseB.latest()', await baseB.latest())
  console.log('baseC.latest()', await baseC.latest())


  // await baseA.inputs[0].update()
  // await baseB.inputs[0].update()
  // await baseC.inputs[0].update()

  t.same(await getValues(baseA), ['a.1'])
  t.same(await getValues(baseB), ['a.1'])
  t.same(await getValues(baseC), ['a.1'])


  // const baseA = new Autobase({
  //   inputs: [writerA, writerB, writerC]
  // })
  // const baseB = new Autobase({
  //   inputs: [writerA, writerB, writerC]
  // })
  // const baseC = new Autobase({
  //   inputs: [writerA, writerB, writerC]
  // })

  // async function getValues(){
  //   const stream = base.createCausalStream()
  //   const buf = []
  //   for await (const node of stream) {
  //     buf.push(node.value.toString())
  //   }
  //   return buf
  // }

  // t.same(await getValues(base), [])

  // await base.append(`one`, await base.latest(writerA), writerA)

  // console.log(await getValues())
  // t.same(
  //   await getValues(),
  //   []
  // )

  console.log('AUTOBASE TEST DONE')
})





// test('creating a document', async (t, createNode) => {
//   const node1 = await createNode()

//   const doc1 = await node1.create()
//   t.same(doc1.writable, true)
//   t.same(doc1.length, 0)
//   t.same(doc1.secretKey.length, 64)

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
//   t.same(doc1.length, 2)
//   t.same(await doc1.get(0), b4a.from('one'))
//   t.same(await doc1.get(1), b4a.from('two'))
//   t.end()
// })

// test('replicating a document', async (t, createNode) => {
//   const node1 = await createNode()
//   const node2 = await createNode()

//   const doc1 = await node1.create()
//   t.same(doc1.writable, true)
//   t.ok(doc1.secretKey)
//   t.same(doc1.length, 0)

//   await doc1.append([b4a.from('one')])
//   t.same(doc1.length, 1)
//   t.same(await doc1.get(0), b4a.from('one'))

//   const doc1copy = await node2.get(doc1.id)
//   t.same(doc1copy.writable, false)
//   t.same(doc1copy.secretKey, undefined)
//   t.same(doc1copy.length, 1)
//   t.same(await doc1copy.get(0), b4a.from('one'))

//   await doc1.append([b4a.from('two')])
//   t.same(doc1.length, 2)
//   t.same(await doc1.get(1), b4a.from('two'))

//   t.same(doc1copy.writable, false)
//   t.same(doc1copy.length, 1)
//   t.same(await doc1copy.get(1), b4a.from('two'))

//   t.end()
// })

// test('subscribing to changes', async (t, createNode) => {
//   const node1 = await createNode()

//   const doc1 = await node1.create()

//   const doc1SubCalls = []
//   doc1.sub((...args) => {
//     doc1SubCalls.push(args)
//   })
//   t.same(doc1SubCalls.length, 0, 'expect doc1SubCalls to have not been called')

//   await doc1.append([b4a.from('three')])

//   t.same(doc1SubCalls.length, 1, 'expect doc1SubCalls to have been called once')
//   t.deepEqual(doc1SubCalls[0], [doc1], 'expect doc1SubCalls to have been called with doc1')

//   t.end()
// })

// test('getting a non-existant document', async (t, createNode) => {
//   const node1 = await createNode()
//   const node2 = await createNode()

//   t.equal(
//     await node1.get('StxBUrJtmwV1PG_zTgbd7wTNP849XyEYfJl_OOhESXp'),
//     undefined
//   )

//   const doc1 = await node1.create()
//   t.same(doc1.length, 0)

//   t.equal(
//     await node1.get(doc1.id),
//     undefined
//   )

//   await doc1.append([b4a.from('not empty')])
//   t.same(doc1.length, 1)

//   const doc1copy = await node2.get(doc1.id)
//   t.same(doc1copy.length, 1)
// })
