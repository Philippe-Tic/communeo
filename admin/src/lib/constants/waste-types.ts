export type WasteType = 'ordures-menageres' | 'tri-selectif' | 'verre' | 'dechets-verts' | 'encombrants'
export type CollectionDay = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche'
export type Frequency = 'hebdomadaire' | 'bimensuel' | 'mensuel'

export const WASTE_TYPE_CONFIG: Record<WasteType, { className: string; label: string }> = {
  'ordures-menageres': { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Ordures menageres' },
  'tri-selectif': { className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Tri selectif' },
  'verre': { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Verre' },
  'dechets-verts': { className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200', label: 'Dechets verts' },
  'encombrants': { className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', label: 'Encombrants' },
}

export const WASTE_TYPE_OPTIONS = Object.entries(WASTE_TYPE_CONFIG).map(
  ([value, { label }]) => ({ value, label })
)

export const COLLECTION_DAY_OPTIONS = [
  { value: 'lundi', label: 'Lundi' },
  { value: 'mardi', label: 'Mardi' },
  { value: 'mercredi', label: 'Mercredi' },
  { value: 'jeudi', label: 'Jeudi' },
  { value: 'vendredi', label: 'Vendredi' },
  { value: 'samedi', label: 'Samedi' },
  { value: 'dimanche', label: 'Dimanche' },
]

export const FREQUENCY_OPTIONS = [
  { value: 'hebdomadaire', label: 'Hebdomadaire' },
  { value: 'bimensuel', label: 'Bimensuel' },
  { value: 'mensuel', label: 'Mensuel' },
]
