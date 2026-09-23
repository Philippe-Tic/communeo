import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mon-site/demarches')({
  component: () => <ComingSoon title="Démarches" ticket={143} />,
});
