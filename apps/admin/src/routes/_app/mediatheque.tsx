import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { MediaScreen, mediaSearch, type MediaSearch } from '@/components/media/media-screen';

export const Route = createFileRoute('/_app/mediatheque')({
  validateSearch: mediaSearch,
  component: function Mediatheque() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (patch: Partial<MediaSearch>, options?: { replace?: boolean }) =>
        void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: options?.replace }),
      [navigate],
    );
    return <MediaScreen search={search} onSearchChange={onSearchChange} />;
  },
});
