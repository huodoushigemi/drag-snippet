import { Node } from './Node'

export class VueNode extends Node {
  static match(el: any) {
    return (el instanceof HTMLElement || (el as Element).tagName == 'svg') && !!(el as any).lcd
  }

  get lcd() {
    return (this.el as any).lcd
  }

  get vnode() {
    return (this.el as any).__vnode
  }

  get componentRootEl() {
    return this.vnode.ctx.ctx.$el
  }

  get is() {
    return this.el == this.componentRootEl ? this.vnode.ctx.type.__name : this.vnode.type
  }

  get loc() {
    return this.lcd.loc
  }

  // get editable() {
  //   return false
  // }

  get file() {
    return this.vnode.ctx.type.__file
  }
}