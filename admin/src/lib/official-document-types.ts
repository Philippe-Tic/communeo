export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'pv-conseil-municipal': 'Procès-verbal de conseil municipal',
  'deliberation': 'Délibération',
  'arrete': 'Arrêté',
  'plu': 'PLU (Plan Local d\'Urbanisme)',
  'scot': 'SCoT (Schéma de Cohérence Territoriale)',
  'carte-communale': 'Carte communale',
  'budget-primitif': 'Budget primitif',
  'compte-administratif': 'Compte administratif',
  'rapport-orientations-budgetaires': 'Rapport d\'Orientations Budgétaires (ROB)',
  'autre': 'Autre',
}

export const DOCUMENT_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)

export const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  'pv-conseil-municipal': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'deliberation': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'arrete': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'plu': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'scot': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'carte-communale': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'budget-primitif': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'compte-administratif': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'rapport-orientations-budgetaires': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'autre': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}
