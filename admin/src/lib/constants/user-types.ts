export const USER_ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrateur',
  editor: 'Rédacteur',
}

export const USER_ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  editor: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

export const USER_ROLE_OPTIONS = Object.entries(USER_ROLE_LABELS).map(
  ([value, label]) => ({ value, label })
)
