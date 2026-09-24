import { createFileRoute } from '@tanstack/react-router';
import { AdminOnly } from '@/components/admin-only';
import { AppearanceScreen } from '@/components/appearance/appearance-screen';
import { SettingsLoading, useSiteSettings } from '@/components/settings/settings-screen';

export const Route = createFileRoute('/_app/mon-site/apparence')({
  component: () => (
    <AdminOnly subject="L'apparence du site">
      <AppearanceRoute />
    </AdminOnly>
  ),
});

function AppearanceRoute() {
  const site = useSiteSettings();
  if (!site.data) return <SettingsLoading title="Apparence" error={site.isError} onRetry={() => void site.refetch()} />;
  return <AppearanceScreen site={site.data} />;
}
