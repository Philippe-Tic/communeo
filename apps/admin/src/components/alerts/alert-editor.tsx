/**
 * Formulaire rapide d'alerte (handoff « 6.13 Alerte — mobile formulaire / aperçu et publication »),
 * identique sur mobile et sur ordinateur : étape 1 les champs, étape 2 l'aperçu du bandeau et le
 * récapitulatif, puis « Publier l'alerte ». La fin est obligatoire (début + 4 h par défaut) : une
 * alerte ne reste pas affichée par oubli. La publication est immédiate, sans mise en ligne du site.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useBlocker, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ALERT_SEVERITY_LABELS, ALERT_TYPE_LABELS } from '@communeo/core';
import {
  DateField,
  FieldSet,
  Form,
  SelectField,
  TextareaField,
  TextField,
  TimeField,
  fieldId,
  useFieldError,
  useZodForm,
} from '@/components/form';
import { Button } from '@/components/ui/button';
import { UnsavedChangesDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api';
import { alertQuery, refreshAlerts, saveAlert, type Alert, type AlertSeverity } from '@/lib/alerts';
import { dateToParis, parisToDate } from '@/lib/dates';
import { focusHeadingIfRequested } from '@/lib/focus';
import { sessionQuery } from '@/lib/session';
import { cn } from '@/lib/utils';
import { AlertBanner, formatAlertEnd, formatAlertWindow } from './alert-banner';

const DEFAULT_HOURS = 4;
const TYPE_OPTIONS = Object.entries(ALERT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const filled = z.object({
  startDay: z.string().min(1),
  startTime: z.string().min(1),
  endDay: z.string().min(1),
  endTime: z.string().min(1),
});

const schema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Indiquez le titre de l'alerte")
      .max(120, 'Le titre ne doit pas dépasser 120 caractères'),
    severity: z.enum(['info', 'warning', 'critical'], { error: 'Choisissez la sévérité' }),
    alert_type: z.string(),
    message: z
      .string()
      .trim()
      .min(1, 'Écrivez le message affiché aux habitants')
      .max(1000, 'Le message ne doit pas dépasser 1 000 caractères'),
    startDay: z.string().min(1, 'Indiquez la date de début'),
    startTime: z.string().min(1, "Indiquez l'heure de début"),
    endDay: z.string().min(1, 'Indiquez la date de fin'),
    endTime: z.string().min(1, "Indiquez l'heure de fin"),
    affected_area: z.string().max(300, 'La zone ne doit pas dépasser 300 caractères'),
    link_url: z.union([
      z.literal(''),
      z
        .string()
        .trim()
        .regex(/^(https?:\/\/\S+\.\S+|\/\S*)$/i, 'Le lien doit commencer par https:// ou / (une page du site)'),
    ]),
  })
  .refine((value) => parisToDate(value.endDay, value.endTime) > parisToDate(value.startDay, value.startTime), {
    path: ['endDay'],
    message: 'La fin doit être après le début',
    when: ({ value }) => filled.safeParse(value).success,
  })
  .refine((value) => parisToDate(value.endDay, value.endTime).getTime() > Date.now(), {
    path: ['endDay'],
    message: "La fin est déjà passée : l'alerte ne serait pas affichée",
    when: ({ value }) => filled.safeParse(value).success,
  });
type Values = z.input<typeof schema>;

/** Maintenant, arrondi au quart d'heure précédent (les heures vont de 15 en 15 minutes) */
function nowSlot(now: Date = new Date()) {
  const { day, time } = dateToParis(now);
  const [h, m] = time.split(':').map(Number) as [number, number];
  return { day, time: `${String(h).padStart(2, '0')}:${String(Math.floor(m / 15) * 15).padStart(2, '0')}` };
}

function plusHours(day: string, time: string, hours: number) {
  return dateToParis(new Date(parisToDate(day, time).getTime() + hours * 3_600_000));
}

function toValues(alert: Alert | undefined, reuse: boolean): Values {
  const start = nowSlot();
  const end = plusHours(start.day, start.time, DEFAULT_HOURS);
  const keepDates = alert && !reuse && alert.display_from && alert.display_until;
  const from = keepDates ? dateToParis(new Date(alert.display_from!)) : start;
  const until = keepDates ? dateToParis(new Date(alert.display_until!)) : end;
  return {
    title: alert?.title ?? '',
    severity: (alert?.severity ?? '') as AlertSeverity,
    alert_type: alert?.alert_type ?? '',
    message: alert?.message ?? '',
    startDay: from.day,
    startTime: from.time,
    endDay: until.day,
    endTime: until.time,
    affected_area: alert?.affected_area ?? '',
    link_url: alert?.link_url ?? '',
  };
}

const SEVERITY_STYLE: Record<AlertSeverity, { dot: string; checked: string }> = {
  info: { dot: 'bg-info', checked: 'has-checked:border-info has-checked:bg-info-bg has-checked:text-info' },
  warning: {
    dot: 'bg-warning',
    checked: 'has-checked:border-warning has-checked:bg-warning-bg has-checked:text-warning',
  },
  critical: { dot: 'bg-danger', checked: 'has-checked:border-danger has-checked:bg-danger-bg has-checked:text-danger' },
};

