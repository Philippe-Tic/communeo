/**
 * Direction artistique « le papier et le sapin », lue dans le code du site (apps/site) plutôt que
 * recopiée : jetons de couleur et polices (global.css), logo et pictogramme, courbes de niveau.
 * Les couleurs s'utilisent en variables CSS (`C.sapin` = `var(--sapin)`), comme sur le site.
 */
import '../../../apps/site/src/styles/global.css';
import logo from '../../../apps/site/src/assets/logo-communeo.svg';
import picto from '../../../apps/site/src/assets/picto-communeo.svg';

export { topo } from '../../../apps/site/src/lib/topo';

export const LOGO = logo as string;
export const PICTO = picto as string;

const jeton = (nom: string) => `var(--${nom})`;

export const C = {
  sapin: jeton('sapin'),
  sapinProfond: jeton('sapin-profond'),
  sapinMoyen: jeton('sapin-moyen'),
  sapinEclairci: jeton('sapin-eclairci'),
  sauge: jeton('sauge'),
  papier: jeton('papier'),
  papierClair: jeton('papier-clair'),
  blanc: jeton('blanc'),
  encre: jeton('encre'),
  encreDouce: jeton('encre-douce'),
  grege: jeton('grege'),
  taupe: jeton('taupe'),
  tuile: jeton('tuile'),
  ble: jeton('ble'),
} as const;

export const POLICES = { serif: jeton('serif'), sans: jeton('sans') } as const;

/** Courbe d'animation du site (cubic-bezier(0.2, 0.8, 0.2, 1)) */
export const EASE_SITE = [0.2, 0.8, 0.2, 1] as const;

export { FPS, HAUTEUR, LARGEUR } from './lib/format';
