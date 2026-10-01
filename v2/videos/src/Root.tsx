/**
 * Compositions des vidéos de communeo.fr (1920 × 1080, 30 images/s). Leur durée vient du script calé
 * sur la voix (timings.json). Une nouvelle vidéo peut démarrer en storyboard (composants/Brouillon).
 */
import type { ComponentType } from 'react';
import { Composition } from 'remotion';
import { Charte } from './composants/Charte';
import { FPS, HAUTEUR, LARGEUR } from './lib/format';
import { dureeEnImages, type ScriptVideo, type Timings } from './lib/script';
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
import { V3Themes } from './videos/v3-themes/Composition';
import { V5Devis } from './videos/v5-devis/Composition';
import { script as test } from './videos/test/script';
import testTimings from './videos/test/timings.json';

const videos: Array<[ScriptVideo, Timings, ComponentType]> = [
  [v1, v1Timings as Timings, V1Demo],
  [v2, v2Timings as Timings, V2Alerte],
  [v3, v3Timings as Timings, V3Themes],
  [v5, v5Timings as Timings, V5Devis],
  [test, testTimings as Timings, Test],
];

export function Root() {
  return (
    <>
      {videos.map(([script, timings, Video]) => (
        <Composition
          key={script.id}
          id={script.id}
          component={() => (
            <Charte>
              <Video />
            </Charte>
          )}
          durationInFrames={dureeEnImages(script, timings)}
          fps={FPS}
          width={LARGEUR}
          height={HAUTEUR}
        />
      ))}
    </>
  );
}
