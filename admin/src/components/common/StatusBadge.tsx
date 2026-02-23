import { Badge } from '@/components/ui/badge'
import { CONTENT_STATUS_CONFIG } from '@/lib/constants/status-types'

interface StatusBadgeProps {
  status: 'draft' | 'published' | 'archived' | string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = CONTENT_STATUS_CONFIG[status as keyof typeof CONTENT_STATUS_CONFIG] || CONTENT_STATUS_CONFIG.default

  return (
    <Badge variant={config.variant} className={config.className}>
      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </Badge>
  )
}
