export default {
  routes: [
    {
      method: 'GET',
      path: '/publication/:type',
      handler: 'publication.states',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/publication/:type/:documentId/unpublish',
      handler: 'publication.unpublish',
      config: { policies: [], middlewares: [] },
    },
  ],
};
