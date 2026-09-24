export default {
  routes: [
    {
      method: 'GET',
      path: '/activity-log',
      handler: 'activity-log.find',
      config: { policies: [], middlewares: [] },
    },
  ],
};
