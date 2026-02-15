import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: 'draft' | 'published' | 'archived' | string
}

const STATUS_CONFIG = {
  published: { variant: 'default' as const, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Publié' },
  draft: { variant: 'default' as const, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Brouillon' },
  archived: { variant: 'default' as const, className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Archivé' },
  default: { variant: 'secondary' as const, className: '', label: 'Inconnu' }
} as const

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
