import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mon-site/reseaux')({
  component: () => <ComingSoon title="Réseaux sociaux" ticket={143} />,
});
