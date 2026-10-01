/**
 * Légende courte à l'écran (3 à 6 mots), dans la charte : papier, texte sapin, filet blé. Elle entre
 * en glissant avec la courbe du site et sort en fondu. À placer sur une zone calme de l'image (un champ
 * vide, une marge), jamais à cheval sur un libellé.
 */
import type { CSSProperties } from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, EASE_SITE, POLICES } from '../charte';

const ENTREE = Easing.bezier(...EASE_SITE);

export type PositionLegende = 'bas-gauche' | 'bas-droite' | 'haut-gauche' | 'haut-droite' | { x: number; y: number };

const positions: Record<Exclude<PositionLegende, object>, CSSProperties> = {
  'bas-gauche': { left: 96, bottom: 96 },
  'bas-droite': { right: 96, bottom: 96 },
  'haut-gauche': { left: 96, top: 96 },
  'haut-droite': { right: 96, top: 96 },
};

export function Callout({ texte, de, a, position = 'bas-gauche' }: { texte: string; de: number; a?: number; position?: PositionLegende }) {
  const frame = useCurrentFrame();
  const mots = texte.trim().split(/\s+/).length;
  if (mots < 2 || mots > 6) throw new Error(`Légende de ${mots} mots : 3 à 6 mots au plus (« ${texte} »)`);
  if (frame < de || (a !== undefined && frame >= a)) return null;
  const entree = ENTREE(Math.min(1, (frame - de) / 16));
  const sortie = a === undefined ? 1 : interpolate(frame, [a - 10, a], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const place = typeof position === 'string' ? positions[position] : { left: position.x, top: position.y };
  return (
    <div
      style={{
        position: 'absolute',
        ...place,
        opacity: entree * sortie,
        transform: `translateY(${(1 - entree) * 22}px)`,
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 16,
        overflow: 'hidden',
        background: C.papier,
        boxShadow: '0 24px 48px -24px rgba(14, 64, 51, 0.45)',
      }}
    >
      <span style={{ width: 9, background: C.ble }} />
      <span style={{ padding: '20px 32px 22px 26px', fontFamily: POLICES.sans, fontWeight: 600, fontSize: 40, lineHeight: 1.15, color: C.sapin }}>
        {texte}
      </span>
    </div>
  );
}
