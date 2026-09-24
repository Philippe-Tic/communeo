import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/plateforme/statistiques')({
  component: () => <ComingSoon title="Statistiques" ticket={146} />,
});
