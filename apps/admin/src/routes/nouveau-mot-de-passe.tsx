import { createFileRoute } from '@tanstack/react-router';
import { SetPasswordScreen } from '@/components/access/set-password';

export const Route = createFileRoute('/nouveau-mot-de-passe')({
  validateSearch: (search: Record<string, unknown>): { jeton?: string } => (typeof search.jeton === 'string' ? { jeton: search.jeton } : {}),
  component: function Screen() {
    const { jeton } = Route.useSearch();
    return <SetPasswordScreen token={jeton} purpose="reset" />;
  },
});
