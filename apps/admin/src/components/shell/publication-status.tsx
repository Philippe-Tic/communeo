/**
 * État de la mise en ligne dans l'en-tête : « Site à jour » ou « Modifications en attente de mise en ligne »
 * suivi de « Mettre en ligne » (seulement quand il y a quelque chose à mettre en ligne).
 */
import { useQuery } from '@tanstack/react-query';
import { CircleAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { publicationQuery, usePublish } from '@/lib/publication';
import { cn } from '@/lib/utils';

export function PublicationStatus({ className, stacked }: { className?: string; stacked?: boolean }) {
  const { data } = useQuery(publicationQuery);
  const publish = usePublish();
  if (!data) return null;

  const running = data.state === 'running' || publish.isPending;
  const badge = running ? (
    <StatusBadge size="md" tone="info" icon={<Loader2 aria-hidden="true" className="size-3 animate-spin" />}>
      Mise en ligne en cours…
    </StatusBadge>
  ) : data.state === 'failed' ? (
    <StatusBadge size="md" tone="danger" icon={<CircleAlert aria-hidden="true" className="size-3" />}>
      La dernière mise en ligne a échoué
    </StatusBadge>
  ) : data.state === 'pending' ? (
    <StatusBadge size="md" tone="warning">Modifications en attente de mise en ligne</StatusBadge>
  ) : (
    <StatusBadge size="md" tone="success">Site à jour</StatusBadge>
  );

  const action = !running && (data.state === 'pending' || data.state === 'failed');
  return (
    <div className={cn('flex items-center gap-3', stacked && 'flex-col items-stretch', className)}>
      <div role="status" aria-live="polite">
        {badge}
      </div>
      {action && (
        <Button size={stacked ? 'lg' : 'sm'} onClick={() => publish.mutate()}>
          {data.state === 'failed' ? 'Réessayer la mise en ligne' : 'Mettre en ligne'}
        </Button>
      )}
    </div>
  );
}
