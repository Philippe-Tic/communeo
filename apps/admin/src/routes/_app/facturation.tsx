import { createFileRoute } from '@tanstack/react-router';
import { AdminOnly } from '@/components/admin-only';
import { BillingScreen } from '@/components/billing/billing-screen';

export const Route = createFileRoute('/_app/facturation')({
  component: () => (
    <AdminOnly subject="La facturation">
      <BillingScreen />
    </AdminOnly>
  ),
});
