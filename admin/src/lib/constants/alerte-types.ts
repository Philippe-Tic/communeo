import type { AlerteSeverity, AlerteType } from '../../hooks/api/useAlertes'

export const ALERTE_SEVERITY_CONFIG: Record<AlerteSeverity, { className: string; label: string }> = {
  info: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Information' },
  warning: { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', label: 'Avertissement' },
  critical: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Critique' },
}

export const ALERTE_SEVERITY_OPTIONS = Object.entries(ALERTE_SEVERITY_CONFIG).map(
  ([value, { label }]) => ({ value, label })
)

export const ALERTE_TYPE_CONFIG: Record<AlerteType, { className: string; label: string; emoji: string }> = {
  'travaux': { className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200', label: 'Travaux', emoji: '🚧' },
  'coupure-eau': { className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200', label: 'Coupure d\'eau', emoji: '💧' },
  'coupure-electricite': { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Coupure d\'electricite', emoji: '⚡' },
  'deviation': { className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', label: 'Deviation', emoji: '↩️' },
  'intemperie': { className: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200', label: 'Intemperie', emoji: '🌧️' },
  'autre': { className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', label: 'Autre', emoji: '📋' },
}

export const ALERTE_TYPE_OPTIONS = Object.entries(ALERTE_TYPE_CONFIG).map(
  ([value, { label }]) => ({ value, label })
)
