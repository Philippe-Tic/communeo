import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { NewsletterScreen, newsletterSearch, type NewsletterSearch } from '@/components/newsletter/newsletter-screen';

export const Route = createFileRoute('/_app/newsletter')({
  validateSearch: newsletterSearch,
  component: function Newsletter() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (patch: Partial<NewsletterSearch>, options?: { replace?: boolean }) => void navigate({ search: (previous) => ({ ...previous, ...patch }), replace: options?.replace }),
      [navigate],
    );
    return <NewsletterScreen search={search} onSearchChange={onSearchChange} />;
  },
});
