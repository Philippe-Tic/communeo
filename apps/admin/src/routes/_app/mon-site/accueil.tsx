import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { HomepageEditor } from '@/components/homepage/homepage-editor';
import { SettingsLoading, useSiteSettings } from '@/components/settings/settings-screen';
import { homepageQuery } from '@/lib/homepage';
import { sessionQuery } from '@/lib/session';

export const Route = createFileRoute('/_app/mon-site/accueil')({ component: HomepageRoute });

function HomepageRoute() {
  const { data: user } = useSuspenseQuery(sessionQuery);
  const site = useSiteSettings();
  const homepage = useQuery(homepageQuery(user.site!.documentId));
  if (!site.data || !homepage.data) {
    return (
      <SettingsLoading
        title="Page d'accueil"
        error={site.isError || homepage.isError}
        onRetry={() => void Promise.all([site.refetch(), homepage.refetch()])}
      />
    );
  }
  return <HomepageEditor site={site.data} homepage={homepage.data} />;
}
