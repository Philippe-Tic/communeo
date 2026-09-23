import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/')({
  component: () => <ComingSoon title="Tableau de bord" ticket={147} />,
});
