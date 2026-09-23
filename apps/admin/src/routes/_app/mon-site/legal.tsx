import { createFileRoute } from '@tanstack/react-router';
import { AdminOnly } from '@/components/admin-only';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mon-site/legal')({
  component: () => (
    <AdminOnly subject="La page des mentions légales et du RGPD">
      <ComingSoon title="Mentions légales et RGPD" ticket={143} />
    </AdminOnly>
  ),
});
