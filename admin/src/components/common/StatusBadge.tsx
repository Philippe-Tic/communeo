import { Badge } from '@chakra-ui/react'

interface StatusBadgeProps {
  status: 'draft' | 'published' | 'archived' | string
  variant?: 'solid' | 'subtle' | 'outline'
}

const STATUS_CONFIG = {
  published: { color: 'green', label: 'Publié' },
  draft: { color: 'yellow', label: 'Brouillon' },
  archived: { color: 'red', label: 'Archivé' },
  default: { color: 'gray', label: 'Inconnu' }
} as const

export function StatusBadge({ status, variant = 'subtle' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default

  return (
    <Badge
      colorScheme={config.color}
      variant={variant}
      borderRadius="md"
      px={2}
      py={1}
    >
      {config.label}
    </Badge>
  )
}
