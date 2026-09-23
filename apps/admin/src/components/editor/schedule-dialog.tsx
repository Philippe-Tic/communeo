/**
 * Programmer la publication (handoff 6.3) : date, heure au pas de 15 minutes (heure de Paris),
 * phrase de synthèse, Annuler / Programmer.
 */
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { Clock, Info } from 'lucide-react';
import { z } from 'zod';
import { DateField, Form, TimeField, useZodForm } from '@/components/form';
import { Button } from '@/components/ui/button';
import { dialogContentClass, DialogIcon, useReturnFocus } from '@/components/ui/confirm-dialog';
import { formatParisDateTime, parisToDate } from '@/lib/dates';

const schema = z
  .object({ day: z.string().min(1, 'Choisissez la date de publication'), time: z.string().min(1, "Choisissez l'heure de publication") })
  .refine((value) => parisToDate(value.day, value.time).getTime() > Date.now(), {
    path: ['day'],
    message: 'La date de publication doit être dans le futur',
    when: ({ value }) => z.object({ day: z.string().min(1), time: z.string().min(1) }).safeParse(value).success,
  });

export function ScheduleDialog({ open, onOpenChange, onSchedule }: { open: boolean; onOpenChange: (open: boolean) => void; onSchedule: (at: Date) => Promise<void> }) {
  const form = useZodForm(schema, { day: '', time: '09:00' });
  const returnFocus = useReturnFocus();
  const [day, time] = form.watch(['day', 'time']);
  const [now] = useState(() => Date.now());
  const at = day && time ? parisToDate(day, time) : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <Dialog.Content className={`${dialogContentClass} max-w-[460px]`} {...returnFocus}>
          <div className="flex gap-3">
            <DialogIcon tone="info" icon={Clock} />
            <div>
              <Dialog.Title className="text-[17px] font-semibold">Programmer la publication</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-secondary">Le contenu sera publié automatiquement à la date choisie.</Dialog.Description>
            </div>
          </div>
          <Form
            form={form}
            requiredNote={false}
            className="mt-5 space-y-4"
            summaryTitle={(count) => `${count} erreur${count > 1 ? 's' : ''} à corriger`}
            onSubmit={async (value) => {
              await onSchedule(parisToDate(value.day, value.time));
              onOpenChange(false);
            }}
          >
            <DateField name="day" label="Date" required />
            <TimeField name="time" label="Heure" required />
            {at && at.getTime() > now && (
              <p className="flex gap-2 rounded-lg bg-info-bg p-3 text-info">
                <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                Publication le {formatParisDateTime(at)} (heure de Paris).
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="secondary">
                  Annuler
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Programmer
              </Button>
            </div>
          </Form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
