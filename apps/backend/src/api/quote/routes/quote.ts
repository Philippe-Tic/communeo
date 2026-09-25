/** Devis de l'abonnement (#312) : rôles et commune vérifiés dans le contrôleur */
export default {
  routes: [
    { method: 'GET', path: '/quote', handler: 'quote.offer', config: { policies: [], middlewares: [] } },
    { method: 'GET', path: '/quote/draft', handler: 'quote.draft', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/quote/sign', handler: 'quote.sign', config: { policies: [], middlewares: [] } },
    { method: 'GET', path: '/quote/:documentId/pdf', handler: 'quote.pdf', config: { policies: [], middlewares: [] } },
  ],
};
