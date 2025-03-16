import { defineConfig } from 'vite'
import fs, { writeFile } from 'fs/promises'
import vue from '@vitejs/plugin-vue'
import { BaseElementNode, ElementTypes, NodeTypes, parse, transform } from '@vue/compiler-dom'
import MagicString from 'magic-string'
import bodyParser from 'body-parser'
import { uid } from 'uid'


const EXCLUDE_TAG = ["template", "script", "style"]

async function dragCode(rel, drag, type) {
  if (rel.loc.start.offset == drag.loc.start.offset) return
  const loc1 = rel.loc, loc2 = drag.loc
  const relCode = await fs.readFile(rel.file, { encoding: 'utf8' })
  const s = new MagicString(relCode)
  let dragSource = rel.file == drag.file
    ? (() => {
      s.remove(
        /\s+/.test(relCode.slice(0, loc2.start.offset)) ? loc2.start.offset - loc2.start.column : loc2.start.offset,
        loc2.end.offset
      )
      return relCode.slice(loc2.start.offset, loc2.end.offset)
    })() 
    : await (async () => {
      const dragCode = await fs.readFile(drag.file, { encoding: 'utf8' })
      writeFile(drag.file, dragCode.slice(0, drag.loc.start.offset + 1) + dragCode.slice(drag.loc.end.offset))
      return dragCode.slice(loc2.start.offset, loc2.end.offset)
    })()
  
  const indent = ' '.repeat(rel.loc.start.column - 1)
  dragSource = dragSource.replace(/\n\s*/g, `\n${indent}`)
  const ret = 
    type == 'prev' ? s.prependLeft(loc1.start.offset, `${dragSource}\n${indent}`) :
    type == 'next' ? s.prependLeft(loc1.end.offset, `\n${indent}${dragSource}`) :
    type == 'inner' ? '' : ''
  writeFile(rel.file, ret.toString())
  // writeFile(rel.file,
  //   type == 'prev' ? relCode.slice(0, loc1.start.offset) + `${dragSource}\n${indent}` + relCode.slice(loc1.start.offset) :
  //   type == 'next' ? relCode.slice(0, loc1.end.offset) + `\n${indent}\n${dragSource}` + relCode.slice(loc1.end.offset) :
  //   type == 'inner' ? relCode.slice() : ''
  // )
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    (() => {
      const ids = {}
      return {
        name: 'drag-snippet',
        apply: 'serve',
        enforce: 'pre',
        configureServer(http) {
          http.middlewares.use(bodyParser.json())
          http.middlewares.use(bodyParser.urlencoded({ extended: true }))
          http.middlewares.use('/__drag-snippet', async (req, res) => {
            const { rel, drag, type } = req.body
            dragCode(rel, drag, type)
          })
        },
        transform(code, id, options) {
          if (id.endsWith('.vue')) {
            const s = new MagicString(code)
            transform(parse(code), {
              nodeTransforms: [
                node => {
                  if (node.type != NodeTypes.ELEMENT) return
                  const el = node as BaseElementNode
                  if (el.tagType != ElementTypes.ELEMENT || EXCLUDE_TAG.includes(el.tag)) return
                  if (!el.loc.source.includes(".lcd")) {
                    const attrs = { loc: node.loc }
                    s.prependLeft(el.loc.start.offset + el.tag.length + 1, ` file-id="${ids[id] ??= uid()}" .lcd='${JSON.stringify(attrs)}'`)
                  }
                }
              ]
            })
            return s.toString()
          }
        },
        transformIndexHtml(html) {
          return [
            { tag: 'script', attrs: { type: 'module', src: './src/inject.ts' }, injectTo: 'head' },
          ]
        },
      }
    })()
  ],
})
