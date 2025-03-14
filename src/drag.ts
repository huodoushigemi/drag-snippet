import { useElementBounding, useEventListener } from '@vueuse/core'
import { VueNode } from './class/VueNode'
import { computed, h, nextTick, reactive, render, watchEffect } from 'vue'
import { pick } from 'es-toolkit'
import type { Node } from './class/Node'
import { useDraggable } from './useDraggable'

type El = HTMLElement

export function useDrag() {
  const state = reactive({
    hover: void 0 as Node | undefined,
  })
  
  useEventListener(window, 'mouseover', e => {
    state.hover = findENode(e)
  })

  const rect = reactive(useElementBounding(() => state.hover?.el))

  const el = document.createElement('div')
  el.style = 'position: fixed; top: 0; left: 0; pointer-events: none; z-index: 10000;'
  document.body.append(el)

  watchEffect(() => {
    const { hover }  = state
    const style = {
      position: 'fixed',
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      outline: '1px red dashed',
      outlineOffset: '-1px',
      opacity: '.4',
      ...hover ? pick(getComputedStyle(hover.el), ['transform', 'borderRadius']) : {}
    }
    render(h('div', { style }, [
      h('div', { style: 'display: flex; height: 22px; line-height: 22px; transform: translate(0, -100%);' }, [
        h('div', { style: 'padding: 0 6px; background: red; font-size: 12px;' }, hover?.is)
      ])
    ]), el)
  })

  // 
  const hoverEl = computed(() => state.hover?.el)

  watchEffect(cleaup => {
    const hover = hoverEl.value
    if (!hover) return
    const draggable = hoverEl.value.draggable
    hoverEl.value.draggable = true
    cleaup(() => hover.draggable = draggable)
  })

  useDraggable(document.body, {
    dragstart(e) {
      e.dataTransfer?.setDragImage(new Image(), 0, 0)
    },
    dragover(el, drag, ctx) {
      if (drag?.contains(el)) return
      if (!el.children.length) return
      return findNode(el) ? true : false
    },
    drop(el, drag, type, e) {
      // update files
    },
  })

  // 文本元素 开启编辑模式
  watchEffect(cleaup => {
    const node = state.hover
    if (!node) return
    // if (!node?.editable) return
    const { el } = node
    const addEvent = (event, cb, opt) => { el.addEventListener(event, cb, opt); cleaup(() => el.removeEventListener(event, cb)) }
    const addAttr = (k, v) => { el.setAttribute(k, v); cleaup(() => el.removeAttribute(k)) }

    addEvent('click', () => {
      addAttr('lcd-text', '')
      addAttr('contenteditable', 'plaintext-only')
      addAttr('spellcheck', 'false')
      cleaup(() => el.ownerDocument.getSelection()?.empty())
      
      addEvent('keydown', async (e) => {
        if (e.key == 'Enter') {
          e.preventDefault()
          state.hover = void 0
          await nextTick()
          state.hover = node
          // 
        }
        e.stopPropagation()
      })
      addEvent('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
      })
    }, { once: true })
  })
}

function findENode(e: Event): Node | undefined {
  const el = e.composedPath().find(e => VueNode.match(e)) as any
  return el ? (el.__lcd_node ??= new VueNode(el)) : void 0
}

function findNode(el: Element): Node | undefined {
  return VueNode.match(el) ? (el.__lcd_node ??= new VueNode(el)) : void 0
}