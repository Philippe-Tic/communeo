/**
 * Offre d'une commune dans l'espace équipe (#310) : rien pour une commune en live, jours d'essai
 * restants, essai terminé, passage en live demandé.
 */
import { trialDaysLeft } from '@communeo/core';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CommuneSummary } from '@/lib/equipe';

export function PlanBadge({ commune, className }: { commune: CommuneSummary; className?: string }) {
  if (commune.plan === 'live') return null;
  if (commune.liveRequestedAt) {
    return (
      <StatusBadge tone="success" className={className}>
        Live demandé
      </StatusBadge>
    );
  }
  if (commune.plan === 'expired') {
    return (
      <StatusBadge tone="danger" className={className}>
        Essai terminé
      </StatusBadge>
    );
  }
  const days = commune.trialEndsAt ? trialDaysLeft(commune.trialEndsAt) : null;
  return (
    <StatusBadge tone={days != null && days <= 7 ? 'warning' : 'info'} className={className}>
      Essai{days != null && ` · ${days} jour${days > 1 ? 's' : ''}`}
    </StatusBadge>
  );
}
