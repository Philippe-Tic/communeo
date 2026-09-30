/**
 * Curseur : va d'un point à l'autre en courbe (jamais en ligne droite), avec un clic discret (léger
 * enfoncement et onde). Les points sont dans le repère du contenu ; `versEcran` (Camera) les place
 * dans l'image, pour que le curseur garde sa taille pendant un zoom.
 */
import { Easing, useCurrentFrame } from 'remotion';
import type { VersEcran } from './Camera';
import type { Point } from '../lib/geometrie';

export interface PointCurseur extends Point {
  /** Image où le curseur arrive sur ce point */
  image: number;
  clic?: boolean;
}

const TRAJET = Easing.bezier(0.33, 0, 0.15, 1);
const DUREE_CLIC = 16;

function position(frame: number, points: PointCurseur[]): Point {
  if (frame <= points[0]!.image) return points[0]!;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (frame > b.image) continue;
    const t = TRAJET((frame - a.image) / Math.max(1, b.image - a.image));
    // Point de contrôle écarté de la ligne droite, alternativement d'un côté puis de l'autre
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const sens = i % 2 ? 1 : -1;
    const cx = (a.x + b.x) / 2 - dy * 0.2 * sens;
    const cy = (a.y + b.y) / 2 + dx * 0.2 * sens;
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y };
  }
  return points[points.length - 1]!;
}

/**
 * `echelle` (Camera) : le curseur grandit un peu avec le zoom, comme dans une vraie capture d'écran
 * agrandie, sans devenir énorme.
 */
export function Cursor({ points, versEcran = (p) => p, echelle = 1 }: { points: PointCurseur[]; versEcran?: VersEcran; echelle?: number }) {
  const frame = useCurrentFrame();
  if (!points.length) return null;
  const taille = Math.min(60, Math.max(30, 25 * echelle));
  const { x, y } = versEcran(position(frame, points));
  const clic = points.find((p) => p.clic && frame >= p.image && frame < p.image + DUREE_CLIC);
  const t = clic ? (frame - clic.image) / DUREE_CLIC : 1;
  const enfonce = clic ? 1 - 0.14 * Math.sin(Math.min(1, t * 2) * Math.PI) : 1;
  return (
    <>
      {clic && (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: 16 + 60 * t,
            height: 16 + 60 * t,
            marginLeft: -(8 + 30 * t),
            marginTop: -(8 + 30 * t),
            borderRadius: '50%',
            border: '3px solid rgba(14, 64, 51, 0.55)',
            opacity: 1 - t,
          }}
        />
      )}
      <svg
        width={taille}
        height={taille}
        viewBox="0 0 24 24"
        style={{ position: 'absolute', left: x - 3, top: y - 2, transform: `scale(${enfonce})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 3px 5px rgba(28, 27, 24, 0.35))' }}
      >
        <path d="M4 2.5v17.2l4.6-4.4 2.9 6.6 3-1.3-2.9-6.5h6.4z" fill="#FFFFFF" stroke="#1C1B18" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </>
  );
}
