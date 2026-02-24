import { cn } from '@/lib/utils'
import type { ToolbarButtonProps } from '../types'

export function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'rounded p-1.5 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed',
        active && 'bg-muted text-foreground'
      )}
    >
      {children}
    </button>
  )
}
