/** Formulaire de contact du site de Communeo (#315) : public, limité en fréquence */
export default {
  routes: [{ method: 'POST', path: '/prospect-contact', handler: 'prospect-contact.send', config: { auth: false } }],
};
