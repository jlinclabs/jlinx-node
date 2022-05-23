import test from 'tape'
import tmp from 'tmp-promise'
import fs from 'node:fs/promises'

export async function getTmpDirPath () {
  const { path } = await tmp.dir()
  // test.onFinish(cleanup)
  test.onFinish(async () => {
    await fs.rm(path, { recursive: true })
  })
  return path
}
