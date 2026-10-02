/**
 * Tableau de bord (handoff 6.6, variante 1f « une action à la fois ») : la prochaine action de
 * conformité en tête, trois raccourcis, les messages non lus ; à droite la mise en ligne, les
 * prochains événements, les derniers contenus modifiés et le score de conformité.
 * Après l'assistant de création, la checklist « Pour terminer votre site » (variante 1g) prend la
 * place de la prochaine action tant qu'elle n'est ni faite ni masquée.
 * Quand une alerte est en cours, le bandeau de tuiles de la variante 1g (alerte, mise en ligne,
 * conformité) passe en tête. Mobile : raccourcis d'abord (« Publier une alerte » en premier), puis
 * messages, puis action recommandée et mise en ligne en cartes courtes.
 */
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  CalendarPlus,
  ChevronRight,
  CloudUpload,
  ExternalLink,
  ListChecks,
  Newspaper,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { ALERT_SEVERITY_LABELS, COMPLIANCE_LEVEL_LABELS, rgpdDeadline, type ComplianceReport } from '@communeo/core';
import { ComplianceGauge } from '@/components/compliance/compliance-gauge';
import { PageHeader } from '@/components/page-header';
import { StatusBadge, type Tone } from '@/components/ui/status-badge';
import { alertState, alertsQuery, type Alert } from '@/lib/alerts';
import { complianceQuery, remainingText } from '@/lib/compliance';
import { checklistQuery, ONBOARDING_STEPS, onboardingPending, TOTAL_STEPS } from '@/lib/onboarding';
import { publicationStatesQuery } from '@/lib/content-list';
import { CONTENT_LABELS, recentContentsQuery, upcomingEventsQuery } from '@/lib/dashboard';
import { formatDayTime, formatListDate, formatShortParisDateTime, relativeTime } from '@/lib/dates';
import { isOpenRgpd } from '@/components/messages/messages-screen';
import { inboxQuery, MESSAGE_CATEGORIES, type MessageSummary } from '@/lib/messages';
import { publicationQuery, type PublicationStatus } from '@/lib/publication';
import { sessionQuery } from '@/lib/session';
import { isReadOnly } from '@/lib/trial';
import { cn } from '@/lib/utils';
import { Checklist } from './checklist';

const ZONE = 'Europe/Paris';
const today = () =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: ZONE, weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(),
  );
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;
/** « il y a 2 h » dans la journée, sinon « hier, 17:40 » */
const since = (date: Date) =>
  Date.now() - date.getTime() < 12 * 3600_000 ? relativeTime(date) : formatListDate(date).toLowerCase();
/** Fin d'une alerte : « aujourd'hui à 18:45 », « demain à 12:00 », sinon « 12 octobre à 12:00 » */
function endText(date: Date, now = new Date()) {
  const day = (value: Date) => new Intl.DateTimeFormat('fr-CA', { timeZone: ZONE }).format(value);
  const time = formatDayTime(date, now).split(' à ')[1];
  if (day(date) === day(now)) return `aujourd'hui à ${time}`;
  if (day(date) === day(new Date(now.getTime() + 86_400_000))) return `demain à ${time}`;
  return `le ${formatDayTime(date, now)}`;
}
const deadlineText = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: ZONE, day: 'numeric', month: 'short' }).format(date);

