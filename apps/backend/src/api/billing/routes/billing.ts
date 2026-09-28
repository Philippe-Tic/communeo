/** Facturation (#314) : rôles et commune vérifiés dans le contrôleur */
export default {
  routes: [
    { method: 'GET', path: '/billing/invoices', handler: 'billing.list', config: { policies: [], middlewares: [] } },
    { method: 'GET', path: '/billing/invoices/:documentId/pdf', handler: 'billing.pdf', config: { policies: [], middlewares: [] } },
    { method: 'GET', path: '/billing/team', handler: 'billing.team', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/billing/team/invoices/:documentId/paid', handler: 'billing.markPaid', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/billing/team/invoices/:documentId/chorus', handler: 'billing.markDeposited', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/billing/team/invoices/:documentId/remind', handler: 'billing.remind', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/billing/team/invoices/:documentId/cancel', handler: 'billing.cancel', config: { policies: [], middlewares: [] } },
    { method: 'POST', path: '/billing/team/sites/:documentId/invoice', handler: 'billing.issueFirst', config: { policies: [], middlewares: [] } },
    { method: 'PUT', path: '/billing/team/sites/:documentId/renewal', handler: 'billing.renewal', config: { policies: [], middlewares: [] } },
  ],
};
