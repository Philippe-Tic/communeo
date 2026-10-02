/**
 * llms.txt (https://llmstxt.org) : Communeo en quelques lignes pour les assistants et moteurs de réponse
 * (ChatGPT, Perplexity, Google…) : ce que c'est, l'offre et ses prix (grille de @communeo/core), et les
 * pages à lire. Généré au build : les prix suivent la grille.
 */
import type { APIRoute } from 'astro';
import { DEFINITION } from '../lib/seo';
import { CONTACT_EMAIL, demoUrl, DOC_URL, TRIAL_URL } from '../lib/site';
import { TRANCHES } from '../lib/tarifs';

export const GET: APIRoute = ({ site }) => {
  const page = (chemin: string) => new URL(chemin, site).href;
  const prix = TRANCHES.map((t) => `  - ${t.label} : ${t.price} € HT par an`).join('\n');
  const texte = `# Communeo

> ${DEFINITION}

Communeo est édité en France par Philippe Chevreul (entreprise individuelle, SIREN 911 592 764). Les données des communes sont hébergées en France, chez OVH (Gravelines), avec des sauvegardes chiffrées à Paris.

## L'offre
- Essai gratuit de 30 jours, sans engagement et sans carte bancaire : ${TRIAL_URL}
- Abonnement annuel selon la population municipale INSEE, sans frais de mise en service ; TVA non applicable (art. 293 B du CGI) :
${prix}
- Devis en ligne, facture déposée sur Chorus Pro, paiement par virement. Marché de faible montant, dispensé de publicité et de mise en concurrence préalables (art. R. 2122-8 du Code de la commande publique).

## Ce que fait Communeo
- Inscription en deux minutes ; l'assistant pré-remplit le site avec les données publiques de la commune (Annuaire de l'administration, INSEE).
- Éditeur par blocs sans compétence technique, enregistrement automatique, publication programmée.
- Alertes en bandeau visibles sur le site en moins d'une minute, actualités, agenda, démarches Service-Public, horaires « ouvert / fermé », menu de la cantine, collectes.
- Quatre thèmes (Institutionnel, Moderne, Journal, Bourg) : la mise en page change, les contenus restent.
- Conformité : écran Conformité, pages légales générées (mentions légales, données personnelles, déclaration d'accessibilité, cookies), thèmes testés selon les critères WCAG 2.2 AA (RGAA), aucun traceur publicitaire, sauvegardes chiffrées.

## Pages
- [Accueil](${page('/')}): présentation et démonstration vidéo
- [Fonctionnalités](${page('/fonctionnalites')}): le site public, l'administration, la conformité
- [Thèmes](${page('/themes')}): les quatre mises en page
- [Démonstration](${page(demoUrl())}): le site de la commune fictive Saint-Aubin-sur-Loire, dans chacun des quatre thèmes
- [Tarifs](${page('/tarifs')}): grille de prix, ce qui est compris, devis et facturation
- [Comment ça marche](${page('/comment-ca-marche')}): de l'inscription à la facture, en sept étapes
- [Questions fréquentes](${page('/questions')}): compétences, délais, nom de domaine, accessibilité, cookies, Chorus Pro
- [Documentation](${DOC_URL}): une page par écran de l'administration
- [Contact](${page('/contact')}): ${CONTACT_EMAIL}
`;
  return new Response(texte, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
