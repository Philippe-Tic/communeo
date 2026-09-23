/**
 * Fenêtres de confirmation (handoff 6.5) : titre qui nomme l'objet, une phrase de conséquence,
 * « Annuler » + action nommée. Suppression : role="alertdialog", focus initial sur « Annuler ».
 * Échap ferme, focus piégé, retour du focus au déclencheur.
 */
import { AlertDialog } from 'radix-ui';
import { CircleAlert, Info, Loader2, Trash2, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

type Tone = 'danger' | 'warning' | 'info';

const TONE: Record<Tone, { icon: LucideIcon; className: string }> = {
  danger: { icon: Trash2, className: 'bg-danger-bg text-danger' },
  warning: { icon: TriangleAlert, className: 'bg-warning-bg text-warning' },
  info: { icon: Info, className: 'bg-info-bg text-info' },
};

export const dialogContentClass = cn(
  'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-dialog bg-surface p-6 text-text shadow-dialog',
);

/**
 * Retour du focus à l'élément qui a ouvert la fenêtre : nos fenêtres s'ouvrent par un état React,
 * sans déclencheur Radix, qui ne saurait pas où rendre le focus.
 */
export function useReturnFocus() {
  const origin = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (event: Event) => {
      if (origin.current?.isConnected) {
        event.preventDefault();
        origin.current.focus();
      }
    },
  };
}

export function DialogIcon({ tone, icon }: { tone: Tone; icon?: LucideIcon }) {
  const Icon = icon ?? TONE[tone].icon;
  return (
    <span aria-hidden="true" className={cn('grid size-9 shrink-0 place-items-center rounded-lg', TONE[tone].className)}>
      <Icon className="size-[18px]" />
    </span>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tone?: Tone;
  icon?: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Peut être asynchrone : le bouton affiche l'attente et la fenêtre reste ouverte en cas d'erreur */
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({ open, onOpenChange, tone = 'danger', icon, title, description, confirmLabel, cancelLabel = 'Annuler', onConfirm }: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnFocus = useReturnFocus();

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L'opération n'a pas abouti.");
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={(value) => !pending && onOpenChange(value)}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <AlertDialog.Content className={dialogContentClass} {...returnFocus}>
          <div className="flex gap-3">
            <DialogIcon tone={tone} icon={icon} />
            <div>
              <AlertDialog.Title className="text-[17px] font-semibold">{title}</AlertDialog.Title>
              <AlertDialog.Description className="mt-1.5 text-secondary">{description}</AlertDialog.Description>
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-4 flex gap-2 text-[13px] text-danger">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={pending}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <Button variant={tone === 'danger' ? 'destructive' : 'primary'} disabled={pending} onClick={() => void confirm()}>
              {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/**
 * Départ avec des modifications non enregistrées : « Quitter sans enregistrer » (à gauche),
 * « Rester », « Enregistrer et quitter » (action principale).
 */
export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
  onSaveAndLeave,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
  onSaveAndLeave?: () => void | Promise<void>;
}) {
  const returnFocus = useReturnFocus();
  return (
    <AlertDialog.Root open={open} onOpenChange={(value) => !value && onStay()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <AlertDialog.Content className={dialogContentClass} {...returnFocus}>
          <div className="flex gap-3">
            <DialogIcon tone="warning" />
            <div>
              <AlertDialog.Title className="text-[17px] font-semibold">Modifications non enregistrées</AlertDialog.Title>
              <AlertDialog.Description className="mt-1.5 text-secondary">
                Si vous quittez cette page maintenant, vos dernières modifications seront perdues.
              </AlertDialog.Description>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button variant="tertiary" className="text-danger" onClick={onLeave}>
              Quitter sans enregistrer
            </Button>
            <div className="ml-auto flex gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">Rester</Button>
              </AlertDialog.Cancel>
              {onSaveAndLeave && <Button onClick={() => void onSaveAndLeave()}>Enregistrer et quitter</Button>}
            </div>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
