export type MenuMode = 'image' | 'manual'
export type MealDay = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi'
export type MealLabel = 'bio' | 'local' | 'vegetarien' | 'fait-maison' | 'aop'

export const MENU_MODE_OPTIONS: { value: MenuMode; label: string; description: string }[] = [
  { value: 'image', label: 'Image / PDF', description: 'Uploadez une photo ou un PDF du menu' },
  { value: 'manual', label: 'Saisie manuelle', description: 'Saisissez les repas jour par jour' },
]

export const MEAL_DAY_OPTIONS: { value: MealDay; label: string }[] = [
  { value: 'lundi', label: 'Lundi' },
  { value: 'mardi', label: 'Mardi' },
  { value: 'mercredi', label: 'Mercredi' },
  { value: 'jeudi', label: 'Jeudi' },
  { value: 'vendredi', label: 'Vendredi' },
]

export const MEAL_LABEL_CONFIG: Record<MealLabel, { label: string; emoji: string; className: string }> = {
  bio: {
    label: 'Bio',
    emoji: '🌱',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  local: {
    label: 'Local',
    emoji: '📍',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  vegetarien: {
    label: 'Végétarien',
    emoji: '🥬',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  'fait-maison': {
    label: 'Fait maison',
    emoji: '👨‍🍳',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  aop: {
    label: 'AOP',
    emoji: '🏅',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
}

export const ALL_MEAL_LABELS: MealLabel[] = ['bio', 'local', 'vegetarien', 'fait-maison', 'aop']
