import { createFileRoute } from '@tanstack/react-router';
import { AdminOnly } from '@/components/admin-only';
import { UsersScreen } from '@/components/users/users-screen';

export const Route = createFileRoute('/_app/utilisateurs')({
  component: () => (
    <AdminOnly subject="La gestion des utilisateurs">
      <UsersScreen />
    </AdminOnly>
  ),
});
