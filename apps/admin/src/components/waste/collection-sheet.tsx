/**
 * Fiche d'une collecte, en panneau latéral (comme l'équipe) : type, fréquence, jour (sauf apport
 * volontaire et rendez-vous), rang dans le mois, saison, zone, « À savoir », affichée ou non. Les
 * prochains passages sont calculés en direct, comme sur le site : l'agent voit tout de suite si la
 * règle est la bonne.
 */
import { Dialog } from 'radix-ui';
import { CalendarClock, Loader2, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { z } from 'zod';
import { formatDate, MONTH_NAMES, MONTH_RANK_LABELS, WASTE_FREQUENCY_LABELS, WASTE_TYPES } from '@communeo/core';
import {
  Form,
  FormErrorSummary,
  RequiredNote,
  SelectField,
  SwitchField,
  TextareaField,
  TextField,
  useZodForm,
} from '@/components/form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, useReturnFocus } from '@/components/ui/confirm-dialog';
import { hasDay, upcoming, WASTE_TYPE_ORDER, type WasteSchedule, type WasteScheduleData } from '@/lib/waste';

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
export const typeLabel = (type: string) => WASTE_TYPES[type]?.label ?? type;

const TYPE_OPTIONS = WASTE_TYPE_ORDER.map((value) => ({ value, label: typeLabel(value) }));
const DAY_OPTIONS = DAYS.map((value) => ({ value, label: capitalize(value) }));
const RANK_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({
  value: String(value),
  label: value === 5 ? 'Dernier' : MONTH_RANK_LABELS[value]!,
}));
const MONTH_OPTIONS = MONTH_NAMES.map((name, index) => ({ value: String(index + 1), label: capitalize(name) }));
const FREQUENCIES = [
  'hebdomadaire',
  'semaines-paires',
  'semaines-impaires',
  'mensuel',
  'apport-volontaire',
  'sur-rendez-vous',
];

const schema = z
  .object({
    waste_type: z.string().min(1, 'Choisissez le type de déchets'),
    frequency: z.string().min(1, 'Choisissez la fréquence'),
    collection_day: z.string(),
    month_rank: z.string(),
    seasonal: z.boolean(),
    season_start_month: z.string(),
    season_end_month: z.string(),
    zone: z.string().max(200, 'La zone ne doit pas dépasser 200 caractères'),
    notes: z.string().max(500, '« À savoir » ne doit pas dépasser 500 caractères'),
    active: z.boolean(),
  })
  .refine((value) => !hasDay(value.frequency) || !!value.collection_day, {
    path: ['collection_day'],
    message: 'Choisissez le jour de collecte',
  })
  .refine((value) => !value.seasonal || (!!value.season_start_month && !!value.season_end_month), {
    path: ['season_start_month'],
    message: 'Choisissez le premier et le dernier mois',
  });
type Values = z.input<typeof schema>;

const toValues = (schedule: WasteSchedule | null): Values => ({
  waste_type: schedule?.waste_type ?? '',
  frequency: schedule?.frequency ?? 'hebdomadaire',
  collection_day: schedule?.collection_day ?? '',
  month_rank: String(schedule?.month_rank ?? 1),
  seasonal: !!(schedule?.season_start_month && schedule?.season_end_month),
  season_start_month: schedule?.season_start_month ? String(schedule.season_start_month) : '4',
  season_end_month: schedule?.season_end_month ? String(schedule.season_end_month) : '11',
  zone: schedule?.zone ?? '',
  notes: schedule?.notes ?? '',
  active: schedule?.active ?? true,
});

export function toData(values: Values, schedule: WasteSchedule | null): WasteScheduleData {
  const withDay = hasDay(values.frequency);
  return {
    waste_type: values.waste_type,
    frequency: values.frequency as WasteScheduleData['frequency'],
    collection_day: withDay ? values.collection_day : null,
    month_rank: values.frequency === 'mensuel' ? Number(values.month_rank) : null,
    season_start_month: values.seasonal ? Number(values.season_start_month) : null,
    season_end_month: values.seasonal ? Number(values.season_end_month) : null,
    // Toutes les deux semaines (ancienne règle) : la date de référence est gardée
    start_date: values.frequency === 'bimensuel' ? (schedule?.start_date ?? null) : null,
    zone: values.zone.trim() || null,
    notes: values.notes.trim() || null,
    active: values.active,
  };
}

function NextPassages({ schedule }: { schedule: WasteSchedule | null }) {
  const values = useWatch() as Values;
  const data = toData(values, schedule);
  const dates = hasDay(values.frequency) && values.collection_day ? upcoming(data) : [];
  return (
    <p aria-live="polite" className="flex gap-2 rounded-lg bg-info-bg p-3 text-[13px] text-info">
      <CalendarClock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>
        {!hasDay(values.frequency)
          ? `${WASTE_FREQUENCY_LABELS[values.frequency]} : pas de date de passage affichée sur le site.`
          : dates.length
            ? `Prochains passages : ${dates.map((iso) => formatDate(iso)).join(', ')}.`
            : 'Choisissez le jour pour voir les prochains passages.'}
      </span>
    </p>
  );
}

