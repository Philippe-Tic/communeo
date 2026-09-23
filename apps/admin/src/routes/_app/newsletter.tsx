import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/newsletter')({
  component: () => <ComingSoon title="Newsletter" ticket={140} />,
});
