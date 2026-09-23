import { createFileRoute } from '@tanstack/react-router';
import { AdminOnly } from '@/components/admin-only';
import { LegalScreen } from '@/components/settings/legal-screen';
import { SettingsLoading, useSiteSettings } from '@/components/settings/settings-screen';

export const Route = createFileRoute('/_app/mon-site/legal')({
  component: () => (
    <AdminOnly subject="La page des mentions légales et du RGPD">
      <LegalRoute />
    </AdminOnly>
  ),
});

function LegalRoute() {
  const site = useSiteSettings();
  if (!site.data) return <SettingsLoading title="Mentions légales et RGPD" error={site.isError} onRetry={() => void site.refetch()} />;
  return <LegalScreen site={site.data} />;
}
