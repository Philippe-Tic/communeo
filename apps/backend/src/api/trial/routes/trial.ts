export default {
  routes: [
    {
      method: 'POST',
      path: '/trial/live-request',
      handler: 'trial.liveRequest',
      config: { policies: [], middlewares: [] },
    },
  ],
};
