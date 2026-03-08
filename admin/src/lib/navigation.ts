import type { NavigationItem, LinkKey } from '../hooks/api/useSites'

export interface LinkDefinition {
  key: LinkKey
  defaultLabel: string
  url: string
  icon: string // lucide icon name
}

export const PREDEFINED_LINKS: LinkDefinition[] = [
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

export const getLinkDefinition = (key: LinkKey): LinkDefinition | undefined =>
  PREDEFINED_LINKS.find(l => l.key === key)

export const getDefaultNavigationConfig = (): NavigationItem[] =>
  PREDEFINED_LINKS.map(link => ({
    id: crypto.randomUUID(),
    type: 'link' as const,
    linkKey: link.key,
    enabled: true,
  }))

/** Collect all link keys used across top-level + children */
export const getAllUsedLinkKeys = (items: NavigationItem[]): Set<LinkKey> => {
  const keys = new Set<LinkKey>()
  for (const item of items) {
    if (item.type === 'link' && item.linkKey) keys.add(item.linkKey)
    if (item.children) {
      for (const child of item.children) {
        if (child.type === 'link' && child.linkKey) keys.add(child.linkKey)
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
    return { ...item, children: filteredChildren }
  })
}