/** Sévérité : trois boutons de 48 px avec un point coloré et le libellé (la couleur n'est jamais seule) */
function SeverityField() {
  const { register } = useFormContext<Values>();
  const error = useFieldError('severity');
  const id = fieldId('severity');
  return (
    <FieldSet name="severity" legend="Sévérité" required error={error}>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(SEVERITY_STYLE) as AlertSeverity[]).map((severity) => (
          <label
            key={severity}
            htmlFor={`${id}-${severity}`}
            className={cn(
              'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-input px-2 text-center font-semibold has-checked:border-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand',
              SEVERITY_STYLE[severity].checked,
            )}
          >
            <input
              type="radio"
              id={`${id}-${severity}`}
              value={severity}
              {...register('severity')}
              className="sr-only"
              aria-invalid={error ? true : undefined}
            />
            <span aria-hidden="true" className={cn('size-2.5 shrink-0 rounded-full', SEVERITY_STYLE[severity].dot)} />
            {ALERT_SEVERITY_LABELS[severity]}
          </label>
        ))}
      </div>
    </FieldSet>
  );
}

/**
 * Fin qui suit le début (+ 4 h) tant qu'on ne l'a pas choisie : elle suit tant qu'elle vaut encore
 * la dernière valeur posée automatiquement (ou la valeur de départ).
 */
function useEndFollowsStart(enabled: boolean) {
  const { setValue, control } = useFormContext<Values>();
  const [startDay, startTime, endDay, endTime] = useWatch({
    control,
    name: ['startDay', 'startTime', 'endDay', 'endTime'],
  });
  const auto = useRef({ day: endDay, time: endTime });
  useEffect(() => {
    if (!enabled || !startDay || !startTime) return;
    if (endDay !== auto.current.day || endTime !== auto.current.time) return;
    const next = plusHours(startDay, startTime, DEFAULT_HOURS);
    if (next.day === endDay && next.time === endTime) return;
    auto.current = next;
    setValue('endDay', next.day, { shouldValidate: false });
    setValue('endTime', next.time, { shouldValidate: false });
  }, [enabled, startDay, startTime, endDay, endTime, setValue]);
}

function Fields({ followStart }: { followStart: boolean }) {
  useEndFollowsStart(followStart);
  return (
    <div className="space-y-5">
      <TextField name="title" label="Titre" required inputProps={{ autoComplete: 'off' }} />
      <SeverityField />
      <SelectField name="alert_type" label="Type" options={TYPE_OPTIONS} placeholder="Choisir…" />
      <TextareaField name="message" label="Message" required rows={3} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-3">
          <DateField name="startDay" label="Début" required />
          <TimeField name="startTime" label="Heure de début" required />
        </div>
        <div className="space-y-3">
          <DateField name="endDay" label="Fin" required help="4 heures après le début par défaut." />
          <TimeField name="endTime" label="Heure de fin" required />
        </div>
      </div>
      <TextField
        name="affected_area"
        label="Zone concernée"
        help="Par exemple « Rue des Lilas et impasse du Verger »."
      />
      <TextField
        name="link_url"
        label="Lien"
        help="Une page du site (/travaux) ou une adresse https:// pour en savoir plus."
        inputProps={{ inputMode: 'url' }}
      />
    </div>
  );
}

