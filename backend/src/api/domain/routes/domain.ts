/**
 * domain router
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/domain/configure',
      handler: 'domain.configure',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/domain/verify',
      handler: 'domain.verify',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/domain/remove',
      handler: 'domain.remove',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/domain/status',
      handler: 'domain.status',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/domain/diagnostic/:domain',
      handler: 'domain.diagnostic',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
