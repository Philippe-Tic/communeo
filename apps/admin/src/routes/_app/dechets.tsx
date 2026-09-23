import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/dechets')({
  component: () => <ComingSoon title="Collecte des déchets" ticket={141} />,
});
