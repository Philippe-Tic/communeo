import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mon-compte')({
  component: () => <ComingSoon title="Mon compte" ticket={132} />,
});