export function AlertEditor({ documentId, reuseId }: { documentId: string | null; reuseId?: string }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { data: session } = useQuery(sessionQuery);
  const sourceId = documentId ?? reuseId ?? null;
  const source = useQuery({ ...alertQuery(sourceId ?? ''), enabled: !!sourceId });
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const saved = useRef(false);
  const [busy, setBusy] = useState(false);
  // Début « plus tard » : comparé à l'ouverture du formulaire (le rendu ne lit pas l'horloge)
  const [openedAt] = useState(() => Date.now());
  const form = useZodForm(schema, toValues(undefined, false));
  const loaded = !sourceId || source.isSuccess;

  useEffect(() => {
    if (source.data) form.reset(toValues(source.data, !documentId));
  }, [source.data, documentId, form]);
  useEffect(() => focusHeadingIfRequested(heading.current), []);
  useEffect(() => {
    document.title = `${documentId ? "Modifier l'alerte" : 'Nouvelle alerte'} · Communeo`;
  }, [documentId]);
  // Changement d'étape : le titre de l'étape reçoit le focus
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  // Lu pendant le rendu : react-hook-form ne suit isDirty que s'il est lu ici
  const dirty = form.formState.isDirty;
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !saved.current,
    enableBeforeUnload: () => dirty && !saved.current,
    withResolver: true,
  });

  const values = form.watch();
  const from = values.startDay && values.startTime ? parisToDate(values.startDay, values.startTime) : null;
  const until = values.endDay && values.endTime ? parisToDate(values.endDay, values.endTime) : null;
  const later = !!from && from.getTime() > openedAt + 60_000;
  const siteName = session?.site?.name ?? 'Votre commune';

  const publish = async () => {
    const value = form.getValues();
    try {
      const alert = await saveAlert(documentId, {
        title: value.title.trim(),
        severity: value.severity as AlertSeverity,
        message: value.message.trim(),
        alert_type: value.alert_type || null,
        affected_area: value.affected_area.trim() || null,
        link_url: value.link_url.trim() || null,
        link_label: null,
        display_from: parisToDate(value.startDay, value.startTime).toISOString(),
        display_until: parisToDate(value.endDay, value.endTime).toISOString(),
      });
      saved.current = true;
      await refreshAlerts(client);
      const url = session?.site?.live_url;
      toast.success(
        later
          ? `Alerte programmée : elle s'affichera sur le site ${formatAlertEnd(new Date(alert.display_from!)).replace(/^à /, "aujourd'hui à ")}.`
          : documentId
            ? "Alerte modifiée. Le bandeau du site est à jour d'ici une minute."
            : 'Alerte publiée. Elle est visible sur le site dès maintenant.',
        url && !later ? { label: 'Voir', onClick: () => window.open(url, '_blank', 'noopener') } : undefined,
      );
      await navigate({ to: '/alertes' });
    } catch (error) {
      toast.error(
        `L'alerte n'a pas pu être publiée : ${error instanceof ApiError ? error.message : 'erreur inattendue'}`,
      );
    }
  };

  return (
    <div className="mx-auto max-w-[560px] pb-28">
      <div className="mb-5 flex items-center gap-2">
        {step === 'form' ? (
          <Button asChild variant="ghost" size="icon-lg">
            <Link to="/alertes" aria-label="Retour aux alertes">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button variant="ghost" size="icon-lg" aria-label="Revenir au formulaire" onClick={() => setStep('form')}>
            <ArrowLeft aria-hidden="true" />
          </Button>
        )}
        <h1 ref={heading} tabIndex={-1} className="min-w-0 flex-1 text-xl outline-none md:text-2xl">
          {step === 'form' ? (documentId ? "Modifier l'alerte" : 'Nouvelle alerte') : "Aperçu de l'alerte"}
        </h1>
        <p className="shrink-0 text-[13px] text-secondary">Étape {step === 'form' ? 1 : 2} sur 2</p>
      </div>

      {!loaded ? (
        <p aria-busy="true" className="p-8 text-center text-secondary">
          Chargement de l'alerte…
        </p>
      ) : (
        <Form
          form={form}
          requiredNote={step === 'form'}
          summaryTitle={(count) => `${count} champ${count > 1 ? 's' : ''} à corriger`}
          onSubmit={() => setStep('preview')}
        >
          <div hidden={step !== 'form'} className="rounded-xl border border-border bg-surface p-4 md:p-6">
            <Fields followStart={!documentId} />
          </div>

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-secondary">
                Voici le bandeau tel qu'il apparaîtra en haut de toutes les pages du site.
              </p>
              <AlertBanner
                siteName={siteName}
                severity={values.severity as AlertSeverity}
                title={values.title.trim()}
                message={values.message.trim()}
                area={values.affected_area.trim()}
                from={from}
                until={until}
              />
              <dl className="divide-y divide-border-row rounded-xl border border-border bg-surface px-4">
                {[
                  ['Sévérité', ALERT_SEVERITY_LABELS[values.severity as AlertSeverity]],
                  ['Affichée', from && until ? formatAlertWindow(from, until) : ''],
                  ['Retrait', until ? `Automatique ${formatAlertEnd(until)}` : ''],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-secondary">{label}</dt>
                    <dd className="text-right font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:mt-5 md:border-0 md:bg-transparent md:p-0 dark:bg-sidebar md:dark:bg-transparent">
            {step === 'form' ? (
              <Button type="submit" size="lg" className="w-full">
                Voir l'aperçu
              </Button>
            ) : (
              <>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="flex-1"
                    onClick={() => setStep('form')}
                  >
                    Modifier
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    className="flex-[1.4]"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        if (await form.trigger()) await publish();
                        else setStep('form');
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy && <Loader2 aria-hidden="true" className="animate-spin" />}
                    {documentId ? 'Enregistrer' : later ? "Programmer l'alerte" : "Publier l'alerte"}
                  </Button>
                </div>
                <p className="mt-2 text-center text-[13px] text-secondary">
                  {later
                    ? 'Elle apparaîtra automatiquement au début choisi, sans mise en ligne du site.'
                    : 'Mise en ligne immédiate, sans attendre la prochaine mise en ligne du site.'}
                </p>
              </>
            )}
          </div>
        </Form>
      )}

      {blocker.status === 'blocked' && (
        <UnsavedChangesDialog open onStay={() => blocker.reset()} onLeave={() => blocker.proceed()} />
      )}
    </div>
  );
}
