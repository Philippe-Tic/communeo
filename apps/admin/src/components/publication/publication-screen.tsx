/**
 * Mise en ligne (handoff 6.12, ticket #145) : une carte d'état qui dit en une phrase ce qui se passe,
 * avec le bouton correspondant (modifications en attente, en cours par étapes nommées, échec avec
 * référence, à jour) ; la liste de ce qui sera mis en ligne ; l'historique. Le domaine personnalisé
 * (administrateurs) est en dessous.
 */
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Check,
  CheckCircle2,
  Circle,
  CircleAlert,
  CloudUpload,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  EyeOff,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { HELP_URL } from '@/components/shell/header';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { formatListDate, relativeTime } from '@/lib/dates';
import { focusHeadingIfRequested } from '@/lib/focus';
import {
  deploymentHistoryQuery,
  HISTORY_SIZE,
  publicationQuery,
  usePublish,
  type Deployment,
  type PendingChange,
  type PublicationStatus,
} from '@/lib/publication';
import { sessionQuery } from '@/lib/session';
import { cn } from '@/lib/utils';
import { DomainSection } from './domain-section';

export const PUBLICATION_STEPS = [
  { id: 'checking', label: 'Vérification des contenus' },
  { id: 'rendering', label: 'Préparation des pages' },
  { id: 'publishing', label: 'Publication sur le site' },
  { id: 'cache', label: 'Vidage du cache' },
] as const;

/** « 24 s », « 2 min 10 s » */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const total = Math.max(0, Math.round(seconds));
  if (total < 60) return `${total} s`;
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

// Ce qui sera mis en ligne : « Page modifiée — Location de la salle des fêtes »
const NOUNS: Record<string, { label: string; feminine: boolean; path?: string }> = {
  page: { label: 'Page', feminine: true, path: '/pages' },
  article: { label: 'Actualité', feminine: true, path: '/actualites' },
  evenement: { label: 'Événement', feminine: false, path: '/agenda' },
  'official-document': { label: 'Document officiel', feminine: false, path: '/documents' },
  'team-member': { label: "Membre de l'équipe", feminine: false },
  association: { label: 'Association', feminine: true },
  alerte: { label: 'Alerte', feminine: true },
  'waste-schedule': { label: 'Collecte des déchets', feminine: true },
  'school-menu': { label: 'Menu de la cantine', feminine: false },
};
const ACTIONS: Record<string, { label: string; icon: LucideIcon }> = {
  create: { label: 'ajouté', icon: Plus },
  update: { label: 'modifié', icon: Pencil },
  publish: { label: 'publié', icon: Plus },
  unpublish: { label: 'dépublié', icon: EyeOff },
  delete: { label: 'supprimé', icon: Trash2 },
};

export function describeChange(change: PendingChange): { text: string; icon: LucideIcon; to?: string } {
  const action = ACTIONS[change.action] ?? ACTIONS.update!;
  const noun = NOUNS[change.type];
  if (!noun) return { text: change.type === 'site' ? 'Réglages du site modifiés' : change.title, icon: action.icon };
  const verb = `${action.label}${noun.feminine ? 'e' : ''}`;
  const to =
    noun.path && change.documentId && change.action !== 'delete' ? `${noun.path}/${change.documentId}` : undefined;
  return { text: `${noun.label} ${verb} — ${change.title}`, icon: action.icon, to };
}

function CardIcon({
  tone,
  icon: Icon,
  spin,
}: {
  tone: 'warning' | 'info' | 'danger' | 'success';
  icon: LucideIcon;
  spin?: boolean;
}) {
  const tones = {
    warning: 'bg-warning-bg text-warning',
    info: 'bg-info-bg text-info',
    danger: 'bg-danger-alert-bg text-danger',
    success: 'bg-success-bg text-success',
  };
  return (
    <span aria-hidden="true" className={cn('grid size-10 shrink-0 place-items-center rounded-full', tones[tone])}>
      <Icon className={cn('size-5', spin && 'animate-spin')} />
    </span>
  );
}

