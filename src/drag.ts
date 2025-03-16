import { useElementBounding, useEventListener } from '@vueuse/core'
import { VueNode } from './class/VueNode'
import { computed, Fragment, h, nextTick, reactive, render, watchEffect } from 'vue'
import { pick } from 'es-toolkit'
import type { Node } from './class/Node'
import { useDraggable } from './useDraggable'
import './css.scss'

type El = HTMLElement

export function useDrag() {
  const state = reactive({
    hover: void 0 as Node | undefined,
    active: void 0 as Node | undefined,
  })
  
  useEventListener(window, 'mouseover', e => {
    state.hover = findENode(e)
  })

  useEventListener(window, 'mousedown', e => {
    state.active = findENode(e)
  })

  const el = document.createElement('div')
  el.style = 'position: fixed; top: 0; left: 0; pointer-events: none; z-index: 10000;'
  document.body.append(el)

  watchEffect(() => {
    const { hover, active }  = state
    render(h('div', { class: 'xxx' }, [
      hover && h('div', { style: { position: 'fixed', top: `${hover.rect.top}px`, left: `${hover.rect.left}px`, width: `${hover.rect.width}px`, height: `${hover.rect.height}px` } }, [
        h('div', { class: 'hover-outline', style: hover && pick(getComputedStyle(hover.el), ['transform', 'borderRadius']) }),
        h('div', { class: 'actions', style: 'display: flex; height: 22px; line-height: 22px; transform: translate(0, -100%);' }, [
          h('div', { class: 'actions-title' }, hover?.label)
        ])
      ]),
      active && h('div', { style: { position: 'fixed', top: `${active.rect.top}px`, left: `${active.rect.left}px`, width: `${active.rect.width}px`, height: `${active.rect.height}px` } }, [
          h('div', { class: 'active-outline', style: active && pick(getComputedStyle(active.el), ['transform', 'borderRadius']) }),
          h('div', { class: 'actions', style: 'display: flex; height: 22px; line-height: 22px; transform: translate(0, -100%);' }, [
            // h('div', { class: 'actions-title' }, hover?.is)
          ])
        ]),
      ]),
      el
    )
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
      const rel = findNode(el)!
      const params = { rel: rel.data, drag: findNode(drag!)?.data, type }
      fetch(`/__drag-snippet`, {
        method: 'POST',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify(params)
      })
    },
  })

  // 文本元素 开启编辑模式
  watchEffect(cleaup => {
    const node = state.active
    // if (!node) return
    if (!node?.editable) return
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
          state.active = void 0
          await nextTick()
          state.active = node
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
  return el ? (reactive(new VueNode(el))) : void 0
}

function findNode(el: Element): Node | undefined {
  return VueNode.match(el) ? (reactive(new VueNode(el))) : void 0
}