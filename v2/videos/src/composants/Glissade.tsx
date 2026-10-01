/**
 * Passage d'une scène à l'autre : la nouvelle glisse par-dessus (de la droite, ou du bas pour la carte
 * de fin), l'ancienne recule et s'assombrit un peu. Plus vivant qu'un fondu, et on suit le sens de la
 * démonstration ; `fondu` quand la scène continue sur le même écran. `duree` : un temps de musique,
 * pour que la scène arrive sur le temps.
 */
import type { ReactNode } from 'react';
import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion';
import { HAUTEUR, LARGEUR } from '../lib/format';

export type Sens = 'droite' | 'bas' | 'fondu';

const GLISSE = Easing.bezier(0.72, 0, 0.16, 1);
const avance = (frame: number, de: number, duree: number) => GLISSE(Math.min(1, Math.max(0, (frame - de) / duree)));

export function Glissade({ children, duree, entree, sortie }: { children: ReactNode; duree: number; entree?: Sens; sortie?: { de: number; sens: Sens } }) {
  const frame = useCurrentFrame();
  const e = entree ? avance(frame, 0, duree) : 1;
  const p = sortie ? avance(frame, sortie.de, duree) : 0;
  const transformations: string[] = [];
  if (entree === 'droite') transformations.push(`translateX(${(1 - e) * LARGEUR}px)`);
  if (entree === 'bas') transformations.push(`translateY(${(1 - e) * HAUTEUR}px)`);
  if (sortie?.sens === 'droite') transformations.push(`translateX(${-p * 0.28 * LARGEUR}px)`, `scale(${1 - 0.06 * p})`);
  if (sortie?.sens === 'bas') transformations.push(`translateY(${-p * 0.1 * HAUTEUR}px)`, `scale(${1 - 0.05 * p})`);
  return (
    <AbsoluteFill
      style={{
        transform: transformations.join(' ') || undefined,
        opacity: entree === 'fondu' ? e : undefined,
        overflow: 'hidden',
        boxShadow: e < 1 && entree !== 'fondu' ? '0 0 140px rgba(11, 42, 34, 0.35)' : undefined,
      }}
    >
      {children}
      {p > 0 && sortie?.sens !== 'fondu' && <AbsoluteFill style={{ background: '#0B2A22', opacity: 0.3 * p }} />}
    </AbsoluteFill>
  );
}
