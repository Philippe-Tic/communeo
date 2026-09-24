import { Check, CircleAlert, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { relativeTime } from '@/lib/dates';
import type { SaveState } from './use-autosave';

/** « ✓ Brouillon enregistré il y a 5 s » (mis à jour chaque seconde, sans annonce répétée) */
export function SaveStatus({
  state,
  onRetry,
  saved = 'Brouillon enregistré',
  failed = 'Brouillon non enregistré',
  showReason = false,
}: {
  state: SaveState;
  onRetry: () => void;
  /** « Brouillon enregistré » (contenus) ; « Enregistré » (réglages enregistrés automatiquement) */
  saved?: string;
  failed?: string;
  /** Affiche la raison de l'échec (champs à compléter…) */
  showReason?: boolean;
}) {
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
        {failed}
        {showReason && <span className="text-text">: {state.message}</span>}
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
        {saved} {relativeTime(state.at, now)}
      </span>
    );
  }
  return null;
}
