import { createFileRoute } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import { useCallback } from 'react';
import { ContentList } from '@/components/content-list/content-list';
import { PAGES_LIST } from '@/components/content-list/pages';
import { listSearch, type ListSearch } from '@/components/content-list/types';

export const Route = createFileRoute('/_app/pages')({
  validateSearch: listSearch(PAGES_LIST.filters),
  component: PagesList,
});

function PagesList() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const onSearchChange = useCallback(
    (patch: Partial<ListSearch>, options?: { replace?: boolean }) => void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: options?.replace }),
    [navigate],
  );
  return <ContentList config={PAGES_LIST} search={search} onSearchChange={onSearchChange} icon={FileText} />;
}
