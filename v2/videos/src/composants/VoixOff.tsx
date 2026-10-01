/** Voix off d'une vidéo, d'après timings.json : un fichier par segment, ou une piste entière */
import { Audio, Sequence, staticFile } from 'remotion';
import type { SegmentCale, Timings } from '../lib/script';

export function VoixOff({ timings, segments }: { timings: Timings; segments: SegmentCale[] }) {
  const audio = timings.audio;
  if (!audio) return null;
  if ('piste' in audio) return <Audio src={staticFile(audio.piste)} />;
  return (
    <>
      {segments.map((segment) =>
        audio.segments[segment.index] ? (
          <Sequence key={segment.index} from={segment.de} layout="none">
            <Audio src={staticFile(audio.segments[segment.index]!)} />
          </Sequence>
        ) : null,
      )}
    </>
  );
}
