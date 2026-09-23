import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/cantine')({
  component: () => <ComingSoon title="Cantine" ticket={141} />,
});
