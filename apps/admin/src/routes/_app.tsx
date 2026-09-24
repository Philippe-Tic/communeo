/**
 * Layout de l'administration : toutes les routes sous _app/ sont protégées et affichées dans le shell.
 */
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppShell } from '@/components/shell/app-shell';
import { ApiError, auth, isUnauthenticated } from '@/lib/api';
import { needsSitePicker, sessionQuery } from '@/lib/session';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    let user;
    try {
      user = await context.queryClient.ensureQueryData(sessionQuery);
    } catch (error) {
      if (isUnauthenticated(error)) throw redirect({ to: '/connexion', search: { retour: location.href } });
      // Commune consultée supprimée entre-temps : retour à la liste
      if (error instanceof ApiError && error.status === 404 && auth.impersonatedSite()) {
        auth.setImpersonatedSite(null);
        throw redirect({ to: '/plateforme' });
      }
      throw error;
    }
    if (needsSitePicker(user)) throw redirect({ to: '/plateforme' });
  },
  component: AppLayout,
});

function AppLayout() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  return (
    <AppShell user={user}>
      <Outlet />
    </AppShell>
  );
}
