/**
 * deployment router
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/deployment/trigger',
      handler: 'deployment.trigger',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/deployment/status',
      handler: 'deployment.status',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/deployment/check/:deploymentId',
      handler: 'deployment.check',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/deployment/debug',
      handler: 'deployment.debug',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
