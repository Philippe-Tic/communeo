/**
 * Bulle d'information (toggletip) : un bouton qui ouvre une explication au clic, au toucher ou au
 * clavier (Entrée, Espace ; Échap la ferme et rend le focus au bouton). Contrairement à l'info-bulle
 * au survol (`tooltip.tsx`), elle marche sur mobile et peut contenir plusieurs paragraphes.
 */
import { Popover } from 'radix-ui';
import { Info, X } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function InfoBubble({
  label,
  title,
  children,
  className,
}: {
  /** Texte visible du bouton (une question courte) */
  label: string;
  /** Titre de la bulle */
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex min-h-11 items-center gap-1.5 rounded-md text-left text-[13px] font-semibold text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand md:min-h-0',
            className,
          )}
        >
          <Info aria-hidden="true" className="size-4 shrink-0" />
          {label}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={16}
          aria-labelledby={`${id}-titre`}
          className="z-50 max-h-[var(--radix-popover-content-available-height)] w-[min(480px,calc(100vw-32px))] overflow-y-auto rounded-xl border border-border-dialog bg-surface p-4 text-[13px] text-text shadow-dialog"
        >
          <div className="flex items-start justify-between gap-3">
            <p id={`${id}-titre`} className="text-[15px] font-semibold">
              {title}
            </p>
            <Popover.Close
              aria-label="Fermer"
              className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-md text-secondary hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-brand"
            >
              <X aria-hidden="true" className="size-4" />
            </Popover.Close>
          </div>
          <div className="mt-2 space-y-2 leading-relaxed">{children}</div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
