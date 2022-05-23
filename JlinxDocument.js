import Debug from 'debug'
import Path from 'path'
import fs from 'fs'
import Hyperbee from 'hyperbee'
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

class KeyValueStore extends JlinxDocument {
  constructor (opts) {
    super(opts)
    this.hyperbee = new Hyperbee(this.core, {
      keyEncoding: 'utf-8',
      valueEncoding: 'json'
    })
  }

  get version (){ return this.hyperbee.version }
  async get (key){
    debug('KeyValueStore.get', key)
    const x = await this.hyperbee.get(key)
    debug('KeyValueStore.get', x)
    // const { seq, key, value } = x
    return x.value
  }

  async all () {
    const all = {}
    // await this.hyperbee.update()
    const rs = this.hyperbee.createReadStream({
      reverse: true,
      limit: this.length,
    })
    for await (const { key, value } of rs) {
      console.log({ key, value })
      all[key] = value
    }
    return all
  }

  async set (key, value){
    await this.hyperbee.put(key, value)
  }

  async del (key){
    await this.hyperbee.del(key)
  }
}

JlinxDocument.types = {
  MicroLedger,
  KeyValueStore,
}

const now = () => (new Date()).toISOString().slice(0, -1)
