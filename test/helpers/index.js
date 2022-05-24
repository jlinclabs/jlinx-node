import test from 'tape'
import tmp from 'tmp-promise'
import fs from 'node:fs/promises'
import { keyToString, createSigningKeyPair } from 'jlinx-util'
import JlinxServer from '../../index.js'

export async function getTmpDirPath () {
  const { path } = await tmp.dir()
  // test.onFinish(cleanup)
  test.onFinish(async () => {
    await fs.rm(path, { recursive: true })
  })
  return path
}

export async function generateInstance () {
  const keyPair = createSigningKeyPair()
  const jlinx = new JlinxServer({
    publicKey: keyToString(keyPair.publicKey),
    storagePath: await getTmpDirPath()
  })
  await jlinx.keys.set(keyPair)
  await jlinx.ready()
  return jlinx
}
