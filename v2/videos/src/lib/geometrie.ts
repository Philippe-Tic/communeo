/** Rectangles et captures : coordonnées en pixels CSS de la page capturée (getBoundingClientRect) */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Une capture enregistrée par scripts/captures.ts : image 2x dans public/, taille en pixels CSS */
export interface Capture {
  /** Chemin dans public/ (staticFile) */
  image: string;
  largeur: number;
  hauteur: number;
  echelle: number;
  /** Adresse à afficher dans la barre du navigateur */
  url: string;
  /** Hauteur de la fenêtre du navigateur (capture pleine page : la page est plus haute) */
  vue?: number;
  /** Éléments repérés (boutons, champs…) : leur rectangle dans la capture */
  elements: Record<string, Rect>;
}

export const centre = (r: Rect): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

/** Élément d'une capture, avec une erreur claire s'il n'a pas été repéré */
export function element(capture: Capture, nom: string): Rect {
  const rect = capture.elements[nom];
  if (!rect) throw new Error(`« ${nom} » n'est pas repéré dans ${capture.image} (voir captures.ts de la vidéo)`);
  return rect;
}

/** Décale un rectangle (capture placée sous la barre d'un navigateur, dans un téléphone…) */
export const decale = (r: Rect, dx: number, dy: number): Rect => ({ ...r, x: r.x + dx, y: r.y + dy });

/** Agrandit un rectangle d'une marge (pour cadrer un zoom autour d'un élément) */
export const autour = (r: Rect, marge: number): Rect => ({ x: r.x - marge, y: r.y - marge, width: r.width + 2 * marge, height: r.height + 2 * marge });
