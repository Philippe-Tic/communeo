export const EVENT_CATEGORY_LABELS: Record<string, string> = {
  cultural: 'Culturel',
  sport: 'Sport',
  meeting: 'Réunion',
  celebration: 'Célébration',
  workshop: 'Atelier',
  conference: 'Conférence',
}

export const EVENT_CATEGORY_COLORS: Record<string, string> = {
  cultural: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  sport: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  meeting: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  celebration: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  workshop: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  conference: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
}

export const EVENT_CATEGORY_OPTIONS = Object.entries(EVENT_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
)
