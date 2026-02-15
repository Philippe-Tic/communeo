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
          <div className="text-4xl text-muted-foreground">{icon}</div>
        )}
        <p className="text-lg font-medium text-muted-foreground">{title}</p>
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
