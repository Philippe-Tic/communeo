export interface DilaMenuNode {
  id: string
  title: string
  type: 'theme' | 'sousTheme' | 'dossier'
  children: DilaMenuNode[]
}

export interface DilaFiche {
  id: string
  type: string
  audience: 'particuliers' | 'professionnels'
  title: string
  description: string
  dateModification: string
  theme: DilaRef | null
  sousTheme: DilaRef | null
  filDAriane: DilaRef[]
  dossierPere: DilaDossierPere | null
  avertissement: DilaContentNode | null
  introduction: DilaContentNode[]
  content: DilaContentNode[]
  references: DilaReferenceSection
}

export interface DilaContentNode {
  type: string
  title?: string
  text?: string
  href?: string
  children?: DilaContentNode[]
  attributes?: Record<string, string>
}

export interface DilaReferenceSection {
  ouSAdresser: DilaServiceInfo[]
  servicesEnLigne: DilaServiceEnLigne[]
  references: DilaExternalRef[]
  voirAussi: DilaRef[]
  definitions: DilaDefinition[]
  questionsReponses: DilaRef[]
  pourEnSavoirPlus: DilaExternalRef[]
}

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
