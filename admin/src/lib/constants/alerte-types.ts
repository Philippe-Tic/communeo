import type { AlerteSeverity } from '../../hooks/api/useAlertes'

export const ALERTE_SEVERITY_CONFIG: Record<AlerteSeverity, { className: string; label: string }> = {
  info: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Information' },
  warning: { className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', label: 'Avertissement' },
  critical: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Critique' },
}

export const ALERTE_SEVERITY_OPTIONS = Object.entries(ALERTE_SEVERITY_CONFIG).map(
  ([value, { label }]) => ({ value, label })
)
