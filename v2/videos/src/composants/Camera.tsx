/**
 * Caméra : cadre un contenu (un navigateur, un téléphone…) dans l'image 1920 × 1080, puis zoome ou se
 * déplace en douceur vers une zone. Les zones sont données dans le repère du contenu (pixels CSS).
 *
 * `superposition` reçoit la conversion contenu → image, pour les éléments qui ne doivent pas grossir
 * avec le zoom (le curseur).
 */
import type { ReactNode } from 'react';
import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion';
import { HAUTEUR, LARGEUR } from '../charte';
import type { Point, Rect } from '../lib/geometrie';

export interface EtapeCamera {
  /** Début et fin du mouvement, en images */
  de: number;
  a: number;
  /** Zone à cadrer ; `null` : tout le contenu */
  cadre: Rect | null;
  /**
   * Zone dont le cadrage ne doit pas sortir (par exemple : sous la barre de l'admin, pour ne jamais
   * montrer de boutons coupés au bord). Sans effet quand la vue est plus grande que la zone.
   */
  bornes?: Rect;
}

export type VersEcran = (point: Point) => Point;

/** Zoom maximal : au-delà, la capture (2x) deviendrait floue */
const ZOOM_MAX = 2.2;
/** Mouvement doux, sans à-coup au départ ni à l'arrivée */
const DOUX = Easing.bezier(0.45, 0, 0.2, 1);

interface Vue {
  echelle: number;
  cx: number;
  cy: number;
}

function borne(centre: number, visible: number, debut: number, taille: number): number {
  if (visible >= taille) return centre;
  return Math.min(Math.max(centre, debut + visible / 2), debut + taille - visible / 2);
}

function vue(cadre: Rect, marge: number, bornes?: Rect): Vue {
  const echelle = Math.min((LARGEUR - 2 * marge) / cadre.width, (HAUTEUR - 2 * marge) / cadre.height, ZOOM_MAX);
  let cx = cadre.x + cadre.width / 2;
  let cy = cadre.y + cadre.height / 2;
  if (bornes) {
    cx = borne(cx, LARGEUR / echelle, bornes.x, bornes.width);
    cy = borne(cy, HAUTEUR / echelle, bornes.y, bornes.height);
  }
  return { echelle, cx, cy };
}

/**
 * Où tombe un point du contenu à l'écran, une fois la caméra posée sur `cadre` : pour placer une
 * légende sur une zone calme connue de la capture, sans deviner.
 */
export function versEcranPour(cadre: Rect | null, contenu: { largeur: number; hauteur: number }, marge = 90, bornes?: Rect): VersEcran {
  const { echelle, cx, cy } = vue(cadre ?? { x: 0, y: 0, width: contenu.largeur, height: contenu.hauteur }, marge, bornes);
  return (p) => ({ x: LARGEUR / 2 + (p.x - cx) * echelle, y: HAUTEUR / 2 + (p.y - cy) * echelle });
}

export function vueA(frame: number, etapes: EtapeCamera[], contenu: { largeur: number; hauteur: number }, marge: number): Vue {
  const tout: Rect = { x: 0, y: 0, width: contenu.largeur, height: contenu.hauteur };
  const vues = [vue(tout, marge), ...etapes.map((e) => vue(e.cadre ?? tout, marge, e.bornes))];
  let courante = vues[0]!;
  etapes.forEach((etape, i) => {
    if (frame < etape.de) return;
    const depart = vues[i]!;
    const arrivee = vues[i + 1]!;
    const t = DOUX(Math.min(1, Math.max(0, (frame - etape.de) / Math.max(1, etape.a - etape.de))));
    // Échelle interpolée en logarithme : un zoom ×2 puis ×4 paraît régulier
    courante = {
      echelle: Math.exp(Math.log(depart.echelle) + (Math.log(arrivee.echelle) - Math.log(depart.echelle)) * t),
      cx: depart.cx + (arrivee.cx - depart.cx) * t,
      cy: depart.cy + (arrivee.cy - depart.cy) * t,
    };
  });
  return courante;
}

export function Camera({
  largeur,
  hauteur,
  etapes = [],
  marge = 90,
  children,
  superposition,
}: {
  largeur: number;
  hauteur: number;
  etapes?: EtapeCamera[];
  marge?: number;
  children: ReactNode;
  superposition?: (versEcran: VersEcran, echelle: number) => ReactNode;
}) {
  const frame = useCurrentFrame();
  const { echelle, cx, cy } = vueA(frame, etapes, { largeur, hauteur }, marge);
  const tx = LARGEUR / 2 - cx * echelle;
  const ty = HAUTEUR / 2 - cy * echelle;
  const versEcran: VersEcran = (p) => ({ x: tx + p.x * echelle, y: ty + p.y * echelle });
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: largeur, height: hauteur, transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${echelle})` }}>
        {children}
      </div>
      {superposition?.(versEcran, echelle)}
    </AbsoluteFill>
  );
}
