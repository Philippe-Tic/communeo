import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/equipe')({
  component: () => <ComingSoon title="Équipe municipale" ticket={139} />,
});
