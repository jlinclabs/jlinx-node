// const {
//   test,
//   createTestnet,
//   timeout,
//   JlinxNode,
//   createSigningKeyPair,
//   keyToString,
// } = require('./helpers/index.js')

// test('autobase', async (t) => {
//   const { createJlinxNodes } = await createTestnet(t)
//   const [node1, node2, node3] = await createJlinxNodes(3)

//   async function createWriter(node){
//     console.log({ node })
//     // const node = await createNode()
//     // await node.connected()
//     const { publicKey, secretKey } = createSigningKeyPair()
//     const core = await node.get(
//       keyToString(publicKey),
//       secretKey
//     )
//     await core.ready()
//     t.alike(core.writable, true)
//     core.jlinxNode = node
//     return core
//   }

//   const [writerA, writerB, writerC] = await Promise.all([
//     createWriter(node1),
//     createWriter(node2),
//     createWriter(node3),
//   ])

//   console.log({
//     writerA: writerA.key.toString('hex'),
//     writerB: writerB.key.toString('hex'),
//     writerC: writerC.key.toString('hex'),
//   })

//   await Promise.all([
//     writerA.jlinxNode.connected(),
//     writerB.jlinxNode.connected(),
//     writerC.jlinxNode.connected(),
//   ])

//   async function apply(){
//     throw new Error('APPLY NOT READY')
//   }

//   async function createBaseFor(writer){
//     const node = writer.jlinxNode
//     const inputs = await Promise.all([
//       writer === writerA ? writerA : node.get(writerA.key),
//       writer === writerB ? writerB : node.get(writerB.key),
//       writer === writerC ? writerC : node.get(writerC.key)
//     ])
//     // await Promise.all(inputs.map(i => i.ready()))
//     const localOutput = new Hypercore(ram)
//     const base = new Autobase({
//       inputs,
//       localOutput,
//       apply,
//     })
//     base.writer = writer
//     return base
//   }

//   const [baseA, baseB, baseC] = await Promise.all([
//     createBaseFor(writerA),
//     createBaseFor(writerB),
//     createBaseFor(writerC),
//   ])

//   async function getValues(base){
//     await base.view.update()
//     const stream = base.createCausalStream()
//     const buf = []
//     for await (const node of stream) {
//       buf.push(node.value.toString())
//     }
//     return buf
//   }

//   t.alike(await getValues(baseA), [])
//   t.alike(await getValues(baseB), [])
//   t.alike(await getValues(baseC), [])

//   await baseA.append(
//     'a.1',
//     await baseA.latest(),
//     baseA.writer
//   )
//   console.log('baseA.writer', baseA.writer)
//   t.alike(baseA.writer.length, 1)
//   t.equal(baseA.inputs[0], baseA.writer)
//   t.alike(baseA.inputs[0].key, baseA.writer.key)
//   t.alike(baseA.inputs[0].length, 1)
//   await baseB.inputs[0].update()
//   console.log( await baseB.inputs[0] )
//   t.alike(baseB.inputs[0].length, 1)
//   t.alike(baseC.inputs[0].length, 1)


//   // await baseA.view.update()
//   // await baseB.view.update()
//   // await baseC.view.update()
//   // // MAGIC!?: not doing this breaks things
//   // await coreValues(baseA.writer)
//   // // t.alike(await coreValues(baseA.writer), ['a.1'])

//   // const baseBsBaseA = baseB.inputs.find(i => i.key === baseA.writer.key)
//   // t.alike(baseBsBaseA.key, baseA.writer.key)
//   // await baseBsBaseA.update()
//   // t.alike(baseBsBaseA.length, baseA.writer.length)

//   // await timeout(250)

//   // MAGIC!?: not doing this breaks things
//   // t.alike(await coreValues(writerA), ['a.1'])

//   // await baseA.writer.flush()
//   // await coreValues(baseA.writer) // MAGIC!

//   // t.alike(writerA.length, 1)
//   // t.alike(await coreValues(writerA), ['a.1'])
//   // t.alike(writerB.length, 0)
//   // t.alike(writerC.length, 0)

//   console.log('baseB.latest()', await baseB.latest())
//   console.log('baseC.latest()', await baseC.latest())


//   // await baseA.inputs[0].update()
//   // await baseB.inputs[0].update()
//   // await baseC.inputs[0].update()

