export default {
  routes: [
    {
      method: 'GET',
      path: '/onboarding/communes',
      handler: 'onboarding.search',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/onboarding/communes/:insee',
      handler: 'onboarding.details',
      config: { policies: [], middlewares: [] },
    },
  ],
};
