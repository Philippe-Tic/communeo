/**
 * Carte de fin : fond sapin et courbes de niveau, logo, « 30 jours gratuits, sans engagement » et
 * communeo.fr, comme l'appel final du site.
 */
import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion';
import { C, EASE_SITE, LOGO, POLICES } from '../charte';
import { Fond } from './Fond';

const ENTREE = Easing.bezier(...EASE_SITE);
const apparition = (frame: number, de: number) => ENTREE(Math.min(1, Math.max(0, (frame - de) / 16)));

export function EndCard() {
  const frame = useCurrentFrame();
  const logo = apparition(frame, 0);
  const titre = apparition(frame, 5);
  const adresse = apparition(frame, 10);
  const trait = Math.min(1, Math.max(0, (frame - 12) / 16));
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
            opacity: logo,
            transform: `translateY(${(1 - logo) * 14}px)`,
          }}
        />
        <div style={{ opacity: titre, transform: `translateY(${(1 - titre) * 20}px)`, fontFamily: POLICES.serif, fontSize: 104, lineHeight: 1.05, color: C.papier, letterSpacing: '-0.01em' }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            30 jours gratuits
            <svg viewBox="0 0 200 16" preserveAspectRatio="none" style={{ position: 'absolute', left: '-2%', bottom: '-0.08em', width: '104%', height: '0.2em', overflow: 'visible' }}>
              <path d="M3 11 C 50 4, 120 2, 197 8" fill="none" stroke="#E3B55B" strokeWidth={6} strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - trait} />
            </svg>
          </span>
          ,<br />
          sans engagement
        </div>
        <div style={{ opacity: adresse, fontFamily: POLICES.sans, fontWeight: 600, fontSize: 46, color: C.ble, letterSpacing: '0.01em' }}>communeo.fr</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
