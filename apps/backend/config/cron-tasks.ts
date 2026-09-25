import { purgeActivityLog } from '../src/services/activity-log';
import { publishDueDocuments } from '../src/services/scheduled-publication';
import { processTrials } from '../src/services/trial';

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
  // Période d'essai : rappels (J-7, J-1), fin de l'essai, suppression des données 6 mois après
  trials: {
    task: async () => {
      await processTrials();
    },
    options: { rule: '0 * * * *', tz: 'Europe/Paris' },
  },
};
