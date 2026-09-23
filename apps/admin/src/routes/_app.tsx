/**
 * Layout de l'administration : toutes les routes sous _app/ sont protégées et affichées dans le shell.
 */
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { AppShell } from '@/components/shell/app-shell';
import { ApiError, auth } from '@/lib/api';
import { hasSession, sessionQuery } from '@/lib/session';

export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    if (!hasSession()) throw redirect({ to: '/connexion', search: { retour: location.href } });
    try {
      await context.queryClient.ensureQueryData(sessionQuery);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        auth.setToken(null);
        throw redirect({ to: '/connexion', search: { retour: location.href } });
      }
      throw error;
    }
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
