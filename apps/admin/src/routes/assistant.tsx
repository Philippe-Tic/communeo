/**
 * Assistant de création (#150–#154) : plein écran, hors du shell de l'administration. Réservé aux
 * administrateurs (et à l'équipe Communeo dans une commune) ; `?etape=` choisit l'étape.
 */
import { createFileRoute, redirect } from '@tanstack/react-router';
import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { isUnauthenticated } from '@/lib/api';
import { TOTAL_STEPS } from '@/lib/onboarding';
import { needsSitePicker, sessionQuery } from '@/lib/session';

export const Route = createFileRoute('/assistant')({
  validateSearch: (raw: Record<string, unknown>): { etape?: number } => {
    const step = Number(raw.etape);
    return Number.isInteger(step) && step >= 1 && step <= TOTAL_STEPS ? { etape: step } : {};
  },
  beforeLoad: async ({ context, location }) => {
    let user;
    try {
      user = await context.queryClient.ensureQueryData(sessionQuery);
    } catch (error) {
      if (isUnauthenticated(error)) throw redirect({ to: '/connexion', search: { retour: location.href } });
      throw error;
    }
    if (needsSitePicker(user)) throw redirect({ to: '/plateforme' });
    if (user.municipality_role === 'editor') throw redirect({ to: '/' });
  },
  component: AssistantRoute,
});

function AssistantRoute() {
  const { etape } = Route.useSearch();
  return <OnboardingScreen step={etape} />;
}
