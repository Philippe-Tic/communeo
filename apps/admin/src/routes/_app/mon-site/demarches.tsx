import { createFileRoute } from '@tanstack/react-router';
import { DemarchesScreen } from '@/components/settings/services-screens';
import { SettingsLoading, useSiteSettings } from '@/components/settings/settings-screen';

export const Route = createFileRoute('/_app/mon-site/demarches')({ component: DemarchesScreenRoute });

function DemarchesScreenRoute() {
  const site = useSiteSettings();
  if (!site.data) return <SettingsLoading title="Démarches" error={site.isError} onRetry={() => void site.refetch()} />;
  return <DemarchesScreen site={site.data} />;
}
