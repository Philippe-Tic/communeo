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
