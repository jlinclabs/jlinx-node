import Debug from 'debug'
import JlinxDocument from './BaseClass.js'

const debug = Debug('jlinx:MicroLedger')

export default class MicroLedger extends JlinxDocument {
  async get (index) {
    const raw = await this.core.get(index)
    const entry = JSON.parse(raw)
    debug('get', index, entry)
    return entry
  }

  async all () {
    const all = []
    await this.core.update()
    const { length } = this.core
    for (let i = 1; i < length; i++) {
      all.push(await this.get(i))
    }
    return all
  }

  validateEvent (event) {
  }

  async append (events) {
    const entries = events.map(event => {
      this.validateEvent(event)
      return JSON.stringify(event)
    })
    await this.core.append(entries)
  }
}
