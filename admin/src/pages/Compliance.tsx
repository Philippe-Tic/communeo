import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import { StatsCard } from '../components/pages'
import { useOfficialDocuments } from '@/hooks/api/useOfficialDocuments'
import { useSite } from '@/hooks/api/useSites'
import { useUserSite } from '@/hooks/useUser'
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Settings,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type ComplianceStatus = 'ok' | 'partial' | 'missing'

interface ComplianceDetail {
  label: string
  ok: boolean
}

interface ComplianceItem {
  id: string
  label: string
  status: ComplianceStatus
  legalReference: string
  fixUrl?: string
  details: ComplianceDetail[]
  conditional?: boolean
}

function getStatusIcon(status: ComplianceStatus) {
  switch (status) {
    case 'ok':
      return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
    case 'partial':
      return <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
    case 'missing':
      return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
  }
}

function getStatusBadge(status: ComplianceStatus) {
  switch (status) {
    case 'ok':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Conforme</Badge>
    case 'partial':
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Partiel</Badge>
    case 'missing':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Manquant</Badge>
  }
}

function getStatusBorderColor(status: ComplianceStatus) {
  switch (status) {
    case 'ok':
      return 'border-l-green-500'
    case 'partial':
      return 'border-l-orange-500'
    case 'missing':
      return 'border-l-red-500'
  }
}

