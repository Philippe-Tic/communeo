export default {
  routes: [
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
  ],
};
