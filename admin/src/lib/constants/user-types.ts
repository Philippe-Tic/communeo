export const USER_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  editor: 'Rédacteur',
}

export const USER_ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  editor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export const USER_ROLE_OPTIONS = Object.entries(USER_ROLE_LABELS).map(
  ([value, label]) => ({ value, label })
)
