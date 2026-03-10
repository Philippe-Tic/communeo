import type { Site } from '@/hooks/api/useSites'

// --- Types ---

export type CompliancePriority = 'obligatoire' | 'recommandé' | 'optionnel'
export type ComplianceCategory = 'legal' | 'data-protection' | 'accessibility' | 'transparency'
export type ComplianceStatus = 'ok' | 'partial' | 'missing'

export interface ComplianceItem {
  id: string
  label: string
  status: ComplianceStatus
  priority: CompliancePriority
  category: ComplianceCategory
  legalReference: string
  description: string
  estimatedTime: string
  fixUrl?: string
  helpUrl?: string
  details: { label: string; ok: boolean }[]
  conditional?: boolean
}

export interface ComplianceCategoryGroup {
  key: ComplianceCategory
  label: string
  items: ComplianceItem[]
  doneCount: number
  totalCount: number
}

export interface ComplianceResult {
  items: ComplianceItem[]
  score: number
  byCategory: ComplianceCategoryGroup[]
  nextAction: ComplianceItem | null
  criticalMissing: number
  populationUnknown: boolean
}

// --- Category labels ---

const CATEGORY_LABELS: Record<ComplianceCategory, string> = {
  legal: 'Obligations légales',
  'data-protection': 'Protection des données',
  accessibility: 'Accessibilité',
  transparency: 'Transparence',
}

const CATEGORY_ORDER: ComplianceCategory[] = ['legal', 'data-protection', 'accessibility', 'transparency']

// --- Helpers ---

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

function computeStatus(checks: boolean[]): ComplianceStatus {
  const ok = checks.filter(Boolean).length
  if (ok === checks.length) return 'ok'
  if (ok > 0) return 'partial'
  return 'missing'
}

// Priority order for sorting next actions
const PRIORITY_ORDER: Record<CompliancePriority, number> = {
  obligatoire: 0,
  'recommandé': 1,
  optionnel: 2,
}

// --- Document type counts ---

export type DocumentType =
  | 'pv-conseil-municipal'
  | 'deliberation'
  | 'plu'
  | 'scot'
  | 'carte-communale'
  | 'budget-primitif'
  | 'compte-administratif'
  | 'rapport-orientations-budgetaires'

export const ALL_DOCUMENT_TYPES: DocumentType[] = [
  'pv-conseil-municipal',
  'deliberation',
  'plu',
  'scot',
  'carte-communale',
  'budget-primitif',
  'compte-administratif',
  'rapport-orientations-budgetaires',
]

// --- Main compute function ---

