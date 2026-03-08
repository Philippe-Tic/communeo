import type { NavigationItem, SectionKey } from '../hooks/api/useSites'

export interface SectionDefinition {
  key: SectionKey
  defaultLabel: string
  url: string
  icon: string // lucide icon name
}

export const PREDEFINED_SECTIONS: SectionDefinition[] = [
  { key: 'articles',     defaultLabel: 'Actualités',        url: '/actualites',        icon: 'newspaper' },
  { key: 'evenements',   defaultLabel: 'Événements',        url: '/evenements',        icon: 'calendar' },
  { key: 'documents',    defaultLabel: 'Documents',         url: '/documents',         icon: 'file-text' },
  { key: 'equipe',       defaultLabel: 'Équipe municipale', url: '/equipe-municipale', icon: 'users' },
  { key: 'associations', defaultLabel: 'Associations',      url: '/associations',      icon: 'heart-handshake' },
  { key: 'demarches',    defaultLabel: 'Démarches',         url: '/demarches',         icon: 'clipboard-list' },
  { key: 'open-data',    defaultLabel: 'Open Data',         url: '/open-data',         icon: 'database' },
  { key: 'collecte-dechets', defaultLabel: 'Collecte des déchets', url: '/collecte-dechets', icon: 'trash-2' },
  { key: 'perturbations',   defaultLabel: 'Perturbations',       url: '/perturbations',     icon: 'alert-triangle' },
  { key: 'cantine',         defaultLabel: 'Cantine scolaire',    url: '/cantine',           icon: 'utensils' },
]

export const getSectionDefinition = (key: SectionKey): SectionDefinition | undefined =>
  PREDEFINED_SECTIONS.find(s => s.key === key)

export const getDefaultNavigationConfig = (): NavigationItem[] =>
  PREDEFINED_SECTIONS.map(section => ({
    id: crypto.randomUUID(),
    type: 'section' as const,
    key: section.key,
    enabled: true,
  }))

/** Collect all section keys used across top-level + children */
export const getAllUsedSectionKeys = (items: NavigationItem[]): Set<SectionKey> => {
  const keys = new Set<SectionKey>()
  for (const item of items) {
    if (item.type === 'section' && item.key) keys.add(item.key)
    if (item.children) {
      for (const child of item.children) {
        if (child.type === 'section' && child.key) keys.add(child.key)
      }
    }
  }
  return keys
}

/** Collect all page documentIds used across top-level + children */
export const getAllUsedPageDocIds = (items: NavigationItem[]): Set<string> => {
  const ids = new Set<string>()
  for (const item of items) {
    if (item.type === 'page' && item.pageDocumentId) ids.add(item.pageDocumentId)
    if (item.children) {
      for (const child of item.children) {
        if (child.type === 'page' && child.pageDocumentId) ids.add(child.pageDocumentId)
      }
    }
  }
  return ids
}

/** Remove an item by id from top-level or from any parent's children */
export const removeItemById = (items: NavigationItem[], id: string): NavigationItem[] => {
  // Try top-level first
  const filtered = items.filter(item => item.id !== id)
  if (filtered.length < items.length) return filtered
  // Search in children
  return items.map(item => {
    if (!item.children) return item
    const filteredChildren = item.children.filter(c => c.id !== id)
    if (filteredChildren.length === item.children.length) return item
    return { ...item, children: filteredChildren.length > 0 ? filteredChildren : undefined }
  })
}

/** Factory to create a NavigationItem with defaults */
export const createNavigationItem = (overrides: Partial<NavigationItem> & Pick<NavigationItem, 'type'>): NavigationItem => ({
  id: crypto.randomUUID(),
  enabled: true,
  ...overrides,
})
