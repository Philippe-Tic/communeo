# Vidéos et illustrations à produire pour communeo.fr

Rien n'est bloquant : le site est complet sans ces médias, leurs emplacements sont simplement masqués.
Vidéos : produites dans `v2/videos/` (Remotion), rendues dans `apps/site/src/videos/` et intégrées au site. Illustrations : à déposer dans `v2/contenus-site/illustrations/`.

Priorité conseillée : **V1**, puis les **3 illustrations du constat** (accueil), puis le reste.

---

## Vidéos

**Format commun**
- MP4 (H.264), 1920 × 1080, 30 images/s, moins de 20 Mo si possible. Une image d'aperçu (PNG 1920 × 1080),
  sinon je prends la première image.
- **Sous-titres** `.vtt` en français, calés sur la voix. Obligatoires pour l'accessibilité.
- **Transcription** en texte (`.md`) : ce qui est dit et ce qu'on voit à l'écran. Elle sera publiée sous la
  vidéo (« Lire la transcription »).
- Tournage : captures d'écran de l'admin et du site de démonstration **Saint-Aubin-sur-Loire** (compte de
  démonstration, jamais de vraies données de commune). Voix posée, sans musique forte ; un sous-titre ne
  remplace pas une voix, et l'inverse non plus.
- Nommage : `v1-demo.mp4`, `v1-demo.vtt`, `v1-demo-transcription.md`, `v1-demo-apercu.png`.

### V1. Démonstration, de l'inscription au site en ligne (1 min 30)
**Où** : accueil (sous l'accroche, titre « De l'inscription au site en ligne, en une minute et demie ») et page
Comment ça marche.
**Objectif** : montrer qu'une secrétaire de mairie peut avoir un site correct en une journée, sans
compétence technique. C'est la vidéo la plus importante du site.
**Déroulé proposé**
1. (0:00–0:10) La page d'inscription : on cherche la commune, on saisit son nom et son e-mail.
2. (0:10–0:25) L'assistant de création : les données publiques arrivent toutes seules (coordonnées et
   horaires de l'Annuaire, population INSEE) ; on choisit un thème.
3. (0:25–0:45) Le tableau de bord, puis une page modifiée dans l'éditeur par blocs (un texte, une image,
   un document PDF) ; le brouillon s'enregistre tout seul.
4. (0:45–1:00) L'aperçu dans le thème, puis « Mettre en ligne » et ses étapes.
5. (1:00–1:20) Le site public sur téléphone et ordinateur : horaires « ouvert maintenant », actualités,
   démarches Service-Public, bandeau « Site en préparation ».
6. (1:20–1:30) Fin sur « 30 jours gratuits, sans engagement » et l'adresse communeo.fr.

### V2. Une alerte, de l'administration au téléphone de l'habitant (20 s)
**Où** : accueil (section « Alertes en direct », lien « Voir la vidéo · 20 s ») et page Fonctionnalités
(groupe « Informer vos habitants »).
**Objectif** : prouver que l'information part vite, sans rebâtir le site.
**Déroulé proposé** : écran partagé en deux. À gauche, l'admin : on crée l'alerte « Coupure d'eau mardi de
9 h à 12 h », niveau « Attention », date de fin, on publie. À droite, un téléphone sur le site : on recharge,
le bandeau apparaît en haut. Un chronomètre discret dans un coin.

### V3. Un contenu, quatre thèmes (15 s)
**Où** : page Thèmes (lien « Un contenu, quatre thèmes · 15 s »).
**Objectif** : montrer que changer de thème ne demande rien de ressaisir.
**Déroulé proposé** : l'écran Apparence de l'admin ; on choisit tour à tour Institutionnel, Moderne,
Journal et Bourg ; à chaque choix, l'aperçu de l'accueil de Saint-Aubin change de mise en page, avec les
mêmes actualités, les mêmes horaires et le même logo.

### V5. Le devis en ligne (20 s)
**Où** : page Tarifs (section « Pour votre secrétariat »).
**Objectif** : rassurer sur la partie administrative, souvent la plus redoutée.
**Déroulé proposé** : l'écran « Passer en live » ; le prix s'affiche d'après la population INSEE ; on
saisit le signataire et sa qualité, le SIRET est vérifié ; on valide ; le devis et le bon de commande en
PDF, horodatés. Fin sur « Facture via Chorus Pro, virement sous 30 jours ».

> Il n'y a pas de V4 : la numérotation vient du brief d'origine.

---

## Illustrations

**Format commun**
- Style de la direction artistique « le papier et le sapin » : aplats, trait simple, palette du site
  (sapin #0E4033, papier #EFECE5, blé #E3B55B, tuile #A8452A, sauge #E1E9E4), pas de dégradés ni d'ombres
  réalistes, pas de texte dans l'image.
- **SVG** de préférence (léger, net sur tous les écrans) ; sinon PNG en double résolution.
- Pour chacune, une phrase qui la décrit (texte alternatif), ou « décorative » si elle n'apporte pas
  d'information.

### I1. Un ordinateur poussiéreux et un cadenas
**Où** : accueil, section « Le constat », carte « Le vieux site qu'on ne sait plus mettre à jour ».
**Format** : 16/9 (par exemple 800 × 450).
**Idée** : un vieil écran d'ordinateur couvert de poussière (quelques traits), un gros cadenas fermé
devant, peut-être une toile d'araignée dans un coin. Évoque un site figé dont on a perdu les accès.

### I2. Une chaise vide et un carton
**Où** : accueil, carte « Le site du bénévole parti ».
**Format** : 16/9.
**Idée** : une chaise de bureau vide, un carton de déménagement posé à côté (un écran ou un classeur qui
dépasse). Évoque la personne qui s'occupait du site et qui est partie.

### I3. Une pile de textes de loi et un point d'interrogation
**Où** : accueil, carte « Des obligations floues ».
**Format** : 16/9.
**Idée** : une pile de documents ou de codes reliés, un grand point d'interrogation au-dessus, couleur
tuile. Évoque les règles qu'on sait exister sans savoir lesquelles.

### I4. La boîte aux lettres de la mairie
**Où** : page Contact, message « Merci, votre message est bien parti ».
**Format** : 16/7 (par exemple 800 × 350).
**Idée** : une boîte aux lettres de mairie (façade avec drapeau tricolore stylisé ou fronton simple), une
enveloppe qui y entre. Ton rassurant.

### I5. Un panneau « Communeo » perdu dans un champ
**Où** : page introuvable (erreur 404).
**Format** : carré (par exemple 600 × 600).
**Idée** : un panneau de direction de campagne, flèches dans tous les sens, planté dans un champ avec les
courbes de niveau du site en arrière-plan. Un clin d'œil : on s'est perdu, mais pas grave.

### I6. La place du village (facultatif)
**Où** : dans le téléphone de l'accueil (maquette du site de Saint-Aubin), à la place de la zone hachurée.
**Format** : 16/9, petite (560 × 315 suffit).
**Idée** : une photo ou une illustration d'une place de village (mairie, arbres, fontaine). Pas de photo
d'une vraie commune reconnaissable, sauf accord.

---

## Rappel : déjà fait

- Image de partage (réseaux sociaux, messageries) : `public/partage.png`, générée.
- Captures de l'administration et des quatre thèmes : en place (à refaire si l'interface change,
  `pnpm --filter @communeo/site captures:themes`).
