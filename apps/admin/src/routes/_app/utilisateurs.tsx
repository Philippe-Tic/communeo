import { createFileRoute } from '@tanstack/react-router';
import { AdminOnly } from '@/components/admin-only';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/utilisateurs')({
  component: () => (
    <AdminOnly subject="La gestion des utilisateurs">
      <ComingSoon title="Utilisateurs" ticket={146} />
    </AdminOnly>
  ),
});
