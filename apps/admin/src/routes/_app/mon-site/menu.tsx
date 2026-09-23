import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mon-site/menu')({
  component: () => <ComingSoon title="Menu du site" ticket={137} />,
});
