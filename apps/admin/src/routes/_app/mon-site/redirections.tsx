import { createFileRoute } from '@tanstack/react-router';
import { AdminOnly } from '@/components/admin-only';
import { RedirectsScreen } from '@/components/settings/redirects-screen';

export const Route = createFileRoute('/_app/mon-site/redirections')({
  component: () => (
    <AdminOnly subject="Les redirections">
      <RedirectsScreen />
    </AdminOnly>
  ),
});
