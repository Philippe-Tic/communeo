/**
 * Saisie dans un champ, dans le repère de la capture :
 * - `texte` : le texte apparaît lettre à lettre par-dessus le champ vide de la capture ;
 * - `rempli` : la capture où le champ est rempli se dévoile de gauche à droite sur le champ.
 */
import { Img, random, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, POLICES } from '../charte';
import type { Capture, Rect } from '../lib/geometrie';

interface Commun {
  /** Rectangle du champ dans la capture */
  cadre: Rect;
  /** Image où la saisie commence */
  de: number;
  /** Caractères par seconde (une saisie posée, pas une machine) */
  vitesse?: number;
}

/** Nombre de caractères tapés à l'image `frame`, avec un rythme un peu irrégulier */
function tapes(frame: number, de: number, fps: number, vitesse: number, total: number): number {
  if (frame < de) return 0;
  let n = 0;
  let t = de;
  while (n < total) {
    t += (fps / vitesse) * (0.6 + 0.8 * random(`frappe-${n}`));
    if (t > frame) break;
    n += 1;
  }
  return n;
}

export function Typing({
  cadre,
  de,
  vitesse = 13,
  texte,
  taille,
  retrait = 16,
  fond = '#FFFFFF',
}: Commun & { texte: string; taille?: number; retrait?: number; fond?: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < de) return null;
  const n = tapes(frame, de, fps, vitesse, texte.length);
  const fini = n >= texte.length;
  const caret = !fini || Math.floor((frame - de) / (fps / 2)) % 2 === 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: cadre.x + 2,
        top: cadre.y + 2,
        width: cadre.width - 4,
        height: cadre.height - 4,
        background: fond,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: retrait - 2,
        fontFamily: POLICES.sans,
        fontSize: taille ?? Math.round(cadre.height * 0.4),
        color: C.encre,
        whiteSpace: 'pre',
        overflow: 'hidden',
      }}
    >
      {texte.slice(0, n)}
      <span style={{ display: 'inline-block', width: 2, height: '1.15em', marginLeft: 1, background: caret ? C.encre : 'transparent' }} />
    </div>
  );
}

/**
 * `depuis` : part du champ déjà écrite dans l'écran de base (compléter un texte existant) : le
 * dévoilement commence là.
 */
export function TypingCaptures({ cadre, de, vitesse = 13, rempli, caracteres, depuis = 0 }: Commun & { rempli: Capture; caracteres: number; depuis?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < de) return null;
  const part = depuis + (1 - depuis) * (tapes(frame, de, fps, vitesse, caracteres) / caracteres);
  return (
    <div style={{ position: 'absolute', left: cadre.x, top: cadre.y, width: cadre.width, height: cadre.height, overflow: 'hidden', clipPath: `inset(0 ${(1 - part) * 100}% 0 0)` }}>
      <Img
        src={staticFile(rempli.image)}
        style={{ position: 'absolute', left: -cadre.x, top: -cadre.y, width: rempli.largeur, height: rempli.hauteur, maxWidth: 'none' }}
      />
    </div>
  );
}
