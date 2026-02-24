import { useEffect, useRef, useState } from 'react'
import { Highlighter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolbarButton } from './ToolbarButton'
import type { Editor } from '../types'

const HIGHLIGHT_COLORS = [
  { label: 'Aucun', value: '' },
  { label: 'Jaune', value: '#fef08a' },
  { label: 'Vert', value: '#bbf7d0' },
  { label: 'Bleu', value: '#bfdbfe' },
  { label: 'Rose', value: '#fecdd3' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Violet', value: '#e9d5ff' },
]

interface HighlightPickerProps {
  editor: Editor
}

export function HighlightPicker({ editor }: HighlightPickerProps) {
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
      <ToolbarButton
        onClick={() => setOpen(!open)}
        active={editor.isActive('highlight')}
        title="Surligner"
      >
        <Highlighter className="h-4 w-4" />
      </ToolbarButton>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-md border bg-popover p-2 shadow-md">
          <div className="flex gap-1">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value || 'none'}
                type="button"
                title={c.label}
                onClick={() => {
                  if (c.value) {
                    editor.chain().focus().toggleHighlight({ color: c.value }).run()
                  } else {
                    editor.chain().focus().unsetHighlight().run()
                  }
                  setOpen(false)
                }}
                className={cn(
                  'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                  !c.value && 'bg-background border-dashed',
                  editor.isActive('highlight', { color: c.value }) &&
                    'ring-2 ring-ring ring-offset-2'
                )}
                style={c.value ? { backgroundColor: c.value } : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
