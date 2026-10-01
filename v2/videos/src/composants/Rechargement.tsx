/**
 * Rechargement d'une page dans un téléphone (enfant de PhoneFrame, repère de la capture) : une barre
 * de chargement court en haut de l'écran pendant `duree` images, puis s'efface. La nouvelle capture de
 * la page (Etat) est à faire apparaître vers la fin de la barre (`finDuChargement`).
 */
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C } from '../charte';

/** Image (relative à `de`) où la page rechargée s'affiche : la barre est presque au bout */
export const finDuChargement = (duree: number) => Math.round(duree * 0.75);

export function Rechargement({ de, duree = 18, largeur }: { de: number; duree?: number; largeur: number }) {
  const frame = useCurrentFrame();
  if (frame < de || frame > de + duree + 8) return null;
  const avance = interpolate(frame, [de, de + duree], [0, 1], { extrapolateRight: 'clamp', easing: Easing.bezier(0.3, 0.7, 0.4, 1) });
  const sortie = interpolate(frame, [de + duree, de + duree + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: largeur, height: 5, zIndex: 2, opacity: sortie }}>
      <div style={{ width: `${avance * 100}%`, height: '100%', background: C.sapin, borderRadius: '0 3px 3px 0' }} />
    </div>
  );
}
