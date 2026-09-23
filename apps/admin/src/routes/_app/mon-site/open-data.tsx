import { createFileRoute } from '@tanstack/react-router';
import { OpenDataScreen } from '@/components/settings/services-screens';
import { SettingsLoading, useSiteSettings } from '@/components/settings/settings-screen';

export const Route = createFileRoute('/_app/mon-site/open-data')({ component: OpenDataScreenRoute });

function OpenDataScreenRoute() {
  const site = useSiteSettings();
  if (!site.data) return <SettingsLoading title="Open data" error={site.isError} onRetry={() => void site.refetch()} />;
  return <OpenDataScreen site={site.data} />;
}
