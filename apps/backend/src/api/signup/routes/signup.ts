/**
 * Inscription d'une mairie en libre-service (#309, #337) : routes publiques, limitées en fréquence ;
 * l'état de l'approbation et son renvoi sont pour l'administration de la commune.
 */
export default {
  routes: [
    { method: 'GET', path: '/signup/communes', handler: 'signup.communes', config: { auth: false } },
    { method: 'POST', path: '/signup', handler: 'signup.request', config: { auth: false } },
    { method: 'GET', path: '/signup/confirm', handler: 'signup.confirmInfo', config: { auth: false } },
    { method: 'POST', path: '/signup/confirm', handler: 'signup.confirm', config: { auth: false } },
    { method: 'GET', path: '/signup/approve', handler: 'signup.approveInfo', config: { auth: false } },
    { method: 'POST', path: '/signup/approve', handler: 'signup.approve', config: { auth: false } },
    { method: 'POST', path: '/signup/decline', handler: 'signup.decline', config: { auth: false } },
    { method: 'GET', path: '/signup/approval', handler: 'signup.approvalState', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/signup/approval/resend', handler: 'signup.resendApproval', config: { policies: [], middlewares: [] } },
  ],
};
