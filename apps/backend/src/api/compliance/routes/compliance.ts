export default {
  routes: [
    {
      method: 'GET',
      path: '/compliance',
      handler: 'compliance.report',
      config: { policies: [], middlewares: [] },
    },
  ],
};
