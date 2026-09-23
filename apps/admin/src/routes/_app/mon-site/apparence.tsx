import { createFileRoute } from '@tanstack/react-router';
import { AdminOnly } from '@/components/admin-only';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mon-site/apparence')({
  component: () => (
    <AdminOnly subject="L'apparence du site">
      <ComingSoon title="Apparence" ticket={144} />
    </AdminOnly>
  ),
});
