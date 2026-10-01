# Vidéos de communeo.fr

V1, V2, V3 et V5 du brief (`v2/contenus-site/medias-a-produire.md`), en code avec Remotion : 1920 × 1080,
30 images/s. La direction artistique vient du site lui-même (`src/charte.ts` lit `apps/site` : couleurs,
polices, logo, courbes de niveau). Outil de production, jamais déployé.

## Une vidéo = un dossier `src/videos/<id>/`

- `script.ts` : **source unique**. Segments `{ debut, fin, voix, ecran }` : la voix off (et les
  sous-titres), ce qu'on voit (et la transcription), les heures estimées.
- `timings.json` : les heures calées sur la voix réelle (généré, ne pas éditer).
- `captures.ts` : les écrans à capturer et les éléments à repérer (boutons, champs).
- `Composition.tsx` : le montage (pour l'instant, seule la vidéo `test` ; les autres sont des
  storyboards `Brouillon` générés depuis le script).

## Commandes (depuis la racine)

```bash
pnpm videos:captures <id> [--build]   # écrans en 2x + JSON des éléments → public/captures/<id>/
pnpm videos:voix <id>                 # voix ElevenLabs (ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID), recalage, sous-titres
pnpm videos:recaler <id>              # sans ElevenLabs : recale sur public/voix/<id>/voix.mp3 (silences)
pnpm videos:musique <id>              # musique de fond composée par code → public/musique/<id>.mp3 (+ clic de souris)
pnpm videos:sous-titres <id>          # <id>.vtt (42 car./ligne, 2 lignes) et <id>-transcription.md
pnpm videos:render <id>               # MP4 < 20 Mo (musique générée si elle manque), aperçu PNG, sous-titres → v2/contenus-site/videos/
pnpm videos:planche <id> [--pas 0.5] [--rendre]   # planche contact → out/<id>-planche.png
pnpm videos:studio                    # éditeur Remotion, aperçu en direct
```

`<id>` : `v1-demo`, `v2-alerte`, `v3-themes`, `v5-devis`, `test`.

## Captures : jamais de vraies données, jamais la production

- **Admin** : le build de l'admin servi en local, avec l'API Strapi simulée des tests
  (`apps/admin/e2e/api.ts`) : commune fictive Saint-Aubin-sur-Loire. Inscription, données publiques
  (INSEE, Annuaire), devis et SIRET passent par ce mock : aucun appel à une API externe.
- **Site** : le site de démonstration construit par le renderer depuis les fixtures
  (`E2E_THEMES=institutionnel,moderne,journal,bourg node e2e/build.mjs` dans apps/renderer).
- **Thèmes (V3)** : l'aperçu de l'écran Apparence sert le build de démonstration du thème demandé (`?theme=<id>`).

Les coordonnées du curseur, des zooms et des saisies viennent du JSON de chaque capture
(`element(capture, 'nom')`) : aucune coordonnée devinée.

## Composants (`src/composants/`)

`BrowserFrame` et `PhoneFrame` (cadres), `Camera` (zoom et déplacement doux ; `bornes` pour ne jamais
montrer une barre coupée), `Cursor` (trajet courbe, clic discret), `Typing` / `TypingCaptures`
(saisie superposée, ou dévoilement de la capture remplie), `Callout` (3 à 6 mots, sur une zone calme),
`EndCard`, `Fond`, `Glissade` (passage d'une scène à l'autre), `Musique` (baissée sous la voix),
`VoixOff`, `Brouillon`.

## Voix off

- Avec ElevenLabs : une phrase par segment, voix posée ; chaque segment prend la durée réelle de sa phrase.
- Sans : enregistrer la voix d'une traite, avec **un silence net (≥ 0,4 s) entre chaque segment**, dans
  `public/voix/<id>/voix.mp3`, puis `pnpm videos:recaler <id>` (`--seuil -35 --silence 0.4` si besoin).
