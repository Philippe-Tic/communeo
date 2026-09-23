import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/page-header';

export const Route = createFileRoute('/_app/mon-site/legal')({
  component: () => <ComingSoon title="Mentions légales et RGPD" ticket={143} />,
});
