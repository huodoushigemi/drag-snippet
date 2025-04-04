import { reactive, watchPostEffect } from 'vue'
import { type MaybeComputedElementRef, unrefElement, useEventListener } from '@vueuse/core'
import { mapValues } from 'es-toolkit'

interface UseDraggableProps {
  dragstart?(e: DragEvent): void
  dragover(el: Element, drag: Element | undefined, ctx: { path: EventTarget[] }): boolean | Element | void
  children?(el: Element): Element[]
  getRect?(el: Element): DOMRect
  drop(el: Element, drag: Element | undefined, type: 'prev' | 'next' | 'inner', e: DragEvent): void
  dragend?(): void
  curosr?: Partial<typeof defaultCurosr>
}

const defaultCurosr = {
  size: 6,
  color: '#e6a23c66'
}

interface State {
  drag?: HTMLElement
  rel?: HTMLElement
  direction?: 'T' | 'B' | 'L' | 'R'
  type?: 'prev' | 'next' | 'inner'
}

export function useDraggable(el: MaybeComputedElementRef, props: UseDraggableProps) {
  const root = () => unrefElement(el) as HTMLElement
  let x = 0, y = 0
  const getRect = (el: Element) => props.getRect ? props.getRect(el) : el.getBoundingClientRect()

  const ret = reactive({
    dragend,
    state: {
      drag: void 0,
      rel: void 0,
      direction: void 0,
      type: void 0
    } as State
  })

  useEventListener(root, 'dragstart', e => {
    props.dragstart?.(e)
    if (e.defaultPrevented) return
    ret.state = { drag: e.target as HTMLElement }
  })

  useEventListener(root, 'dragover', (e: DragEvent) => {
    const container = root()
    const path = e.composedPath()
    let dragover: HTMLElement | void
    for (let i = 0; i < path.length; i++) {
      const el = path[i] as HTMLElement
      const v = el.nodeType == 1 ? props.dragover(el, ret.state.drag, { path }) : void 0
      dragover = v == true ? el : (v as HTMLElement || void 0)
      if (el == container || dragover) break
    }
    // @ts-ignore
    if (!dragover) {
      ret.state = { ...mapValues(ret.state, () => void 0), drag: ret.state.drag }
      return
    }

    e.stopPropagation()
    e.preventDefault()
    if (e.x == x && e.y == y) return
    x = e.x; y = e.y

    const children = props.children ? props.children(dragover) : [...dragover.children]
    const [, rel, rect, dir] = nearestEl(e.x, e.y, children, dragover, getRect)!
    ret.state.rel = rel ?? dragover
    ret.state.direction = dir
    ret.state.type = ret.state.rel ? { T: 'prev', L: 'prev', B: 'next', R: 'next' }[dir] ?? 'inner' : void 0
  })

  useEventListener(root, 'drop', e => {
    e.stopPropagation()
    e.preventDefault()
    props.drop(ret.state.rel!, ret.state.drag, ret.state.type!, e)
    dragend()
  })

  useEventListener('dragend', dragend)

  function dragend() {
    props.dragend?.()
    ret.state = mapValues(ret.state, () => void 0)
  }

  // drop cursor
  const cursorContainer = Object.assign(document.createElement('div'), { style: 'position: fixed; top: 0; left: 0; pointer-events: none; z-index: 100000' })
  const cursor = Object.assign(document.createElement('div'), { style: 'background: #e6a23c66' })
  cursorContainer.append(cursor)
  document.body.append(cursorContainer)

  watchPostEffect(() => {
    if (ret.state.rel) {
      const { rel, type } = ret.state
      const rect = getRect(rel!)
      const v = computeDir()(rel) == 'v', t = type == 'prev'
      const { size } = { ...defaultCurosr, ...props.curosr }
      Object.assign(cursor.style, type != 'inner' ? {
        transform: `translate(${rect.x - (v ? 0 : size / 2) + (v || t ? 0 : rect.width)}px, ${rect.y - (v ? size / 2 : 0) + (!v || t ? 0 : rect.height)}px)`,
        width: v ? `${rect.width}px` : `${size}px`,
        height: v ? `${size}px` : `${rect.height}px`,
      } : {
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      })
    }
    else {
      Object.assign(cursor.style, {
        transform: '',
        width: '0px',
        height: '0px'
      })
    }
  })

  ret.cursor = cursor

  return ret
}

function nearestEl(x, y, els: Element[], container: Element, getRect: (el: Element) => DOMRect) {
  const dir = computeDir()
  return els.reduce((t, e) => {
    const dis = distance(x, y, e, getRect(e), dir(e));
    return t[0] < dis[0] ? t : dis
  }, [Infinity] as ReturnType<typeof distance>)
}

function distance(x, y, el, rect, dir) {
  if (dir == 'h') {
    const y2 = Math.pow(y - (rect.y + rect.height / 2), 2)
    return x < rect.x + rect.width / 2
      ? [Math.sqrt(Math.pow(x - rect.x, 2) + y2), el, rect, 'L']
      : [Math.sqrt(Math.pow(x - rect.right, 2) + y2), el, rect, 'R']
  }
  if (dir == 'v') {
    const x2 = Math.pow(x - (rect.x + rect.width / 2), 2)
    return y < rect.y + rect.height / 2
      ? [Math.sqrt(Math.pow(y - rect.y, 2) + x2), el, rect, 'T']
      : [Math.sqrt(Math.pow(y - rect.bottom, 2) + x2), el, rect, 'B']
  }
}

function computeStyle() {
  const wm = new WeakMap<Element, CSSStyleDeclaration>()
  return (el: Element) => wm.get(el) ?? wm.set(el, getComputedStyle(el)).get(el)!
}

function computeDir() {
  const fn = computeStyle()
  return (el: Element) => {
    const style = fn(el.parentElement!)
    return (
      style.display.includes('flex') ? style.flexDirection.includes('row') ? 'h' : 'v' :
      style.display.includes('grid') ? 'h' : // todo
      style.display.includes('table-row') ? 'h' :
      fn(el).display.includes('inline') ? 'h' :
      'v'
    )
  }
}