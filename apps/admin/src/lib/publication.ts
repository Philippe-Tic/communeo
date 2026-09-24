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
  lastDeployment?: {
    status: DeploymentStatus;
    reason: DeploymentReason | null;
    reference: string | null;
    step: string | null;
    triggeredAt: string;
    completedAt: string | null;
    /** Durée en secondes */
    buildTime: number | null;
    triggeredBy: Person | null;
  } | null;
  /** Ce qui sera mis en ligne */
  pending?: PendingChange[];
}

export type DeploymentStatus = 'building' | 'ready' | 'error';
export type DeploymentReason = 'manual' | 'content' | 'scheduled' | 'domain';
export type Person = { firstName: string | null; lastName: string | null };

export interface PendingChange {
  /** UID Strapi du contenu (api::page.page…) */
  type: string;
  documentId: string | null;
  title: string;
  action: 'create' | 'update' | 'publish' | 'unpublish' | 'delete' | string;
  source: 'person' | 'scheduled' | string;
  author: Person | null;
  occurredAt: string;
}

/** Une mise en ligne de l'historique (GET /api/deployment/status) */
export interface Deployment {
  documentId: string;
  status: DeploymentStatus;
  reason: DeploymentReason | null;
  reference: string | null;
  error_message: string | null;
  triggered_at: string;
  completed_at: string | null;
  build_time: number | null;
  triggered_by: { first_name: string | null; last_name: string | null } | null;
}

export const HISTORY_SIZE = 30;

export const deploymentHistoryQuery = queryOptions({
  queryKey: ['publication', 'historique'],
  queryFn: () => api<{ data: Deployment[] }>(`/api/deployment/status?pageSize=${HISTORY_SIZE}`).then((response) => response.data),
  refetchInterval: (query) => (query.state.data?.some((deployment) => deployment.status === 'building') ? 3000 : false),
});

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
