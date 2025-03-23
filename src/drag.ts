import { useElementBounding, useEventListener, useMutationObserver } from '@vueuse/core'
import { computed, Fragment, h, nextTick, reactive, render, toRaw, toRef, triggerRef, watchEffect } from 'vue'
import { pick } from 'es-toolkit'
import { VueNode } from './class/VueNode'
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

  // hover outline
  watchEffect(() => {
    const { hover, active }  = state
    render(h('div', { class: 'xxx' }, [
      hover?.component && (hover?.component.el != hover?.el) && Outline(hover?.component, { color: 'green' }),
      hover && h('div', { style: { position: 'fixed', top: `${hover.rect.top}px`, left: `${hover.rect.left}px`, width: `${hover.rect.width}px`, height: `${hover.rect.height}px` } }, [
        h('div', { class: 'hover-outline', style: pick(getComputedStyle(hover.el), ['transform', 'borderRadius']) }),
        h('div', { class: 'actions', style: 'display: flex; height: 22px; line-height: 22px; transform: translate(0, -100%);' }, [
          h('div', { class: 'actions-title' }, hover?.label)
        ])
      ]),
      active && h('div', { style: { position: 'fixed', top: `${active.rect.top}px`, left: `${active.rect.left}px`, width: `${active.rect.width}px`, height: `${active.rect.height}px` } }, [
          h('div', { class: 'active-outline', style: pick(getComputedStyle(active.el), ['transform', 'borderRadius']) }),
          h('div', { class: 'actions', style: 'display: flex; height: 22px; line-height: 22px; transform: translate(0, -100%);' }, [
            // h('div', { class: 'actions-title' }, hover?.is)
          ])
        ]),
      ]),
      el
    )
  })
  
  // 监听 vite 热更新
  import.meta.hot?.on('vite:afterUpdate', async () => {
    if (state.active) {
      await nextTick()
      state.active = findNode(document.querySelector(`[lcd-id="${state.active.id}"]`))
    }
  })

  useMutationObserver(() => document.body, (e, obs) => {
    state.hover && triggerRef(toRaw(state.hover).el)
    state.active && triggerRef(toRaw(state.active).el)
    obs.takeRecords()
  }, {
    subtree: true,
    childList: true,
    attributes: false,
  })

  // 
  const hoverEl = computed(() => state.hover?.el)

  console.log(window.state = state);

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
      import.meta.hot.send('drag-snippet/move', params)
    },
  })
 
  // 快捷键
  useEventListener('keydown', e => {
    const target = e.target as HTMLElement
    if (target.tagName == 'INPUT' ) e.key == 'Enter' && target.dispatchEvent(new Event('change'))
    if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return
    const key = e.key.toLocaleLowerCase()

    const kb = [
      [() => key == 'delete' && state.active, () => {
        import.meta.hot.send('drag-snippet/remove', { node: state.active?.data })
      }]
    ]

    const cb = kb.find(e => e[0]())?.[1]
    if (cb) {
      cb()
      e.stopPropagation()
      e.preventDefault()
    }
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
  return el ? reactive(new VueNode(el)) : void 0
}

function findNode(el: Element): Node | undefined {
  return VueNode.match(el) ? reactive(new VueNode(el)) : void 0
}

const Outline = ({ label, el, rect }, { color } = {}) => h('div', { style: { position: 'fixed', top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` } }, [
  h('div', { class: 'hover-outline', style: [pick(getComputedStyle(el), ['transform', 'borderRadius']), `outline-color: ${color}`] }),
  h('div', { class: 'actions', style: 'display: flex; height: 22px; line-height: 22px; transform: translate(0, -100%);' }, [
    // h('div', { class: 'actions-title', style: `background: ${color}` }, label)
  ])
])