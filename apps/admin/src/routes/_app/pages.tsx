import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/pages')({
  component: () => <ComingSoon title="Pages" ticket={137} />,
});
