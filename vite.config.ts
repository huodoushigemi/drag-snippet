import { defineConfig } from 'vite'
import fs, { writeFile } from 'fs/promises'
import vue from '@vitejs/plugin-vue'
import { BaseElementNode, ComponentNode, ElementTypes, NodeTypes, parse, transform } from '@vue/compiler-dom'
import MagicString from 'magic-string'
import { uid } from 'uid'
import { CodeHandlers } from './src/CodeHandlers'


const EXCLUDE_TAG = ["template", "script", "style"]
const NID = Symbol('nid')
const LCD = Symbol('lcd')

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
            function getNid(e) {
              let nid = e[NID] ??= e.props?.find(e => e.type == NodeTypes.ATTRIBUTE && e.name == 'lcd-id')?.value?.content
              if (e.type == NodeTypes.ELEMENT && !nid) w.prependLeft(e.loc.start.offset + e.tag.length + 1, ` lcd-id="${nid = uid()}"`)
              e[NID] = nid
              return nid
            }
            const scopeId = ids[id] ??= uid()
            transform(parse(code), {
              nodeTransforms: [
                node => {
                  if (node.type == NodeTypes.ROOT) {
                    const children = node.children.find(e => e.type == NodeTypes.ELEMENT && e.tag == 'template')?.children
                    children?.map(e => (e[LCD] ??= {}).root = true)
                  }
                  if (node.type != NodeTypes.ELEMENT) return
                  const el = node as BaseElementNode
                  if (EXCLUDE_TAG.includes(el.tag)) return
                  if (el.tagType == ElementTypes.ELEMENT || el.tagType == ElementTypes.COMPONENT) {
                    const nid = getNid(node)
                    if (node[LCD]?.root) {
                      s.prependLeft(el.loc.start.offset + el.tag.length + 1, ` .__v_root="true"`)
                    }
                    else {
                      const attrs = el[LCD] ??= {}
                      Object.assign(attrs, {
                        id: nid,
                        scopeId,
                        loc: { ...node.loc, source: void 0 },
                        children: el.children.map(e => getNid(e)).filter(e => e),
                        editable: el.children.length == 1 && el.children[0].type == NodeTypes.TEXT,
                      })
                      el.children.map(e => (e[LCD] ??= {}).parent = nid)
  
                      return () => {
                        s.prependLeft(el.loc.start.offset + el.tag.length + 1, ` key="${nid}" file-id="${scopeId}" .lcd='${JSON.stringify(attrs)}'`)
                      }
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
