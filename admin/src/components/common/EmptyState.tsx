import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon
}: EmptyStateProps) {
  return (
    <div className="p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        {icon && (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-50 text-3xl text-brand-400 dark:from-brand-900/40 dark:to-brand-800/20 dark:text-brand-400">
            {icon}
          </div>
        )}
        <p className="text-lg font-semibold text-foreground/80">{title}</p>
        {description && (
          <p className="max-w-md text-muted-foreground">{description}</p>
        )}
        {actionLabel && onAction && (
          <Button onClick={onAction} className="mt-2">{actionLabel}</Button>
        )}
      </div>
    </div>
  )
}
