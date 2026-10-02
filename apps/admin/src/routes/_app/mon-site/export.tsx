import { createFileRoute } from '@tanstack/react-router';
import { AdminOnly } from '@/components/admin-only';
import { ExportScreen } from '@/components/settings/export-screen';

export const Route = createFileRoute('/_app/mon-site/export')({
  component: () => (
    <AdminOnly subject="L'export des données">
      <ExportScreen />
    </AdminOnly>
  ),
});
