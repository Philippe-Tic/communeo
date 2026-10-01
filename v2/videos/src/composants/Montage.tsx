/**
 * Montage commun aux vidéos, celui de V1 : scènes calées sur les segments du script (et la voix) qui
 * glissent l'une sur l'autre en un temps de musique, musique de fond baissée sous la voix, écrans dans
 * un navigateur cadré par la caméra, avec le curseur.
 *
 * Règles de montage (validées sur V1) : un seul mouvement de caméra à la fois, jamais pendant un
 * changement d'écran ; chaque écran reste à l'image avant qu'on agisse dessus ; peu de légendes
 * (4 ou 5 pour 1 min 30), jamais le texte de la voix mot pour mot.
 */
import type { ComponentType, ReactNode } from 'react';
import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { FPS } from '../lib/format';
import { decale, type Capture, type Rect } from '../lib/geometrie';
import { chronologie, type ScriptVideo, type Timings } from '../lib/script';
import { BARRE, BrowserFrame } from './BrowserFrame';
import { Camera, type EtapeCamera } from './Camera';
import { Cursor, type PointCurseur } from './Cursor';
import { EndCard } from './EndCard';
import { Fond } from './Fond';
import { Glissade } from './Glissade';
import { Musique } from './Musique';
import { VoixOff } from './VoixOff';

/** Glissade d'une scène à l'autre : un temps de musique à 100 temps/min (le tempo des scripts) */
export const TRANSITION = 18;
/** Passage d'un écran à un autre dans une scène */
export const FONDU = 8;

/**
 * Outils de minutage d'une scène. Les repères s'écrivent en secondes à vitesse posée ; `tempo` les
 * resserre (1.12 : le pas vif de V1).
 */
export function rythme({ tempo = 1.12, mouvement = 0.8 }: { tempo?: number; mouvement?: number } = {}) {
  /** Secondes (à vitesse posée) → images, dans le repère de la scène */
  const s = (secondes: number) => Math.round((secondes * FPS) / tempo);
  return {
    s,
    /** Mouvement de caméra à `de` secondes vers `cadre` (`null` : tout le contenu) */
    vers: (de: number, cadre: Rect | null, bornes?: Rect): EtapeCamera => ({ de: s(de), a: s(de + mouvement), cadre, bornes }),
    /** Point du curseur à la seconde `t` (avec un clic) */
    au: (t: number, point: { x: number; y: number }, clic = false): PointCurseur => ({ image: s(t), ...point, clic }),
  };
}

/** Rectangle d'une capture placée dans un navigateur (sous la barre d'adresse) */
export const nav = (r: Rect): Rect => decale(r, 0, BARRE);
export const union = (...rects: Rect[]): Rect => {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return { x, y, width: Math.max(...rects.map((r) => r.x + r.width)) - x, height: Math.max(...rects.map((r) => r.y + r.height)) - y };
};
export const marge = (r: Rect, m: number): Rect => ({ x: r.x - m, y: r.y - m, width: r.width + 2 * m, height: r.height + 2 * m });

/** Un nouvel écran dans une scène : fondu court, avec un léger recul (on « entre » dans l'écran) */
export function Entree({ children }: { children: ReactNode }) {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, FONDU], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return <AbsoluteFill style={{ opacity: t, transform: `scale(${1.03 - 0.03 * t})` }}>{children}</AbsoluteFill>;
}

/** Un navigateur cadré par la caméra, avec le curseur */
export function Navigateur({
  capture,
  etapes,
  curseur,
  defilement,
  children,
}: {
  capture: Capture;
  etapes: EtapeCamera[];
  curseur?: PointCurseur[];
  defilement?: number;
  children?: ReactNode;
}) {
  return (
    <AbsoluteFill>
      <Fond />
      <Camera
        largeur={capture.largeur}
        hauteur={(capture.vue ?? capture.hauteur) + BARRE}
        etapes={etapes}
        superposition={(versEcran, echelle) => (curseur ? <Cursor points={curseur} versEcran={versEcran} echelle={echelle} /> : null)}
      >
        <BrowserFrame capture={capture} defilement={defilement}>
          {children}
        </BrowserFrame>
      </Camera>
    </AbsoluteFill>
  );
}

/** Carte de fin : elle monte pendant la glissade, ses éléments arrivent ensuite */
export function Fin() {
  return <EndCard de={TRANSITION} />;
}

/**
 * Une vidéo : une scène par segment du script. Chaque scène glisse (de la droite ; du bas pour la
 * dernière, la carte de fin ; en fondu quand le segment a `entree: 'fondu'`) pendant le temps qui
 * précède son début, et se trouve en place sur le temps. Musique et voix off par-dessus.
 */
export function Scenes({ script, timings, scenes }: { script: ScriptVideo; timings: Timings; scenes: ComponentType[] }) {
  const segments = chronologie(script, timings);
  if (scenes.length !== segments.length) throw new Error(`${script.id} : ${scenes.length} scènes pour ${segments.length} segments`);
  const derniere = segments.length - 1;
  const sens = (i: number) => (segments[i]?.entree === 'fondu' ? 'fondu' : i === derniere ? 'bas' : 'droite');
  return (
    <AbsoluteFill>
      <Fond />
      {segments.map((segment, i) => {
        const Scene = scenes[i]!;
        const de = i === 0 ? segment.de : segment.de - TRANSITION;
        const suivante = segments[i + 1];
        return (
          <Sequence key={i} from={de} durationInFrames={suivante ? suivante.de - de : undefined}>
            <Glissade
              duree={TRANSITION}
              entree={i === 0 ? undefined : sens(i)}
              sortie={suivante ? { de: suivante.de - TRANSITION - de, sens: sens(i + 1) } : undefined}
            >
              <Scene />
            </Glissade>
          </Sequence>
        );
      })}
      <Musique id={script.id} segments={segments} />
      <VoixOff timings={timings} segments={segments} />
    </AbsoluteFill>
  );
}
