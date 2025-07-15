/**
 * evenement router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::evenement.evenement', {
  config: {
    find: {
      auth: {
        scope: ['find'],
      },
    },
    findOne: {
      auth: {
        scope: ['find'],
      },
    },
    create: {
      auth: {
        scope: ['create'],
      },
    },
    update: {
      auth: {
        scope: ['update'],
      },
    },
    delete: {
      auth: {
        scope: ['delete'],
      },
    },
  },
});
