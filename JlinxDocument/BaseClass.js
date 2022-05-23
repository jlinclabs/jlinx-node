import { coreToKey, keyToString } from 'jlinx-core/util.js'

export default class JlinxDocument {
  constructor (opts) {
    this.core = opts.core
    this.header = opts.header
    this.id = keyToString(coreToKey(this.core))
  }

  get type () { return this.constructor.name }

  get writable () { return this.core.writable }

  get length () { return this.core.length - 1 }

  get created () { return this.header.created }

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