function ComplianceCard({ item }: { item: ComplianceItem }) {
  const navigate = useNavigate()

  return (
    <div className={`rounded-lg border border-l-4 ${getStatusBorderColor(item.status)} bg-card p-5 shadow-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getStatusIcon(item.status)}</div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{item.label}</h3>
              {getStatusBadge(item.status)}
            </div>

            {item.details.length > 0 && (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {item.details.map((detail) => (
                  <li key={detail.label} className="flex items-center gap-1.5">
                    {detail.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    {detail.label}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs italic text-muted-foreground">
              {item.legalReference}
            </p>
          </div>
        </div>

        {item.status !== 'ok' && item.fixUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(item.fixUrl!)}
            className="shrink-0"
          >
            Corriger
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

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

export function Compliance() {
  const navigate = useNavigate()
  const { site: userSite } = useUserSite()
  const documentId = userSite?.documentId || ''

  const { data: site, isLoading: siteLoading, error: siteError, refetch: refetchSite } = useSite(documentId)

  // Official document queries — one per document type, pageSize: 1
  const pvQuery = useOfficialDocuments({ document_type: 'pv-conseil-municipal', status: 'published', pageSize: 1 })
  const deliberationQuery = useOfficialDocuments({ document_type: 'deliberation', status: 'published', pageSize: 1 })
  const pluQuery = useOfficialDocuments({ document_type: 'plu', status: 'published', pageSize: 1 })
  const scotQuery = useOfficialDocuments({ document_type: 'scot', status: 'published', pageSize: 1 })
  const carteQuery = useOfficialDocuments({ document_type: 'carte-communale', status: 'published', pageSize: 1 })
  const budgetPrimitifQuery = useOfficialDocuments({ document_type: 'budget-primitif', status: 'published', pageSize: 1 })
  const compteAdminQuery = useOfficialDocuments({ document_type: 'compte-administratif', status: 'published', pageSize: 1 })
  const robQuery = useOfficialDocuments({ document_type: 'rapport-orientations-budgetaires', status: 'published', pageSize: 1 })

  const isLoading = siteLoading ||
    pvQuery.isLoading || deliberationQuery.isLoading ||
    pluQuery.isLoading || scotQuery.isLoading || carteQuery.isLoading ||
    budgetPrimitifQuery.isLoading || compteAdminQuery.isLoading || robQuery.isLoading

  const hasError = siteError ||
    pvQuery.error || deliberationQuery.error ||
    pluQuery.error || scotQuery.error || carteQuery.error ||
    budgetPrimitifQuery.error || compteAdminQuery.error || robQuery.error

  if (isLoading) return <LoadingSpinner message="Chargement de la conformité..." />
  if (hasError || !site) return <ErrorState onRetry={() => refetchSite()} />

  const hasPv = (pvQuery.data?.meta?.pagination?.total ?? 0) > 0
  const hasDeliberation = (deliberationQuery.data?.meta?.pagination?.total ?? 0) > 0
  const hasUrbanisme =
    (pluQuery.data?.meta?.pagination?.total ?? 0) > 0 ||
    (scotQuery.data?.meta?.pagination?.total ?? 0) > 0 ||
    (carteQuery.data?.meta?.pagination?.total ?? 0) > 0
  const hasBudget =
    (budgetPrimitifQuery.data?.meta?.pagination?.total ?? 0) > 0 ||
    (compteAdminQuery.data?.meta?.pagination?.total ?? 0) > 0 ||
    (robQuery.data?.meta?.pagination?.total ?? 0) > 0

  const ml = site.mentions_legales
  const rgpd = site.rgpd
  const acc = site.accessibilite
  const population = site.infos_pratiques?.population

  // Build compliance items
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

  const allItems: ComplianceItem[] = [
    {
      id: 'mentions-legales',
      label: 'Mentions légales',
      status: computeStatus([siretOk, directorOk, hebergeurOk]),
      legalReference: 'Art. 6 LCEN (loi n\u00b02004-575)',
      fixUrl: '/site/legal',
      details: [
        { label: 'SIRET', ok: siretOk },
        { label: 'Directeur de publication', ok: directorOk },
        { label: 'Hébergeur', ok: hebergeurOk },
      ],
    },
    {
      id: 'rgpd',
      label: 'Politique RGPD',
      status: rgpdPolicyOk ? 'ok' : rgpdPolicyPartial ? 'partial' : 'missing',
      legalReference: 'RGPD art. 13-14, règlement UE 2016/679',
      fixUrl: '/site/rgpd',
      details: [
        { label: 'Politique de confidentialité (min. 50 caractères)', ok: rgpdPolicyOk },
      ],
    },
    {
      id: 'dpo',
      label: 'Délégué à la protection des données (DPO)',
      status: computeStatus([dpoNameOk, dpoEmailOk]),
      legalReference: 'RGPD art. 37-39',
      fixUrl: '/site/rgpd',
      details: [
        { label: 'Nom du DPO', ok: dpoNameOk },
        { label: 'Email du DPO', ok: dpoEmailOk },
      ],
    },
    {
      id: 'accessibilite',
      label: 'Accessibilité',
      status: computeStatus([accLevelOk, accDeclarationOk]),
      legalReference: 'Art. 47 loi n\u00b02005-102, RGAA',
      fixUrl: '/site/accessibility',
      details: [
        { label: "Niveau d'accessibilité", ok: accLevelOk },
        { label: "Déclaration d'accessibilité", ok: accDeclarationOk },
      ],
    },
    {
      id: 'cookies',
      label: 'Bandeau cookies',
      status: 'ok',
      legalReference: 'Directive ePrivacy, recommandations CNIL',
      details: [],
    },
    {
      id: 'https',
      label: 'HTTPS',
      status: 'ok',
      legalReference: 'RGS, recommandations ANSSI',
      details: [],
    },
    {
      id: 'contact',
      label: 'Contact / Saisine par voie électronique',
      status: contactOk ? 'ok' : 'missing',
      legalReference: 'Art. L112-2-1 CRPA',
      fixUrl: '/site/general',
      details: [
        { label: 'Email de contact', ok: contactOk },
      ],
    },
    {
      id: 'pv-conseil',
      label: 'Procès-verbaux du conseil municipal',
      status: hasPv ? 'ok' : 'missing',
      legalReference: 'Art. L2121-25 CGCT',
      fixUrl: '/documents/new',
      details: [],
    },
    {
      id: 'deliberations',
      label: 'Délibérations',
      status: hasDeliberation ? 'ok' : 'missing',
      legalReference: 'Art. L2121-24 CGCT',
      fixUrl: '/documents/new',
      details: [],
    },
    {
      id: 'urbanisme',
      label: 'Documents d\'urbanisme',
      status: hasUrbanisme ? 'ok' : 'missing',
      legalReference: 'Art. L153-1 Code de l\'urbanisme',
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
      legalReference: 'Art. L312-1-1 CRPA',
      fixUrl: '/documents',
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
      legalReference: 'Art. L2313-1 CGCT',
      fixUrl: '/documents/new',
      details: [],
      conditional: true,
    })
  }

  // Compute scores
  const okCount = allItems.filter((i) => i.status === 'ok').length
  const partialCount = allItems.filter((i) => i.status === 'partial').length
  const missingCount = allItems.filter((i) => i.status === 'missing').length
  const total = allItems.length
  const percentage = Math.round(((okCount + partialCount * 0.5) / total) * 100)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Conformité légale"
          subtitle="Vérifiez que votre site respecte les obligations légales des collectivités"
        />
        <Button onClick={() => navigate('/site/general')}>
          <Settings className="mr-1.5 h-4 w-4" />
          Configurer
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <StatsCard
          label="Score global"
          value={`${percentage} %`}
          color="blue"
          icon={<ShieldCheck className="h-6 w-6" />}
        />
        <StatsCard
          label="Conforme"
          value={okCount}
          color="green"
          icon={<CheckCircle2 className="h-6 w-6" />}
        />
        <StatsCard
          label="Partiel"
          value={partialCount}
          color="orange"
          icon={<AlertTriangle className="h-6 w-6" />}
        />
        <StatsCard
          label="Manquant"
          value={missingCount}
          color="red"
          icon={<XCircle className="h-6 w-6" />}
        />
      </div>

      {/* Population warning banner */}
      {populationUnknown && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/30">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400" />
          <div className="text-sm">
            <p className="font-medium text-orange-800 dark:text-orange-300">
              Population non renseignée
            </p>
            <p className="mt-1 text-orange-700 dark:text-orange-400">
              Certaines obligations dépendent de la population de votre commune (open data, budget).
              Renseignez-la dans les{' '}
              <Button
                variant="link"
                className="h-auto p-0 text-orange-700 underline dark:text-orange-400"
                onClick={() => navigate('/site/general')}
              >
                paramètres du site
              </Button>
              .
            </p>
          </div>
        </div>
      )}

      {/* Compliance cards */}
      <div className="flex flex-col gap-4">
        {allItems.map((item) => (
          <ComplianceCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
