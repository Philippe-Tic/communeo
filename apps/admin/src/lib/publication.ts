/**
 * État de la mise en ligne (GET /api/deployment/state) : en-tête et écran « Mise en ligne ».
 */
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export type PublicationState = 'idle' | 'pending' | 'running' | 'failed' | 'ok';

export interface PublicationStatus {
  state: PublicationState;
  pendingCount: number;
  /** `queued` : demande déposée, le worker ne l'a pas encore prise */
  step: 'queued' | 'checking' | 'rendering' | 'publishing' | 'cache' | null;
  reference: string | null;
  /** Mise en ligne automatique prévue (modifications en attente) */
  scheduledAt?: string | null;
}

export const publicationQuery = queryOptions({
  queryKey: ['publication'],
  queryFn: () => api<PublicationStatus>('/api/deployment/state'),
  // Pendant une mise en ligne, l'état est suivi de près
  refetchInterval: (query) => (query.state.data?.state === 'running' ? 2000 : 30_000),
});

export function usePublish() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ status: string }>('/api/deployment/trigger', { method: 'POST' }),
    // Demande acceptée : « en cours » tout de suite, sans attendre la prochaine lecture de l'état
    // (le bouton ne doit pas réapparaître entre le clic et le départ du build)
    onSuccess: () =>
      client.setQueryData(publicationQuery.queryKey, (current) => (current ? { ...current, state: 'running' as const, step: current.step ?? ('queued' as const) } : current)),
    onSettled: () => client.invalidateQueries({ queryKey: publicationQuery.queryKey }),
  });
}
