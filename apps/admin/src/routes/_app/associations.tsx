import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/associations')({
  component: () => <ComingSoon title="Associations" ticket={140} />,
});