export function computeComplianceItems(
  site: Site,
  documentCounts: Map<string, number>,
): ComplianceResult {
  const ml = site.mentions_legales
  const rgpd = site.rgpd
  const acc = site.accessibilite
  const population = site.infos_pratiques?.population

  // Site config checks
  const siretOk = isFilled(ml?.siret)
  const directorOk = isFilled(ml?.publication_director)
  const hebergeurOk = isFilled(ml?.hebergeur_name)

  const rgpdPolicyOk = typeof rgpd?.rgpd_policy === 'string' && rgpd.rgpd_policy.trim().length >= 50
  const rgpdPolicyPartial = typeof rgpd?.rgpd_policy === 'string' && rgpd.rgpd_policy.trim().length > 0 && rgpd.rgpd_policy.trim().length < 50

  const dpoNameOk = isFilled(rgpd?.dpo_name)
  const dpoEmailOk = isFilled(rgpd?.dpo_email)

  const accLevelOk = isFilled(acc?.accessibility_level)
  const accDeclarationOk = isFilled(acc?.accessibility_declaration)

  const contactOk = isFilled(site.contact_mail)

  // Document checks
  const hasPv = (documentCounts.get('pv-conseil-municipal') ?? 0) > 0
  const hasDeliberation = (documentCounts.get('deliberation') ?? 0) > 0
  const hasUrbanisme =
    (documentCounts.get('plu') ?? 0) > 0 ||
    (documentCounts.get('scot') ?? 0) > 0 ||
    (documentCounts.get('carte-communale') ?? 0) > 0
  const hasBudget =
    (documentCounts.get('budget-primitif') ?? 0) > 0 ||
    (documentCounts.get('compte-administratif') ?? 0) > 0 ||
    (documentCounts.get('rapport-orientations-budgetaires') ?? 0) > 0

  const allItems: ComplianceItem[] = [
    {
      id: 'mentions-legales',
      label: 'Mentions légales',
      status: computeStatus([siretOk, directorOk, hebergeurOk]),
      priority: 'obligatoire',
      category: 'legal',
      legalReference: 'Art. 6 LCEN (loi n°2004-575)',
      description: 'Identifie le responsable du site. Sans ces informations, le site est en infraction.',
      estimatedTime: '~5 min',
      fixUrl: '/site/legal',
      helpUrl: 'https://www.service-public.fr/professionnels-entreprises/vosdroits/F31228',
      details: [
        { label: 'SIRET', ok: siretOk },
        { label: 'Directeur de publication', ok: directorOk },
        { label: 'Hébergeur', ok: hebergeurOk },
      ],
    },
    {
      id: 'contact',
      label: 'Contact / Saisine par voie électronique',
      status: contactOk ? 'ok' : 'missing',
      priority: 'obligatoire',
      category: 'legal',
      legalReference: 'Art. L112-2-1 CRPA',
      description: 'Les usagers doivent pouvoir contacter la mairie par voie électronique.',
      estimatedTime: '~5 min',
      fixUrl: '/site/general',
      details: [
        { label: 'Email de contact', ok: contactOk },
      ],
    },
    {
      id: 'rgpd',
      label: 'Politique RGPD',
      status: rgpdPolicyOk ? 'ok' : rgpdPolicyPartial ? 'partial' : 'missing',
      priority: 'obligatoire',
      category: 'data-protection',
      legalReference: 'RGPD art. 13-14, règlement UE 2016/679',
      description: 'Informe les visiteurs sur l\'utilisation de leurs données personnelles.',
      estimatedTime: '~15 min',
      fixUrl: '/site/rgpd',
      helpUrl: 'https://www.cnil.fr/fr/rgpd-de-quoi-parle-t-on',
      details: [
        { label: 'Politique de confidentialité (min. 50 caractères)', ok: rgpdPolicyOk },
      ],
    },
    {
      id: 'dpo',
      label: 'Délégué à la protection des données (DPO)',
      status: computeStatus([dpoNameOk, dpoEmailOk]),
      priority: 'obligatoire',
      category: 'data-protection',
      legalReference: 'RGPD art. 37-39',
      description: 'Toute collectivité doit désigner un DPO pour garantir la conformité RGPD.',
      estimatedTime: '~5 min',
      fixUrl: '/site/rgpd',
      helpUrl: 'https://www.cnil.fr/fr/designation-dpo',
      details: [
        { label: 'Nom du DPO', ok: dpoNameOk },
        { label: 'Email du DPO', ok: dpoEmailOk },
      ],
    },
    {
      id: 'accessibilite',
      label: 'Accessibilité',
      status: computeStatus([accLevelOk, accDeclarationOk]),
      priority: 'obligatoire',
      category: 'accessibility',
      legalReference: 'Art. 47 loi n°2005-102, RGAA',
      description: 'Le site doit déclarer son niveau d\'accessibilité et publier une déclaration.',
      estimatedTime: '~15 min',
      fixUrl: '/site/accessibility',
      helpUrl: 'https://accessibilite.numerique.gouv.fr/',
      details: [
        { label: "Niveau d'accessibilité", ok: accLevelOk },
        { label: "Déclaration d'accessibilité", ok: accDeclarationOk },
      ],
    },
    {
      id: 'pv-conseil',
      label: 'Procès-verbaux du conseil municipal',
      status: hasPv ? 'ok' : 'missing',
      priority: 'obligatoire',
      category: 'transparency',
      legalReference: 'Art. L2121-25 CGCT',
      description: 'Les PV des séances du conseil doivent être rendus publics.',
      estimatedTime: '~15 min',
      fixUrl: '/documents/new',
      details: [],
    },
    {
      id: 'deliberations',
      label: 'Délibérations',
      status: hasDeliberation ? 'ok' : 'missing',
      priority: 'obligatoire',
      category: 'transparency',
      legalReference: 'Art. L2121-24 CGCT',
      description: 'Les délibérations du conseil municipal doivent être publiées.',
      estimatedTime: '~15 min',
      fixUrl: '/documents/new',
      details: [],
    },
    {
      id: 'urbanisme',
      label: 'Documents d\'urbanisme',
      status: hasUrbanisme ? 'ok' : 'missing',
      priority: 'recommandé',
      category: 'transparency',
      legalReference: 'Art. L153-1 Code de l\'urbanisme',
      description: 'PLU, SCoT ou carte communale doivent être consultables en ligne.',
      estimatedTime: '~15 min',
      fixUrl: '/documents/new',
      details: [],
    },
  ]

  // Conditional items (population > 3500)
  const showConditional = typeof population === 'number' && population > 3500
  const populationUnknown = population === null || population === undefined

  if (showConditional) {
    const openDataChecks = [hasDeliberation, hasPv, hasBudget]
    const openDataOkCount = openDataChecks.filter(Boolean).length

    allItems.push({
      id: 'open-data',
      label: 'Open data (communes > 3 500 hab.)',
      status: openDataOkCount === openDataChecks.length ? 'ok' : openDataOkCount > 0 ? 'partial' : 'missing',
      priority: 'obligatoire',
      category: 'transparency',
      legalReference: 'Art. L312-1-1 CRPA',
      description: 'Les communes de plus de 3 500 habitants doivent publier leurs données en open data.',
      estimatedTime: '~15 min',
      fixUrl: '/documents',
      helpUrl: 'https://www.data.gouv.fr/fr/pages/legal/open-data-obligations/',
      details: [
        { label: 'Délibérations publiées', ok: hasDeliberation },
        { label: 'PV du conseil publiés', ok: hasPv },
        { label: 'Documents budgétaires publiés', ok: hasBudget },
      ],
      conditional: true,
    })

    allItems.push({
      id: 'budget',
      label: 'Budget (communes > 3 500 hab.)',
      status: hasBudget ? 'ok' : 'missing',
      priority: 'obligatoire',
      category: 'transparency',
      legalReference: 'Art. L2313-1 CGCT',
      description: 'Les documents budgétaires doivent être mis à disposition du public.',
      estimatedTime: '~15 min',
      fixUrl: '/documents/new',
      details: [],
      conditional: true,
    })
  }

  // Score
  const okCount = allItems.filter((i) => i.status === 'ok').length
  const partialCount = allItems.filter((i) => i.status === 'partial').length
  const total = allItems.length
  const score = Math.round(((okCount + partialCount * 0.5) / total) * 100)

  // Group by category
  const byCategory: ComplianceCategoryGroup[] = CATEGORY_ORDER
    .map((key) => {
      const items = allItems.filter((i) => i.category === key)
      if (items.length === 0) return null
      return {
        key,
        label: CATEGORY_LABELS[key],
        items,
        doneCount: items.filter((i) => i.status === 'ok').length,
        totalCount: items.length,
      }
    })
    .filter((g): g is ComplianceCategoryGroup => g !== null)

  // Next action: first non-ok item, sorted by priority
  const incomplete = allItems
    .filter((i) => i.status !== 'ok')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
  const nextAction = incomplete[0] ?? null

  // Critical missing: count of 'obligatoire' items that are not 'ok'
  const criticalMissing = allItems.filter((i) => i.priority === 'obligatoire' && i.status !== 'ok').length

  return {
    items: allItems,
    score,
    byCategory,
    nextAction,
    criticalMissing,
    populationUnknown,
  }
}
