import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mise-en-ligne')({
  component: () => <ComingSoon title="Mise en ligne" ticket={145} />,
});
