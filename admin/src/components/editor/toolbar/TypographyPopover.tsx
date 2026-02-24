import { useEffect, useRef, useState } from 'react'
import { Type } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolbarButton } from './ToolbarButton'
import type { Editor } from '../types'

const FONT_SIZES = [
  { label: 'Par défaut', value: '' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
]

const LINE_HEIGHTS = [
  { label: 'Par défaut', value: '' },
  { label: '1.2', value: '1.2' },
  { label: '1.5', value: '1.5' },
  { label: '1.8', value: '1.8' },
  { label: '2.0', value: '2.0' },
]

const LETTER_SPACINGS = [
  { label: 'Normal', value: '' },
  { label: 'Large', value: '0.05em' },
  { label: 'Plus large', value: '0.1em' },
]

interface TypographyPopoverProps {
  editor: Editor
}

export function TypographyPopover({ editor }: TypographyPopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <ToolbarButton onClick={() => setOpen(!open)} title="Typographie">
        <Type className="h-4 w-4" />
      </ToolbarButton>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-md border bg-popover p-3 shadow-md">
          {/* Font size */}
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Taille</p>
            <div className="flex flex-wrap gap-1">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.value || 'default'}
                  type="button"
                  onClick={() => {
                    if (s.value) {
                      (editor.commands as any).setFontSize(s.value)
                    } else {
                      (editor.commands as any).unsetFontSize()
                    }
                  }}
                  className={cn(
                    'rounded px-2 py-0.5 text-xs transition-colors hover:bg-muted',
                    !s.value && 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line height */}
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Interligne</p>
            <div className="flex flex-wrap gap-1">
              {LINE_HEIGHTS.map((lh) => (
                <button
                  key={lh.value || 'default'}
                  type="button"
                  onClick={() => {
                    if (lh.value) {
                      (editor.commands as any).setLineHeight(lh.value)
                    } else {
                      (editor.commands as any).unsetLineHeight()
                    }
                  }}
                  className={cn(
                    'rounded px-2 py-0.5 text-xs transition-colors hover:bg-muted',
                    !lh.value && 'text-muted-foreground'
                  )}
                >
                  {lh.label}
                </button>
              ))}
            </div>
          </div>

          {/* Letter spacing */}
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Espacement lettres</p>
            <div className="flex flex-wrap gap-1">
              {LETTER_SPACINGS.map((ls) => (
                <button
                  key={ls.value || 'normal'}
                  type="button"
                  onClick={() => {
                    if (ls.value) {
                      editor.chain().focus().insertContent(`<span style="letter-spacing: ${ls.value}">`).run()
                    }
                  }}
                  className={cn(
                    'rounded px-2 py-0.5 text-xs transition-colors hover:bg-muted',
                    !ls.value && 'text-muted-foreground'
                  )}
                >
                  {ls.label}
                </button>
              ))}
            </div>
          </div>

          {/* Drop cap */}
          <div>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().insertContent('<p class="drop-cap">').run()
              }}
              className="w-full rounded px-2 py-1 text-left text-xs transition-colors hover:bg-muted"
            >
              Lettrine (Drop Cap)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
