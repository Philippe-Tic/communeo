import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mediatheque')({
  component: () => <ComingSoon title="Médiathèque" ticket={142} />,
});
