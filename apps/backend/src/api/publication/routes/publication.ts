export default {
  routes: [
    {
      method: 'GET',
      path: '/publication/:type',
      handler: 'publication.states',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/publication/:type/years',
      handler: 'publication.years',
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
