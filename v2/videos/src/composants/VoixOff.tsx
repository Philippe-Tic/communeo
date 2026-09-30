/** Voix off d'une vidéo, d'après timings.json : un fichier par segment, ou une piste entière */
import { Audio, Sequence, staticFile } from 'remotion';
import { FPS } from '../lib/format';
import type { SegmentCale, Timings } from '../lib/script';

export function VoixOff({ timings, segments }: { timings: Timings; segments: SegmentCale[] }) {
  const audio = timings.audio;
  if (!audio) return null;
  if ('piste' in audio) return <Audio src={staticFile(audio.piste)} />;
  return (
    <>
      {segments.map((segment) =>
        audio.segments[segment.index] ? (
          // La voix démarre à l'heure de sa phrase (un peu après l'image de la scène)
          <Sequence key={segment.index} from={Math.round((segment.parole?.debut ?? segment.debut) * FPS)} layout="none">
            <Audio src={staticFile(audio.segments[segment.index]!)} />
          </Sequence>
        ) : null,
      )}
    </>
  );
}
