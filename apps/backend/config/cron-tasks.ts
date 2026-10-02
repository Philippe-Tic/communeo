import { purgeActivityLog } from '../src/services/activity-log';
import { publishDueDocuments } from '../src/services/scheduled-publication';
import { processBilling } from '../src/services/billing';
import { purgeExpiredMessages } from '../src/services/message-retention';
import { processTrials } from '../src/services/trial';
import { processDeletionRequests } from '../src/services/commune-deletion-request';

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
  // Messages des habitants (#342) : messages traités supprimés après la durée choisie par la commune,
  // demandes d'inscription non confirmées après 30 jours
  messageRetention: {
    task: async () => {
      await purgeExpiredMessages();
    },
    options: { rule: '30 3 * * *', tz: 'Europe/Paris' },
  },
  // Période d'essai : rappels (J-7, J-1), fin de l'essai, suppression des données 6 mois après
  trials: {
    task: async () => {
      await processTrials();
    },
    options: { rule: '0 * * * *', tz: 'Europe/Paris' },
  },
  // Suppression demandée par une commune (#391) : rappel la veille, suppression à la date prévue
  communeDeletions: {
    task: async () => {
      await processDeletionRequests();
    },
    options: { rule: '15 * * * *', tz: 'Europe/Paris' },
  },
  // Facturation (#314) : factures de renouvellement à l'échéance, relances des factures en retard
  billing: {
    task: async () => {
      await processBilling();
    },
    options: { rule: '0 7 * * *', tz: 'Europe/Paris' },
  },
};
