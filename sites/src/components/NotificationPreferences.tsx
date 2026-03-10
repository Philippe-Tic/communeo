import { useEffect, useState } from 'preact/hooks';

interface Props {
  siteDocumentId: string;
}

interface TopicConfig {
  key: string;
  label: string;
  description: string;
  topicSuffix: string;
}

const TOPICS: TopicConfig[] = [
  { key: 'articles', label: 'Actualités', description: 'Nouveaux articles publiés', topicSuffix: 'articles' },
  { key: 'evenements', label: 'Événements', description: 'Nouveaux événements ajoutés', topicSuffix: 'evenements' },
  { key: 'alertes', label: 'Alertes', description: 'Alertes et perturbations', topicSuffix: 'alertes' },
  { key: 'school-menus', label: 'Cantine', description: 'Menus de la cantine scolaire', topicSuffix: 'school-menus' },
  { key: 'waste-schedules', label: 'Déchets', description: 'Planning de collecte des déchets', topicSuffix: 'waste-schedules' },
];

/** Type-safe access to Capacitor plugins when running inside the native shell. */
function getCapacitor(): any {
  return (window as any).Capacitor;
}

async function getStoredPreferences(): Promise<Record<string, boolean>> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'notification_prefs' });
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

async function storePreferences(prefs: Record<string, boolean>): Promise<void> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'notification_prefs', value: JSON.stringify(prefs) });
  } catch { /* ignore */ }
}

export default function NotificationPreferences({ siteDocumentId }: Props) {
  const [isNative, setIsNative] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cap = getCapacitor();
    if (!cap?.isNativePlatform()) {
      setIsNative(false);
      setLoading(false);
      return;
    }

    setIsNative(true);

    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Check current permission status
        const permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'granted') {
          setPermissionGranted(true);
        }

        // Load stored preferences
        const stored = await getStoredPreferences();
        setPrefs(stored);
      } catch (err) {
        console.error('[NotificationPreferences] Init error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function requestPermission() {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const result = await PushNotifications.requestPermissions();
      if (result.receive === 'granted') {
        await PushNotifications.register();
        setPermissionGranted(true);
      }
    } catch (err) {
      console.error('[NotificationPreferences] Permission error:', err);
    }
  }

  async function toggleTopic(topic: TopicConfig) {
    const topicName = `${siteDocumentId}-${topic.topicSuffix}`;
    const currentlyEnabled = prefs[topic.key] ?? false;

    try {
      const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

      if (currentlyEnabled) {
        await FirebaseMessaging.unsubscribeFromTopic({ topic: topicName });
      } else {
        await FirebaseMessaging.subscribeToTopic({ topic: topicName });
      }

      const newPrefs = { ...prefs, [topic.key]: !currentlyEnabled };
      setPrefs(newPrefs);
      await storePreferences(newPrefs);
    } catch (err) {
      console.error(`[NotificationPreferences] Toggle error for ${topic.key}:`, err);
    }
  }

  // Not running inside Capacitor — show download prompt
  if (!isNative && !loading) {
    return (
      <div class="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p class="text-gray-600 text-lg mb-2">
          Les notifications push sont disponibles uniquement dans l'application mobile.
        </p>
        <p class="text-gray-500 text-sm">
          Téléchargez l'application pour recevoir les alertes et actualités de votre mairie.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div class="animate-pulse space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} class="h-16 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  // Permission not yet granted
  if (!permissionGranted) {
    return (
      <div class="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p class="text-gray-700 text-lg mb-4">
          Autorisez les notifications pour rester informé des actualités de votre mairie.
        </p>
        <button
          onClick={requestPermission}
          class="px-6 py-3 rounded-lg text-white font-medium"
          style={{ backgroundColor: `rgb(var(--color-primary))` }}
        >
          Activer les notifications
        </button>
      </div>
    );
  }

  return (
    <div class="space-y-3">
      {TOPICS.map((topic) => {
        const enabled = prefs[topic.key] ?? false;
        return (
          <button
            key={topic.key}
            onClick={() => toggleTopic(topic)}
            class="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-4 transition-colors hover:bg-gray-50"
          >
            <div class="text-left">
              <p class="font-medium text-gray-900">{topic.label}</p>
              <p class="text-sm text-gray-500">{topic.description}</p>
            </div>
            <div
              class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                class={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
