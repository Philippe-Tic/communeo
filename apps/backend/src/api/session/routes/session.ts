export default {
  routes: [
    { method: 'POST', path: '/session/login', handler: 'session.login', config: { auth: false } },
    { method: 'POST', path: '/session/logout', handler: 'session.logout', config: { auth: false } },
  ],
};
