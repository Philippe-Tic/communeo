import { createFileRoute } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import { useCallback } from 'react';
import { ContentList } from '@/components/content-list/content-list';
import { DOCUMENTS_LIST } from '@/components/content-list/documents';
import { listSearch, type ListSearch } from '@/components/content-list/types';

export const Route = createFileRoute('/_app/documents')({
  validateSearch: listSearch(DOCUMENTS_LIST.filters, DOCUMENTS_LIST.tabs),
  component: function List() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (patch: Partial<ListSearch>, options?: { replace?: boolean }) => void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: options?.replace }),
      [navigate],
    );
    return <ContentList config={DOCUMENTS_LIST} search={search} onSearchChange={onSearchChange} icon={FileText} />;
  },
});
