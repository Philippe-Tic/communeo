/** Suppression de la commune demandée par la commune (#391) : rôles vérifiés dans le contrôleur */
export default {
  routes: [
    { method: 'GET', path: '/commune-deletion', handler: 'commune-deletion.state', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/commune-deletion/request', handler: 'commune-deletion.request', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/commune-deletion/cancel', handler: 'commune-deletion.cancel', config: { policies: [], middlewares: [] } },
  ],
};
