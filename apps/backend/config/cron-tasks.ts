import { purgeActivityLog } from '../src/services/activity-log';
import { publishDueDocuments } from '../src/services/scheduled-publication';

export default {
  scheduledPublication: {
    task: async ({ strapi }) => {
      await publishDueDocuments(strapi);
    },
    options: { rule: '* * * * *' },
  },
  // Journal d'activité : 6 mois de conservation (RGPD)
  activityLogPurge: {
    task: async () => {
      await purgeActivityLog();
    },
    options: { rule: '0 3 * * *', tz: 'Europe/Paris' },
  },
};
