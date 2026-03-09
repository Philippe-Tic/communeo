export default {
  routes: [
    {
      method: 'GET',
      path: '/comarquage/categories/:audience',
      handler: 'comarquage.categories',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/comarquage/fiche/:audience/:ficheId',
      handler: 'comarquage.fiche',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/comarquage/search/:audience',
      handler: 'comarquage.search',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/comarquage/cache/invalidate',
      handler: 'comarquage.invalidateCache',
      config: { policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/comarquage/cache/status',
      handler: 'comarquage.cacheStatus',
      config: { policies: [], middlewares: [] },
    },
  ],
}
