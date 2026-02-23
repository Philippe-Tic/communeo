export const CONTACT_STATUS_CONFIG: Record<string, { className: string; label: string }> = {
  received: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Reçu' },
  in_progress: { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'En cours' },
  resolved: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Résolu' },
  closed: { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Fermé' },
}

export const CONTACT_CATEGORY_LABELS: Record<string, string> = {
  general: 'Général',
  urbanisme: 'Urbanisme',
  'etat-civil': 'État civil',
  voirie: 'Voirie',
  associations: 'Associations',
  rgpd: 'RGPD',
  autre: 'Autre',
}

export const CONTACT_STATUS_OPTIONS = Object.entries(CONTACT_STATUS_CONFIG).map(
  ([value, { label }]) => ({ value, label })
)

export const CONTACT_CATEGORY_OPTIONS = Object.entries(CONTACT_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
)
