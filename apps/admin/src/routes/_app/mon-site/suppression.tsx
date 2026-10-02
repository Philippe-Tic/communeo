import { createFileRoute } from '@tanstack/react-router';
import { AdminOnly } from '@/components/admin-only';
import { DeletionScreen } from '@/components/settings/deletion-screen';

export const Route = createFileRoute('/_app/mon-site/suppression')({
  component: () => (
    <AdminOnly subject="La suppression de la commune">
      <DeletionScreen />
    </AdminOnly>
  ),
});
