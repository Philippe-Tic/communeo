import { Node, mergeAttributes } from '@tiptap/core'

// Column container
export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column+',

  addAttributes() {
    return {
      cols: {
        default: 2,
        parseHTML: (el) => parseInt(el.getAttribute('data-cols') || '2'),
        renderHTML: (attrs) => ({ 'data-cols': attrs.cols }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div.content-columns' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes({ class: 'content-columns' }, HTMLAttributes),
      0,
    ]
  },
})

// Individual column
export const Column = Node.create({
  name: 'column',
  group: '',
  content: 'block+',

  parseHTML() {
    return [{ tag: 'div.content-column' }]
  },

  renderHTML() {
    return ['div', { class: 'content-column' }, 0]
  },
})
