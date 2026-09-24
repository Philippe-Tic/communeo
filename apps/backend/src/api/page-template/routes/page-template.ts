export default {
  routes: [
    {
      method: 'GET',
      path: '/page-templates',
      handler: 'page-template.list',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/page-templates',
      handler: 'page-template.create',
      config: { policies: [], middlewares: [] },
    },
  ],
};
