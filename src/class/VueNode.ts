import { reactive } from 'vue'
import { _calc, Node } from './Node'

export class VueNode extends Node {
  static match(el: any) {
    if (el.__v_root) return true
    return (el instanceof HTMLElement || (el as Element).tagName == 'svg') && !!(el as any).lcd
  }

  get lcd() {
    return (this.el as any).lcd || {}
  }

  // get vnode() {
  //   return (this.el as any).__vnode
  // }

  get componentRootEl() {
    return this.vnode.ctx.ctx.$el
  }

  get isComponent() {
    return (this.el as any).__vueParentComponent
  }

  vnode = _calc(() => {
    const a = reactive(this)
    // const vnode = (this.el as any).__vnode
    const vnode = (a.el as any).__vnode
    
    if (a.el == vnode.ctx.ctx.$el) {
      return (function r(arr) {
        for (const child of arr) {
          if (child.component?.subTree == vnode) return child
          if (Array.isArray(child.children)) {
            const ret = r(child.children)
            if (ret) return ret
          }
        }
      })(vnode.ctx.parent?.subTree.children || []) ?? vnode
    }
    // vnode.ctx.parent.subTree.children
    return vnode
  })

  get id() {
    return this.lcd.id
  }

  get is() {
    return (v => typeof v == 'string' ? v :  v.__name || basename(v.__file))(this.vnode.type)
  }

  get component() {
    // return document.querySelector() this.lcd.scopeId
    return reactive(new VueNode(this.vnode.ctx.ctx.$el))
  }

  get loc() {
    return this.lcd.loc
  }

  get editable() {
    return this.lcd.editable
  }

  get file() {
    return this.vnode.ctx.type.__file
  }
}

// 解析文件名称
function basename(path) {
  return path.split('/').pop().split('.')[0]
}