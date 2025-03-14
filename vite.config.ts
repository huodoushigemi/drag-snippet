import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { BaseElementNode, ElementTypes, NodeTypes, parse, transform } from '@vue/compiler-dom'
import MagicString from 'magic-string'

const EXCLUDE_TAG = ["template", "script", "style"]

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'drag-snippet',
      apply: 'serve',
      enforce: 'pre',
      transform(code, id, options) {
        if (id.endsWith('.vue')) {
          const s = new MagicString(code)
          transform(parse(code), {
            nodeTransforms: [
              node => {
                if (node.type == NodeTypes.ELEMENT) {
                  const el = node as BaseElementNode
                  if (el.tagType == ElementTypes.ELEMENT && !EXCLUDE_TAG.includes(el.tag)) {
                    !el.loc.source.includes(".lcd") && s.prependLeft(el.loc.start.offset + el.tag.length + 1, ` .lcd="{}"`)
                  }
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
      }
    }
  ],
})
