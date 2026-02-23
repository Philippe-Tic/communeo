import type { AssociationCategory, AssociationStatus } from '../../hooks/api/useAssociations'

export const ASSOCIATION_CATEGORY_LABELS: Record<AssociationCategory, string> = {
  sport: 'Sport',
  culture: 'Culture',
  social: 'Social',
  environnement: 'Environnement',
  education: 'Éducation',
  autre: 'Autre',
}

export const ASSOCIATION_CATEGORY_COLORS: Record<AssociationCategory, string> = {
  sport: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  culture: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  social: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  environnement: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  education: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  autre: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export const ASSOCIATION_STATUS_CONFIG: Record<AssociationStatus, { className: string; label: string }> = {
  pending: { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'En attente' },
  published: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Publiée' },
  rejected: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Rejetée' },
}

export const ASSOCIATION_CATEGORY_OPTIONS = Object.entries(ASSOCIATION_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
)

export const ASSOCIATION_STATUS_OPTIONS = Object.entries(ASSOCIATION_STATUS_CONFIG).map(
  ([value, { label }]) => ({ value, label })
)
