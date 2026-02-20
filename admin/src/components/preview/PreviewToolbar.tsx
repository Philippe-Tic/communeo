import { cn } from '@/lib/utils'
import { Maximize2, Minimize2, Monitor, Smartphone, Tablet } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type ViewportSize = 'desktop' | 'tablet' | 'mobile'

interface PreviewToolbarProps {
  children: React.ReactNode
  actions?: React.ReactNode
}

const VIEWPORTS: { key: ViewportSize; label: string; icon: typeof Monitor; width: string }[] = [
  { key: 'desktop', label: 'Desktop', icon: Monitor, width: '1280px' },
  { key: 'tablet', label: 'Tablette', icon: Tablet, width: '768px' },
  { key: 'mobile', label: 'Mobile', icon: Smartphone, width: '375px' },
]

export function PreviewToolbar({ children, actions }: PreviewToolbarProps) {
  const [viewport, setViewport] = useState<ViewportSize>('desktop')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const currentViewport = VIEWPORTS.find((v) => v.key === viewport)!

  const closeFullscreen = useCallback(() => setIsFullscreen(false), [])

  useEffect(() => {
    if (!isFullscreen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreen()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, closeFullscreen])

  const toolbar = (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
      {VIEWPORTS.map((vp) => (
        <button
          key={vp.key}
          type="button"
          onClick={() => setViewport(vp.key)}
          title={vp.label}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
            viewport === vp.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <vp.icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{vp.label}</span>
        </button>
      ))}

      <div className="ml-auto">
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Réduire' : 'Plein écran'}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{isFullscreen ? 'Réduire' : 'Plein écran'}</span>
        </button>
      </div>
    </div>
  )

  if (isFullscreen) {
    const fullscreenMaxWidth = viewport === 'desktop' ? '100%' : currentViewport.width

    return createPortal(
      <div className="fixed inset-0 z-[1200] flex flex-col bg-background">
        <div className="shrink-0 border-b px-4 py-2">
          {toolbar}
        </div>
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <div
            className="mx-auto w-full h-full min-h-full transition-[max-width] duration-300 ease-in-out"
            style={{ maxWidth: fullscreenMaxWidth }}
          >
            {children}
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2 shrink-0">
        {toolbar}
        {actions && <div className="ml-auto flex gap-2">{actions}</div>}
      </div>
      <div
        className="mx-auto w-full min-h-0 flex-1 overflow-auto transition-[max-width] duration-300 ease-in-out"
        style={{ maxWidth: currentViewport.width }}
      >
        {children}
      </div>
    </div>
  )
}
