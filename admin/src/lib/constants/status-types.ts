export const CONTENT_STATUS_CONFIG = {
  published: { variant: 'default' as const, className: 'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300', dotColor: 'bg-emerald-500', label: 'Publié' },
  draft: { variant: 'default' as const, className: 'bg-amber-100/80 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300', dotColor: 'bg-amber-500', label: 'Brouillon' },
  archived: { variant: 'default' as const, className: 'bg-red-100/80 text-red-700 dark:bg-red-900/50 dark:text-red-300', dotColor: 'bg-red-500', label: 'Archivé' },
  default: { variant: 'secondary' as const, className: '', dotColor: 'bg-gray-400', label: 'Inconnu' },
} as const

export const CONTENT_STATUS_OPTIONS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
  { value: 'archived', label: 'Archivé' },
]
