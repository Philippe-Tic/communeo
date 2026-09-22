# Créer un thème Communeo

Un thème est un site complet : il décide de toute la présentation (en-tête, menus, composition de l'accueil,
forme des listes, rendu de chaque bloc). Les contenus sont les mêmes pour tous les thèmes : changer de
thème ne fait rien perdre à la commune.

## Démarrer

```bash
pnpm create-theme moderne --name "Moderne"   # copie themes/starter vers themes/moderne
pnpm theme:dev moderne                       # commune de démonstration dans ce thème, sans Strapi
pnpm theme:dev moderne --variant minimal     # accueil réduit, sans image
pnpm theme:dev moderne --variant empty       # états vides
pnpm theme:dev moderne --logo blason         # logo carré (blason)
pnpm theme:dev moderne --alert               # ajoute une alerte urgente
pnpm theme:thumbnail moderne                 # vignette 1200 × 800 du sélecteur de thème
```

Pour qu'une commune puisse choisir le thème, ajoutez son identifiant au registre `THEMES`
(`packages/core/src/site/themes.ts`) et à l'énumération `theme` du Site (`apps/backend/.../site/schema.json`),
puis lancez `pnpm gen:types`.

## Ce que fournit un thème

`src/index.ts` exporte `defineTheme({ manifest, templates, blocks })`. TypeScript refuse un thème
auquel il manque un template ou un bloc, ou dont les props ne correspondent pas au contrat (`pnpm typecheck`).

| Élément | Rôle |
|---|---|
| `manifest` | Identifiant, nom, description, vignette (`thumbnail.png`, 1200 × 800), sections d'accueil gérées, menus |
| `templates` | 19 composants de page : `Home`, `Page`, `ArticleList`, `Article`, `EventList`, `Event`, `DocumentList`, `Document`, `Team`, `AssociationList`, `Association`, `AssociationProposal`, `RightsRequest`, `Contact`, `Waste`, `Canteen`, `Disruptions`, `Frame`, `NotFound` |
| `blocks` | 9 composants de blocs : `text`, `image`, `buttons`, `callout`, `documents`, `gallery`, `faq`, `contact`, `video` |

Chaque template reçoit `ctx` (site, menus, alertes, chemin courant, fil d'Ariane, titre, SEO) et ses données
propres, sous forme de **view-models** de `@communeo/core` : libellés en français, dates formatées,
liens prêts, champs absents à `null`. Un thème ne fait jamais d'appel à Strapi.

Le `<main>` du thème porte les attributs de `searchAttributes(ctx)` : l'index de recherche du site
(Pagefind, construit après le build) ne retient alors que le contenu propre à chaque page.

`Frame` est le cadre des pages dont le contenu est commun à tous les thèmes (mentions légales, données
personnelles, déclaration d'accessibilité, plan du site, recherche, démarches) : le renderer fournit le
contenu dans le slot par défaut, le thème ne fait que l'habiller.

## Ce que le thème ne gère pas

Le renderer fournit le document HTML : `<html lang="fr">`, `<head>` (titre, description, canonique,
Open Graph, JSON-LD), les liens d'évitement et le bandeau cookies. Le thème rend le contenu du `<body>`.

## Règles d'accessibilité (RGAA)

- Un seul `<h1>` par page ; titres dans l'ordre, sans sauter de niveau.
- `<main id="contenu">` (cible du lien d'évitement) et `<nav id="menu" aria-label="Menu principal">`.
- Menus utilisables sans JavaScript ; `aria-current="page"` sur le lien de la page courante.
- Contrastes ≥ 4,5:1 (texte) et 3:1 (éléments d'interface), focus toujours visible.
- L'information ne passe jamais par la couleur seule (sévérité d'alerte, catégorie, encadré).
- Liens externes et téléchargements signalés (format et poids).
- Pas de hauteur fixe sur du texte ; lisible à 320 px et avec un zoom à 200 %.

## Composants partagés (`@communeo/ui-a11y`)

À réutiliser plutôt qu'à réécrire : le comportement est écrit une fois, le thème l'habille.

| Élément | Rôle |
|---|---|
| `RichText`, `Blocks` | Texte riche et aiguillage des blocs vers les composants du thème |
| `Breadcrumb` | Fil d'Ariane (`aria-current` sur la page courante) |
| `Alerts` | Bandeau d'alertes : rendu au build, puis rechargé par le navigateur (mise en ligne immédiate) et retrait à la date de fin |
| `ConsentEmbed` | Vidéos et cartes chargées seulement après consentement |
| `OpeningStatus` | Statut « ouverte · ferme à 12h », calculé dans le navigateur |
| `Lightbox` + `scripts/lightbox` | Agrandissement d'une galerie : Échap, flèches, focus rendu à la vignette |
| `scripts/menu` | Menu repliable sur petit écran et sous-menus : `aria-expanded`, Échap, clic à l'extérieur |
| `styles.css` | Utilitaires d'accessibilité (`cn-sr-only`, `cn-js-only`, `prefers-reduced-motion`) |
| `search` | Attributs à poser sur le `<main>` : seul le contenu principal entre dans l'index de recherche |
| `Weather` | Météo de la commune (Open-Meteo, sans cookie), chargée dans le navigateur |
| `NextCollections` | Prochains passages de collecte, recalculés à l'affichage : un site publié il y a trois semaines reste juste |
| `scripts/today` | Marque le jour courant parmi des éléments datés (`data-cn-day`) |

Le renderer pose la classe `cn-js` sur `<html>` : tout élément qui n'a de sens qu'avec JavaScript
(bouton de menu, agrandissement, copie d'un lien) porte la classe `cn-js-only` et disparaît sans lui.
