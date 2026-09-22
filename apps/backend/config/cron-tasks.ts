import { publishDueDocuments } from '../src/services/scheduled-publication';

export default {
  scheduledPublication: {
    task: async ({ strapi }) => {
      await publishDueDocuments(strapi);
    },
    options: { rule: '* * * * *' },
  },
};
