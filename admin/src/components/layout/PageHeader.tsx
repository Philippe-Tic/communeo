import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface PageHeaderAction {
  label: string
  onClick: () => void
  variant?: 'solid' | 'outline' | 'ghost'
  colorScheme?: string
  loading?: boolean
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: PageHeaderAction[]
}

export function PageHeader({ title, subtitle, actions = [] }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={
                action.variant === 'outline' ? 'outline' :
                action.variant === 'ghost' ? 'ghost' : 'default'
              }
              onClick={action.onClick}
              disabled={action.loading}
              className={cn(
                action.colorScheme === 'red' && action.variant === 'outline' && 'border-destructive text-destructive hover:bg-destructive/10',
                action.colorScheme === 'red' && action.variant !== 'outline' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                action.colorScheme === 'orange' && 'border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950',
                action.colorScheme === 'gray' && action.variant === 'outline' && 'border-border text-muted-foreground'
              )}
            >
              {action.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
