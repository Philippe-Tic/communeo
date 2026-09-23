import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { MessagesScreen, messagesSearch, type MessagesSearch } from '@/components/messages/messages-screen';

export const Route = createFileRoute('/_app/messages')({
  validateSearch: messagesSearch,
  component: function Messages() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (patch: Partial<MessagesSearch>, options?: { replace?: boolean }) =>
        void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: options?.replace }),
      [navigate],
    );
    return <MessagesScreen search={search} onSearchChange={onSearchChange} />;
  },
});
