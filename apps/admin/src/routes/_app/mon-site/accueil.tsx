import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mon-site/accueil')({
  component: () => <ComingSoon title="Page d'accueil" ticket={143} />,
});
