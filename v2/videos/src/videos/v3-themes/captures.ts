/**
 * Écrans de V3 : l'écran Apparence de l'admin, et l'accueil de Saint-Aubin dans chaque thème, capturé
 * par le script du site (`captures:themes`, réutilisé ici en 2x).
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Plan } from '../../lib/plans';

export const captures: Plan[] = [
  {
    nom: 'apparence',
    ou: 'admin',
    chemin: '/mon-site/apparence',
    url: 'app.communeo.fr/mon-site/apparence',
    elements: {
      moderne: (p) => p.getByRole('button', { name: 'Choisir le thème Moderne' }),
      journal: (p) => p.getByRole('button', { name: 'Choisir le thème Journal' }),
      bourg: (p) => p.getByRole('button', { name: 'Choisir le thème Bourg' }),
    },
  },
];

export function preparer(): void {
  const site = fileURLToPath(new URL('../../../../../apps/site/', import.meta.url));
  const sortie = fileURLToPath(new URL('../../../public/captures/v3-themes/', import.meta.url));
  execFileSync('node', ['scripts/captures-themes.mjs', '--echelle', '2', '--sortie', sortie, '--prefixe', 'captures/v3-themes/'], { cwd: site, stdio: 'inherit' });
}
