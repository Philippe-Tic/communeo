/**
 * Chronomètre discret dans un coin de l'image (repère de l'écran, il ne suit pas la caméra) : il
 * apparaît et démarre à l'image `de`, s'arrête à l'image `a` et reste affiché, en vert, avec le temps
 * écoulé. Il compte le temps réel de la vidéo : rien n'est accéléré.
 */
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, POLICES } from '../charte';

const secondes = (images: number, fps: number) => `${(images / fps).toFixed(1).replace('.', ',')} s`;

export function Chronometre({ de, a, haut = 56, droite = 64 }: { de: number; a: number; haut?: number; droite?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < de) return null;
  const arrete = frame >= a;
  const ecoule = Math.min(frame, a) - de;
  const entree = spring({ frame: frame - de, fps, config: { damping: 16, stiffness: 160 } });
  // À l'arrêt : un léger battement, puis la couleur reste
  const battement = arrete ? 1 + 0.08 * Math.sin(Math.min(1, (frame - a) / 8) * Math.PI) : 1;
  const tour = interpolate(ecoule % fps, [0, fps], [0, 360]);
  const couleur = arrete ? C.sapin : C.encre;
  return (
    <div
      style={{
        position: 'absolute',
        top: haut,
        right: droite,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 22px 12px 16px',
        borderRadius: 999,
        background: C.papier,
        border: `2px solid ${arrete ? C.sapin : C.grege}`,
        boxShadow: '0 18px 36px -22px rgba(14, 64, 51, 0.5)',
        opacity: entree,
        transform: `translateY(${(1 - entree) * -20}px) scale(${battement})`,
        fontFamily: POLICES.sans,
        fontWeight: 600,
        fontSize: 30,
        color: couleur,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="13.5" r="8" />
        <path d="M10 2.5h4M12 2.5v3" />
        {arrete ? <path d="M8.6 13.6l2.4 2.4 4.4-4.6" /> : <path d="M12 13.5V9" style={{ transform: `rotate(${tour}deg)`, transformOrigin: '12px 13.5px' }} />}
      </svg>
      {secondes(ecoule, fps)}
    </div>
  );
}
