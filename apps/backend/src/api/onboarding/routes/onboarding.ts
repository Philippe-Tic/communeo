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
    {
      method: 'GET',
      path: '/onboarding/checklist',
      handler: 'onboarding.checklist',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/onboarding/checklist/hide',
      handler: 'onboarding.hideChecklist',
      config: { policies: [], middlewares: [] },
    },
  ],
};
