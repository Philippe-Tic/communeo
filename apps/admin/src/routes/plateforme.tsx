/**
 * Espace de l'équipe Communeo (super admin) : communes, utilisateurs, statistiques.
 * Y entrer quitte l'administration de la commune consultée.
 */
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { EquipeShell } from '@/components/equipe/equipe-shell';
import { auth, isUnauthenticated } from '@/lib/api';
import { sessionQuery } from '@/lib/session';

export const Route = createFileRoute('/plateforme')({
  beforeLoad: async ({ context, location }) => {
    if (auth.impersonatedSite()) {
      auth.setImpersonatedSite(null);
      context.queryClient.clear();
    }
    try {
      const user = await context.queryClient.ensureQueryData(sessionQuery);
      if (user.municipality_role !== 'super_admin') throw redirect({ to: '/' });
    } catch (error) {
      if (isUnauthenticated(error)) throw redirect({ to: '/connexion', search: { retour: location.href } });
      throw error;
    }
  },
  component: EquipeLayout,
});

function EquipeLayout() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  return (
    <EquipeShell user={user}>
      <Outlet />
    </EquipeShell>
  );
}
