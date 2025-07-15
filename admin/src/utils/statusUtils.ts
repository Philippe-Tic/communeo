export const STATUS_CONFIG = {
  published: { color: 'green', label: 'Publié' },
  draft: { color: 'yellow', label: 'Brouillon' },
  archived: { color: 'red', label: 'Archivé' },
  default: { color: 'gray', label: 'Inconnu' }
} as const

export type StatusType = keyof typeof STATUS_CONFIG | 'default'

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.default
}

export function getStatusColor(status: string): string {
  return getStatusConfig(status).color
}

export function getStatusLabel(status: string): string {
  return getStatusConfig(status).label
}
