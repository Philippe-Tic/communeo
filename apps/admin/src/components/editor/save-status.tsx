import { Check, CircleAlert, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { relativeTime } from '@/lib/dates';
import type { SaveState } from './use-autosave';

/** « ✓ Brouillon enregistré il y a 5 s » (mis à jour chaque seconde, sans annonce répétée) */
export function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (state.status !== 'saved') return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [state.status]);

  if (state.status === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-secondary">
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
        Enregistrement…
      </span>
    );
  }
  if (state.status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-danger">
        <CircleAlert aria-hidden="true" className="size-3.5" />
        Brouillon non enregistré
        <button type="button" className="font-semibold underline underline-offset-2" onClick={onRetry}>
          Réessayer
        </button>
      </span>
    );
  }
  if (state.status === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-secondary">
        <Check aria-hidden="true" className="size-3.5 text-success" />
        Brouillon enregistré {relativeTime(state.at, now)}
      </span>
    );
  }
  return null;
}
