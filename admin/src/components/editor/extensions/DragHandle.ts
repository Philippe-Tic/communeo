import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, NodeSelection } from '@tiptap/pm/state'

const dragHandlePluginKey = new PluginKey('dragHandle')

function createDragHandle() {
  const handle = document.createElement('div')
  handle.className = 'drag-handle'
  handle.setAttribute('draggable', 'true')
  handle.setAttribute('data-drag-handle', '')
  handle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/></svg>`
  handle.contentEditable = 'false'
  return handle
}

export const DragHandle = Extension.create({
  name: 'dragHandle',

  addProseMirrorPlugins() {
    let dragHandleElement: HTMLElement | null = null
    let currentPos: number | null = null

    return [
      new Plugin({
        key: dragHandlePluginKey,

        view: (view) => {
          dragHandleElement = createDragHandle()
          dragHandleElement.style.display = 'none'
          view.dom.parentElement?.appendChild(dragHandleElement)

          dragHandleElement.addEventListener('mousedown', (e) => {
            e.preventDefault()
            if (currentPos === null) return

            const tr = view.state.tr
            const node = view.state.doc.nodeAt(currentPos)
            if (node) {
              tr.setSelection(NodeSelection.create(view.state.doc, currentPos))
              view.dispatch(tr)
            }
          })

          dragHandleElement.addEventListener('dragstart', (_e) => {
            if (currentPos === null) return
            const node = view.state.doc.nodeAt(currentPos)
            if (!node) return

            // Set up drag data
            const tr = view.state.tr
            tr.setSelection(NodeSelection.create(view.state.doc, currentPos))
            view.dispatch(tr)

            // Use the ProseMirror drag mechanism
            view.dragging = {
              slice: view.state.selection.content(),
              move: true,
            }
          })

          return {
            destroy: () => {
              dragHandleElement?.remove()
              dragHandleElement = null
            },
          }
        },

        props: {
          handleDOMEvents: {
            mousemove: (view, event) => {
              if (!dragHandleElement) return false

              const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })
              if (!pos) {
                dragHandleElement.style.display = 'none'
                return false
              }

              const resolvedPos = view.state.doc.resolve(pos.pos)
              // Find the top-level block node
              const depth = resolvedPos.depth
              if (depth === 0) {
                dragHandleElement.style.display = 'none'
                return false
              }

              const blockPos = resolvedPos.before(1)
              const node = view.state.doc.nodeAt(blockPos)
              if (!node || node.isInline) {
                dragHandleElement.style.display = 'none'
                return false
              }

              currentPos = blockPos

              // Position the handle
              const dom = view.nodeDOM(blockPos)
              if (dom instanceof HTMLElement) {
                const editorRect = view.dom.getBoundingClientRect()
                const blockRect = dom.getBoundingClientRect()
                dragHandleElement.style.display = 'flex'
                dragHandleElement.style.top = `${blockRect.top - editorRect.top + view.dom.offsetTop}px`
                dragHandleElement.style.left = `${-24}px`
              }

              return false
            },

            mouseleave: () => {
              if (dragHandleElement) {
                // Delay hiding so drag can be initiated
                setTimeout(() => {
                  if (dragHandleElement) {
                    dragHandleElement.style.display = 'none'
                  }
                }, 200)
              }
              return false
            },
          },
        },
      }),
    ]
  },
})
