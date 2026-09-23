import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/actualites')({
  component: () => <ComingSoon title="Actualités" ticket={138} />,
});
