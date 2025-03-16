import MagicString from 'magic-string'

const a = new MagicString('asd qwe')

a.move(0, 3, 8)

console.log(a.toString());
