import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import {
  AssociationsScreen,
  associationsSearch,
  type AssociationsSearch,
} from '@/components/associations/associations-screen';

export const Route = createFileRoute('/_app/associations')({
  validateSearch: associationsSearch,
  component: function Associations() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (patch: Partial<AssociationsSearch>, options?: { replace?: boolean }) =>
        void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: options?.replace }),
      [navigate],
    );
    return <AssociationsScreen search={search} onSearchChange={onSearchChange} />;
  },
});
