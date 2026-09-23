export default {
  routes: [
    {
      method: 'GET',
      path: '/user-management/invitation',
      handler: 'user-management.invitationInfo',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/user-management/request-invitation',
      handler: 'user-management.requestInvitation',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/user-management/forgot-password',
      handler: 'user-management.forgotPassword',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/user-management/accept-invitation',
      handler: 'user-management.acceptInvitation',
      config: {
        auth: false, // Public endpoint — no JWT required
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/user-management/admins',
      handler: 'user-management.admins',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'PUT',
      path: '/user-management/me',
      handler: 'user-management.updateMe',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/user-management/me/reset-password',
      handler: 'user-management.requestPasswordReset',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/user-management',
      handler: 'user-management.find',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/user-management/:id',
      handler: 'user-management.findOne',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/user-management',
      handler: 'user-management.create',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'PUT',
      path: '/user-management/:id',
      handler: 'user-management.update',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'DELETE',
      path: '/user-management/:id',
      handler: 'user-management.delete',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/user-management/:id/reset-password',
      handler: 'user-management.resetPassword',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/user-management/:id/resend-invitation',
      handler: 'user-management.resendInvitation',
      config: { policies: [], middlewares: [] },
    },
  ],
};
