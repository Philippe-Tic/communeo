/** Écrans de la vidéo de test */
import type { Plan } from '../../lib/plans';

export const captures: Plan[] = [
  {
    nom: 'alerte-nouvelle',
    ou: 'admin',
    chemin: '/alertes/nouvelle',
    url: 'app.communeo.fr/alertes/nouvelle',
    elements: {
      titre: (p) => p.getByRole('textbox', { name: /^Titre/ }),
      attention: (p) => p.locator('label', { hasText: 'Attention' }),
    },
  },
  { nom: 'site-mobile', ou: 'site', chemin: '/', appareil: 'telephone', url: 'saint-aubin.communeo.fr', elements: { bandeau: (p) => p.locator('[data-cn-alerts]') } },
];
