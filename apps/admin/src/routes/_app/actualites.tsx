import { createFileRoute } from '@tanstack/react-router';
import { Newspaper } from 'lucide-react';
import { useCallback } from 'react';
import { ContentList } from '@/components/content-list/content-list';
import { ARTICLES_LIST } from '@/components/content-list/articles';
import { listSearch, type ListSearch } from '@/components/content-list/types';

export const Route = createFileRoute('/_app/actualites')({
  validateSearch: listSearch(ARTICLES_LIST.filters),
  component: function List() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (patch: Partial<ListSearch>, options?: { replace?: boolean }) => void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: options?.replace }),
      [navigate],
    );
    return <ContentList config={ARTICLES_LIST} search={search} onSearchChange={onSearchChange} icon={Newspaper} />;
  },
});
