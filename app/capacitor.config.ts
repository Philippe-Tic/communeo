import type { CapacitorConfig } from '@capacitor/cli';

// These values are replaced by scripts/build.sh at build time
const SLUG = process.env.APP_SLUG || 'demo';
const APP_NAME = process.env.APP_NAME || 'Mairie';

const config: CapacitorConfig = {
  appId: `fr.communeo.mairie.${SLUG}`,
  appName: APP_NAME,
  webDir: 'www',
  server: {
    // Load the existing Netlify-hosted static site directly in the WebView
    url: `https://${SLUG}-mairie.netlify.app`,
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF',
    },
  },
};

export default config;
