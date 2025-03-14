export abstract class Node {
    el: HTMLElement
  
    constructor(el: Element) {
      this.el = el as HTMLElement
    }
  
    abstract get componentRootEl(): HTMLElement
  
    abstract get is(): string
  
    get editable() {
      return false
    }
  
    abstract get file(): string
  }