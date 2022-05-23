import test from 'tape'
import { keyToString, createSigningKeyPair } from 'jlinx-core/util.js'
import { getTmpDirPath } from './helpers/index.js'
import JlinxServer from '../index.js'

test('jlinx server should work like this', async t => {
  const keyPair = createSigningKeyPair()

  const jlinx = new JlinxServer({
    publicKey: keyToString(keyPair.publicKey),
    storagePath: await getTmpDirPath()
  })
  await jlinx.keys.set(keyPair)
  await jlinx.ready()
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
  console.log(await events1.all())
  t.same(events1.length, 3)
  t.deepEqual(await events1.all(), [
    { eventThree: 3 },
    { eventTwo: 2 },
    { eventOne: 1 }
  ])

  t.end()
})

// TODO: Add a test case that links directly to the links of a previous input node.
