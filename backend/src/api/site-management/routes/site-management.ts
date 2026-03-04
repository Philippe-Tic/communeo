export default {
  routes: [
    {
      method: 'GET',
      path: '/site-management/stats',
      handler: 'site-management.stats',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/site-management',
      handler: 'site-management.find',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/site-management/:documentId',
      handler: 'site-management.findOne',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/site-management',
      handler: 'site-management.create',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'PUT',
      path: '/site-management/:documentId',
      handler: 'site-management.update',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'DELETE',
      path: '/site-management/:documentId',
      handler: 'site-management.delete',
      config: { policies: [], middlewares: [] },
    },
  ],
};
