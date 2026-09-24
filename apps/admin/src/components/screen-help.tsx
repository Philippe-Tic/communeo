import { useRouterState } from '@tanstack/react-router';
import { SCREEN_HELP } from '@/lib/help';
import { cn } from '@/lib/utils';

/** Aide contextuelle de l'écran courant, sous son titre (une phrase ; rien pour un écran sans aide) */
export function ScreenHelp({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const help = SCREEN_HELP[pathname.replace(/\/$/, '')];
  if (!help) return null;
  return <p className={cn('mt-1 max-w-[680px] text-[13px] text-secondary', className)}>{help}</p>;
}
