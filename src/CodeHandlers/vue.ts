import fs from 'fs/promises'
import MagicString from "magic-string"

export const VueCodeHandler = {
  match: /\.vue$/,
  async add({ rel, drag, type }) {

  },
  async edit({ node, props }) {

  },
  async remove({ node }) {
    const code = await fs.readFile(node.file, { encoding: 'utf8' })
    const { loc } = node
    const s = new MagicString(code)
    const start = /\s+$/.test(code.slice(0, loc.start.offset)) ? loc.start.offset - loc.start.column : loc.start.offset
    s.remove(start, loc.end.offset)
    fs.writeFile(node.file, s.toString())
  },
  async move({ rel, drag, type }) {
    if (rel.loc.start.offset == drag.loc.start.offset) return
    const loc1 = rel.loc, loc2 = drag.loc
    const relCode = await fs.readFile(rel.file, { encoding: 'utf8' })
    const s = new MagicString(relCode)
    let dragSource = rel.file == drag.file
      ? (() => {
        const start = /\s+$/.test(relCode.slice(0, loc2.start.offset)) ? loc2.start.offset - loc2.start.column : loc2.start.offset
        s.remove(start, loc2.end.offset)
        return relCode.slice(loc2.start.offset, loc2.end.offset)
      })() 
      : await (async () => {
        const dragCode = await fs.readFile(drag.file, { encoding: 'utf8' })
        fs.writeFile(drag.file, dragCode.slice(0, drag.loc.start.offset + 1) + dragCode.slice(drag.loc.end.offset))
        return dragCode.slice(loc2.start.offset, loc2.end.offset)
      })()
    
    const indent = ' '.repeat(rel.loc.start.column - 1)
    dragSource = dragSource.replace(/\n\s*/g, `\n${indent}`)
    const ret = 
      type == 'prev' ? s.prependLeft(loc1.start.offset, `${dragSource}\n${indent}`) :
      type == 'next' ? s.prependLeft(loc1.end.offset, `\n${indent}${dragSource}`) :
      type == 'inner' ? '' : ''
    fs.writeFile(rel.file, ret.toString())
  }
}