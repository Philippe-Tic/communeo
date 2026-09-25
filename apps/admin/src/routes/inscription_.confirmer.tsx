import { createFileRoute } from '@tanstack/react-router';
import { SignupConfirmScreen } from '@/components/signup/confirm-screen';

export const Route = createFileRoute('/inscription_/confirmer')({
  validateSearch: (search: Record<string, unknown>): { jeton?: string } => (typeof search.jeton === 'string' ? { jeton: search.jeton } : {}),
  component: function Screen() {
    const { jeton } = Route.useSearch();
    return <SignupConfirmScreen token={jeton} />;
  },
});
