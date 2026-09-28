/**
 * Démarches Service-Public (comarquage DILA). Les fiches sont servies par le backend, qui télécharge
 * et normalise les archives de la DILA ; le renderer et les scripts de page n'en voient que ces types.
 */
export type DemarcheAudience = 'particuliers' | 'professionnels';

/** Nœud de contenu d'une fiche, tel que le normalise le backend. */
export interface DemarcheNode {
  type: string;
  title?: string;
  text?: string;
  href?: string;
  children?: DemarcheNode[];
  attributes?: Record<string, string>;
}

export interface DemarcheRef {
  id: string;
  title: string;
}

/**
 * Rubrique de l'arborescence des démarches : thème, puis sous-thèmes, puis les dossiers (chacun
 * regroupe les fiches d'un sujet : « Carte d'identité », « Passeport »…), rangés dans `fiches`.
 */
export interface DemarcheThemeVM {
  id: string;
  title: string;
  children: DemarcheThemeVM[];
  fiches: DemarcheRef[];
}

export interface DemarcheLinkVM {
  label: string;
  href: string;
  /** Numéro de formulaire Cerfa, quand le service en ligne en porte un */
  cerfa: string | null;
}

/** Dossier : les fiches d'un sujet, par sous-dossier (« Pour un majeur », « Pour un mineur »…) */
export interface DemarcheFolderVM {
  id: string;
  title: string;
  groups: Array<{ title: string; fiches: DemarcheRef[] }>;
}

/** Fiche prête à afficher : le thème n'a rien à savoir du comarquage. */
export interface DemarcheVM {
  id: string;
  audience: DemarcheAudience;
  title: string;
  /** La page est un dossier : son contenu est d'abord la liste de ses fiches */
  isFolder: boolean;
  /** Dossier de la page (lui-même pour un dossier, son dossier pour une fiche) */
  folder: DemarcheFolderVM | null;
  description: string | null;
  /** Rubriques d'origine, pour situer la fiche */
  trail: DemarcheRef[];
  warning: DemarcheNode | null;
  introduction: DemarcheNode[];
  content: DemarcheNode[];
  onlineServices: DemarcheLinkVM[];
  forms: DemarcheLinkVM[];
  references: DemarcheLinkVM[];
  seeAlso: DemarcheRef[];
  /** « Vérifié le 12 mars 2026 – Direction de l'information légale et administrative » */
  verifiedOn: string | null;
  source: { label: string; href: string };
}

export const AUDIENCE_LABELS: Record<DemarcheAudience, string> = {
  particuliers: 'Particuliers',
  professionnels: 'Professionnels',
};

export const DEMARCHE_AUDIENCES = Object.keys(AUDIENCE_LABELS) as DemarcheAudience[];
