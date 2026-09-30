/** Fond des scènes : papier du site, avec les courbes de niveau très discrètes, qui dérivent lentement */
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, HAUTEUR, LARGEUR, topo } from '../charte';

export function Fond({ sombre = false }: { sombre?: boolean }) {
  const frame = useCurrentFrame();
  const derive = `translate(${-frame * 0.35}px, ${-frame * 0.12}px) rotate(${frame * 0.012}deg)`;
  return (
    <AbsoluteFill style={{ background: sombre ? C.sapin : C.papierClair }}>
      <svg width={LARGEUR} height={HAUTEUR} viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <path
          d={topo({ cx: 1640, cy: 760, rings: 13, gap: 64, r0: 50, seed: 0.9, sx: 1.35 })}
          fill="none"
          stroke={sombre ? '#86C2AE' : '#0E4033'}
          strokeWidth={1.4}
          opacity={sombre ? 0.16 : 0.05}
          style={{ transform: derive, transformOrigin: '1640px 760px' }}
        />
      </svg>
    </AbsoluteFill>
  );
}
