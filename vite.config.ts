import { defineConfig } from 'vite'
import fs, { writeFile } from 'fs/promises'
import vue from '@vitejs/plugin-vue'
import { BaseElementNode, ElementTypes, NodeTypes, parse, transform } from '@vue/compiler-dom'
import MagicString from 'magic-string'
import { uid } from 'uid'
import { CodeHandlers } from './src/CodeHandlers'


const EXCLUDE_TAG = ["template", "script", "style"]

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
          http.ws.on('drag-snippet/move', async (data) => {
            CodeHandlers.find(e => e.match.test(data.rel.file))?.move(data)
          })
          http.ws.on('drag-snippet/remove', async (data) => {
            CodeHandlers.find(e => e.match.test(data.node.file))?.remove(data)
          })
          http.ws.on('drag-snippet/add', async (data) => {
            CodeHandlers.find(e => e.match.test(data.rel.file))?.add(data)
          })
          http.ws.on('drag-snippet/edit', async (data) => {
            CodeHandlers.find(e => e.match.test(data.node.file))?.edit(data)
          })
        },
        transform(code, id, options) {
          if (id.endsWith('.vue')) {
            const s = new MagicString(code)
            const w = new MagicString(code)
            transform(parse(code), {
              nodeTransforms: [
                node => {
                  if (node.type != NodeTypes.ELEMENT) return
                  const el = node as BaseElementNode
                  if (el.tagType != ElementTypes.ELEMENT || EXCLUDE_TAG.includes(el.tag)) return
                  if (!el.loc.source.includes(".lcd")) {
                    const getNid = e => e.props?.find(e => e.type == NodeTypes.ATTRIBUTE && e.name == 'lcd-id')?.value?.content
                    let nid = getNid(el)
                    if (!nid) w.prependLeft(el.loc.start.offset + el.tag.length + 1, ` lcd-id="${nid = uid()}"`)
                      return () => {
                      const attrs = {
                        id: nid,
                        loc: node.loc,
                        children: el.children.map(e => getNid(e)),
                        editable: el.children.length == 1 && el.children[0].type == NodeTypes.TEXT,
                      }
                      s.prependLeft(el.loc.start.offset + el.tag.length + 1, ` key="${nid}" file-id="${ids[id] ??= uid()}" .lcd='${JSON.stringify(attrs)}'`)
                    }
                  }
                }
              ]
            })
            if (w.toString() != code) {
              writeFile(id, w.toString())
            }
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
