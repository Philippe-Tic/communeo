import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';

export const TooltipProvider = TooltipPrimitive.Provider;

/** Info-bulle : complète un libellé déjà présent (aria-label), ne le remplace jamais. */
export function Tooltip({ label, side = 'right', children }: { label: string; side?: 'top' | 'right' | 'bottom' | 'left'; children: ReactNode }) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className="z-50 rounded-md bg-text px-2 py-1 text-xs font-medium text-bg shadow-menu"
        >
          {label}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
