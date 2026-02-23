export const ARTICLE_CATEGORY_LABELS: Record<string, string> = {
  news: 'Actualité',
  event: 'Événement',
  information: 'Information',
  emergency: 'Urgence',
}

export const ARTICLE_CATEGORY_COLORS: Record<string, string> = {
  news: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  event: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  information: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  emergency: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export const ARTICLE_CATEGORY_OPTIONS = Object.entries(ARTICLE_CATEGORY_LABELS).map(
  ([value, label]) => ({ value, label })
)
