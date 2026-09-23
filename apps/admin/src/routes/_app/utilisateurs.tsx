import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/utilisateurs')({
  component: () => <ComingSoon title="Utilisateurs" ticket={146} />,
});
