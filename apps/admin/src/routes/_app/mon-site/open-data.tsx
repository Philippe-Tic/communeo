import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mon-site/open-data')({
  component: () => <ComingSoon title="Open data" ticket={143} />,
});
