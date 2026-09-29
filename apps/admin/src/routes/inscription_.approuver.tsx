import { createFileRoute } from '@tanstack/react-router';
import { SignupApproveScreen } from '@/components/signup/approve-screen';

export const Route = createFileRoute('/inscription_/approuver')({
  validateSearch: (search: Record<string, unknown>): { jeton?: string } => (typeof search.jeton === 'string' ? { jeton: search.jeton } : {}),
  component: function Screen() {
    const { jeton } = Route.useSearch();
    return <SignupApproveScreen token={jeton} />;
  },
});
