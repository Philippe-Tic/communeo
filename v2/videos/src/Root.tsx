/**
 * Compositions des vidéos de communeo.fr (1920 × 1080, 30 images/s). Leur durée vient du script calé
 * sur la voix (timings.json). V3 et V5 sont encore des storyboards (Brouillon).
 */
import { Composition } from 'remotion';
import { Brouillon } from './composants/Brouillon';
import { Charte } from './composants/Charte';
import { FPS, HAUTEUR, LARGEUR } from './lib/format';
import { chronologie, dureeEnImages, type ScriptVideo, type Timings } from './lib/script';
import { script as v1 } from './videos/v1-demo/script';
import v1Timings from './videos/v1-demo/timings.json';
import { script as v2 } from './videos/v2-alerte/script';
import v2Timings from './videos/v2-alerte/timings.json';
import { script as v3 } from './videos/v3-themes/script';
import v3Timings from './videos/v3-themes/timings.json';
import { script as v5 } from './videos/v5-devis/script';
import v5Timings from './videos/v5-devis/timings.json';
import { Test } from './videos/test/Composition';
import { V1Demo } from './videos/v1-demo/Composition';
import { V2Alerte } from './videos/v2-alerte/Composition';
import { script as test } from './videos/test/script';
import testTimings from './videos/test/timings.json';

const brouillons: Array<[ScriptVideo, Timings]> = [
  [v3, v3Timings as Timings],
  [v5, v5Timings as Timings],
];

export function Root() {
  return (
    <>
      {brouillons.map(([script, timings]) => (
        <Composition
          key={script.id}
          id={script.id}
          component={() => (
            <Charte>
              <Brouillon script={script} segments={chronologie(script, timings)} />
            </Charte>
          )}
          durationInFrames={dureeEnImages(script, timings)}
          fps={FPS}
          width={LARGEUR}
          height={HAUTEUR}
        />
      ))}
      <Composition
        id="v1-demo"
        component={() => (
          <Charte>
            <V1Demo />
          </Charte>
        )}
        durationInFrames={dureeEnImages(v1, v1Timings as Timings)}
        fps={FPS}
        width={LARGEUR}
        height={HAUTEUR}
      />
      <Composition
        id="v2-alerte"
        component={() => (
          <Charte>
            <V2Alerte />
          </Charte>
        )}
        durationInFrames={dureeEnImages(v2, v2Timings as Timings)}
        fps={FPS}
        width={LARGEUR}
        height={HAUTEUR}
      />
      <Composition
        id="test"
        component={() => (
          <Charte>
            <Test />
          </Charte>
        )}
        durationInFrames={dureeEnImages(test, testTimings as Timings)}
        fps={FPS}
        width={LARGEUR}
        height={HAUTEUR}
      />
    </>
  );
}
