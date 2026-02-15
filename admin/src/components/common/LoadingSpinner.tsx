import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  minHeight?: string
  centered?: boolean
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8', xl: 'h-12 w-12' }

export function LoadingSpinner({
  size = 'lg',
  message = 'Chargement...',
  minHeight = '200px',
  centered = true
}: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className={`${sizeMap[size]} animate-spin text-primary`} />
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  )

  if (centered) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight }}>
        {content}
      </div>
    )
  }

  return content
}
