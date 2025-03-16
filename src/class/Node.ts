import { computed, reactive, ref } from 'vue'
import { useElementBounding } from '@vueuse/core'

function _ref<T>(): T | undefined
function _ref<T>(v: T): T
function _ref(v?) { return ref(v) }

function _calc<T extends () => any>(v: T) { return computed(v) as ReturnType<T> }

export abstract class Node {
    el = _ref() as HTMLElement
  
    constructor(el: Element) {
      this.el = el as HTMLElement
    }
  
    abstract get componentRootEl(): HTMLElement
  
    abstract get is(): string
    abstract get loc(): Record<string, any>
    get label() { return this.is }
  
    get editable() {
      return !this.el.children.length && !!this.el.textContent
    }

    rect = _calc(() => reactive(useElementBounding(() => this.el)))
  
    abstract get file(): string

    get data() {
      return {
        file: this.file,
        loc: this.loc
      }
    }
  }