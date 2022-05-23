import Debug from 'debug'
import Path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { coreToKey, keyToString } from 'jlinx-core/util.js'

const debug = Debug('jlinx:ledger')
const packageJson = JSON.parse(fs.readFileSync(Path.join(fileURLToPath(import.meta.url), '../package.json'), 'utf8'))
const VERSION = packageJson.version

export default class JlinxDocument {
  static getTypeClass (type) {
    const TypeClass = this.types[type]
    if (!TypeClass) throw new Error(`unknown type ${type}`)
    return TypeClass
  }

  static async create ({ core, type }) {
    debug('create', type)
    this.getTypeClass(type)
    await core.ready()
    if (core.length !== 0) throw new Error('core is not empty')
    await core.append([
      JSON.stringify({
        jlinxVersion: VERSION,
        type
      })
    ])
    return await this.get({ core })
  }

  static async get ({ core }) {
    await core.update()
    // const publicKey = keyToString(core.key)
    const header = JSON.parse(await core.get(0))
    const { type } = header
    const TypeClass = this.getTypeClass(type)
    debug('get', TypeClass)
    return new TypeClass({ core })
  }

  constructor (opts) {
    this.core = opts.core
    this.id = keyToString(coreToKey(this.core))
  }

  get type () { return this.constructor.name }

  get writable () { return this.core.writable }

  get length () { return this.core.length - 1 }

  [Symbol.for('nodejs.util.inspect.custom')] (depth, opts) {
    let indent = ''
    if (typeof opts.indentationLvl === 'number') { while (indent.length < opts.indentationLvl) indent += ' ' }
    return this.constructor.name + '(\n' +
      indent + '  id: ' + opts.stylize(this.id, 'string') + '\n' +
      indent + '  type: ' + opts.stylize(this.type, 'string') + '\n' +
      indent + '  length: ' + opts.stylize(this.length, 'number') + '\n' +
      indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      // indent + '  core: ' + this.core[Symbol.for('nodejs.util.inspect.custom')](depth, {...opts, indentationLvl: 1}) + '\n' +
      indent + ')'
  }
}

class MicroLedger extends JlinxDocument {
  async get (index) {
    const raw = await this.core.get(index)
    const entry = JSON.parse(raw)
    return entry.event
  }

  async all () {
    const all = []
    await this.core.update()
    for (let i = this.core.length - 1; i >= 1; i--) {
      all.push(await this.get(i))
    }
    return all
  }

  async append (events) {
    const entries = events.map(event => {
      const entry = {
        // ei: createRandomString(), // event id
        jv: VERSION, // jlinx version
        at: now(),
        event
      }
      return JSON.stringify(entry)
    })
    await this.core.append(entries)
  }
}

JlinxDocument.types = {
  MicroLedger
}

const now = () => (new Date()).toISOString().slice(0, -1)
