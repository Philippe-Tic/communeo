/** Écrans de V2 (premier jet) */
import type { Plan } from '../../lib/plans';

export const captures: Plan[] = [
  {
    nom: 'alerte-nouvelle',
    ou: 'admin',
    chemin: '/alertes/nouvelle',
    url: 'app.communeo.fr/alertes/nouvelle',
    elements: {
      titre: (p) => p.getByRole('textbox', { name: /^Titre/ }),
      message: (p) => p.getByRole('textbox', { name: /^Message/ }),
      apercu: (p) => p.getByRole('button', { name: /Voir l.aperçu/ }),
    },
  },
  {
    nom: 'site-mobile-sans-alerte',
    ou: 'site',
    chemin: '/',
    appareil: 'telephone',
    url: 'saint-aubin.communeo.fr',
    // Le site de démonstration a des alertes : on les retire pour l'état « avant »
    avant: async (page) => page.evaluate(() => document.querySelectorAll('[data-cn-alerts]').forEach((el) => el.remove())),
  },
  {
    nom: 'site-mobile-avec-alerte',
    ou: 'site',
    chemin: '/',
    appareil: 'telephone',
    url: 'saint-aubin.communeo.fr',
    elements: { bandeau: (p) => p.locator('[data-cn-alerts]') },
  },
];
