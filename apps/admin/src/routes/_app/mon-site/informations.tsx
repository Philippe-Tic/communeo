import { createFileRoute } from '@tanstack/react-router';
import { InformationsScreen } from '@/components/settings/informations-screen';
import { SettingsLoading, useSiteSettings } from '@/components/settings/settings-screen';

export const Route = createFileRoute('/_app/mon-site/informations')({ component: InformationsRoute });

function InformationsRoute() {
  const site = useSiteSettings();
  if (!site.data) return <SettingsLoading title="Informations de la commune" error={site.isError} onRetry={() => void site.refetch()} />;
  return <InformationsScreen site={site.data} />;
}