function StatusCard({
  status,
  onPublish,
  publishing,
}: {
  status: PublicationStatus;
  onPublish: () => void;
  publishing: boolean;
}) {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const last = status.lastDeployment;
  const liveUrl = user.site?.live_url;

  if (status.state === 'running') {
    const current = PUBLICATION_STEPS.findIndex((step) => step.id === status.step);
    return (
      <section aria-labelledby="etat-titre" className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
        <div className="flex gap-3">
          <CardIcon tone="info" icon={Loader2} spin />
          <div className="min-w-0 flex-1">
            <h2 id="etat-titre" className="text-base font-semibold">
              {status.step === 'queued' || current < 0 ? 'Mise en ligne demandée' : 'Mise en ligne en cours'}
            </h2>
            <p className="text-[13px] text-secondary">
              {last?.status === 'building'
                ? `Commencée ${relativeTime(new Date(last.triggeredAt), now)}`
                : 'Elle démarre dans quelques secondes.'}
            </p>
          </div>
        </div>
        <ol className="mt-4 space-y-1.5" aria-label="Étapes">
          {PUBLICATION_STEPS.map((step, index) => {
            const done = index < current;
            const active = index === current;
            return (
              <li
                key={step.id}
                className={cn(
                  'flex items-center gap-2 text-[13px]',
                  active ? 'font-semibold' : done ? 'text-text' : 'text-secondary',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {done ? (
                  <Check aria-hidden="true" className="size-4 text-success" />
                ) : active ? (
                  <Loader2 aria-hidden="true" className="size-4 animate-spin text-brand" />
                ) : (
                  <Circle aria-hidden="true" className="size-4" />
                )}
                {step.label}
                <span className="sr-only">{done ? ' : terminée' : active ? ' : en cours' : ' : à venir'}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[13px] text-secondary">
          Vous pouvez quitter cette page, l'opération continue. Le site reste accessible pendant ce temps.
        </p>
      </section>
    );
  }

  if (status.state === 'failed') {
    const at = last ? new Date(last.triggeredAt) : null;
    return (
      <section
        aria-labelledby="etat-titre"
        className="rounded-xl border-2 border-danger bg-surface p-5 dark:bg-sidebar"
      >
        <div className="flex gap-3">
          <CardIcon tone="danger" icon={CircleAlert} />
          <div className="min-w-0 flex-1">
            <h2 id="etat-titre" className="text-base font-semibold">
              La mise en ligne a échoué
            </h2>
            {at && (
              <p className="text-[13px] text-secondary">
                {lower(formatListDate(at, now))}
                {last?.buildTime != null && `, après ${formatDuration(last.buildTime)}`}
              </p>
            )}
            <p className="mt-2">
              <strong>Rien n'a été modifié sur votre site</strong> : la version précédente reste en ligne et vos
              modifications sont conservées.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="button" className="max-md:h-11" disabled={publishing} onClick={onPublish}>
                {publishing && <Loader2 aria-hidden="true" className="animate-spin" />}
                Réessayer
              </Button>
              <a
                href={HELP_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand underline underline-offset-2"
              >
                Contacter l'assistance<span className="sr-only"> (nouvel onglet)</span>
              </a>
            </div>
            {status.reference && (
              <p className="mt-3 text-[13px] text-secondary">
                Référence à communiquer : <span className="font-mono text-text">{status.reference}</span>
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (status.state === 'pending') {
    const count = status.pendingCount;
    return (
      <section
        aria-labelledby="etat-titre"
        className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-5 dark:bg-sidebar"
      >
        <CardIcon tone="warning" icon={CloudUpload} />
        <div className="min-w-0 flex-1">
          <h2 id="etat-titre" className="text-base font-semibold">
            {count > 1
              ? `${count} modifications attendent d'être mises en ligne`
              : count === 1
                ? "1 modification attend d'être mise en ligne"
                : 'Des modifications attendent d’être mises en ligne'}
          </h2>
          <p className="text-[13px] text-secondary">
            {status.scheduledAt
              ? `Mise en ligne automatique prévue ${lower(formatListDate(new Date(status.scheduledAt), now))}. `
              : ''}
            La mise en ligne prend environ 30 secondes. Le site reste accessible pendant l'opération.
          </p>
        </div>
        <Button type="button" className="max-md:h-11 max-md:w-full" disabled={publishing} onClick={onPublish}>
          {publishing && <Loader2 aria-hidden="true" className="animate-spin" />}
          Mettre en ligne maintenant
        </Button>
      </section>
    );
  }

  // À jour, ou jamais mis en ligne
  return (
    <section aria-labelledby="etat-titre" className="rounded-xl border border-border bg-surface p-5 dark:bg-sidebar">
      <div className="flex gap-3">
        <CardIcon tone="success" icon={CheckCircle2} />
        <div className="min-w-0 flex-1">
          <h2 id="etat-titre" className="text-base font-semibold">
            {last ? 'Votre site est à jour' : "Votre site n'a pas encore été mis en ligne"}
          </h2>
          {last?.completedAt ? (
            <p className="text-[13px] text-secondary">
              Dernière mise en ligne {relativeTime(new Date(last.completedAt), now)}
              {last.buildTime != null && `, en ${formatDuration(last.buildTime)}`}
            </p>
          ) : null}
          <p className="mt-2">
            {last
              ? "Tout ce que vous avez publié est visible en ligne. Il n'y a rien à faire."
              : 'Publiez vos premiers contenus, puis mettez le site en ligne.'}
          </p>
          {!last && (
            <Button type="button" className="mt-3 max-md:h-11" disabled={publishing} onClick={onPublish}>
              {publishing && <Loader2 aria-hidden="true" className="animate-spin" />}
              Mettre en ligne maintenant
            </Button>
          )}
          {last && liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-medium text-brand underline underline-offset-2"
            >
              Ouvrir {liveUrl.replace(/^https?:\/\//, '')}
              <ExternalLink aria-hidden="true" className="size-3.5" />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function announce(status: PublicationStatus): string {
  if (status.state === 'running')
    return `Mise en ligne en cours${PUBLICATION_STEPS.find((step) => step.id === status.step) ? ` : ${lower(PUBLICATION_STEPS.find((step) => step.id === status.step)!.label)}` : ''}.`;
  if (status.state === 'failed') return 'La mise en ligne a échoué.';
  if (status.state === 'ok') return 'Votre site est à jour.';
  return '';
}

function PendingList({ changes }: { changes: PendingChange[] }) {
  return (
    <section aria-labelledby="attente-titre" className="rounded-xl border border-border bg-surface dark:bg-sidebar">
      <h2 id="attente-titre" className="border-b border-border px-5 py-3 text-base font-semibold">
        Ce qui sera mis en ligne
      </h2>
      <ul className="grid gap-x-6 gap-y-2 px-5 py-4 md:grid-cols-2">
        {changes.map((change) => {
          const { text, icon: Icon, to } = describeChange(change);
          return (
            <li
              key={`${change.type}-${change.documentId}-${change.occurredAt}`}
              className="flex items-start gap-2 text-[13px]"
            >
              <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-secondary" />
              {to ? (
                <Link to={to} className="hover:underline">
                  {text}
                </Link>
              ) : (
                <span>{text}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const TRIGGERS: Record<string, string> = {
  scheduled: 'Publication programmée',
  content: 'Mise en ligne automatique',
  domain: 'Changement de domaine',
};

function History() {
  const { data, isError, refetch } = useQuery(deploymentHistoryQuery);
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <section aria-labelledby="historique-titre" className="rounded-xl border border-border bg-surface dark:bg-sidebar">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3">
        <h2 id="historique-titre" className="text-base font-semibold">
          Historique
        </h2>
        <p className="text-[13px] text-secondary">{HISTORY_SIZE} dernières mises en ligne</p>
      </div>
      {isError ? (
        <div role="alert" className="px-5 py-4">
          L'historique n'a pas pu être chargé.{' '}
          <Button type="button" variant="tertiary" size="sm" onClick={() => void refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !data ? (
        <p aria-busy="true" className="px-5 py-4 text-secondary">
          Chargement de l'historique…
        </p>
      ) : data.length === 0 ? (
        <p className="px-5 py-4 text-secondary">Aucune mise en ligne pour l'instant.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.06em] text-secondary uppercase">
                <th scope="col" className="py-2 pr-2 pl-4 font-semibold sm:px-5">
                  Date
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Déclenchée par
                </th>
                <th scope="col" className="px-3 py-2 font-semibold max-sm:hidden">
                  Durée
                </th>
                <th scope="col" className="py-2 pr-4 pl-2 font-semibold sm:px-5">
                  Résultat
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((deployment) => (
                <HistoryRow
                  key={deployment.documentId}
                  deployment={deployment}
                  opened={opened === deployment.documentId}
                  onToggle={() =>
                    setOpened((current) => (current === deployment.documentId ? null : deployment.documentId))
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function HistoryRow({
  deployment,
  opened,
  onToggle,
}: {
  deployment: Deployment;
  opened: boolean;
  onToggle: () => void;
}) {
  const by = [deployment.triggered_by?.first_name, deployment.triggered_by?.last_name].filter(Boolean).join(' ');
  const trigger = by || TRIGGERS[deployment.reason ?? ''] || 'Mise en ligne';
  const detailId = `detail-${deployment.documentId}`;
  return (
    <>
      <tr className="border-t border-border">
        <td className="py-2.5 pr-2 pl-4 sm:px-5 sm:whitespace-nowrap">
          {formatListDate(new Date(deployment.triggered_at))}
        </td>
        <td className="px-3 py-2.5">
          {trigger}
          {/* Mobile : la durée sous le déclencheur (colonne masquée) */}
          {deployment.status !== 'building' && (
            <span className="block text-secondary sm:hidden">{formatDuration(deployment.build_time)}</span>
          )}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap max-sm:hidden">
          {deployment.status === 'building' ? '—' : formatDuration(deployment.build_time)}
        </td>
        <td className="py-2.5 pr-4 pl-2 sm:px-5">
          <span className="flex flex-wrap items-center gap-2">
            {deployment.status === 'ready' && <StatusBadge tone="success">Réussie</StatusBadge>}
            {deployment.status === 'building' && <StatusBadge tone="info">En cours</StatusBadge>}
            {deployment.status === 'error' && (
              <>
                <StatusBadge tone="danger" icon={<CircleAlert aria-hidden="true" className="size-3" />}>
                  Échouée
                </StatusBadge>
                <button
                  type="button"
                  aria-expanded={opened}
                  aria-controls={detailId}
                  onClick={onToggle}
                  className="font-medium text-brand underline underline-offset-2"
                >
                  Détail
                  <span className="sr-only">
                    {' '}
                    de l'échec du {formatListDate(new Date(deployment.triggered_at)).toLowerCase()}
                  </span>
                </button>
              </>
            )}
          </span>
        </td>
      </tr>
      {deployment.status === 'error' && opened && (
        <tr id={detailId} className="bg-danger-alert-bg/40">
          <td colSpan={4} className="px-4 py-3 text-[13px] sm:px-5">
            <p>La mise en ligne n'a pas abouti ; la version précédente du site est restée en ligne.</p>
            {deployment.reference && (
              <p className="mt-1 text-secondary">
                Référence à communiquer à l'assistance :{' '}
                <span className="font-mono text-text">{deployment.reference}</span>
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function PublicationScreen() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const client = useQueryClient();
  const status = useQuery(publicationQuery);
  const publish = usePublish();
  // L'historique suit l'état : une mise en ligne qui démarre ou se termine y apparaît aussitôt
  const state = status.data?.state;
  useEffect(() => {
    if (state) void client.invalidateQueries({ queryKey: deploymentHistoryQuery.queryKey });
  }, [state, client]);
  const heading = useRef<HTMLHeadingElement>(null);
  const admin = user.municipality_role === 'admin' || user.municipality_role === 'super_admin';
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = 'Mise en ligne · Communeo';
  }, []);

  const start = () =>
    publish.mutate(undefined, {
      onError: (error) =>
        toast.error(
          `La mise en ligne n'a pas démarré : ${error instanceof ApiError ? error.message : 'erreur inattendue'}`,
        ),
    });

  return (
    <div className="mx-auto max-w-[960px] space-y-5">
      <div>
        <h1 ref={heading} className="outline-none">
          Mise en ligne
        </h1>
        <p className="mt-1 text-secondary">
          Vos modifications sont enregistrées dans l'administration. Elles apparaissent sur le site après une mise en
          ligne.
        </p>
      </div>

      {status.isError ? (
        <div role="alert" className="rounded-xl border border-danger bg-danger-alert-bg p-5">
          L'état de la mise en ligne n'a pas pu être chargé.{' '}
          <Button type="button" variant="secondary" size="sm" onClick={() => void status.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : !status.data ? (
        <div aria-busy="true" className="h-28 animate-pulse rounded-xl bg-neutral-bg" />
      ) : (
        <>
          {/* Annonce courte, qui ne change qu'avec l'état ou l'étape (la carte a une durée mise à jour chaque seconde) */}
          <p role="status" className="sr-only">
            {announce(status.data)}
          </p>
          <StatusCard status={status.data} onPublish={start} publishing={publish.isPending} />
          {status.data.state !== 'running' && !!status.data.pending?.length && (
            <PendingList changes={status.data.pending} />
          )}
        </>
      )}

      <History />

      {admin && <DomainSection />}
    </div>
  );
}
