import { computed, reactive, ref, toValue, unref } from 'vue'
import { useElementBounding } from '@vueuse/core'

export function _ref<T>(): T | undefined
export function _ref<T>(v: T): T
export function _ref(v?) { return ref(v) }

export function _calc<T extends () => any>(v: T) { return computed(v) as ReturnType<T> }

export abstract class Node {
  // #el = ref<HTMLElement>()
  // get el() { return this.#el.value! }
  // set el(v) { this.#el.value = v }
  el = _ref() as HTMLElement

  constructor(el: Element) {
    this.el.value = el as HTMLElement
  }

  abstract get componentRootEl(): HTMLElement

  abstract get is(): string
  abstract get id(): string
  abstract get loc(): Record<string, any>
  abstract get component(): Node
  get label() { return this.is }

  get editable() {
    return !this.el.children.length && !!this.el.textContent
  }

  rect = _calc(() => reactive(useElementBounding(() => unref(this.el))))

  abstract get file(): string

  get data() {
    return {
      file: this.file,
      loc: this.loc
    }
  }
}