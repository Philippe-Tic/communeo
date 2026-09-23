import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mon-site/informations')({
  component: () => <ComingSoon title="Informations de la commune" ticket={143} />,
});
