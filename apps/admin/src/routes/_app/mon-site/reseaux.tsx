import { createFileRoute } from '@tanstack/react-router';
import { SocialScreen } from '@/components/settings/social-screen';
import { SettingsLoading, useSiteSettings } from '@/components/settings/settings-screen';

export const Route = createFileRoute('/_app/mon-site/reseaux')({ component: SocialScreenRoute });

function SocialScreenRoute() {
  const site = useSiteSettings();
  if (!site.data) return <SettingsLoading title="Réseaux sociaux" error={site.isError} onRetry={() => void site.refetch()} />;
  return <SocialScreen site={site.data} />;
}
