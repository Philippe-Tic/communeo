/** File de validation de l'équipe Communeo (#313) : réservée aux super admins (vérifié dans le contrôleur) */
export default {
  routes: [
    { method: 'GET', path: '/validations', handler: 'validation.list', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/validations/signups/:id/approve', handler: 'validation.approveSignup', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/validations/signups/:id/reject', handler: 'validation.rejectSignup', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/validations/live/:documentId/approve', handler: 'validation.approveLive', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/validations/live/:documentId/reject', handler: 'validation.rejectLive', config: { policies: [], middlewares: [] } },
  ],
};
