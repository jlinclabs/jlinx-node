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
  console.log(jlinx)
  await jlinx.keys.set(keyPair)
  await jlinx.ready()
  console.log(jlinx)
  t.end()
})

// TODO: Add a test case that links directly to the links of a previous input node.
