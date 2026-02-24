import { useEffect, useRef, useState } from 'react'
import { Palette } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolbarButton } from './ToolbarButton'
import { COLORS } from '../types'
import type { Editor } from '../types'

interface ColorPickerProps {
  editor: Editor
}

export function ColorPicker({ editor }: ColorPickerProps) {
  const [colorOpen, setColorOpen] = useState(false)
  const colorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!colorOpen) return
    const handler = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setColorOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [colorOpen])

  return (
    <div className="relative" ref={colorRef}>
      <ToolbarButton
        onClick={() => setColorOpen(!colorOpen)}
        title="Couleur du texte"
      >
        <Palette className="h-4 w-4" />
      </ToolbarButton>
      {colorOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-md border bg-popover p-2 shadow-md">
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c.value || 'default'}
                type="button"
                title={c.label}
                onClick={() => {
                  if (c.value) {
                    editor.chain().focus().setColor(c.value).run()
                  } else {
                    editor.chain().focus().unsetColor().run()
                  }
                  setColorOpen(false)
                }}
                className={cn(
                  'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                  !c.value && 'bg-foreground',
                  editor.isActive('textStyle', { color: c.value }) &&
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
