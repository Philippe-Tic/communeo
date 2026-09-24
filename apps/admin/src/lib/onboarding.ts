/**
 * Assistant de création (#150–#154, handoff 6.18) : 7 étapes, progression enregistrée sur le Site
 * (`onboarding`) à chaque étape quittée ; données publiques pour pré-remplir (API Communeo, qui
 * interroge geo.api.gouv.fr et l'Annuaire de l'administration).
 */
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { OnboardingChecklist } from '@communeo/core';
import type { CommuneDetails, CommuneMatch } from '@communeo/core/client';
import { api } from './api';
import { sessionQuery, type SessionUser } from './session';
import { saveSiteSettings, type OnboardingProgress } from './site-settings';

export const ONBOARDING_STEPS = [
  { id: 'bienvenue', label: 'Bienvenue' },
  { id: 'commune', label: 'Votre commune' },
  { id: 'logo', label: 'Votre logo' },
  { id: 'theme', label: 'Votre thème' },
  { id: 'obligations', label: 'Obligations' },
  { id: 'pages', label: 'Premières pages' },
  { id: 'mise-en-ligne', label: 'Mise en ligne' },
] as const;

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

/** Assistant à proposer : commune créée par l'équipe, pas encore terminé */
export const onboardingPending = (user: SessionUser | undefined) => {
  const progress = user?.site?.onboarding;
  return (
    !!progress &&
    !progress.completedAt &&
    (user?.municipality_role === 'admin' || user?.municipality_role === 'super_admin')
  );
};

export const searchCommunes = (q: string) =>
  api<{ data: CommuneMatch[] }>(`/api/onboarding/communes?${new URLSearchParams({ q })}`).then(
    (response) => response.data,
  );

export const communeDetails = (insee: string) =>
  api<{ data: CommuneDetails }>(`/api/onboarding/communes/${encodeURIComponent(insee)}`).then(
    (response) => response.data,
  );

/** Enregistre la progression (et, avec `data`, les réglages de l'étape) ; la session suit */
export async function saveProgress(
  client: QueryClient,
  siteDocumentId: string,
  progress: OnboardingProgress,
  data: Record<string, unknown> = {},
  cached?: Record<string, unknown>,
) {
  await saveSiteSettings(
    client,
    siteDocumentId,
    { ...data, onboarding: progress },
    { ...(cached ?? data), onboarding: progress },
  );
  client.setQueryData(sessionQuery.queryKey, (user) =>
    user?.site ? { ...user, site: { ...user.site, onboarding: progress } } : user,
  );
}

/** Checklist « Pour terminer votre site » (#154) : tableau de bord et écran de succès */
export const checklistQuery = queryOptions({
  queryKey: ['checklist'],
  queryFn: () =>
    api<{ data: OnboardingChecklist & { visible: boolean } }>('/api/onboarding/checklist').then(
      (response) => response.data,
    ),
  // Recalculée à chaque visite : on revient souvent de l'écran où l'on vient de compléter un point
  staleTime: 0,
});

/** « Masquer » : pour toute la commune */
export async function hideChecklist(client: QueryClient) {
  await api('/api/onboarding/checklist/hide', { method: 'POST' });
  client.setQueryData(checklistQuery.queryKey, (current) => (current ? { ...current, visible: false } : current));
}
