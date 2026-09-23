/**
 * Refuser une proposition (handoff « 6.13 Refuser une proposition ») : le motif est envoyé au
 * demandeur par e-mail, il est donc obligatoire et rédigé en s'adressant à lui. Trois raccourcis
 * pré-remplissent le champ, qui reste modifiable.
 */
import { AlertDialog } from 'radix-ui';
import { CircleAlert, Loader2, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogIcon, dialogContentClass, useReturnFocus } from '@/components/ui/confirm-dialog';
import { ApiError } from '@/lib/api';
import { REJECTION_PRESETS, type Association } from '@/lib/associations';
import { cn } from '@/lib/utils';

const MAX_LENGTH = 2000;

export function RejectDialog({
  association,
  onOpenChange,
  onReject,
}: {
  /** Proposition à refuser ; `null` : fenêtre fermée */
  association: Association | null;
  onOpenChange: (open: boolean) => void;
  onReject: (reason: string) => Promise<void>;
}) {
  const returnFocus = useReturnFocus();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const ids = { field: useId(), error: useId(), presets: useId() };
  const [shown, setShown] = useState<Association | null>(association);
  // Nouvelle proposition : champ vide
  if (association && association !== shown) {
    setShown(association);
    setReason('');
    setError(null);
    setFailure(null);
  }
  const current = association ?? shown;
  const requester = current?.submitted_by_name?.trim();

  const submit = async () => {
    const text = reason.trim();
    const problem = !text
      ? 'Écrivez le motif : il est envoyé au demandeur.'
      : text.length > MAX_LENGTH
        ? 'Le motif ne doit pas dépasser 2 000 caractères.'
        : null;
    setError(problem);
    if (problem) {
      field.current?.focus();
      return;
    }
    setPending(true);
    setFailure(null);
    try {
      await onReject(text);
      onOpenChange(false);
    } catch (caught) {
      setFailure(caught instanceof ApiError ? caught.message : "Le refus n'a pas pu être enregistré.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog.Root open={!!association} onOpenChange={(value) => !pending && onOpenChange(value)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <AlertDialog.Content className={cn(dialogContentClass, 'max-w-[540px]')} {...returnFocus}>
          <div className="flex gap-3">
            <DialogIcon tone="danger" icon={X} />
            <div>
              <AlertDialog.Title className="text-[17px] font-semibold">Refuser « {current?.name} » ?</AlertDialog.Title>
              <AlertDialog.Description className="mt-1.5 text-secondary">
                {current?.submitted_by_email
                  ? `${requester || 'Le demandeur'} recevra votre motif par e-mail. La proposition sera archivée, elle pourra en soumettre une nouvelle.`
                  : "La proposition sera archivée. Aucune adresse e-mail n'a été donnée : le motif ne pourra pas être envoyé."}
              </AlertDialog.Description>
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor={ids.field} className="font-semibold">
              Motif{' '}
              <span aria-hidden="true" className="text-danger">
                *
              </span>
              <span className="sr-only">(obligatoire)</span>
            </label>
            <div role="group" aria-label="Motifs courants" id={ids.presets} className="mt-2 flex flex-wrap gap-2">
              {REJECTION_PRESETS.map((preset) => {
                const chosen = reason === preset.text;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => {
                      setReason(preset.text);
                      setError(null);
                      field.current?.focus();
                    }}
                    className={cn(
                      'inline-flex min-h-9 items-center rounded-full border px-3 text-[13px]',
                      chosen
                        ? 'border-brand bg-brand-soft font-semibold text-brand'
                        : 'border-border-input hover:bg-surface-hover',
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <textarea
              ref={field}
              id={ids.field}
              value={reason}
              rows={4}
              aria-required="true"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ids.error : undefined}
              onChange={(event) => {
                setReason(event.target.value);
                if (error) setError(null);
              }}
              className={cn(
                'mt-3 w-full resize-y rounded-lg border border-border-input bg-surface px-3 py-2.5 leading-relaxed dark:bg-bg',
                error && 'border-danger',
              )}
            />
            {error && (
              <p id={ids.error} className="mt-1.5 text-[13px] font-medium text-danger">
                {error}
              </p>
            )}
          </div>

          {failure && (
            <p role="alert" className="mt-4 flex gap-2 text-[13px] text-danger">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {failure}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={pending}>
                Annuler
              </Button>
            </AlertDialog.Cancel>
            <Button variant="destructive" disabled={pending} onClick={() => void submit()}>
              {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {current?.submitted_by_email ? 'Refuser et envoyer le motif' : 'Refuser'}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
