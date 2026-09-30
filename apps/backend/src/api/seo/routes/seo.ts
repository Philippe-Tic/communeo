/** Référencement (#336) : administrateurs de la commune, vérifié dans le contrôleur */
export default {
  routes: [
    { method: 'GET', path: '/seo/checklist', handler: 'seo.checklist', config: { policies: [], middlewares: [] } },
    { method: 'PUT', path: '/seo/checklist/:item', handler: 'seo.declare', config: { policies: [], middlewares: [] } },
  ],
};
