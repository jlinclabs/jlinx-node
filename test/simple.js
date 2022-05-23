import test from 'tape'
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
    { eventThree: 3 },
    { eventTwo: 2 },
    { eventOne: 1 }
  ])

  t.end()
})

test('creating a KeyValueStore', async t => {
  const jlinx = await generateInstance()
  const db = await jlinx.create('KeyValueStore')
  t.same(db.writable, true)
  t.same(db.version, 1)
  t.deepEqual(await db.all(), {})

  await db.set('name', 'Larry David')
  t.same(await db.get('name'), 'Larry David')

  t.deepEqual(await db.all(), {
    name: 'Larry David'
  })

  console.log(db)

  t.end()
})

// TODO: Add a test case that links directly to the links of a previous input node.
