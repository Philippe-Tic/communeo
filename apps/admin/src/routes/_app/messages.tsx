import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/messages')({
  component: () => <ComingSoon title="Messages" ticket={140} />,
});
