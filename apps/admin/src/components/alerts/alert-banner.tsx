/**
 * Aperçu du bandeau d'alerte tel qu'il apparaîtra en haut des pages du site (handoff « 6.13 Alerte —
 * mobile aperçu ») : barre de la commune, bandeau coloré selon la sévérité, titre, message, zone et
 * horaires. La couleur n'est jamais seule : le libellé de sévérité précède le titre.
 */
import { Info, OctagonAlert, TriangleAlert } from 'lucide-react';
import { ALERT_SEVERITY_LABELS } from '@communeo/core';
import type { AlertSeverity } from '@/lib/alerts';
import { cn } from '@/lib/utils';

const TONE: Record<AlertSeverity, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: 'border-l-info bg-info-bg' },
  warning: { icon: TriangleAlert, className: 'border-l-warning bg-warning-bg' },
  critical: { icon: OctagonAlert, className: 'border-l-danger bg-danger-bg' },
};

const hour = (date: Date) => {
  const [h, m] = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .split(':');
  return `${Number(h)} h${m === '00' ? '' : ` ${m}`}`;
};
const day = (date: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
const sameDay = (a: Date, b: Date) => day(a) === day(b);

/** « jeu. 25 sept., 8 h → 12 h », ou « jeu. 25 sept., 8 h → ven. 26 sept., 10 h » */
export function formatAlertWindow(from: Date, until: Date): string {
  return sameDay(from, until)
    ? `${day(from)}, ${hour(from)} → ${hour(until)}`
    : `${day(from)}, ${hour(from)} → ${day(until)}, ${hour(until)}`;
}

/** « jeu. 25 sept., 12 h » */
export function formatAlertMoment(date: Date): string {
  return `${day(date)}, ${hour(date)}`;
}

/** « à 12 h » le jour même, sinon « le ven. 26 sept. à 10 h » */
export function formatAlertEnd(until: Date, now: Date = new Date()): string {
  return sameDay(until, now) ? `à ${hour(until)}` : `le ${day(until)} à ${hour(until)}`;
}

export function AlertBanner({
  siteName,
  severity,
  title,
  message,
  area,
  from,
  until,
}: {
  siteName: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  area: string;
  from: Date | null;
  until: Date | null;
}) {
  const tone = TONE[severity];
  const Icon = tone.icon;
  return (
    <figure
      aria-label="Aperçu du bandeau sur le site"
      className="overflow-hidden rounded-xl border border-border bg-surface"
    >
      <div
        aria-hidden="true"
        className="flex items-center gap-2 bg-[#1f3354] px-3 py-2 text-[13px] font-semibold text-white"
      >
        <span className="size-4 rounded-full bg-white/90" />
        {siteName}
      </div>
      <div className={cn('flex gap-3 border-l-4 px-4 py-3 text-[#1c1b17]', tone.className)}>
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold break-words">
            {ALERT_SEVERITY_LABELS[severity]} — {title || 'Titre de l’alerte'}
          </p>
          <p className="mt-0.5 whitespace-pre-line break-words">{message || 'Message de l’alerte'}</p>
          {(area || (from && until)) && (
            <p className="mt-1 text-[13px] text-[#4a4942]">
              {[area, from && until ? formatAlertWindow(from, until) : null].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>
      <div aria-hidden="true" className="h-20 bg-bg/60" />
    </figure>
  );
}
