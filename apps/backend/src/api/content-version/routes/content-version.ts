export default {
  routes: [
    {
      method: 'GET',
      path: '/content-versions/:type/:documentId',
      handler: 'content-version.list',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/content-versions/:type/:documentId/:id',
      handler: 'content-version.findOne',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/content-versions/:type/:documentId/checkpoint',
      handler: 'content-version.checkpoint',
      config: { policies: [], middlewares: [] },
    },
  ],
};
