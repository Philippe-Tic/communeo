/**
 * Refus avec motif (#313) : le motif part par e-mail, il est donc obligatoire et rédigé en s'adressant
 * à son destinataire. Même fenêtre que le refus d'une proposition d'association.
 */
import { AlertDialog } from 'radix-ui';
import { CircleAlert, Loader2, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogIcon, dialogContentClass, useReturnFocus } from '@/components/ui/confirm-dialog';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const MAX_LENGTH = 2000;

export function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onReject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onReject: (reason: string) => Promise<void>;
}) {
  const returnFocus = useReturnFocus();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const field = useRef<HTMLTextAreaElement>(null);
  const ids = { field: useId(), error: useId() };
  // Nouvelle ouverture : champ vide
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason('');
      setError(null);
      setFailure(null);
    }
  }

  const submit = async () => {
    const text = reason.trim();
    const problem = !text
      ? 'Écrivez le motif : il est envoyé par e-mail.'
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
    <AlertDialog.Root open={open} onOpenChange={(value) => !pending && onOpenChange(value)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <AlertDialog.Content className={cn(dialogContentClass, 'max-w-[540px]')} {...returnFocus}>
          <div className="flex gap-3">
            <DialogIcon tone="danger" icon={X} />
            <div>
              <AlertDialog.Title className="text-[17px] font-semibold">{title}</AlertDialog.Title>
              <AlertDialog.Description className="mt-1.5 text-secondary">{description}</AlertDialog.Description>
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor={ids.field} className="font-semibold">
              Motif{' '}
              <span aria-hidden="true" className="text-danger">
                *
              </span>
            </label>
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
                'mt-2 w-full resize-y rounded-lg border border-border-input bg-surface px-3 py-2.5 leading-relaxed dark:bg-bg',
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
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
