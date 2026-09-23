import { createFileRoute } from '@tanstack/react-router';
import { CalendarDays } from 'lucide-react';
import { useCallback } from 'react';
import { ContentList } from '@/components/content-list/content-list';
import { EVENTS_LIST } from '@/components/content-list/events';
import { listSearch, type ListSearch } from '@/components/content-list/types';

export const Route = createFileRoute('/_app/agenda')({
  validateSearch: listSearch(EVENTS_LIST.filters),
  component: function List() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (patch: Partial<ListSearch>, options?: { replace?: boolean }) => void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: options?.replace }),
      [navigate],
    );
    return <ContentList config={EVENTS_LIST} search={search} onSearchChange={onSearchChange} icon={CalendarDays} />;
  },
});
