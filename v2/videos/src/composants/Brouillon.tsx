/**
 * Storyboard d'une vidéo pas encore produite : chaque segment du script s'affiche à son heure (écran et
 * voix), pour relire le découpage et le rythme avant de monter les vraies scènes.
 */
import { AbsoluteFill, Sequence } from 'remotion';
import { C, POLICES } from '../charte';
import type { ScriptVideo, SegmentCale } from '../lib/script';
import { Fond } from './Fond';

export function Brouillon({ script, segments }: { script: ScriptVideo; segments: SegmentCale[] }) {
  return (
    <AbsoluteFill>
      <Fond />
      {segments.map((s) => (
        <Sequence key={s.index} from={s.de} durationInFrames={Math.max(1, s.a - s.de)}>
          <AbsoluteFill style={{ padding: 120, justifyContent: 'center', gap: 36, fontFamily: POLICES.sans }}>
            <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.16em', color: C.tuile }}>
              {script.titre.toUpperCase()} · SEGMENT {s.index + 1}/{segments.length} · BROUILLON
            </span>
            <span style={{ fontFamily: POLICES.serif, fontSize: 60, lineHeight: 1.15, color: C.sapin, maxWidth: 1500 }}>{s.ecran}</span>
            {s.voix && <span style={{ fontSize: 38, lineHeight: 1.45, color: C.encreDouce, maxWidth: 1500 }}>« {s.voix} »</span>}
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
