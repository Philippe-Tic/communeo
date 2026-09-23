/**
 * Statut d'un contenu, identique dans les listes et l'éditeur : Brouillon, Publié, Programmé
 * (avec la date), et « modifications non publiées » pour un contenu en ligne retouché depuis.
 */
import { Clock } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import type { PublicationState } from '@/lib/content-list';
import { formatShortParisDateTime } from '@/lib/dates';
import { cn } from '@/lib/utils';

export function PublicationBadge({ state, scheduledAt, className }: { state: PublicationState; scheduledAt?: string | null; className?: string }) {
  if (scheduledAt) {
    return (
      <StatusBadge tone="info" icon={<Clock aria-hidden="true" className="size-3" />} className={className}>
        Programmé le {formatShortParisDateTime(new Date(scheduledAt))}
      </StatusBadge>
    );
  }
  if (state === 'draft') {
    return (
      <StatusBadge tone="neutral" className={className}>
        Brouillon
      </StatusBadge>
    );
  }
  return (
    <span className={cn('inline-flex flex-col items-start gap-1', className)}>
      <StatusBadge tone="success">Publié</StatusBadge>
      {state === 'modified' && <span className="text-xs text-secondary">Modifications non publiées</span>}
    </span>
  );
}
