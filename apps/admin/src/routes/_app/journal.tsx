import { createFileRoute } from '@tanstack/react-router';
import { ActivityLog } from '@/components/activity/activity-log';
import { AdminOnly } from '@/components/admin-only';
import { PageHeader } from '@/components/page-header';

export const Route = createFileRoute('/_app/journal')({
  component: () => (
    <AdminOnly subject="Le journal d'activité">
      <div className="mx-auto max-w-[1100px]">
        <PageHeader
          title="Journal d'activité"
          description="Connexions, publications, suppressions et changements de réglages, y compris ceux faits par l'équipe Communeo."
        />
        <ActivityLog />
      </div>
    </AdminOnly>
  ),
});
