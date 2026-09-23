import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/agenda')({
  component: () => <ComingSoon title="Agenda" ticket={138} />,
});
