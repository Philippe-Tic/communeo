# Site de Communeo (communeo.fr)

Site de présentation de Communeo (#315), d'après les maquettes de `v2/design_handoff_site_communeo/`
(direction artistique « le papier et le sapin »). Astro, pages statiques, aucun traceur ni ressource
tierce : polices DM Sans et DM Serif Display servies par le site.

```bash
pnpm --filter @communeo/site dev          # http://localhost:4321
pnpm --filter @communeo/site build        # dist/
pnpm --filter @communeo/site test:e2e     # build + axe (WCAG 2.2 AA), 320 px, texte à 200 %, interactions, en 390 et 1440 px
pnpm --filter @communeo/site a-fournir    # contenus encore à fournir (après un build)
pnpm --filter @communeo/site captures:themes   # captures des thèmes (voir plus bas)
```

## Contenus

- Les textes viennent des maquettes, corrigés quand le produit ne fait pas ce qu'ils annonçaient
  (inscription validée par la mairie, pré-remplissage par l'assistant, sauvegardes restaurées par l'équipe).
- Les tarifs viennent de `@communeo/core` (`PRICING_TIERS`), la même grille que les devis.
- Ce qui reste à fournir (textes juridiques, parcours, délais) est marqué par `<AFournir>` : visible dans
  la page, listé par `pnpm a-fournir`. Le site n'est pas mis en ligne tant que la liste n'est pas vide.
- Vidéos (V1, V2, V3, V5) et illustrations des maquettes : leurs emplacements ne sont pas affichés tant
  qu'elles n'existent pas.

## Images

- `src/assets/captures/` : écrans de l'administration (commune de démonstration).
- `src/assets/themes/` : l'accueil de Saint-Aubin-sur-Loire dans chaque thème, capturé depuis les builds
  de démonstration du renderer (`E2E_THEMES=institutionnel,moderne,journal,bourg node e2e/build.mjs`
  dans apps/renderer, puis `pnpm captures:themes`). À refaire quand un thème change d'aspect.

## Formulaire de contact

Envoyé à Strapi (`POST /api/prospect-contact`, public, 5 messages par heure et par adresse IP, champ piège
contre les robots) qui le transmet par e-mail à l'équipe (`SIGNUP_NOTIFY_EMAIL`), l'adresse de
l'expéditeur en réponse. Rien n'est enregistré. `PUBLIC_API_URL` au build : Strapi visé
(défaut https://app.communeo.fr).

## Mise en ligne

Site Netlify, « Base directory » `apps/site` : `netlify.toml` construit depuis la racine du monorepo et
pose les en-têtes de sécurité (CSP, rejouée par le serveur des tests). Les pages sont servies sans
extension (`/tarifs` → `tarifs.html`).