- Pas de musique forte : la musique est réglée 9 dB sous la voix, et baisse encore sous chaque phrase.

## Musique et rythme

- `pnpm videos:musique <id>` compose la musique de fond note à note (`scripts/synthe.ts` : corde pincée,
  nappe, basse, percussions légères, réverbération) : **libre de droits par construction**, rien n'est
  téléchargé. Elle suit le montage : au `tempo` du script (100 temps/min pour V1), un souffle à chaque
  changement de scène, un accord final sur la carte de fin.
- Avec un `tempo`, le calage arrondit chaque scène au temps suivant : les scènes changent sur la musique.
  Une scène glisse par-dessus la précédente en un temps ; `entree: 'fondu'` dans le script quand elle
  continue sur le même écran.
- Pour une autre musique (une piste libre de droits choisie ailleurs) : la déposer à la place de
  `public/musique/<id>.mp3`. `videos:render` la garde ; `videos:musique` l'écraserait.
- Chaque clic du curseur s'entend (`public/sons/clic.wav`, généré avec la musique).

ffmpeg et ffprobe sont ceux fournis par Remotion (aucune installation système), réduits : pas de filtre
`fps` ni `tile`, d'où l'assemblage des planches avec sharp.

## Vérifier un rendu

Toujours regarder la planche (`pnpm videos:planche <id> --pas 0.5`) avant de livrer : bords coupés,
légende sur un libellé, texte illisible, fondu raté se voient tout de suite.

## Faire une nouvelle vidéo (V2, V3, V5)

Brief et déroulé : `v2/contenus-site/medias-a-produire.md`. Cible : une secrétaire de mairie sans
compétence technique ; vouvoiement, ton posé, aucun superlatif marketing.

1. `src/videos/<id>/script.ts` : segments `{ debut, fin, voix, ecran }` (durées prévues = minimum),
   `tempo: 100`, `apercu: { segment, apres }`, `prononciation` pour « Communeo » (« Communéo ») et
   « communeo.fr » (« communéo point f r »), `entree: 'fondu'` quand une scène continue sur le même écran.
2. `captures.ts` : les écrans, uniquement l'admin simulé (`apps/admin/e2e/api.ts`, options et routes
   `donnees` si un état manque) et les sites de démonstration ; jamais une image retouchée. Les photos
   de `packages/fixtures/photos/` remplacent les emplacements hachurés (Pexels : demander avant de
   télécharger une nouvelle photo, noter sa source dans le README du dossier). `pnpm videos:captures <id>`.
3. `Composition.tsx` : le montage commun (`composants/Montage.tsx` : `Scenes`, `Navigateur`, `rythme`,
   `Entree`, `Fin`), comme `src/videos/v1-demo/Composition.tsx` ; l'enregistrer dans `src/Root.tsx`.
   Rythme vif : glissades, clics audibles, légendes en ressort ; un seul mouvement de caméra à la fois,
   jamais pendant un changement d'écran ; 1 ou 2 légendes pour 20 s, jamais le texte de la voix.
4. `pnpm videos:voix <id>` (ElevenLabs, `.env`), `pnpm videos:musique <id>`, `pnpm videos:render <id>`.
5. Avant de livrer : planche (`pnpm videos:planche <id> --pas 0.5`) regardée image par image, chaque
   sous-titre sur sa phrase (`<id>.vtt`), taille < 20 Mo, image d'aperçu. Le MP4 reste hors de git.

## Plusieurs vidéos en parallèle (git worktree)

Une vidéo par copie de travail. Les ports des serveurs de capture dépendent de la vidéo (`ports()` dans
`scripts/outils.ts`) ; les fichiers ignorés par git (`v2/videos/.env`, builds de démonstration
`apps/renderer/.e2e/`) sont lus dans le dépôt principal quand la copie n'en a pas (`partage()`). Dans la
copie : `pnpm install`, puis les commandes habituelles (le build de l'admin se fait au premier
`videos:captures`).
