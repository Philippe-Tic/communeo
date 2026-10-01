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
  /** Thème du site (build de démonstration du renderer), par défaut institutionnel */
  theme?: string;
  appareil?: 'ordinateur' | 'telephone';
  /** Réglages de l'API simulée (utilisateur, alertes, état de mise en ligne…) */
  options?: MockOptions;
  /** Adresse affichée dans la barre du navigateur de la vidéo */
  url: string;
  /** Préparation avant la capture : remplir un champ, ouvrir un panneau… */
  avant?: (page: Page) => Promise<void>;
  /** Éléments repérés : leur rectangle est enregistré dans le JSON (curseur, zooms, saisies) */
  elements?: Record<string, (page: Page) => Locator>;
}
