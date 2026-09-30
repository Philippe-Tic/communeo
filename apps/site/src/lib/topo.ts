/**
 * Courbes de niveau du motif de fond (sections sapin) : contours fermés concentriques, jamais croisés,
 * calculés au build (chemin SVG statique, aucun script dans la page).
 */
export interface TopoOptions {
  cx: number;
  cy: number;
  /** Nombre d'anneaux */
  rings: number;
  /** Écart entre deux anneaux */
  gap: number;
  /** Rayon du premier anneau */
  r0: number;
  seed: number;
  /** Étirement horizontal */
  sx: number;
  /** Ondulation propre à chaque anneau (par défaut 18 % de l'écart) */
  wobble?: number;
}

export function topo({ cx, cy, rings, gap, r0, seed, sx, wobble = gap * 0.18 }: TopoOptions): string {
  let d = '';
  for (let i = 0; i < rings; i += 1) {
    const r = r0 + i * gap;
    for (let k = 0; k <= 120; k += 1) {
      const a = (k / 120) * Math.PI * 2;
      const rr = r * (1 + 0.12 * Math.sin(3 * a + seed) + 0.05 * Math.sin(5 * a + seed * 2)) + wobble * Math.sin(2 * a + seed + i * 0.35);
      d += `${k ? 'L' : 'M'}${(cx + rr * Math.cos(a) * sx).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`;
    }
    d += 'Z';
  }
  return d;
}
