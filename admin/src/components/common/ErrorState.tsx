import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = 'Une erreur est survenue',
  message = 'Impossible de charger les données. Veuillez réessayer.',
  onRetry,
  retryLabel = 'Réessayer'
}: ErrorStateProps) {
  return (
    <div className="p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="text-4xl">❌</div>
        <p className="text-lg font-medium text-destructive">{title}</p>
        <p className="max-w-md text-muted-foreground">{message}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="mt-2 border-destructive text-destructive hover:bg-destructive/10">
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