function Card({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={cn('rounded-xl border border-border bg-surface dark:bg-sidebar', className)}
    >
      {title && (
        <div className="flex items-center justify-between gap-2 px-5 pt-4">
          <h2 id={headingId} className="text-[17px] font-semibold">
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const cardLink = 'text-[13px] font-medium text-brand underline underline-offset-2 hover:text-brand-hover';

// --- Prochaine action ------------------------------------------------------------------------------

function NextAction({ report, canAdmin, compact }: { report: ComplianceReport; canAdmin: boolean; compact?: boolean }) {
  const next = report.next;
  if (!next) return null;
  const reachable = next.target && !(next.target.adminOnly && !canAdmin);
  const target = reachable ? next.target! : null;
  if (compact)
    return (
      <Card className="relative">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <ListChecks aria-hidden="true" className="size-5 shrink-0 text-secondary" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {target ? (
                <Link
                  to={target.to as '/'}
                  search={target.search as never}
                  className="after:absolute after:inset-0 after:rounded-xl"
                >
                  {next.todo}
                </Link>
              ) : (
                next.todo
              )}
            </p>
            <p className="text-[13px] text-secondary">
              Prochaine action{!reachable && next.target ? ' · par un administrateur' : ''}
            </p>
          </div>
          {target && <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-secondary" />}
        </div>
      </Card>
    );
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4 p-5">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-neutral-bg text-text"
        >
          <ListChecks className="size-5" />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="text-[11px] font-semibold tracking-[0.06em] text-secondary uppercase">
            Prochaine action recommandée
          </h2>
          <p className="mt-0.5 text-[18px] font-semibold">{next.todo}</p>
          <p className="mt-1 text-secondary">{next.why}</p>
        </div>
        {target ? (
          <Link
            to={target.to as '/'}
            search={target.search as never}
            className="inline-flex h-10 items-center rounded-lg bg-brand-button px-4 font-semibold text-on-brand hover:bg-brand-hover"
          >
            Compléter
            <span className="sr-only"> : {next.todo}</span>
          </Link>
        ) : (
          next.target && <p className="text-[13px] text-secondary">À faire par un administrateur</p>
        )}
      </div>
    </Card>
  );
}

// --- Raccourcis ------------------------------------------------------------------------------------

function Shortcut({
  to,
  icon: Icon,
  label,
  note,
  warning,
  className,
}: {
  to: '/actualites/$documentId' | '/agenda/$documentId' | '/alertes/$documentId';
  icon: LucideIcon;
  label: string;
  note?: string;
  warning?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      params={{ documentId: 'nouvelle' }}
      className={cn(
        'flex min-h-14 items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 hover:bg-surface-hover dark:bg-sidebar',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-lg',
          warning ? 'bg-warning-bg text-warning' : 'bg-neutral-bg text-text',
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {note && <span className="block text-[12px] text-warning">{note}</span>}
      </span>
    </Link>
  );
}

// --- Messages --------------------------------------------------------------------------------------

function MessageRow({ message }: { message: MessageSummary }) {
  const rgpd = isOpenRgpd(message);
  const name = [message.first_name, message.last_name].filter(Boolean).join(' ');
  return (
    <li className={cn('relative flex items-start gap-3 px-5 py-3', rgpd && 'bg-danger-bg/60')}>
      <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-brand" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
          <span className="font-semibold text-text">{name}</span>
          {rgpd ? (
            <span className="rounded-full bg-danger-bg px-2 py-px text-[12px] font-semibold text-danger">
              RGPD · répondre avant le {deadlineText(rgpdDeadline(message.createdAt))}
            </span>
          ) : (
            <span className="text-secondary">{MESSAGE_CATEGORIES[message.category]}</span>
          )}
        </p>
        <Link
          to="/messages"
          search={{ id: message.documentId }}
          className="block truncate font-semibold after:absolute after:inset-0 hover:underline"
        >
          {message.subject}
        </Link>
      </div>
      <span className="shrink-0 text-[13px] text-secondary max-sm:hidden">
        {message.reference_number} · {since(new Date(message.createdAt))}
      </span>
    </li>
  );
}

function Messages() {
  const inbox = useQuery(inboxQuery({ q: '', nonLus: true, page: 1 }));
  const total = inbox.data?.total;
  return (
    <Card
      title={<>Messages non lus{total !== undefined && <span className="font-normal text-secondary"> {total}</span>}</>}
      action={
        <Link to="/messages" search={{ nonLus: true }} className={cardLink}>
          Tous les messages
        </Link>
      }
    >
      {!inbox.data ? (
        <div aria-busy="true" className="m-5 h-24 animate-pulse rounded-lg bg-neutral-bg" />
      ) : inbox.data.rows.length === 0 ? (
        <p className="px-5 pt-2 pb-5 text-secondary">Aucun message non lu.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {inbox.data.rows.slice(0, 3).map((message) => (
            <MessageRow key={message.documentId} message={message} />
          ))}
        </ul>
      )}
    </Card>
  );
}

// --- Colonne de droite -------------------------------------------------------------------------------

const PUBLICATION_BADGE: Record<PublicationStatus['state'], { tone: Tone; label: string }> = {
  ok: { tone: 'success', label: 'Site à jour' },
  idle: { tone: 'neutral', label: 'Pas encore en ligne' },
  pending: { tone: 'warning', label: 'Modifications en attente' },
  running: { tone: 'info', label: 'Mise en ligne en cours' },
  failed: { tone: 'danger', label: 'Échec' },
};

/** Essai terminé : le site est retiré, quel que soit l'état de la dernière mise en ligne */
function usePublicationBadge(state: PublicationStatus['state'] | undefined) {
  const { data: user } = useQuery(sessionQuery);
  if (isReadOnly(user?.site)) return { tone: 'danger' as Tone, label: 'Site retiré : essai terminé' };
  return state ? PUBLICATION_BADGE[state] : null;
}

function lastPublicationText(status: PublicationStatus) {
  const last = status.lastDeployment;
  if (!last) return "Le site n'a pas encore été mis en ligne.";
  const who = last.triggeredBy && [last.triggeredBy.firstName, last.triggeredBy.lastName].filter(Boolean).join(' ');
  const when = since(new Date(last.completedAt ?? last.triggeredAt));
  if (last.status === 'error') return `Dernière mise en ligne ${when}${who ? ` par ${who}` : ''} : échec.`;
  if (last.status === 'building') return `Mise en ligne lancée ${when}${who ? ` par ${who}` : ''}.`;
  return `Dernière mise en ligne ${when}${who ? ` par ${who}` : ''}, réussie${last.buildTime ? ` en ${plural(last.buildTime, 'seconde', 'secondes')}` : ''}.`;
}

function Publication({ siteUrl, compact }: { siteUrl: string | null; compact?: boolean }) {
  const { data } = useQuery(publicationQuery);
  const badge = usePublicationBadge(data?.state);
  if (!data || !badge) return null;
  const link = siteUrl && (
    <a href={siteUrl} target="_blank" rel="noreferrer" className={cn(cardLink, 'inline-flex items-center gap-1')}>
      {compact ? 'Voir le site' : siteUrl.replace(/^https?:\/\//, '')}
      <ExternalLink aria-hidden="true" className="size-3.5" />
      <span className="sr-only">(nouvel onglet)</span>
    </a>
  );
  if (compact)
    return (
      <Card>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{badge.label}</p>
            <p className="text-[13px] text-secondary">
              {data.lastDeployment
                ? `Mise en ligne ${since(new Date(data.lastDeployment.triggeredAt))}`
                : 'Jamais mis en ligne'}
            </p>
          </div>
          {link}
        </div>
      </Card>
    );
  return (
    <Card title="Mise en ligne" action={<StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}>
      <div className="space-y-2 px-5 pt-2 pb-4">
        <p className="text-secondary">{lastPublicationText(data)}</p>
        {link}
      </div>
    </Card>
  );
}

function Events() {
  const events = useQuery(upcomingEventsQuery);
  const states = useQuery(publicationStatesQuery('evenements'));
  const day = (date: Date, part: 'day' | 'month') =>
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: ZONE,
      ...(part === 'day' ? { day: 'numeric' } : { month: 'short' }),
    }).format(date);
  return (
    <Card
      title="Prochains événements"
      action={
        <Link to="/agenda" className={cardLink}>
          Agenda
        </Link>
      }
    >
      {!events.data ? (
        <div aria-busy="true" className="m-5 h-20 animate-pulse rounded-lg bg-neutral-bg" />
      ) : events.data.length === 0 ? (
        <p className="px-5 pt-2 pb-4 text-secondary">Aucun événement à venir.</p>
      ) : (
        <ul className="space-y-1 px-5 pt-2 pb-4">
          {events.data.map((event) => {
            const start = new Date(event.start_date);
            const draft = states.data?.[event.documentId]?.state === 'draft';
            return (
              <li key={event.documentId} className="relative flex items-center gap-3 py-1">
                <span className="min-w-9 shrink-0 text-center leading-none">
                  <span className="block text-[17px] font-semibold">{day(start, 'day')}</span>
                  <span className="block text-[11px] text-secondary">
                    {day(start, 'month')}
                    {start.getFullYear() !== new Date().getFullYear() && ` ${start.getFullYear()}`}
                  </span>
                  <span className="sr-only">, {formatShortParisDateTime(start)}</span>
                </span>
                <Link
                  to="/agenda/$documentId"
                  params={{ documentId: event.documentId }}
                  className="min-w-0 flex-1 after:absolute after:inset-0 hover:underline"
                >
                  {event.title}
                </Link>
                {draft && <StatusBadge tone="neutral">Brouillon</StatusBadge>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function RecentContents() {
  const recent = useQuery(recentContentsQuery);
  return (
    <Card title="Derniers contenus modifiés">
      {!recent.data ? (
        <div aria-busy="true" className="m-5 h-20 animate-pulse rounded-lg bg-neutral-bg" />
      ) : recent.data.length === 0 ? (
        <p className="px-5 pt-2 pb-4 text-secondary">Aucun contenu pour l'instant.</p>
      ) : (
        <ul className="space-y-2.5 px-5 pt-2 pb-4">
          {recent.data.map((content) => (
            <li key={`${content.type}-${content.documentId}`} className="relative">
              <Link
                to={CONTENT_LABELS[content.type].to as '/pages/$documentId'}
                params={{ documentId: content.documentId }}
                className="block font-medium after:absolute after:inset-0 hover:underline"
              >
                {content.title || 'Sans titre'}
              </Link>
              <p className="text-[12px] text-secondary">
                {CONTENT_LABELS[content.type].label} · {formatListDate(new Date(content.updatedAt)).toLowerCase()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Compliance({ report }: { report: ComplianceReport | undefined }) {
  if (!report) return null;
  return (
    <Card>
      <div className="flex items-center gap-4 p-5">
        <ComplianceGauge score={report.score} size={64} inner="bg-surface dark:bg-sidebar" />
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold">Conformité</h2>
          <p className="text-secondary">
            {capitalize(COMPLIANCE_LEVEL_LABELS[report.level])}
            {report.done < report.total && ` · ${remainingText(report)}`}
          </p>
          <Link to="/conformite" className={cardLink}>
            Voir la checklist
          </Link>
        </div>
      </div>
    </Card>
  );
}

// --- Bandeau de tuiles (alerte en cours) ------------------------------------------------------------

function Tile({
  icon,
  eyebrow,
  children,
  tone,
}: {
  icon: ReactNode;
  eyebrow: string;
  children: ReactNode;
  tone?: 'warning';
}) {
  return (
    <section
      aria-label={eyebrow}
      className={cn(
        'flex gap-3 rounded-xl border p-4',
        tone === 'warning' ? 'border-warning bg-warning-bg' : 'border-border bg-surface dark:bg-sidebar',
      )}
    >
      {icon}
      <div className="min-w-0 text-[13px]">
        <h2
          className={cn(
            'text-[11px] font-semibold tracking-[0.06em] uppercase',
            tone === 'warning' ? 'text-warning' : 'text-secondary',
          )}
        >
          {eyebrow}
        </h2>
        {children}
      </div>
    </section>
  );
}

function Tiles({ alert, report }: { alert: Alert; report: ComplianceReport | undefined }) {
  const { data: publication } = useQuery(publicationQuery);
  const badge = usePublicationBadge(publication?.state);
  const last = publication?.lastDeployment;
  const who = last?.triggeredBy && [last.triggeredBy.firstName, last.triggeredBy.lastName].filter(Boolean).join(' ');
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Tile
        tone="warning"
        eyebrow={`Alerte en cours · ${ALERT_SEVERITY_LABELS[alert.severity]}`}
        icon={<TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-warning" />}
      >
        <p className="text-[15px] font-semibold text-text">{alert.title}</p>
        <p className="text-secondary">
          {alert.display_until ? `Se termine ${endText(new Date(alert.display_until))}` : 'Sans date de fin'}
        </p>
        <Link to="/alertes/$documentId" params={{ documentId: alert.documentId }} className={cn(cardLink, 'text-text')}>
          Modifier ou terminer
        </Link>
      </Tile>
      <Tile
        eyebrow="Mise en ligne"
        icon={<CloudUpload aria-hidden="true" className="size-5 shrink-0 text-secondary" />}
      >
        <p className="text-[15px] font-semibold">{badge?.label ?? '…'}</p>
        {last && (
          <p className="text-secondary">
            {capitalize(since(new Date(last.triggeredAt)))}
            {last.buildTime ? ` · ${last.buildTime} s` : ''}
            {who ? ` · ${who}` : ''}
          </p>
        )}
        <Link to="/mise-en-ligne" className={cardLink}>
          Historique
        </Link>
      </Tile>
      {report && (
        <Tile
          eyebrow="Conformité"
          icon={<ComplianceGauge score={report.score} size={56} inner="bg-surface dark:bg-sidebar" />}
        >
          <p className="text-[15px] font-semibold">{capitalize(COMPLIANCE_LEVEL_LABELS[report.level])}</p>
          <Link to="/conformite" className={cardLink}>
            {report.done < report.total ? remainingText(report) : 'Voir la checklist'}
          </Link>
        </Tile>
      )}
    </div>
  );
}

// --- Écran -------------------------------------------------------------------------------------------

export function DashboardScreen() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const compliance = useQuery(complianceQuery);
  const checklist = useQuery(checklistQuery);
  const alerts = useQuery(alertsQuery);
  const inbox = useQuery(inboxQuery({ q: '', nonLus: true, page: 1 }));
  const canAdmin = user.municipality_role === 'admin' || user.municipality_role === 'super_admin';
  const activeAlerts = (alerts.data ?? []).filter((alert) => alertState(alert) === 'active');
  const alert = activeAlerts[0];
  const report = compliance.data;
  const unread = inbox.data?.total;
  const steps = checklist.data?.visible ? checklist.data : null;

  const summary = [
    capitalize(today()),
    unread !== undefined && plural(unread, 'message non lu', 'messages non lus'),
    activeAlerts.length > 0 && plural(activeAlerts.length, 'alerte active', 'alertes actives'),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mx-auto max-w-[1200px]">
      <PageHeader
        title={user.first_name ? `Bonjour ${user.first_name}` : 'Bonjour'}
        documentTitle="Tableau de bord"
        description={summary}
      />
      {onboardingPending(user) && user.site?.onboarding && (
        <section
          aria-labelledby="reprendre-assistant"
          className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-brand bg-brand-soft p-5"
        >
          <div className="min-w-0 flex-1 basis-64">
            <h2 id="reprendre-assistant" className="text-[17px] font-semibold">
              Terminez la création de votre site
            </h2>
            <p className="mt-1 text-secondary">
              Vous en êtes à l'étape {user.site.onboarding.step} sur {TOTAL_STEPS} :{' '}
              {ONBOARDING_STEPS[user.site.onboarding.step - 1]?.label.toLowerCase()}.
            </p>
          </div>
          <Link
            to="/assistant"
            search={{ etape: user.site.onboarding.step }}
            className="inline-flex h-10 items-center rounded-lg bg-brand-button px-4 font-semibold text-on-brand hover:bg-brand-hover max-md:h-11 max-md:w-full max-md:justify-center"
          >
            Reprendre
          </Link>
        </section>
      )}
      {alert && (
        <div className="mb-5 max-lg:hidden">
          <Tiles alert={alert} report={report} />
        </div>
      )}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6">
        {/* Mobile : les deux colonnes se suivent (raccourcis, messages, action, mise en ligne…), dans l'ordre du DOM */}
        <div className="flex flex-col gap-4">
          {steps ? (
            <div className="max-lg:hidden">
              <Checklist checklist={steps} canAdmin={canAdmin} />
            </div>
          ) : (
            report && (
              <div className="max-lg:hidden">
                <NextAction report={report} canAdmin={canAdmin} />
              </div>
            )
          )}
          <nav aria-label="Raccourcis">
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {/* « Publier une alerte » d'abord (tâche mobile du handoff) ; en dernier sur ordinateur */}
              <li className="col-span-2 lg:order-last lg:col-span-1">
                <Shortcut
                  to="/alertes/$documentId"
                  icon={TriangleAlert}
                  warning
                  label="Publier une alerte"
                  note={
                    alert
                      ? activeAlerts.length > 1
                        ? plural(activeAlerts.length, 'alerte active', 'alertes actives')
                        : `1 alerte active : ${alert.title}`
                      : undefined
                  }
                  className="h-full"
                />
              </li>
              <li>
                <Shortcut to="/actualites/$documentId" icon={Newspaper} label="Nouvelle actualité" className="h-full" />
              </li>
              <li>
                <Shortcut to="/agenda/$documentId" icon={CalendarPlus} label="Nouvel événement" className="h-full" />
              </li>
            </ul>
          </nav>
          <Messages />
          {steps ? (
            <div className="lg:hidden">
              <Checklist checklist={steps} canAdmin={canAdmin} />
            </div>
          ) : (
            report && (
              <div className="lg:hidden">
                <NextAction report={report} canAdmin={canAdmin} compact />
              </div>
            )
          )}
        </div>
        <div className="flex flex-col gap-4">
          {!alert && (
            <div className="max-lg:hidden">
              <Publication siteUrl={user.site?.live_url ?? null} />
            </div>
          )}
          <div className="lg:hidden">
            <Publication siteUrl={user.site?.live_url ?? null} compact />
          </div>
          <Events />
          <RecentContents />
          {/* Avec une alerte en cours, la conformité est dans le bandeau de tuiles (ordinateur) */}
          <div className={alert ? 'lg:hidden' : undefined}>
            <Compliance report={report} />
          </div>
        </div>
      </div>
    </div>
  );
}
