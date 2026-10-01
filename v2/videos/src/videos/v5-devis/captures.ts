/** Écrans de V5 (premier jet) */
import type { Plan } from '../../lib/plans';

export const captures: Plan[] = [
  {
    nom: 'passer-en-live',
    ou: 'admin',
    chemin: '/passer-en-live',
    options: { trial: { endsInDays: 12 } },
    url: 'app.communeo.fr/passer-en-live',
    elements: {
      siret: (p) => p.getByLabel(/^SIRET de la mairie/),
      signataire: (p) => p.getByLabel(/^Nom du signataire/),
      qualite: (p) => p.getByRole('combobox', { name: /^Qualité/ }),
      valider: (p) => p.getByRole('button', { name: 'Valider le devis' }),
    },
  },
];
