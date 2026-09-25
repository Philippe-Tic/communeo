/** Inscription d'une mairie en libre-service (#309) : routes publiques, limitées en fréquence */
export default {
  routes: [
    { method: 'GET', path: '/signup/communes', handler: 'signup.communes', config: { auth: false } },
    { method: 'POST', path: '/signup', handler: 'signup.request', config: { auth: false } },
    { method: 'GET', path: '/signup/confirm', handler: 'signup.confirmInfo', config: { auth: false } },
    { method: 'POST', path: '/signup/confirm', handler: 'signup.confirm', config: { auth: false } },
  ],
};
