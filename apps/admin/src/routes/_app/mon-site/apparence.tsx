import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mon-site/apparence')({
  component: () => <ComingSoon title="Apparence" ticket={144} />,
});
