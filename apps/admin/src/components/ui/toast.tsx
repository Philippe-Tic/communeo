/**
 * Notifications (handoff « Toasts ») : en bas à droite, succès 6 s (role="status"), erreur persistante
 * (role="alert"), lien d'action, vrai bouton de fermeture. Inversées en mode sombre.
 */
import { CircleAlert, CircleCheck, WifiOff, X } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';

export type ToastKind = 'success' | 'error' | 'network';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function dismissToast(id: number) {
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

function push(kind: ToastKind, message: string, action?: ToastAction): number {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, kind, message, action }];
  emit();
  if (kind === 'success') setTimeout(() => dismissToast(id), 6000);
  return id;
}

export const toast = {
  success: (message: string, action?: ToastAction) => push('success', message, action),
  error: (message: string, action?: ToastAction) => push('error', message, action),
  network: (message: string, action?: ToastAction) => push('network', message, action),
};

const ICONS = {
  success: { icon: CircleCheck, className: 'text-[#8FD3A9] dark:text-success' },
  error: { icon: CircleAlert, className: 'text-[#F5A597] dark:text-danger' },
  network: { icon: WifiOff, className: 'text-[#F5C97A] dark:text-warning' },
};

export function Toaster() {
  const items = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toasts,
    () => toasts,
  );

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[calc(100vw-32px)] max-w-[420px] flex-col gap-2">
      {/* Régions toujours présentes : les annonces fonctionnent dès la première notification */}
      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        {items.filter((t) => t.kind === 'success').map((t) => <ToastItem key={t.id} toast={t} />)}
      </div>
      <div role="alert" aria-live="assertive" className="flex flex-col gap-2">
        {items.filter((t) => t.kind !== 'success').map((t) => <ToastItem key={t.id} toast={t} />)}
      </div>
    </div>
  );
}

function ToastItem({ toast: item }: { toast: Toast }) {
  const { icon: Icon, className } = ICONS[item.kind];
  return (
    <div className="pointer-events-auto flex items-start gap-3 rounded-[10px] bg-[#1C1B18] px-3.5 py-3 text-sm text-white shadow-toast dark:bg-[#F1EFE6] dark:text-[#1C1B18]">
      <Icon aria-hidden="true" className={cn('mt-0.5 size-[18px] shrink-0', className)} />
      <p className="flex-1">
        {item.message}
        {item.action && (
          <>
            {' '}
            <button
              type="button"
              className="font-semibold underline underline-offset-2"
              onClick={() => {
                item.action?.onClick();
                dismissToast(item.id);
              }}
            >
              {item.action.label}
            </button>
          </>
        )}
      </p>
      <button type="button" aria-label="Fermer la notification" className="grid size-6 shrink-0 place-items-center rounded" onClick={() => dismissToast(item.id)}>
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
