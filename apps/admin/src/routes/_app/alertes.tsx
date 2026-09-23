import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/alertes')({
  component: () => <ComingSoon title="Alertes et perturbations" ticket={141} />,
});
