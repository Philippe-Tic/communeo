/**
 * Carte de fin : fond sapin et courbes de niveau, logo, « 30 jours gratuits, sans engagement » et
 * communeo.fr, comme l'appel final du site. Les éléments arrivent l'un après l'autre avec un léger
 * rebond, `de` images après le début (le temps que la carte finisse de monter).
 */
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, LOGO, POLICES } from '../charte';
import { Fond } from './Fond';

export function EndCard({ de = 0 }: { de?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ressort = (decalage: number, raideur = 140) => spring({ frame: frame - de - decalage, fps, config: { damping: 15, stiffness: raideur, mass: 0.8 } });
  const logo = ressort(0);
  const titre = ressort(6);
  const suite = ressort(11);
  const adresse = ressort(18, 180);
  const trait = Math.min(1, Math.max(0, (frame - de - 16) / 14));
  return (
    <AbsoluteFill>
      <Fond sombre />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 44, textAlign: 'center' }}>
        <div
          style={{
            width: 360,
            aspectRatio: '538 / 70',
            background: C.papier,
            WebkitMask: `url(${LOGO}) center / contain no-repeat`,
            mask: `url(${LOGO}) center / contain no-repeat`,
            opacity: Math.min(1, logo * 1.5),
            transform: `translateY(${(1 - logo) * 30}px) scale(${0.9 + 0.1 * logo})`,
          }}
        />
        <div style={{ fontFamily: POLICES.serif, fontSize: 104, lineHeight: 1.05, color: C.papier, letterSpacing: '-0.01em' }}>
          <span style={{ position: 'relative', display: 'inline-block', opacity: Math.min(1, titre * 1.5), transform: `translateY(${(1 - titre) * 50}px)` }}>
            30 jours gratuits
            <svg viewBox="0 0 200 16" preserveAspectRatio="none" style={{ position: 'absolute', left: '-2%', bottom: '-0.08em', width: '104%', height: '0.2em', overflow: 'visible' }}>
              <path d="M3 11 C 50 4, 120 2, 197 8" fill="none" stroke="#E3B55B" strokeWidth={6} strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - trait} />
            </svg>
          </span>
          <span style={{ display: 'inline-block', opacity: Math.min(1, titre * 1.5) }}>,</span>
          <br />
          <span style={{ display: 'inline-block', opacity: Math.min(1, suite * 1.5), transform: `translateY(${(1 - suite) * 50}px)` }}>sans engagement</span>
        </div>
        <div
          style={{
            opacity: Math.min(1, adresse * 1.5),
            transform: `scale(${0.7 + 0.3 * adresse})`,
            fontFamily: POLICES.sans,
            fontWeight: 600,
            fontSize: 46,
            color: C.sapin,
            background: C.ble,
            padding: '14px 40px 16px',
            borderRadius: 999,
            letterSpacing: '0.01em',
          }}
        >
          communeo.fr
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