//   t.alike(await getValues(baseA), ['a.1'])
//   t.alike(await getValues(baseB), ['a.1'])
//   t.alike(await getValues(baseC), ['a.1'])


//   // const baseA = new Autobase({
//   //   inputs: [writerA, writerB, writerC]
//   // })
//   // const baseB = new Autobase({
//   //   inputs: [writerA, writerB, writerC]
//   // })
//   // const baseC = new Autobase({
//   //   inputs: [writerA, writerB, writerC]
//   // })

//   // async function getValues(){
//   //   const stream = base.createCausalStream()
//   //   const buf = []
//   //   for await (const node of stream) {
//   //     buf.push(node.value.toString())
//   //   }
//   //   return buf
//   // }

//   // t.alike(await getValues(base), [])

//   // await base.append(`one`, await base.latest(writerA), writerA)

//   // console.log(await getValues())
//   // t.alike(
//   //   await getValues(),
//   //   []
//   // )

//   console.log('AUTOBASE TEST DONE')
// })





// // test('creating a document', async (t, createNode) => {
// //   const node1 = await createNode()

// //   const doc1 = await node1.create()
// //   t.alike(doc1.writable, true)
// //   t.alike(doc1.length, 0)
// //   t.alike(doc1.secretKey.length, 64)

// //   t.ok(
// //     validateSigningKeyPair({
// //       publicKey: doc1.publicKey,
// //       secretKey: doc1.secretKey
// //     }),
// //     'valid key pair'
// //   )

// //   await doc1.append([
// //     b4a.from('one'),
// //     b4a.from('two')
// //   ])
// //   t.alike(doc1.length, 2)
// //   t.alike(await doc1.get(0), b4a.from('one'))
// //   t.alike(await doc1.get(1), b4a.from('two'))
// //   t.end()
// // })

// // test('replicating a document', async (t, createNode) => {
// //   const node1 = await createNode()
// //   const node2 = await createNode()

// //   const doc1 = await node1.create()
// //   t.alike(doc1.writable, true)
// //   t.ok(doc1.secretKey)
// //   t.alike(doc1.length, 0)

// //   await doc1.append([b4a.from('one')])
// //   t.alike(doc1.length, 1)
// //   t.alike(await doc1.get(0), b4a.from('one'))

// //   const doc1copy = await node2.get(doc1.id)
// //   t.alike(doc1copy.writable, false)
// //   t.alike(doc1copy.secretKey, undefined)
// //   t.alike(doc1copy.length, 1)
// //   t.alike(await doc1copy.get(0), b4a.from('one'))

// //   await doc1.append([b4a.from('two')])
// //   t.alike(doc1.length, 2)
// //   t.alike(await doc1.get(1), b4a.from('two'))

// //   t.alike(doc1copy.writable, false)
// //   t.alike(doc1copy.length, 1)
// //   t.alike(await doc1copy.get(1), b4a.from('two'))

// //   t.end()
// // })

// // test('subscribing to changes', async (t, createNode) => {
// //   const node1 = await createNode()

// //   const doc1 = await node1.create()

// //   const doc1SubCalls = []
// //   doc1.sub((...args) => {
// //     doc1SubCalls.push(args)
// //   })
// //   t.alike(doc1SubCalls.length, 0, 'expect doc1SubCalls to have not been called')

// //   await doc1.append([b4a.from('three')])

// //   t.alike(doc1SubCalls.length, 1, 'expect doc1SubCalls to have been called once')
// //   t.deepEqual(doc1SubCalls[0], [doc1], 'expect doc1SubCalls to have been called with doc1')

// //   t.end()
// // })

// // test('getting a non-existant document', async (t, createNode) => {
// //   const node1 = await createNode()
// //   const node2 = await createNode()

// //   t.equal(
// //     await node1.get('StxBUrJtmwV1PG_zTgbd7wTNP849XyEYfJl_OOhESXp'),
// //     undefined
// //   )

// //   const doc1 = await node1.create()
// //   t.alike(doc1.length, 0)

// //   t.equal(
// //     await node1.get(doc1.id),
// //     undefined
// //   )

// //   await doc1.append([b4a.from('not empty')])
// //   t.alike(doc1.length, 1)

// //   const doc1copy = await node2.get(doc1.id)
// //   t.alike(doc1copy.length, 1)
// // })
