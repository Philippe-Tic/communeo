/** Redirections depuis l'ancien site (#335) : administrateurs de la commune, vérifié dans le contrôleur */
export default {
  routes: [
    { method: 'GET', path: '/redirects', handler: 'redirect.list', config: { policies: [], middlewares: [] } },
    { method: 'PUT', path: '/redirects', handler: 'redirect.save', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/redirects/suggest', handler: 'redirect.suggest', config: { policies: [], middlewares: [] } },
  ],
};
