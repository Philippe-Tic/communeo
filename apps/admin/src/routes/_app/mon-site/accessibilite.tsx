import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mon-site/accessibilite')({
  component: () => <ComingSoon title="Accessibilité" ticket={143} />,
});
