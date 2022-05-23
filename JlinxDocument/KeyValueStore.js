import Debug from 'debug'
import Hyperbee from 'hyperbee'
import JlinxDocument from './BaseClass.js'

const debug = Debug('jlinx:KeyValueStore')

export default class KeyValueStore extends JlinxDocument {
  constructor (opts) {
    super(opts)
    this.hyperbee = new Hyperbee(this.core, {
      keyEncoding: 'utf-8',
      valueEncoding: 'json'
    })
  }

  get version () { return this.hyperbee.version }
  async get (key) {
    // debug('KeyValueStore.get', key)
    const { value } = await this.hyperbee.get(key)
    debug('KeyValueStore.get', key, value)
    return value
  }

  async all () {
    const all = {}
    const rs = this.hyperbee.createReadStream({
      reverse: true,
      limit: this.length
    })
    for await (const { key, value } of rs) { all[key] = value }
    return all
  }

  async set (changes) {
    const batch = this.hyperbee.batch()
    for (const [key, value] of Object.entries(changes)) {
      if (typeof value === 'undefined') {
        await batch.del(key)
      } else {
        await batch.put(key, value)
      }
    }
    await batch.flush()
  }

  async del (key) {
    await this.hyperbee.del(key)
  }
}
