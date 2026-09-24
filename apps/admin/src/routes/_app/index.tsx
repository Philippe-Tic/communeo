import { createFileRoute, redirect } from '@tanstack/react-router';
import { DashboardScreen } from '@/components/dashboard/dashboard-screen';
import { onboardingPending } from '@/lib/onboarding';
import { sessionQuery } from '@/lib/session';

export const Route = createFileRoute('/_app/')({
  // Commune nouvellement créée : l'assistant d'abord pour son administrateur (sauf s'il a été remis
  // à plus tard) ; l'équipe Communeo, elle, voit la carte « Reprendre » du tableau de bord
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(sessionQuery);
    if (user.municipality_role === 'admin' && onboardingPending(user) && !user.site?.onboarding?.postponedAt)
      throw redirect({ to: '/assistant', search: { etape: user.site!.onboarding!.step } });
  },
  component: DashboardScreen,
});
