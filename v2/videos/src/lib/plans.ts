/**
 * Plans de capture d'une vidéo (`src/videos/<id>/captures.ts`), lus par scripts/captures.ts.
 * Côté Node uniquement (Playwright) : ce fichier n'est jamais importé par les compositions.
 */
import type { Locator, Page } from '@playwright/test';
import type { MockOptions } from '../../../../apps/admin/e2e/api';

export interface Plan {
  /** Nom du fichier : public/captures/<vidéo>/<nom>.png et .json */
  nom: string;
  /**
   * `admin` : l'admin compilé, API Strapi simulée (apps/admin/e2e/api.ts) ;
   * `site` : le site de démonstration Saint-Aubin-sur-Loire construit par le renderer (fixtures).
   */
  ou: 'admin' | 'site';
  /** Chemin dans l'admin ou le site */
  chemin: string;
  /**
   * Site de démonstration (build du renderer) : un thème, ou `essai` (thème Institutionnel, commune en
   * période d'essai : bandeau « Site en préparation »). Par défaut institutionnel.
   */
  theme?: string;
  /** Heure du navigateur (ISO) : horaires « ouvert maintenant », dates relatives */
  heure?: string;
  appareil?: 'ordinateur' | 'telephone';
  /** Réglages de l'API simulée (utilisateur, alertes, état de mise en ligne…) */
  options?: MockOptions;
  /** Adresse affichée dans la barre du navigateur de la vidéo */
  url: string;
  /**
   * Données de démonstration, avant d'ouvrir la page : réponses de l'API simulée remplacées
   * (`page.route`) pour obtenir un état précis (commune neuve, étape de mise en ligne…)
   */
  donnees?: (page: Page) => Promise<void>;
  /** Préparation avant la capture, par l'interface : remplir un champ, ouvrir un panneau… */
  avant?: (page: Page) => Promise<void>;
  /**
   * Toute la hauteur de la page (pour la faire défiler dans le cadre) ; les éléments sont alors
   * repérés dans la page entière
   */
  pleinePage?: boolean;
  /** Éléments repérés : leur rectangle est enregistré dans le JSON (curseur, zooms, saisies) */
  elements?: Record<string, (page: Page) => Locator>;
}
