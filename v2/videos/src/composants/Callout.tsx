/**
 * Légende courte à l'écran (3 à 6 mots), dans la charte : papier, texte sapin, filet blé. Elle entre
 * avec un léger rebond (le filet blé d'abord, puis le texte) et sort en fondu. À placer sur une zone calme de l'image (un champ
 * vide, une marge), jamais à cheval sur un libellé.
 */
import type { CSSProperties } from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, POLICES } from '../charte';

export type PositionLegende = 'bas-gauche' | 'bas-droite' | 'haut-gauche' | 'haut-droite' | { x: number; y: number };

const positions: Record<Exclude<PositionLegende, object>, CSSProperties> = {
  'bas-gauche': { left: 96, bottom: 96 },
  'bas-droite': { right: 96, bottom: 96 },
  'haut-gauche': { left: 96, top: 96 },
  'haut-droite': { right: 96, top: 96 },
};

export function Callout({ texte, de, a, position = 'bas-gauche' }: { texte: string; de: number; a?: number; position?: PositionLegende }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mots = texte.trim().split(/\s+/).length;
  if (mots < 2 || mots > 6) throw new Error(`Légende de ${mots} mots : 3 à 6 mots au plus (« ${texte} »)`);
  if (frame < de || (a !== undefined && frame >= a)) return null;
  const entree = spring({ frame: frame - de, fps, config: { damping: 13, stiffness: 170, mass: 0.7 } });
  const texteEntre = spring({ frame: frame - de - 4, fps, config: { damping: 18, stiffness: 150 } });
  const sortie = a === undefined ? 1 : interpolate(frame, [a - 10, a], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const place = typeof position === 'string' ? positions[position] : { left: position.x, top: position.y };
  return (
    <div
      style={{
        position: 'absolute',
        ...place,
        opacity: Math.min(1, (frame - de) / 5) * sortie,
        transform: `translateY(${(1 - entree) * 30}px) scale(${0.88 + 0.12 * entree})`,
        transformOrigin: 'left center',
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 16,
        overflow: 'hidden',
        background: C.papier,
        boxShadow: '0 24px 48px -24px rgba(14, 64, 51, 0.45)',
      }}
    >
      <span style={{ width: 9, background: C.ble, transform: `scaleY(${entree})` }} />
      <span style={{ opacity: texteEntre, transform: `translateX(${(1 - texteEntre) * -14}px)`, padding: '20px 32px 22px 26px', fontFamily: POLICES.sans, fontWeight: 600, fontSize: 40, lineHeight: 1.15, color: C.sapin }}>
        {texte}
      </span>
    </div>
  );
}
