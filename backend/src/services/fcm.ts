/**
 * Firebase Cloud Messaging service — sends push notifications to FCM topics.
 */

let admin: any = null;
let messaging: any = null;

class FcmService {
  private initialized = false;

  /**
   * Lazy-init firebase-admin from the FIREBASE_SERVICE_ACCOUNT_JSON env var.
   * Returns true if ready to send, false otherwise.
   */
  private init(): boolean {
    if (this.initialized) return !!messaging;

    this.initialized = true;

    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!json) {
      console.warn('⚠️ [FCM] FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled');
      return false;
    }

    try {
      // Dynamic import so the backend still boots without firebase-admin installed
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      admin = require('firebase-admin');

      const serviceAccount = JSON.parse(json);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      messaging = admin.messaging();

      console.log('✅ [FCM] Firebase Admin initialized');
      return true;
    } catch (error) {
      console.error('❌ [FCM] Failed to initialize Firebase Admin:', error);
      return false;
    }
  }

  /**
   * Send a notification to an FCM topic.
   */
  async sendToTopic(
    topic: string,
    payload: { title: string; body: string; data?: Record<string, string> }
  ): Promise<void> {
    if (!this.init()) return;

    try {
      const message = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        android: {
          notification: {
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.send(message);
      console.log(`📤 [FCM] Sent to topic "${topic}": ${response}`);
    } catch (error) {
      console.error(`❌ [FCM] Failed to send to topic "${topic}":`, error);
    }
  }
}

export default new FcmService();
