/**
 * Alertes et perturbations (handoff « 6.13 Alerte — desktop ») : l'alerte en cours en carte avec
 * Modifier / Prolonger / Terminer maintenant, les alertes programmées, puis les alertes passées
 * réutilisables. Tout est en ligne immédiatement : pas de « Mettre en ligne » pour une alerte.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Dialog } from 'radix-ui';
import { Clock, Info, OctagonAlert, Plus, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { ALERT_SEVERITY_LABELS, ALERT_TYPE_LABELS } from '@communeo/core';
import { DateField, Form, TimeField, useZodForm } from '@/components/form';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, dialogContentClass, DialogIcon, useReturnFocus } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import {
  alertState,
  alertsQuery,
  endAlert,
  extendAlert,
  refreshAlerts,
  type Alert,
  type AlertSeverity,
} from '@/lib/alerts';
import { dateToParis, formatShortDate, parisToDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { formatAlertMoment, formatAlertWindow } from './alert-banner';

const PAST_PAGE = 20;
const ICON: Record<AlertSeverity, typeof Info> = { info: Info, warning: TriangleAlert, critical: OctagonAlert };
const CARD: Record<AlertSeverity, string> = {
  info: 'border-info/40',
  warning: 'border-warning/40',
  critical: 'border-danger/40',
};
const ICON_BG: Record<AlertSeverity, string> = {
  info: 'bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning',
  critical: 'bg-danger-bg text-danger',
};
const DOT: Record<AlertSeverity, string> = { info: 'bg-info', warning: 'bg-warning', critical: 'bg-danger' };

const errorText = (error: unknown) => (error instanceof ApiError ? error.message : 'erreur inattendue');
const windowOf = (alert: Alert) =>
  alert.display_from && alert.display_until
    ? formatAlertWindow(new Date(alert.display_from), new Date(alert.display_until))
    : null;

export function AlertsScreen() {
  const client = useQueryClient();
  const alerts = useQuery(alertsQuery);
  const [now] = useState(() => new Date());
  const [ending, setEnding] = useState<Alert | null>(null);
  const [extending, setExtending] = useState<Alert | null>(null);
  const [shownPast, setShownPast] = useState(PAST_PAGE);
  const endingScheduled = !!ending && alertState(ending, now) === 'scheduled';

  const all = alerts.data ?? [];
  const active = all.filter((alert) => alertState(alert, now) === 'active');
  const scheduled = all.filter((alert) => alertState(alert, now) === 'scheduled');
  const past = all.filter((alert) => alertState(alert, now) === 'past');
  const description = alerts.data
    ? [
        active.length
          ? `${active.length} alerte${active.length > 1 ? 's' : ''} active${active.length > 1 ? 's' : ''}`
          : 'Aucune alerte active',
        scheduled.length ? `${scheduled.length} programmée${scheduled.length > 1 ? 's' : ''}` : null,
        past.length ? `${past.length} passée${past.length > 1 ? 's' : ''}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  return (
    <div className="max-w-[960px]">
      <PageHeader
        title="Alertes et perturbations"
        description={description}
        actions={
          <Button asChild>
            <Link to="/alertes/$documentId" params={{ documentId: 'nouvelle' }}>
              <Plus aria-hidden="true" />
              Nouvelle alerte
            </Link>
          </Button>
        }
      />

      {alerts.isPending ? (
        <p aria-busy="true" className="p-8 text-center text-secondary">
          Chargement des alertes…
        </p>
      ) : alerts.isError ? (
        <div role="alert" className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="font-semibold">Les alertes n'ont pas pu être chargées.</p>
          <Button variant="secondary" className="mt-3" onClick={() => void alerts.refetch()}>
            Réessayer
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface px-6 py-8 text-center">
              <p className="text-[15px] font-semibold">Aucune alerte en cours sur le site.</p>
              <p className="mx-auto mt-1.5 max-w-md text-secondary">
                Travaux, coupure d'eau, intempérie : une alerte s'affiche en bandeau en haut de toutes les pages, dès sa
                publication.
              </p>
            </div>
          ) : (
            <section aria-labelledby="alertes-actives" className="space-y-3">
              <h2 id="alertes-actives" className="sr-only">
                Alertes actives
              </h2>
              {active.map((alert) => (
                <AlertCard
                  key={alert.documentId}
                  alert={alert}
                  state="active"
                  onExtend={() => setExtending(alert)}
                  onEnd={() => setEnding(alert)}
                />
              ))}
            </section>
          )}

          {scheduled.length > 0 && (
            <section aria-labelledby="alertes-programmees" className="space-y-3">
              <h2 id="alertes-programmees" className="text-xs font-semibold tracking-wide text-secondary uppercase">
                Programmées
              </h2>
              {scheduled.map((alert) => (
                <AlertCard
                  key={alert.documentId}
                  alert={alert}
                  state="scheduled"
                  onExtend={() => setExtending(alert)}
                  onEnd={() => setEnding(alert)}
                />
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section aria-labelledby="alertes-passees">
              <h2 id="alertes-passees" className="text-xs font-semibold tracking-wide text-secondary uppercase">
                Alertes passées
              </h2>
              <ul className="mt-3 divide-y divide-border-row rounded-xl border border-border bg-surface">
                {past.slice(0, shownPast).map((alert) => (
                  <li key={alert.documentId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                    <p className="flex min-w-0 flex-1 basis-64 items-baseline gap-2">
                      <span
                        aria-hidden="true"
                        className={cn('size-2 shrink-0 translate-y-[-1px] rounded-full', DOT[alert.severity])}
                      />
                      <span className="min-w-0">
                        <span className="font-semibold">{ALERT_SEVERITY_LABELS[alert.severity]}</span> — {alert.title}
                      </span>
                    </p>
                    <span className="text-[13px] text-secondary">
                      {[
                        alert.alert_type ? ALERT_TYPE_LABELS[alert.alert_type] : null,
                        alert.display_from ? formatShortDate(new Date(alert.display_from)) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <Button asChild variant="tertiary" size="sm">
                      <Link
                        to="/alertes/$documentId"
                        params={{ documentId: 'nouvelle' }}
                        search={{ depuis: alert.documentId }}
                        aria-label={`Réutiliser « ${alert.title} »`}
                      >
                        Réutiliser
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
              {past.length > shownPast && (
                <Button variant="secondary" className="mt-3" onClick={() => setShownPast((count) => count + PAST_PAGE)}>
                  Afficher les alertes plus anciennes
                </Button>
              )}
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!ending}
        onOpenChange={(open) => !open && setEnding(null)}
        tone="warning"
        title={
          endingScheduled ? `Annuler « ${ending?.title ?? ''} » ?` : `Terminer « ${ending?.title ?? ''} » maintenant ?`
        }
        description={
          endingScheduled
            ? "L'alerte ne s'affichera pas. Elle restera dans les alertes passées, réutilisable."
            : "Le bandeau disparaîtra du site d'ici une minute. L'alerte restera dans les alertes passées, réutilisable."
        }
        confirmLabel={endingScheduled ? "Annuler l'alerte" : 'Terminer maintenant'}
        cancelLabel={endingScheduled ? 'Garder' : 'Annuler'}
        onConfirm={async () => {
          const alert = ending!;
          try {
            await endAlert(alert.documentId);
            toast.success(endingScheduled ? `« ${alert.title} » est annulée.` : `« ${alert.title} » est terminée.`);
          } catch (error) {
            toast.error(`L'alerte n'a pas pu être terminée : ${errorText(error)}`);
          }
          await refreshAlerts(client);
        }}
      />

      <ExtendDialog
        alert={extending}
        onOpenChange={(open) => !open && setExtending(null)}
        onExtend={async (until) => {
          const alert = extending!;
          await extendAlert(alert.documentId, until);
          toast.success(`« ${alert.title} » est prolongée jusqu'au ${formatAlertMoment(until)}.`);
          await refreshAlerts(client);
        }}
      />
    </div>
  );
}

function AlertCard({
  alert,
  state,
  onExtend,
  onEnd,
}: {
  alert: Alert;
  state: 'active' | 'scheduled';
  onExtend: () => void;
  onEnd: () => void;
}) {
  const Icon = ICON[alert.severity];
  const window = windowOf(alert);
  return (
    <article
      aria-labelledby={`alerte-${alert.documentId}`}
      className={cn('rounded-xl border-2 bg-surface p-4 md:p-5', CARD[alert.severity])}
    >
      <div className="flex gap-3">
        <span
          aria-hidden="true"
          className={cn('grid size-10 shrink-0 place-items-center rounded-full', ICON_BG[alert.severity])}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 id={`alerte-${alert.documentId}`} className="text-[17px] font-semibold">
              {alert.title}
            </h3>
            <span className={cn('rounded-full px-2 py-px text-xs font-semibold', ICON_BG[alert.severity])}>
              {ALERT_SEVERITY_LABELS[alert.severity]} · {state === 'active' ? 'active' : 'programmée'}
            </span>
          </div>
          <p className="mt-1 text-[13px] text-secondary">
            {[alert.alert_type ? ALERT_TYPE_LABELS[alert.alert_type] : null, alert.affected_area, window]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="mt-2 whitespace-pre-line">{alert.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link to="/alertes/$documentId" params={{ documentId: alert.documentId }}>
                Modifier
              </Link>
            </Button>
            <Button variant="secondary" onClick={onExtend}>
              Prolonger
            </Button>
            <Button variant="destructive-outline" onClick={onEnd}>
              {state === 'active' ? 'Terminer maintenant' : 'Annuler'}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

const extendSchema = z
  .object({ day: z.string().min(1, 'Choisissez la date de fin'), time: z.string().min(1, "Choisissez l'heure de fin") })
  .refine((value) => parisToDate(value.day, value.time).getTime() > Date.now(), {
    path: ['day'],
    message: 'La nouvelle fin doit être dans le futur',
    when: ({ value }) => z.object({ day: z.string().min(1), time: z.string().min(1) }).safeParse(value).success,
  });

function ExtendDialog({
  alert,
  onOpenChange,
  onExtend,
}: {
  alert: Alert | null;
  onOpenChange: (open: boolean) => void;
  onExtend: (until: Date) => Promise<void>;
}) {
  const returnFocus = useReturnFocus();
  const base = alert?.display_until ? new Date(alert.display_until) : new Date();
  const suggested = (hours: number) => dateToParis(new Date(base.getTime() + hours * 3_600_000));
  const form = useZodForm(extendSchema, { day: '', time: '' });
  const [shown, setShown] = useState<Alert | null>(null);
  // Nouvelle alerte à prolonger : fin actuelle + 4 h proposée
  if (alert && alert !== shown) {
    setShown(alert);
    const next = suggested(4);
    form.reset({ day: next.day, time: next.time });
  }
  const pick = (hours: number) => {
    const next = suggested(hours);
    form.setValue('day', next.day, { shouldDirty: true });
    form.setValue('time', next.time, { shouldDirty: true });
  };
  return (
    <Dialog.Root open={!!alert} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content className={`${dialogContentClass} max-w-[460px]`} {...returnFocus}>
          <div className="flex gap-3">
            <DialogIcon tone="info" icon={Clock} />
            <div>
              <Dialog.Title className="text-[17px] font-semibold">Prolonger « {alert?.title} »</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-secondary">
                {alert?.display_until
                  ? `Fin actuelle : ${formatAlertMoment(new Date(alert.display_until))}.`
                  : 'Choisissez la nouvelle fin.'}
              </Dialog.Description>
            </div>
          </div>
          <Form
            form={form}
            requiredNote={false}
            className="mt-5 space-y-4"
            summaryTitle={(count) => `${count} erreur${count > 1 ? 's' : ''} à corriger`}
            onSubmit={async (value) => {
              try {
                await onExtend(parisToDate(value.day, value.time));
                onOpenChange(false);
              } catch (error) {
                toast.error(`L'alerte n'a pas pu être prolongée : ${errorText(error)}`);
              }
            }}
          >
            <div role="group" aria-label="Raccourcis" className="flex flex-wrap gap-2">
              {[
                ['+ 2 h', 2],
                ['+ 4 h', 4],
                ['+ 1 jour', 24],
              ].map(([label, hours]) => (
                <Button key={label} type="button" variant="secondary" size="sm" onClick={() => pick(hours as number)}>
                  {label}
                </Button>
              ))}
            </div>
            <DateField name="day" label="Nouvelle fin" required />
            <TimeField name="time" label="Heure" required />
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Annuler
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Prolonger
              </Button>
            </div>
          </Form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