export function CollectionSheet({
  open,
  schedule,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  /** Collecte modifiée, ou `null` pour en ajouter une */
  schedule: WasteSchedule | null;
  onClose: () => void;
  onSave: (data: WasteScheduleData) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const form = useZodForm(schema, toValues(schedule));
  const returnFocus = useReturnFocus();
  const [confirm, setConfirm] = useState<'close' | 'delete' | null>(null);
  const [frequency, seasonal] = form.watch(['frequency', 'seasonal']);
  const name = schedule ? typeLabel(schedule.waste_type) : 'Nouvelle collecte';
  const frequencyOptions = [...(schedule?.frequency === 'bimensuel' ? ['bimensuel'] : []), ...FREQUENCIES].map(
    (value) => ({
      value,
      label: value === 'mensuel' ? 'Une fois par mois' : WASTE_FREQUENCY_LABELS[value]!,
    }),
  );

  useEffect(() => {
    if (open) form.reset(toValues(schedule));
  }, [open, schedule, form]);

  // Lu pendant le rendu : react-hook-form ne suit isDirty que s'il est lu ici
  const dirty = form.formState.isDirty;
  const close = () => (dirty ? setConfirm('close') : onClose());

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(value) => !value && close()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
          <Dialog.Content
            {...returnFocus}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-border bg-surface shadow-dialog dark:border-border-dialog dark:bg-sidebar"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <Dialog.Title className="text-[17px] font-semibold">{name}</Dialog.Title>
              <Dialog.Description className="sr-only">
                Collecte affichée sur la page Collecte des déchets du site.
              </Dialog.Description>
              <Button type="button" variant="ghost" size="icon" aria-label="Fermer la fiche" onClick={close}>
                <X aria-hidden="true" />
              </Button>
            </div>
            <Form
              form={form}
              requiredNote={false}
              summary={false}
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={async (values) => {
                await onSave(toData(values, schedule));
                form.reset(values);
              }}
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
                <FormErrorSummary title={(count) => `${count} champ${count > 1 ? 's' : ''} à corriger`} />
                <RequiredNote />
                <SelectField
                  name="waste_type"
                  label="Type de déchets"
                  required
                  options={TYPE_OPTIONS}
                  placeholder="Choisir…"
                />
                <SelectField name="frequency" label="Fréquence" required options={frequencyOptions} />
                {hasDay(frequency) && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {frequency === 'mensuel' && (
                      <SelectField name="month_rank" label="Semaine du mois" required options={RANK_OPTIONS} />
                    )}
                    <SelectField
                      name="collection_day"
                      label="Jour"
                      required
                      options={DAY_OPTIONS}
                      placeholder="Choisir…"
                    />
                  </div>
                )}
                <SwitchField
                  name="seasonal"
                  label="Seulement une partie de l'année"
                  help="Par exemple les déchets verts, d'avril à novembre."
                />
                {seasonal && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <SelectField name="season_start_month" label="Du mois de" required options={MONTH_OPTIONS} />
                    <SelectField name="season_end_month" label="Au mois de" required options={MONTH_OPTIONS} />
                  </div>
                )}
                <NextPassages schedule={schedule} />
                <TextField
                  name="zone"
                  label="Zone"
                  help="Vide : toute la commune. Par exemple « Bourg » ou « 4 points »."
                />
                <TextareaField
                  name="notes"
                  label="À savoir"
                  rows={2}
                  help="Par exemple « Sortir les bacs la veille au soir »."
                />
                <SwitchField name="active" label="Affichée sur le site" />
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
                {schedule && (
                  <Button type="button" variant="tertiary" className="text-danger" onClick={() => setConfirm('delete')}>
                    <Trash2 aria-hidden="true" />
                    Supprimer
                  </Button>
                )}
                <div className="ml-auto flex gap-2">
                  <Button type="button" variant="secondary" onClick={close}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 aria-hidden="true" className="animate-spin" />}
                    Enregistrer
                  </Button>
                </div>
              </div>
            </Form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <ConfirmDialog
        open={confirm === 'close'}
        onOpenChange={(value) => !value && setConfirm(null)}
        tone="warning"
        title="Fermer sans enregistrer ?"
        description="Les modifications de cette collecte seront perdues."
        confirmLabel="Fermer sans enregistrer"
        cancelLabel="Continuer la saisie"
        onConfirm={() => {
          setConfirm(null);
          onClose();
        }}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(value) => !value && setConfirm(null)}
        title={`Supprimer la collecte « ${name} » ?`}
        description="Cette action est définitive. La collecte disparaîtra du site à la prochaine mise en ligne. Pour la retirer temporairement, décochez plutôt « Affichée sur le site »."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          await onDelete();
          setConfirm(null);
        }}
      />
    </>
  );
}
