/**
 * Suppression de la commune (#391) : un administrateur la demande en tapant le nom de la commune ;
 * elle a lieu 7 jours plus tard, annulable jusque-là (bandeau, écran « Supprimer la commune »).
 * L'équipe Communeo supprime tout de suite depuis la fiche de la commune.
 */
import type { QueryClient } from '@tanstack/react-query';
import { api } from './api';
import { sessionQuery, type SessionSite } from './session';

export interface DeletionState {
  scheduledAt: string | null;
}

/** Date de suppression prévue, ou null */
export const deletionScheduledAt = (site: SessionSite | null | undefined): Date | null =>
  site?.deletion_scheduled_at ? new Date(site.deletion_scheduled_at) : null;

export const requestCommuneDeletion = (name: string) =>
  api<{ data: DeletionState }>('/api/commune-deletion/request', { method: 'POST', json: { name } }).then((response) => response.data);

export const cancelCommuneDeletion = () =>
  api<{ data: DeletionState }>('/api/commune-deletion/cancel', { method: 'POST' }).then((response) => response.data);

/** La session porte la date : bandeau et écran suivent tout de suite */
export function setDeletionInSession(client: QueryClient, state: DeletionState) {
  client.setQueryData(sessionQuery.queryKey, (user) =>
    user?.site ? { ...user, site: { ...user.site, deletion_scheduled_at: state.scheduledAt } } : user,
  );
}
