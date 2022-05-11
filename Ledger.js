import Debug from 'debug'
import Path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { didToKey, keyToString } from 'jlinx-core/util.js'

const debug = Debug('jlinx:ledger')
const packageJson = JSON.parse(fs.readFileSync(Path.join(fileURLToPath(import.meta.url), '../package.json'), 'utf8'))
const VERSION = packageJson.version

export default class Ledger {

  constructor(did, core){
    this.did = did
    this.publicKey = didToKey(did)
    this.core = core
  }

  [Symbol.for('nodejs.util.inspect.custom')](depth, opts){
    let indent = ''
    if (typeof opts.indentationLvl === 'number')
      while (indent.length < opts.indentationLvl) indent += ' '
    return this.constructor.name + '(\n' +
      indent + '  did: ' + opts.stylize(this.did, 'string') + '\n' +
      indent + '  length: ' + opts.stylize(this.length, 'number') + '\n' +
      indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      // indent + '  writable: ' + opts.stylize(this.writable, 'boolean') + '\n' +
      // indent + '  published: ' + opts.stylize(this.published, 'boolean') + '\n' +
      // indent + '  loaded: ' + opts.stylize(this.loaded, 'boolean') + '\n' +
      // indent + '  publicKey: ' + opts.stylize(this.publicKey, 'string') + '\n' +
      // indent + '  value: ' + opts.stylize(this.value ? JSON.stringify(this.value) : '', 'string') + '\n' +
      indent + ')'
  }

  get writable(){ return this.core.writable }
  get length(){ return this.core.length }

  async update(){
    await this.core.update()
    if (keyToString(this.core.key) !== this.publicKey)
      throw new Error(`key mismatch ${[keyToString(this.core.key), this.publicKey]}`)
    this.loaded = true
    this.initialized = this.core.length > 0
    if (this.initialized){
      const headerJson = await this.core.get(0)
      this.header = JSON.parse(headerJson)
      this.type = this.header.type
    }
  }

  async ready(){
    await this.update()
  }

  async exists(){
    await this.update()
    return this.initialized
  }

  async append(...events){
    return await this.core.append(
      events.map(event =>
        JSON.stringify({
          ...event,
          jlinxVersion: VERSION,
          at: new Date,
        })
      )
    )
  }

  async initialize(header){
    await this.update()
    if (this.initialized) throw new Error(`did=${this.did} already initialized`)
    await this.append(header)
  }

  async setValue(changes){
    await this.append({ eventType: 'amend', changes })
  }

  async getEvent(index){
    const json = await this.core.get(index)
    debug('event', { index, json })
    return JSON.parse(json)
  }

  async getEvents(){
    await this.update()
    const length = this.core.length - 1 // -1 to skip header
    const entries = await Promise.all(
      Array(length).fill().map((_, index) => this.getEvent(index + 1))
    )
    debug({ entries })
    return entries
  }

  applyEvent(value, event){
    if (event && event.eventType === 'amend')
      return Object.assign({}, value, event.changes)
    else
      return value
  }

  async getValue(){
    const events = await this.getEvents()
    debug({ events })
    if (events.length === 0) return
    let value = {}
    for (const entry of events)
      value = this.applyEvent(value, entry, events)
    return value
  }
}
