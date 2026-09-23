import { createFileRoute } from '@tanstack/react-router';
import { AccessibilityScreen } from '@/components/settings/accessibility-screen';
import { SettingsLoading, useSiteSettings } from '@/components/settings/settings-screen';

export const Route = createFileRoute('/_app/mon-site/accessibilite')({ component: AccessibilityScreenRoute });

function AccessibilityScreenRoute() {
  const site = useSiteSettings();
  if (!site.data) return <SettingsLoading title="Accessibilité" error={site.isError} onRetry={() => void site.refetch()} />;
  return <AccessibilityScreen site={site.data} />;
}
