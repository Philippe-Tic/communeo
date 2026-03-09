// Audiences
export type DilaAudience = 'particuliers' | 'professionnels'

// Métadonnées du cache
export interface CacheMetadata {
  downloadedAt: string // ISO 8601
  audience: DilaAudience
  fileCount: number
}

// Fiche parsée
export interface DilaFiche {
  id: string // "F1234", "N456", "R789"
  type: string // type Publication (ex: "Fiche d'information conditionnee")
  audience: DilaAudience
  title: string
  description: string
  dateModification: string
  theme: DilaRef | null
  sousTheme: DilaRef | null
  filDAriane: DilaRef[]
  dossierPere: DilaDossierPere | null
  avertissement: DilaContentNode | null
  introduction: DilaContentNode[]
  content: DilaContentNode[] // Arbre de contenu récursif
  references: DilaReferenceSection
}

// Noeud de contenu récursif (pattern unique pour tout l'arbre)
export interface DilaContentNode {
  type: string
  title?: string
  text?: string
  href?: string
  children?: DilaContentNode[]
  attributes?: Record<string, string>
}

// Sections de référence (bas de fiche)
export interface DilaReferenceSection {
  ouSAdresser: DilaServiceInfo[]
  servicesEnLigne: DilaServiceEnLigne[]
  references: DilaExternalRef[]
  voirAussi: DilaRef[]
  definitions: DilaDefinition[]
  questionsReponses: DilaRef[]
  pourEnSavoirPlus: DilaExternalRef[]
}

// Sous-types
export interface DilaRef {
  id: string
  title: string
}

export interface DilaDossierPere {
  id: string
  title: string
  sousDossiers: { id: string; title: string; fiches: DilaRef[] }[]
}

export interface DilaServiceInfo {
  id: string
  title: string
  type: string
  pivotLocal?: string
  url?: string
  texte?: DilaContentNode[]
}

export interface DilaServiceEnLigne {
  id: string
  title: string
  url: string
  type: string
  numeroCerfa?: string
}

export interface DilaExternalRef {
  id: string
  title: string
  url: string
  source?: string
}

export interface DilaDefinition {
  id: string
  term: string
  texte: DilaContentNode[]
}

// Navigation
export interface DilaMenuNode {
  id: string
  title: string
  type: 'theme' | 'sousTheme' | 'dossier'
  children: DilaMenuNode[]
}

// Retours des méthodes publiques
export interface FicheResult {
  fiche: DilaFiche
  cacheAge: number
  stale: boolean
}

export interface MenuResult {
  themes: DilaMenuNode[]
  audience: DilaAudience
  cacheAge: number
  stale: boolean
}

export interface CacheInfo {
  exists: boolean
  downloadedAt: string | null
  fileCount: number
  stale: boolean
  ageMs: number
}
