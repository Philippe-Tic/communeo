/**
 * Push notification service — decides when to send FCM notifications based on content changes.
 */

import fcmService from './fcm';

/** Content types that trigger push notifications, with their topic suffix and notification logic. */
const NOTIFIABLE_TYPES: Record<string, {
  topicSuffix: string;
  /** Return notification payload if this change should trigger a push, or null to skip. */
  shouldNotify: (params: {
    action: string;
    result: any;
    previousData: any | null;
  }) => { title: string; body: string; data?: Record<string, string> } | null;
}> = {
  'api::article.article': {
    topicSuffix: 'articles',
    shouldNotify({ action, result, previousData }) {
      // Notify when status transitions to "published"
      if (result?.status !== 'published') return null;
      if (action === 'create' || (action === 'update' && previousData?.status !== 'published')) {
        return {
          title: 'Nouvel article',
          body: result.title || 'Un nouvel article a été publié',
          data: { type: 'article', slug: result.slug || '' },
        };
      }
      return null;
    },
  },

  'api::evenement.evenement': {
    topicSuffix: 'evenements',
    shouldNotify({ action, result }) {
      // Notify on creation only
      if (action !== 'create') return null;
      return {
        title: 'Nouvel événement',
        body: result.title || 'Un nouvel événement a été ajouté',
        data: { type: 'evenement', slug: result.slug || '' },
      };
    },
  },

  'api::alerte.alerte': {
    topicSuffix: 'alertes',
    shouldNotify({ action, result, previousData }) {
      // Notify when active transitions to true
      if (!result?.active) return null;
      if (action === 'create' || (action === 'update' && !previousData?.active)) {
        return {
          title: `Alerte : ${result.title || 'Nouvelle alerte'}`,
          body: result.message || '',
          data: { type: 'alerte' },
        };
      }
      return null;
    },
  },

  'api::school-menu.school-menu': {
    topicSuffix: 'school-menus',
    shouldNotify({ action, result }) {
      if (action !== 'create') return null;
      return {
        title: 'Menu cantine',
        body: `Le menu de la semaine du ${result.week_start || ''} est disponible`,
        data: { type: 'school-menu' },
      };
    },
  },

  'api::waste-schedule.waste-schedule': {
    topicSuffix: 'waste-schedules',
    shouldNotify({ action, result }) {
      if (action !== 'create') return null;
      const wasteLabels: Record<string, string> = {
        'ordures-menageres': 'Ordures ménagères',
        'tri-selectif': 'Tri sélectif',
        'verre': 'Verre',
        'dechets-verts': 'Déchets verts',
        'encombrants': 'Encombrants',
      };
      return {
        title: 'Collecte des déchets',
        body: `Nouveau planning : ${wasteLabels[result.waste_type] || result.waste_type}`,
        data: { type: 'waste-schedule' },
      };
    },
  },
};

class PushNotificationService {
  /**
   * Returns the config for a notifiable content type, or null if not notifiable.
   */
  getNotifiableConfig(uid: string) {
    return NOTIFIABLE_TYPES[uid] || null;
  }

  /**
   * Check whether a notification should be sent and send it if so.
   */
  async notifyIfNeeded(params: {
    uid: string;
    action: string;
    siteDocumentId: string;
    result: any;
    previousData: any | null;
  }): Promise<void> {
    const config = NOTIFIABLE_TYPES[params.uid];
    if (!config) return;

    const payload = config.shouldNotify({
      action: params.action,
      result: params.result,
      previousData: params.previousData,
    });

    if (!payload) return;

    const topic = `${params.siteDocumentId}-${config.topicSuffix}`;
    await fcmService.sendToTopic(topic, payload);
  }
}

export default new PushNotificationService();
