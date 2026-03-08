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
