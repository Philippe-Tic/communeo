import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState, LoadingSpinner } from '../components/common'
import { PageHeader } from '../components/layout'
import { StatsCard } from '../components/pages'
import { useCompliance } from '@/hooks/useCompliance'
import type { ComplianceItem, CompliancePriority, ComplianceStatus } from '@/lib/compliance'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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

function PriorityBadge({ priority }: { priority: CompliancePriority }) {
  switch (priority) {
    case 'obligatoire':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Obligatoire</Badge>
    case 'recommandé':
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Recommandé</Badge>
    case 'optionnel':
      return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400">Optionnel</Badge>
  }
}

function StatusBadge({ status }: { status: ComplianceStatus }) {
  switch (status) {
    case 'ok':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Conforme</Badge>
    case 'partial':
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Partiel</Badge>
    case 'missing':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Manquant</Badge>
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
              <PriorityBadge priority={item.priority} />
              <StatusBadge status={item.status} />
            </div>

            <p className="text-sm text-muted-foreground">{item.description}</p>

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

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {item.estimatedTime}
              </span>
              <span className="italic">{item.legalReference}</span>
              {item.helpUrl && (
                <a
                  href={item.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-brand-600 hover:underline dark:text-brand-400"
                >
                  En savoir plus
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
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
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

function CategoryProgress({ done, total }: { done: number; total: number }) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            percent === 100
              ? 'bg-green-500'
              : percent > 0
                ? 'bg-orange-500'
                : 'bg-red-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {done}/{total}
      </span>
    </div>
  )
}

export function Compliance() {
  const navigate = useNavigate()
  const {
    score,
    byCategory,
    nextAction,
    criticalMissing,
    populationUnknown,
    isLoading,
    error,
    refetch,
  } = useCompliance()

  if (isLoading) return <LoadingSpinner message="Chargement de la conformité..." />
  if (error) return <ErrorState onRetry={() => refetch()} />

  // Find the first incomplete category with critical items to auto-open
  const firstIncompleteCategory = byCategory.find(
    (cat) => cat.items.some((i) => i.status !== 'ok' && i.priority === 'obligatoire')
  )
  const defaultOpenCategory = firstIncompleteCategory?.key ?? byCategory[0]?.key

  const totalObligatoire = byCategory.flatMap((c) => c.items).filter((i) => i.priority === 'obligatoire').length
  const doneObligatoire = totalObligatoire - criticalMissing

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conformité légale"
        subtitle="Vérifiez que votre site respecte les obligations légales des collectivités"
      />

      {/* Stats cards — 3 columns */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <StatsCard
          label="Score global"
          value={`${score} %`}
          color={score === 100 ? 'green' : score >= 50 ? 'blue' : 'red'}
          icon={<ShieldCheck className="h-6 w-6" />}
        />
        <StatsCard
          label="Obligations critiques"
          value={`${doneObligatoire}/${totalObligatoire}`}
          color={criticalMissing === 0 ? 'green' : 'red'}
          icon={<ShieldAlert className="h-6 w-6" />}
        />
        {nextAction ? (
          <div className="glass-card flex flex-col justify-between rounded-xl p-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Prochaine action</p>
              <p className="font-semibold">{nextAction.label}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {nextAction.estimatedTime}
              </p>
            </div>
            {nextAction.fixUrl && (
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={() => navigate(nextAction.fixUrl!)}
              >
                Corriger
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : (
          <div className="glass-card flex items-center gap-4 rounded-xl p-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">Tout est conforme</p>
              <p className="text-sm text-muted-foreground">Votre site respecte toutes les obligations</p>
            </div>
          </div>
        )}
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

      {/* Accordion by category */}
      <Accordion
        type="single"
        collapsible
        defaultValue={defaultOpenCategory}
        className="rounded-lg border bg-card shadow-sm"
      >
        {byCategory.map((cat) => (
          <AccordionItem key={cat.key} value={cat.key} className="px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-1 items-center justify-between gap-4 pr-2">
                <span className="text-base font-semibold">{cat.label}</span>
                <CategoryProgress done={cat.doneCount} total={cat.totalCount} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col gap-3 pb-2">
                {cat.items.map((item) => (
                  <ComplianceCard key={item.id} item={item} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
