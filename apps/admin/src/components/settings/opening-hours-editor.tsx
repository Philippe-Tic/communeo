/**
 * Horaires d'ouverture (handoff 6.10) : une ligne par jour, jusqu'à 4 plages, « Copier lundi sur
 * les jours de semaine » (du mardi au vendredi), puis les fermetures exceptionnelles en liste datée (un jour ou une période).
 * Heures au pas de 15 minutes, choisies dans une liste (pas de saisie libre).
 */
import { Dialog } from 'radix-ui';
import { CalendarX2, ChevronDown, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useFieldArray, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { formatDay, WEEKDAY_LABELS, WEEKDAYS, type Weekday } from '@communeo/core/client';
import { DateField, Form, TextField, controlClass, fieldId, flattenErrors, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { dialogContentClass, useReturnFocus } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

export const MAX_RANGES = 4;
const TIMES = Array.from(
  { length: 96 },
  (_, index) => `${String(Math.floor(index / 4)).padStart(2, '0')}:${String((index % 4) * 15).padStart(2, '0')}`,
);

export type Closure = { date: string; end: string; label: string };
export type HoursValues = { days: Record<Weekday, Array<{ open: string; close: string }>>; closures: Closure[] };

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** « Le 11 novembre 2026 — Armistice », « Du 24 décembre 2026 au 2 janvier 2027 — congés de fin d'année » */
export function describeClosure(closure: Closure) {
  const day = (date: string) => `${formatDay(date)} ${date.slice(0, 4)}`;
  const { date, end } = closure;
  const when =
    !end || end === date
      ? `Le ${day(date)}`
      : date.slice(0, 4) === end.slice(0, 4)
        ? `Du ${formatDay(date)} au ${day(end)}`
        : `Du ${day(date)} au ${day(end)}`;
  return `${when}${closure.label.trim() ? ` — ${closure.label.trim()}` : ''}`;
}

/** Plage proposée par « + Plage » : le matin, puis l'après-midi, puis après la dernière */
function nextRange(ranges: Array<{ open: string; close: string }>) {
  const last = ranges.at(-1);
  if (!last) return { open: '09:00', close: '12:00' };
  if (last.close <= '12:00') return { open: '14:00', close: '17:00' };
  const index = Math.min(TIMES.indexOf(last.close) + 2, TIMES.length - 3);
  return { open: TIMES[index]!, close: TIMES[index + 2]! };
}

function TimeSelect({
  id,
  label,
  value,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(controlClass, 'h-11 w-[100px] appearance-none pr-7 pl-2.5 tabular-nums md:h-9 md:w-[84px]')}
      >
        {TIMES.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-secondary"
      />
    </div>
  );
}

function DayRow({ name, day }: { name: string; day: Weekday }) {
  const { control, setValue } = useFormContext();
  const { errors } = useFormState({ control, name: `${name}.days.${day}` });
  const path = `${name}.days.${day}`;
  const { fields, append, remove } = useFieldArray({ control, name: path });
  const ranges = (useWatch({ control, name: path }) as Array<{ open: string; close: string }> | undefined) ?? [];
  const label = capitalize(WEEKDAY_LABELS[day].long);
  const dayErrors = flattenErrors(errors).filter((error) => error.name.startsWith(`${path}.`));
  const errorId = `horaires-${day}-erreur`;
  const addRef = useRef<HTMLButtonElement>(null);
  // Focus après ajout (nouvelle plage) ou retrait (bouton d'ajout, réaffiché sous 4 plages), posé
  // juste après le rendu : pas d'image différée qui le reprendrait pendant la saisie
  const pendingFocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    const target = pendingFocus.current === 'ajout' ? addRef.current : document.getElementById(pendingFocus.current);
    pendingFocus.current = null;
    target?.focus();
  });

  return (
    <div
      role="group"
      aria-labelledby={`horaires-${day}`}
      aria-describedby={dayErrors.length ? errorId : undefined}
      className="grid gap-x-3 gap-y-1.5 py-2 sm:grid-cols-[88px_1fr]"
    >
      <p
        id={`horaires-${day}`}
        className={cn('font-medium sm:leading-[46px]', !fields.length && 'text-secondary sm:font-normal')}
      >
        {label}
      </p>
      <div>
        <div className="flex min-h-[46px] flex-wrap items-center gap-2">
          {fields.length === 0 && <span className="text-secondary">Fermé</span>}
          {fields.map((field, index) => {
            const range = ranges[index] ?? { open: '09:00', close: '12:00' };
            const invalid = dayErrors.some((error) => error.name.startsWith(`${path}.${index}`));
            const set = (key: 'open' | 'close', value: string) =>
              setValue(`${path}.${index}.${key}`, value, { shouldDirty: true, shouldValidate: invalid });
            return (
              <div
                key={field.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border p-1',
                  invalid ? 'border-2 border-danger' : 'border-border',
                )}
              >
                <TimeSelect
                  id={fieldId(`${path}.${index}`)}
                  label={`${label}, plage ${index + 1} : ouverture`}
                  value={range.open}
                  invalid={invalid}
                  onChange={(value) => set('open', value)}
                />
                <span aria-hidden="true" className="text-secondary">
                  →
                </span>
                <TimeSelect
                  id={fieldId(`${path}.${index}.close`)}
                  label={`${label}, plage ${index + 1} : fermeture`}
                  value={range.close}
                  invalid={invalid}
                  onChange={(value) => set('close', value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Retirer la plage ${index + 1} du ${WEEKDAY_LABELS[day].long}`}
                  title="Retirer la plage"
                  className="size-9 text-secondary md:size-8"
                  onClick={() => {
                    remove(index);
                    pendingFocus.current = 'ajout';
                  }}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            );
          })}
          {fields.length < MAX_RANGES && (
            <Button
              ref={addRef}
              type="button"
              variant="tertiary"
              size="sm"
              aria-label={`Ajouter une plage le ${WEEKDAY_LABELS[day].long}`}
              className="border border-dashed border-border-input max-md:h-11"
              onClick={() => {
                append(nextRange(ranges));
                pendingFocus.current = fieldId(`${path}.${fields.length}`);
              }}
            >
              <Plus aria-hidden="true" />
              Plage
            </Button>
          )}
        </div>
        {dayErrors.length > 0 && (
          <p id={errorId} className="mt-1.5 text-[13px] font-medium text-danger">
            {dayErrors[0]!.message}
          </p>
        )}
      </div>
    </div>
  );
}

const closureSchema = z
  .object({
    date: z.string().min(1, 'Indiquez le premier jour de fermeture'),
    end: z.string(),
    label: z.string().max(120, 'Le motif ne doit pas dépasser 120 caractères'),
  })
  .refine((closure) => !closure.end || closure.end >= closure.date, {
    message: 'Le dernier jour doit être après le premier',
    path: ['end'],
  });

function ClosureDialog({
  open,
  onOpenChange,
  closure,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closure: Closure | null;
  onSubmit: (closure: Closure) => void;
}) {
  const returnFocus = useReturnFocus();
  const form = useZodForm(closureSchema, closure ?? { date: '', end: '', label: '' });
  useEffect(() => {
    if (open) form.reset(closure ?? { date: '', end: '', label: '' });
  }, [open, closure, form]);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content
          {...returnFocus}
          className={cn(dialogContentClass, 'max-h-[calc(100dvh-32px)] max-w-[480px] overflow-y-auto')}
        >
          <Dialog.Title className="text-[17px] font-semibold">
            {closure ? 'Modifier la fermeture' : 'Ajouter une fermeture'}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-secondary">
            Un jour férié, des congés : le site affiche la mairie fermée ces jours-là.
          </Dialog.Description>
          <Form
            form={form}
            requiredNote={false}
            className="mt-4 space-y-4"
            summaryTitle={(count) => `${count} champ${count > 1 ? 's' : ''} à corriger`}
            onSubmit={(values) => {
              onSubmit({
                date: values.date,
                end: values.end && values.end !== values.date ? values.end : '',
                label: values.label.trim(),
              });
              onOpenChange(false);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField name="date" label="Premier jour" required />
              <DateField name="end" label="Dernier jour" help="Vide : un seul jour." />
            </div>
            <TextField name="label" label="Motif" help="Ex. « Congés de fin d'année », « Armistice »." />
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Annuler
                </Button>
              </Dialog.Close>
              <Button type="submit">{closure ? 'Enregistrer la fermeture' : 'Ajouter la fermeture'}</Button>
            </div>
          </Form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function OpeningHoursEditor({ name }: { name: string }) {
  const { control, getValues, setValue } = useFormContext();
  const closures = useFieldArray({ control, name: `${name}.closures` });
  const values = (useWatch({ control, name: `${name}.closures` }) as Closure[] | undefined) ?? [];
  const [dialog, setDialog] = useState<{ index: number | null } | null>(null);
  const [message, setMessage] = useState('');
  const id = useId();

  const copyMonday = () => {
    const monday = getValues(`${name}.days.monday`) as Array<{ open: string; close: string }>;
    for (const day of WEEKDAYS.slice(1, 5))
      setValue(`${name}.days.${day}`, structuredClone(monday), { shouldDirty: true });
    setMessage(
      monday.length ? 'Horaires du lundi copiés du mardi au vendredi.' : 'Mardi à vendredi : fermé, comme le lundi.',
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-secondary">
          Jusqu'à {MAX_RANGES} plages par jour. Un jour sans plage est affiché fermé.
        </p>
        <Button type="button" variant="secondary" size="sm" className="max-md:h-11" onClick={copyMonday}>
          Copier lundi sur les jours de semaine
        </Button>
      </div>
      <p className="sr-only" role="status">
        {message}
      </p>
      <div className="divide-y divide-border">
        {WEEKDAYS.map((day) => (
          <DayRow key={day} name={name} day={day} />
        ))}
      </div>

      <div className="border-t border-border pt-4">
        <h3 id={`${id}-fermetures`} className="font-semibold">
          Fermetures exceptionnelles
        </h3>
        {closures.fields.length === 0 ? (
          <p className="mt-1 text-[13px] text-secondary">Aucune fermeture prévue.</p>
        ) : (
          <ul aria-labelledby={`${id}-fermetures`} className="mt-2 space-y-1.5">
            {closures.fields.map((field, index) => {
              const closure = values[index] ?? (field as unknown as Closure);
              const text = describeClosure(closure);
              return (
                <li key={field.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-1.5">
                  <CalendarX2 aria-hidden="true" className="size-4 shrink-0 text-secondary" />
                  <span className="min-w-0 flex-1 text-[13px]">{text}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    data-closure-edit={index}
                    aria-label={`Modifier : ${text}`}
                    title="Modifier"
                    className="size-9 text-secondary md:size-8"
                    onClick={() => setDialog({ index })}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Supprimer : ${text}`}
                    title="Supprimer"
                    className="size-9 text-secondary md:size-8"
                    onClick={() => {
                      closures.remove(index);
                      setMessage(`Fermeture supprimée : ${text}.`);
                      requestAnimationFrame(() => document.getElementById(`${id}-ajout`)?.focus());
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <Button
          id={`${id}-ajout`}
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2 max-md:h-11"
          onClick={() => setDialog({ index: null })}
        >
          <Plus aria-hidden="true" />
          Ajouter une fermeture
        </Button>
      </div>

      <ClosureDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        closure={dialog?.index != null ? (values[dialog.index] ?? null) : null}
        onSubmit={(closure) => {
          if (dialog?.index != null) closures.update(dialog.index, closure);
          else closures.append(closure);
          setMessage(
            `${dialog?.index != null ? 'Fermeture modifiée' : 'Fermeture ajoutée'} : ${describeClosure(closure)}.`,
          );
        }}
      />
    </>
  );
}
