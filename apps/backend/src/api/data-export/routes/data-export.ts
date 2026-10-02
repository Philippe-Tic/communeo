/** Export des données de la commune (#343) : rôles vérifiés dans le contrôleur */
export default {
  routes: [
    { method: 'GET', path: '/data-export', handler: 'data-export.state', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/data-export', handler: 'data-export.request', config: { policies: [], middlewares: [] } },
    { method: 'GET', path: '/data-export/download', handler: 'data-export.download', config: { policies: [], middlewares: [] } },
  ],
};
