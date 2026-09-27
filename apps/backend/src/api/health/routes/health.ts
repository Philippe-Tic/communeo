/** Contrôle de santé public pour la supervision externe (#179) */
export default {
  routes: [{ method: 'GET', path: '/health', handler: 'health.check', config: { auth: false } }],
};
