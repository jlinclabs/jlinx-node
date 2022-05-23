import Debug from 'debug'
import Path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import MicroLedger from './MicroLedger.js'
import KeyValueStore from './KeyValueStore.js'
import DidDocument from './DidDocument.js'

const debug = Debug('jlinx:ledger')
const packageJson = JSON.parse(fs.readFileSync(Path.join(fileURLToPath(import.meta.url), '../../package.json'), 'utf8'))
const VERSION = packageJson.version

export default {

  types: {
    MicroLedger,
    KeyValueStore,
    DidDocument
  },

  getTypeClass (type) {
    const TypeClass = this.types[type]
    if (!TypeClass) throw new Error(`unknown type ${type}`)
    return TypeClass
  },

  defineType (Class) {
    this.types[Class.name] = Class
  },

  async create ({ core, type }) {
    debug('create', type)
    this.getTypeClass(type)
    await core.ready()
    if (core.length !== 0) throw new Error('core is not empty')
    await core.append([
      JSON.stringify({
        jlinxVersion: VERSION,
        type,
        created: now()
      })
    ])
    return await this.get({ core })
  },

  async get ({ core }) {
    await core.update()
    if (core.length === 0) throw new Error('core is empty')
    const headerJson = await core.get(0)
    const header = JSON.parse(headerJson)
    debug('get', { header })
    const { jlinxVersion, type } = header
    if (
      !jlinxVersion
      // || version is too old
    ) throw new Error(`bad jlinxVersion "${jlinxVersion}"`)
    const TypeClass = this.getTypeClass(type)
    debug('get', TypeClass)
    return new TypeClass({ core, header })
  }
}

const now = () => (new Date()).toISOString().slice(0, -1)
