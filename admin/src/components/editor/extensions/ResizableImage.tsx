import { Node } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { AlignCenter, AlignLeft, AlignRight, Maximize2 } from 'lucide-react'

// --- NodeView Component ---

function ResizableImageView({ node, updateAttributes, selected }: any) {
  const { src, alt, title, width, align, caption } = node.attrs
  const imgRef = useRef<HTMLImageElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      startX.current = e.clientX
      startWidth.current = imgRef.current?.offsetWidth || 0
    },
    []
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current
      const newWidth = Math.max(100, startWidth.current + diff)
      updateAttributes({ width: newWidth })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, updateAttributes])

  const setAlign = (newAlign: string) => {
    updateAttributes({ align: newAlign })
  }

  return (
    <NodeViewWrapper
      className={cn('image-block relative my-4', `image-align-${align || 'center'}`)}
      data-align={align || 'center'}
    >
      {/* Alignment controls on selection */}
      {selected && (
        <div className="absolute -top-10 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-md border bg-popover p-1 shadow-md">
          <button
            type="button"
            onClick={() => setAlign('left')}
            className={cn('rounded p-1 hover:bg-muted', align === 'left' && 'bg-muted')}
            title="Aligner à gauche"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAlign('center')}
            className={cn('rounded p-1 hover:bg-muted', (!align || align === 'center') && 'bg-muted')}
            title="Centrer"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAlign('right')}
            className={cn('rounded p-1 hover:bg-muted', align === 'right' && 'bg-muted')}
            title="Aligner à droite"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setAlign('full')}
            className={cn('rounded p-1 hover:bg-muted', align === 'full' && 'bg-muted')}
            title="Pleine largeur"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <figure
        className={cn(
          'relative inline-block',
          selected && 'ring-2 ring-primary ring-offset-2 rounded-lg'
        )}
        style={{ maxWidth: width ? `${width}px` : undefined }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt || ''}
          title={title || undefined}
          className="block w-full rounded-lg"
          draggable={false}
        />

        {/* Resize handle */}
        {selected && (
          <div
            className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize rounded-tl-md bg-primary/80"
            onMouseDown={handleMouseDown}
            title="Redimensionner"
          />
        )}

        {/* Caption */}
        {caption !== undefined && caption !== null && (
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {selected ? (
              <input
                type="text"
                value={caption || ''}
                onChange={(e) => updateAttributes({ caption: e.target.value })}
                placeholder="Ajouter une légende..."
                className="w-full bg-transparent text-center text-sm text-muted-foreground outline-none"
              />
            ) : (
              caption || null
            )}
          </figcaption>
        )}
      </figure>
    </NodeViewWrapper>
  )
}

// --- TipTap Extension ---

export const ResizableImage = Node.create({
  name: 'resizableImage',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      align: { default: 'center' },
      caption: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'figure.image-block',
        getAttrs(dom) {
          const el = dom as HTMLElement
          const img = el.querySelector('img')
          const figcaption = el.querySelector('figcaption')
          const style = el.getAttribute('style') || ''
          const widthMatch = style.match(/max-width:\s*(\d+)px/)
          return {
            src: img?.getAttribute('src') || null,
            alt: img?.getAttribute('alt') || null,
            title: img?.getAttribute('title') || null,
            width: widthMatch ? parseInt(widthMatch[1]) : null,
            align: el.getAttribute('data-align') || 'center',
            caption: figcaption?.textContent || null,
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, title, width, align, caption } = HTMLAttributes

    const figureAttrs: Record<string, string> = {
      class: 'image-block',
      'data-align': align || 'center',
    }
    if (width) {
      figureAttrs.style = `max-width:${width}px`
    }

    const imgAttrs: Record<string, string> = { src }
    if (alt) imgAttrs.alt = alt
    if (title) imgAttrs.title = title

    const children: any[] = ['img', imgAttrs]

    if (caption) {
      return [
        'figure',
        figureAttrs,
        children,
        ['figcaption', {}, caption],
      ]
    }

    return ['figure', figureAttrs, children]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },

  addCommands() {
    return {
      setResizableImage:
        (attrs: { src: string; alt?: string; title?: string; caption?: string }) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: { ...attrs, caption: attrs.caption ?? null },
          })
        },
    } as any
  },
})
