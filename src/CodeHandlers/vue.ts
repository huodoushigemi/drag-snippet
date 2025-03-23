import fs from 'fs/promises'
import MagicString from "magic-string"

export const VueCodeHandler = {
  match: /\.vue$/,
  async add({ rel, drag, type }) {
    // todo
  },
  async edit({ node, props }) {
    // todo
  },
  async remove({ node }) {
    const code = await fs.readFile(node.file, { encoding: 'utf8' })
    const { loc } = node
    const s = new MagicString(code)
    const trim = code.slice(0, loc.start.offset).match(/\s+$/)[0].length
    s.remove(loc.start.offset - trim, loc.end.offset)
    fs.writeFile(node.file, s.toString())
  },
  async move({ rel, drag, type }) {
    if (rel.loc.start.offset == drag.loc.start.offset) return
    const loc1 = rel.loc, loc2 = drag.loc
    const code = await fs.readFile(rel.file, { encoding: 'utf8' })
    const s = new MagicString(code)
    let dragSource = rel.file == drag.file
      ? (() => {
        const start = /\n\s+$/.test(code.slice(0, loc2.start.offset)) ? loc2.start.offset - loc2.start.column - 1 : loc2.start.offset
        s.remove(start, loc2.end.offset)
        return code.slice(loc2.start.offset, loc2.end.offset)
      })() 
      : await (async () => {
        const dragCode = await fs.readFile(drag.file, { encoding: 'utf8' })
        const trim = dragCode.slice(0, loc2.start.offset).match(/\s+$/)[0].length
        fs.writeFile(drag.file, dragCode.slice(0, loc2.start.offset - trim) + dragCode.slice(loc2.end.offset))
        return dragCode.slice(loc2.start.offset, loc2.end.offset)
      })()
    
    const indent = code.slice(0, loc1.start.offset).match(/\s+$/)?.[0]
    dragSource = dragSource.replace(/\n\s*/g, `\n${indent}`)
    const ret = 
      type == 'prev' ? s.prependLeft(loc1.start.offset, `${dragSource}${indent}`) :
      type == 'next' ? s.prependLeft(loc1.end.offset, `${indent}${dragSource}`) :
      type == 'inner' ? '' : ''
    fs.writeFile(rel.file, ret.toString())
  }
}