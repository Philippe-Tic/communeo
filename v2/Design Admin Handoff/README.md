# Handoff : Administration Communeo V2 (back-office)

## Vue d'ensemble

Communeo est un CMS pour mairies. Chaque commune choisit un thème parmi 4 (Institutionnel, Moderne, Journal, Bourg) et gère son site depuis cette administration : pages en blocs, actualités, agenda, documents officiels, informations pratiques, messages des habitants, mise en ligne, conformité.

Ce paquet couvre l'intégralité du brief `brief-maquettes-admin.md` (§6.1 à §6.20, états transverses §7, livrables §8) : fondations, composants, tous les écrans en desktop 1440, mobile 390 pour les tâches rapides, mode sombre pour les écrans principaux, un écran 1366, et deux parcours annotés.

Utilisatrice de référence : Sophie Leroy, secrétaire de mairie de Saint-Aubin-sur-Loire (3 240 hab.), écran 1366 px, pas technicienne, doit pouvoir publier une alerte depuis son téléphone.

## À propos des fichiers de design

Les fichiers `.dc.html` de ce dossier sont des **références de design réalisées en HTML** (planches statiques, styles inline). Ce ne sont pas du code de production à copier. La tâche est de **recréer ces écrans dans la base de code cible** — stack prévue : **React + Tailwind + shadcn/ui** — avec ses conventions, ses composants et son système de tokens. Si la base n'existe pas encore, créer un projet Vite + React + TypeScript + Tailwind + shadcn/ui.

Ouvrir chaque planche dans un navigateur (nécessite `support.js` et `assets/` à côté, fournis). Les planches sont de grandes toiles : zoomer/dézoomer avec la molette. Chaque écran porte un attribut `data-screen-label` qui reprend la numérotation du brief.

## Fidélité

**Haute fidélité.** Couleurs, typographie, espacements, rayons, états (repos, survol, focus, erreur, désactivé, chargement, vide) sont définitifs. Reproduire à l'identique, en mappant sur les primitives shadcn/ui (Button, Input, Select, Switch, Checkbox, RadioGroup, Dialog, Sheet, DropdownMenu, Tabs, Table, Toast/Sonner, Tooltip, Badge, Skeleton, Popover).

Les contenus (textes, noms, dates) sont des données de démonstration réalistes ; les images sont des placeholders hachurés.

## Fichiers

| Fichier | Contenu |
|---|---|
| `Admin Communeo - Priorite 1.dc.html` | Fondations, composants, 6.1 shell, 6.2 liste, 6.3 éditeur de blocs (+ tous les blocs ouverts, catalogue, historique), 6.4 formulaire, 6.5 confirmations, 6.6 tableau de bord, **mode sombre** |
| `Admin Communeo - Priorite 2.dc.html` | 6.7 apparence/thème, 6.8 page d'accueil, 6.9 menu, 6.10 réglages (informations, légal/RGPD, accessibilité, réseaux, démarches, open data), 6.11 médiathèque, 6.12 mise en ligne + domaine |
| `Admin Communeo - Priorite 3.dc.html` | 6.13 contenus spécifiques (documents, équipe, associations, alertes, déchets, cantine), 6.14 messages, 6.15 newsletter, 6.16 utilisateurs, 6.17 conformité, 6.18 onboarding, 6.19 authentification, 6.20 super admin |
| `Admin Communeo - Parcours et 1366.dc.html` | Parcours A « créer et publier une actualité », parcours B « changer de thème », éditeur à 1366 × 768 |
| `brief-maquettes-admin.md` | Brief d'origine : règles métier, contraintes, données de démo |
| `assets/logo-vert.svg` | Logo Communeo (vert #004643) |
| `support.js` | Runtime nécessaire pour ouvrir les `.dc.html`, ne pas réutiliser |

---

## Design tokens

### Couleurs — mode clair

| Token | Hex | Usage |
|---|---|---|
| `brand` | `#004643` | Accent : bouton principal, liens, item de nav actif, focus, cases cochées. Blanc dessus = 11,3:1 |
| `brand-hover` | `#00332F` | Survol du bouton principal |
| `brand-soft` | `#E2E8E4` | Fond de l'item actif, pastille d'icône de bloc, filtre actif |
| `bg` | `#EFEDE4` | Fond d'application (beige) |
| `bg-sidebar` | `#F7F6F1` | Barre latérale, préfixes de champ, ligne de menu survolée |
| `surface` | `#FFFFFF` | Cartes, en-tête, champs, tableaux |
| `border` | `#D9D6C9` | Bordures de cartes, séparateurs |
| `border-row` | `#ECEAE2` | Séparateurs de lignes de tableau, squelettes |
| `border-input` | `#8F8C7E` | Bordures de champs et boutons secondaires (3,3:1 sur blanc) |
| `muted` | `#B9B6A8` | Bouton désactivé, icône inactive, bordure de cadre |
| `text` | `#1C1B18` | Texte principal (16,4:1) |
| `text-secondary` | `#4A4942` | Texte secondaire, aides, métadonnées (8,3:1 blanc, 7,3:1 beige) |
| `selected-row` | `#F3F6F4` | Ligne sélectionnée |
| `overlay` | `rgba(28,27,24,.4)` | Voile derrière une fenêtre modale |

### Couleurs sémantiques (clair) — texte sur fond, toujours avec libellé

| Statut | Texte | Fond | Contraste |
|---|---|---|---|
| Succès / Publié / À jour | `#0E5A34` | `#DCEFE3` | 7,4:1 |
| Info / Programmé / En cours | `#2B4A9B` | `#E3E8F5` | 6,6:1 |
| Attention / En attente | `#7A4B00` | `#FBEBD0` | 6,8:1 |
| Erreur / Urgent / Destructif | `#9B2C1F` | `#F8E1DE` (badge) · `#FBF3F2` (alerte) | 6,3:1 |
| Neutre / Brouillon | `#4A4942` | `#ECEAE2` | 7,1:1 |

Bouton destructif : fond `#9B2C1F`, texte blanc. Bordure d'alerte : couleur du texte sémantique. Bandeau d'alerte site (preview) : bordure gauche `#B8860B`, fond `#FBF6E8`.

### Couleurs — mode sombre

| Token | Hex |
|---|---|
| `bg` | `#12120E` |
| `bg-sidebar` (aussi en-tête, champs) | `#1B1A15` |
| `surface` | `#26251E` |
| `surface-hover` | `#2E2D25` |
| `border` | `#3C3A31` |
| `border-input` | `#8B887A` (5,4:1) |
| `border-dialog` | `#4C4A3F` (remplace l'ombre) |
| `text` | `#F1EFE6` (13,8:1) |
| `text-secondary` | `#B4B1A4` (7,3:1) |
| `accent` (liens, actif, focus) | `#7FBDB4` (8,6:1) |
| `brand-button` | `#0B5C56`, texte `#F1EFE6` (6,4:1) |
| `brand-soft` (nav active, pastilles) | `#123D38` |
| `selected-row` | `#1C3733` |
| Succès | `#8FD3A9` sur `#163425` |
| Info | `#A9BEEB` sur `#1D2742` |
| Attention | `#F0C384` sur `#3A2A10` |
| Erreur | `#F5A597` sur `#3A1C17` · alerte fond `#2A1A16`, bordure `#7A2B21` |
| Neutre | `#CFCCBE` sur `#2E2D25` |
| Destructif | fond `#7A2B21`, texte `#FBE9E6` |
| Désactivé | fond `#3C3A31`, texte `#8B887A` |

Règles sombre : aucune ombre portée (niveaux par valeur de fond + bordure) ; le toast s'inverse (fond `#F1EFE6`, texte `#1C1B18`) ; la **preview du site public reste en clair**, posée sur `#1B1A15` avec bordure `#3C3A31` ; images et logos jamais atténués ; logo Communeo en version claire ; transition 150 ms, supprimée avec `prefers-reduced-motion`. Le mode suit le système par défaut, la bascule de l'en-tête le remplace et se mémorise par utilisateur.

### Typographie — DM Sans (Google Fonts, axe opsz), une seule famille

| Rôle | Taille / graisse | Notes |
|---|---|---|
| Titre de page (h1) | 28 / 600 | `letter-spacing:-0.01em` |
| Titre de section (h2) | 20 / 600 | |
| Titre de carte, libellé de bloc | 16 / 600 | |
| Corps, cellules, texte d'aide long | 14 / 400 | `line-height` 1.5 pour les paragraphes |
| Libellé de champ | 14 / 500 | |
| Aide sous champ, métadonnées | 13 / 400 | couleur `text-secondary` |
| Badge, bouton petit | 12–13 / 600 | |
| Rubrique de navigation, en-tête de tableau | 11–12 / 600 | capitales, `letter-spacing:.04–.06em`, `text-secondary` |
| Mobile : corps | 16 (15 pour les titres de carte) | |
| Chiffres clés | 26–28 / 600 | |

Preview du site public (thème Institutionnel) : Georgia/serif pour le corps, bleu `#1E3A5F` ; c'est le rendu du thème, pas de l'admin.

### Espacements, rayons, ombres

- Échelle : 4 · 8 · 12 · 16 · 24 · 32 · 48. Gouttière de cartes 24 ; marge de contenu 32 desktop (`padding:28px 32px` sur `<main>`), 16 mobile.
- Rayons : 6 (badges carrés, petits boutons, pastilles d'icône) · 8 (champs, boutons) · 10 (cartes de bloc, menus) · 12 (cartes, fenêtres) · 999 (badges de statut, filtres).
- Ombres : carte = bordure seule ; menu/popover = `0 1px 2px rgba(28,27,24,.06), 0 4px 16px rgba(28,27,24,.12)` ; modale = `0 8px 32px rgba(28,27,24,.18)` ; toast = `0 8px 24px rgba(28,27,24,.2)` ; bloc en cours de glisser = `0 12px 32px rgba(28,27,24,.22)` + `rotate(-1deg)`.
- Focus : `outline:2px solid #004643; outline-offset:2–3px` (sombre : `#7FBDB4`). Jamais supprimé, identique sur tous les composants.
- Icônes : **Lucide**, trait 1,75 px ; 20 px en navigation, 18 px en en-tête, 16 px dans les boutons, 14–15 px en inline. Toujours avec libellé visible ou `aria-label`.

### Points de rupture

- **1440** référence. **1366** : barre latérale repliée en icônes 64 px (tooltips + `aria-label`), preview 420 px, « Aperçu plein écran » en icône seule, en-tête de page repliée en une ligne quand un bloc est ouvert. **< 1200** : preview en tiroir superposé (variante 1c). **1024** : nav en icônes. **390** : menu en tiroir plein écran, cartes empilées, cibles 44–48 px, barre d'actions fixe en bas.
- Zoom 200 % : aucune hauteur fixe sur du texte ; tableaux défilants horizontalement.

---

## Structure générale (6.1 Shell)

**Barre latérale** 232 px, fond `bg-sidebar`, bordure droite. En tête : carré 36 px avec initiales de la commune (`SA`), nom, « Thème Institutionnel ». Items 36 px de haut, `padding 0 10px`, rayon 8, icône 18 + libellé 14 ; actif = `brand-soft` + texte `brand` + 600. Rubriques en capitales 11/600. Sous-items 13 px indentés à 38 px. Compteur non lus sur Messages : pill `brand` blanc 11/600. Ordre exact : Tableau de bord · CONTENUS (Pages, Actualités, Agenda, Documents officiels, Équipe municipale, Associations) · VIE PRATIQUE (Alertes et perturbations, Collecte des déchets, Cantine) · HABITANTS (Messages, Newsletter) · Médiathèque · Mon site ▸ (replié par défaut ; 9 sous-entrées : Apparence, Page d'accueil, Menu du site, Informations de la commune, Mentions légales et RGPD, Accessibilité, Réseaux sociaux, Démarches, Open data) · Mise en ligne · Utilisateurs (admin) · Conformité. Pied : logo Communeo 96 px, opacité .85.

**En-tête** 56 px, fond blanc, bordure basse. Gauche : pill d'état de mise en ligne — « Site à jour » (succès) ou « Modifications en attente de mise en ligne » (attention) suivi d'un bouton `brand` « Mettre en ligne » (n'apparaît qu'en attente). Droite : « Voir le site » (secondaire, icône external-link), Aide, bascule clair/sombre (lune/soleil), compte (avatar 30 px initiales + chevron). Tous nommés par `aria-label`.

**Lien d'évitement** « Aller au contenu » : caché, visible au premier Tab en haut à gauche du `<main>`, bouton blanc rayon 8 avec anneau de focus.

**Bandeau super admin** (impersonation) : fond `#1C1B18`, texte blanc 14, icône shield-alert `#F5C97A`, « **Mode équipe Communeo** — Vous consultez l'administration de Saint-Aubin-sur-Loire. Vos actions sont enregistrées. », bouton blanc « Quitter » à droite. Pleine largeur, au-dessus de tout, pousse le contenu.

**Mobile** : en-tête 56 px (menu ☰ 44 px, nom de la commune 15/600, avatar 36). L'état de mise en ligne descend dans le contenu (pill) et dans le tiroir. Tiroir plein écran fond `bg-sidebar` : fermer (X) avec focus, « Voir le site » + « Mettre en ligne » en deux boutons 44 px, mêmes rubriques, items 48 px, texte 15. Fermeture : bouton, Échap, clic à l'extérieur.

---

## Composants

### Boutons (36 px desktop, 44–48 mobile ; 14/600 ; rayon 8 ; `padding 9px 16px`)
- Principal : fond `brand`, blanc ; survol `brand-hover` ; désactivé fond `muted` texte `text-secondary` ; chargement : icône loader + « Enregistrement… ».
- Secondaire : blanc, bordure `border-input`, texte `text`.
- Tertiaire : transparent, texte `brand`, `padding 9px 12px`.
- Destructif : fond `#9B2C1F`, blanc — réservé aux fenêtres de confirmation (dans les listes, la variante est contour rouge).
- Icône seule : 36 × 36, bordure `border-input`, `aria-label`.
- Une seule action principale par écran.

### Badges de statut (pill, 12/600, `padding 3px 10px 3px 8px`)
Point 6 px `currentColor` ou icône 12 px (clock pour Programmé, circle-alert pour erreur, triangle-alert pour Attention). Libellés : Brouillon · Publié · Programmé le 3 nov. à 8h · En erreur · Attention · Site à jour · Actif · Invitation en attente · Désabonné · Réussie · Échouée · Thème actif · RGPD.

### Champs
Libellé visible 14/500 au-dessus, astérisque `#9B2C1F` si obligatoire ; « (facultatif) » en `text-secondary` 400 sinon. Input : `padding 9px 12px`, 14 px, rayon 8, bordure `border-input`, blanc. Aide 13 `text-secondary` dessous. Erreur : bordure `2px #9B2C1F`, message 13 rouge avec icône circle-alert 14 px. Désactivé : bordure `border`, fond `bg-sidebar`, texte `text-secondary`. Préfixe/suffixe (adresse de page) : segment `bg-sidebar` séparé par bordure. Select : même boîte + chevron-down 16. Date : même boîte + icône calendar. Heure : deux selects « h » / « min » de 96 px, pas 15 min, pas de saisie libre. Textarea : `padding 10px 12px`, redimensionnable verticalement.
Case à cocher 18 px rayon 4 (cochée : fond `brand`, check blanc 12). Radio 18 px (sélectionné : bordure 2 px `brand`, point 8 px). Interrupteur 36 × 20, pouce 16 px ; on = `brand`, off = `border-input`. Radios « carte » (niveau de conformité, rôle) : bloc `padding 10px 12px`, sélectionné = bordure 2 px `brand` + fond `selected-row`.
Champs requis pour la conformité : badge « Requis pour la conformité » (Attention) à côté du libellé.

### Récapitulatif d'erreurs
`role="alert"`, bordure `#9B2C1F`, fond `#FBF3F2`, rayon 8–10, icône 20 px, titre 600 « N erreurs empêchent la publication », liste de liens vers les champs. Placé en haut du formulaire, reçoit le focus à la soumission (`tabindex=-1`). Les blocs en erreur sont bordés `2px #9B2C1F`, développés, et leur en-tête affiche « 1 erreur » en rouge. Le bouton « Publier » reste actif : un nouveau clic renvoie au récapitulatif.

### Toasts
Fond `#1C1B18`, blanc 14, rayon 10, `padding 12px 14px`, icône 18 px (succès `#8FD3A9`, erreur `#F5A597`, réseau `#F5C97A`), lien d'action blanc 600 souligné, X (vrai bouton 24 px). Bas droite, 6 s pour un succès, persistant pour une erreur, `role=status|alert`. Textes : « Publié. Votre site sera mis à jour dans quelques instants. » (+ Voir) · « Brouillon enregistré. » · « « X » a été supprimé. » (+ Annuler) · « La publication a échoué. Vos modifications sont enregistrées. Réessayer » · « Connexion perdue, vos modifications sont enregistrées localement. »

### Fenêtres de confirmation (Dialog 460–520 px, rayon 12, `padding 24px`)
Pastille icône 36 px colorée sémantiquement, titre 17/600 nommant l'objet entre guillemets, une phrase de conséquence en `text-secondary`, boutons à droite (Annuler secondaire + action nommée). Suppression : `role=alertdialog`, focus initial sur Annuler, bouton destructif rouge « Supprimer ». Départ non enregistré : « Quitter sans enregistrer » (tertiaire rouge, à gauche) · « Rester » · « Enregistrer et quitter » (principal). Échap ferme ; focus piégé. En sombre : bordure `border-dialog`, pas d'ombre, voile noir 60 %.

### Onglets, étapes, filtres, pagination
Onglets : `padding 10px 14px`, actif = bordure basse 2 px `brand` + texte `brand` 600, compteur 400 `text-secondary`, badge pill `brand` pour un compteur à traiter. Étapes d'assistant : barre 4 px par étape (faite/en cours `brand`, à venir `border`), l'étape courante porte l'anneau de focus et « — en cours ». Filtres : pills 13 px bordure `border-input` + chevron ; actif = `brand-soft`, bordure et texte `brand`, 600, X pour retirer. Pagination : « 1–20 sur 48 » à gauche, boutons 32 px (courant = fond `brand`), précédent désactivé au début.

### Menu d'actions ⋯
Popover 200–240 px, rayon 10, ombre menu, `padding 6px`, items `padding 8px 10px` rayon 6 avec icône 16 ; item survolé fond `bg-sidebar` ; séparateur 1 px ; « Supprimer » séparé, texte `#9B2C1F`. Contenus : Modifier · Dupliquer · Voir sur le site · — · Supprimer. Utilisateurs : Renvoyer l'invitation · Réinitialiser le mot de passe · Désactiver · — · Supprimer.

### Squelettes de chargement
Formes des lignes (vignette 56 × 40, barre de titre, pill, barre de date) en `border-row`, animation `pulse` 1,6 s décalée de 150 ms par ligne, `aria-busy`, texte masqué « Chargement des actualités ». Les filtres restent utilisables. Pas de spinner plein écran.

---

## Écrans

### 6.2 Gabarit liste (Actualités) — applicable à tous les contenus
- Titre 28 + sous-titre « 48 actualités · 2 brouillons · 1 programmée » ; à droite le seul bouton principal « + Nouvelle actualité ».
- Carte blanche rayon 12 contenant : (a) barre d'actions groupées quand une sélection existe, fond `brand-soft`, « 2 actualités sélectionnées », boutons contour `brand` Publier / Dépublier et contour rouge Supprimer, « Annuler la sélection » à droite — elle **remplace** la barre de filtres ; (b) barre de filtres : recherche 280 px, pills Statut / Catégorie / Date, à droite « Trié par date de modification ↓ » et bouton « Compact » ; (c) tableau : case, Titre (vignette 56 × 40 rayon 6 ou icône image sur `border-row` ; titre = lien 500, 2 lignes max), Statut, Catégorie, Modifiée (colonne de tri, flèche), Auteur, ⋯ ; lignes `padding 12px`, séparateur `border-row`, sélectionnée `selected-row` ; (d) pagination.
- Tri au clic sur l'en-tête, annoncé en texte. 20 par page ; « Compact » = lignes 40 px, 50 par page (défaut pour Documents officiels).
- États : **vide** (carte centrée : pastille icône 56 px `brand-soft`, « Publiez votre première actualité », phrase d'aide, bouton principal, lien « Voir un exemple ») ; **aucun résultat** (rappel du terme « cantine scolaire », « Effacer la recherche et les filtres ») ; **chargement** (squelettes).
- **Mobile** : filtres en pills défilantes, une carte par ligne (statut en tête, titre 15/600, méta 13, ⋯ 44 px), bouton principal fixé en bas sur dégradé beige.

### 6.3 Éditeur de contenu (page « Location de la salle des fêtes ») — l'écran le plus important
Structure retenue **1a** : édition à gauche, preview à droite, séparateur 6 px redimensionnable (`role=separator`, `aria-orientation=vertical`), preview masquable. Variantes documentées : 1b onglets Édition/Aperçu, 1c preview en tiroir superposé (= mode dégradé sous 1200 px et mode mobile).
- **Barre d'actions** 60 px : retour (← « Pages »), titre, à droite : « ✓ Brouillon enregistré il y a 5 s » (autosave toutes les ~5 s, visible), « Aperçu plein écran » (tertiaire), « Programmer » (secondaire, clock), « Publier » (principal), ⋯ (Dupliquer, Supprimer, Voir l'historique).
- **En-tête du contenu** (carte) : Titre (18/600 dans le champ), Chapô (facultatif), Image principale (fichier + « Changer ») avec Texte alternatif **obligatoire** et aide « Décrivez l'image pour les personnes qui ne la voient pas. », Adresse de la page (préfixe `saint-aubin-sur-loire.fr/`, générée depuis le titre, modifiable), interrupteur « Afficher dans le menu » (pages seulement).
- **Rubrique** « CONTENU DE LA PAGE · 9 BLOCS ».
- **Carte de bloc** (fermée) : rayon 10, `padding 10px 12px` : poignée grip-vertical `border-input`, pastille 28 px `brand-soft` avec l'icône du type, nom 600, résumé du contenu en `text-secondary` tronqué, 5 boutons 32 px : replier/déplier, monter (désactivé en 1er), descendre (désactivé en dernier), dupliquer, supprimer. Ouverte : bordure `brand`. En erreur : bordure `2px #9B2C1F`, pastille rouge. La galerie affiche « 1 texte alternatif manquant » dans l'en-tête.
- **« + Ajouter un bloc »** : entre chaque bloc, pill discrète sur une ligne `border` ; en bas, bouton pleine largeur pointillé rayon 10.
- **Référencement** : `<details>` repliée en bas (« Description pour les moteurs de recherche renseignée »).
- **Catalogue des 9 blocs** : variante retenue **1e** (panneau qui remplace temporairement la preview, la ligne d'insertion « Le bloc sera inséré ici » surlignée `brand` dans la liste, un clic insère et referme) ; variante 1d = fenêtre 640 px grille 3 × 3. Icônes : Texte `text`, Image `image`, Bouton/lien `mouse-pointer-click`, Encadré `info`, Documents `file-down`, Galerie `images`, Questions/réponses `message-circle-question`, Contact/lieu `map-pin`, Vidéo `video`. Descriptions courtes dans la planche.
- **Bloc Texte ouvert** : barre d'outils réduite — select « Paragraphe / Titre (h2) / Sous-titre (h3) », gras, italique, lien, liste à puces, liste numérotée ; zone `contenteditable` 15 px, `padding 14px 16px`, bordure `border-input`, anneau de focus.
- **Bloc Image ouvert** : vignette 200 px + « Changer l'image » ; Texte alternatif* (aide + exemple), Légende, Crédit, Largeur (radios Normale / Pleine largeur).
- **Bloc Galerie ouvert** : grille 4 colonnes de vignettes 90 px numérotées (badge noir 20 px), poignée + flèches ◀ ▶ + ✕ sous chaque vignette, « Alt manquant » en badge rouge sur la vignette et bordure rouge ; case « + Ajouter » pointillée ; compteur « 6 images sur 12 » ; panneau « Image 1 sur 6 — fichier » avec Texte alternatif* et Légende, ouvert au clic sur une vignette.
- **Bloc Questions/réponses** : Titre de section (facultatif) ; paires en cartes réordonnables (poignée, « Question 1 sur 5 », ↑ ↓ 🗑), Question = input, Réponse = texte riche limité (gras, italique, lien, liste) ; autres paires repliées avec chevron ; « + Ajouter une question ».
- **Bloc Contact/lieu** : Nom*, Adresse, Téléphone / E-mail (2 col.), Horaires (texte court, aide sur les horaires de la mairie), interrupteur « Afficher une carte » avec aperçu de carte centré sur l'adresse.
- **Bloc Vidéo** : Lien* (détection « YouTube reconnu. YouTube, Dailymotion et Vimeo sont acceptés. »), vignette noire + Titre* (« Lu par les lecteurs d'écran »), Transcription (recommandée, aide sur la conformité), note : la vidéo ne se charge qu'après consentement (vignette + « Lire la vidéo »).
- **Bloc en déplacement** : original en pointillé, cible = ligne 3 px `brand` avec point, bloc soulevé (ombre + rotation -1°) portant « Position 2 sur 9 ». Clavier : Espace sur la poignée saisit, flèches déplacent, annonce live « Bloc Encadré déplacé en position 2 sur 9 ».
- **Panneau preview** 520 px : barre 13 px avec radiogroup Mobile / Tablette / Bureau (36 × 30, actif fond `brand`), « Aperçu du brouillon — thème Institutionnel », recharger, plein écran, masquer (`panel-right-close`). Corps `border-row` `padding 16px`, iframe du site réel (rendu par le thème). Rechargée après chaque autosave. En mode mobile : cadre 320 px bordure 6 px `#1C1B18` rayon 18.
- **Programmer la publication** : Dialog 460 px : Date (select date), Heure (pas de 15 min), phrase de synthèse en encart Info « Publication le vendredi 3 octobre à 9 h 00 (heure de Paris). », Annuler / Programmer.
- **Confirmation de publication** : le bouton devient « ✓ Publié » (fond succès) ~3 s, badge Publié dans la barre, toast avec « Voir sur le site », l'en-tête passe en « Modifications en attente » puis la mise en ligne se lance automatiquement.
- **Historique** (Sheet 420 px depuis ⋯) : liste des versions (Brouillon en cours · Version publiée « En ligne » · versions antérieures · Page créée depuis le modèle), auteur + résumé, actions « Voir », « Comparer au brouillon », « Restaurer… » (crée un nouveau brouillon, n'écrase rien — note en pied).
- **Éditeur vide** : zone pointillée « Cette page est vide. Ajoutez un premier bloc. », explication d'un bloc, raccourcis Texte (principal) / Image / Documents / « Tous les blocs… ».
- **Mobile** : édition seule, blocs repliés (56 px, ⋮ 44 px ouvrant Modifier / Monter / Descendre / Dupliquer / Supprimer), en-tête de page repliée (« Chapô, image et adresse de la page… »), barre fixe en bas « Aperçu » (plein écran) + « Publier ».

### 6.4 Gabarit formulaire (Nouvel événement)
Colonne 760 px, sections en cartes (L'événement · Dates et lieu · Tarif et inscription · Organisateur et contact · Description), sommaire collant à droite 200 px (bordure gauche 2 px, section courante `brand` 600 ; point rouge sur les sections en erreur). Champs : Titre*, Catégorie* (Culture, Sport, Réunion, Fête, Atelier, Conférence), « Mettre à la une sur la page d'accueil » (switch), Image (zone de dépôt pointillée + lien médiathèque), Début* et Fin* (date + heure, fin préremplie = début, aide « Un événement peut durer plusieurs jours. »), Lieu, Adresse, Tarif (radios Gratuit / Montant, le champ montant apparaît si Montant), Inscription obligatoire (switch révélant Date limite + Nombre de places), Organisateur, Lien externe, E-mail, Téléphone, Description en blocs (Texte, Image, Documents, Bouton). Même barre d'actions que l'éditeur.
États : erreurs (récapitulatif : « Le titre est obligatoire », « La date de fin doit être après la date de début », « L'e-mail de contact n'est pas valide » ; message de cohérence sous Fin : « La fin doit être après le début (samedi 21 juin à 19 h). »), enregistrement (boutons désactivés, « Publication… » avec loader, champs à 60 %), succès (retour liste, ligne créée surlignée succès 2 s avec anneau, toast « « Fête de la musique » est publié. »).

### 6.6 Tableau de bord — variante retenue **1f** « une action à la fois »
Grille `minmax(0,1fr) 380px`. Gauche : « Bonjour Sophie » + « Mardi 22 septembre · 5 messages non lus · 1 alerte active » ; carte **Prochaine action recommandée** (issue de la checklist ; pastille 44 px, titre 18, explication, bouton « Compléter ») ; 3 raccourcis (Nouvelle actualité, Nouvel événement, Publier une alerte — pastille Attention + « 1 alerte active : coupure d'eau rue des Lilas ») ; **Messages non lus** (3 derniers ; point `brand`, nom, catégorie, objet 600, référence SVE + délai ; la demande RGPD sur fond `#FBF3F2` avec badge « RGPD · répondre avant le 12 oct. »). Droite : Mise en ligne (badge + « Dernière mise en ligne il y a 2 heures par Sophie Leroy, réussie en 24 secondes. » + lien du site), Prochains événements (3, pastille date), Derniers contenus modifiés (3), **Conformité** (jauge conique 64 px `brand`/`border`, « 72 % », « Partiellement conforme · 3 points à compléter », lien checklist).
Variante 1g « vue d'ensemble » : bandeau 3 tuiles (alerte active, mise en ligne, conformité), checklist d'onboarding dépliée « 4 étapes sur 7 faites » avec barre de progression, raccourcis dans la barre de titre, messages et agenda côte à côte. Recommandation : 1f, avec le bandeau de 1g quand une alerte est active.
Mobile : raccourcis d'abord (alerte en premier, 56 px), messages, puis action recommandée et mise en ligne en cartes courtes.

### 6.7 Apparence
Galerie 4 cartes (vignette schématique 180 px, nom 16/600, description, actif = bordure 2 px `brand` + badge « ✓ Thème actif », boutons Prévisualiser / Choisir). Note : couleurs et polices non réglables. **Prévisualisation plein écran** sur fond `#1C1B18` : barre blanche avec « ✕ Fermer l'aperçu », radiogroup des 4 thèmes (actif marqué « actif », prévisualisé fond `brand`), largeurs mobile/tablette/bureau, « Choisir le thème Moderne » ; iframe du site réel navigable. **Confirmation** : « Passer au thème Moderne ? Vos contenus sont conservés, seule la présentation change. Le nouveau thème sera visible sur le site après la prochaine mise en ligne. », case « Mettre en ligne immédiatement après le changement » (cochée), bouton « Passer au thème Moderne ».

### 6.8 Page d'accueil (sections en intentions)
Encart d'explication en tête : « Vous choisissez **ce qui apparaît**. L'ordre et la mise en page sont décidés par le thème… ». Une ligne par section : switch, nom 15/600, résumé du contenu, chevron ; ouverte = bordure `brand`, formulaire déplié en place. Sections : Accroche (Titre, Sous-titre, Image + Alt*, Bouton principal et secondaire = libellé + cible), Accès rapides (4 à 8 lignes : icône choisie dans une liste, libellé 200 px, description, cible 220 px, ↑ ↓ 🗑 ; « 6 sur 8 maximum »), Actualités à la une (nombre), Agenda (nombre), Mot du maire (titre, texte, photo, signature), Chiffres clés (3–4 : valeur, libellé, icône), Perturbations, Infos pratiques, Newsletter, … ; `<details>` « 3 sections non disponibles avec le thème Institutionnel — Météo, Partenaires, Contenu libre ». Pas de poignée de déplacement (volontaire). Autosave, « Enregistré il y a 8 s ». Preview 480 px de l'accueil, section en cours d'édition entourée `brand`.

### 6.9 Menu du site
Sous-titre « 5 entrées sur 7 · un seul niveau de sous-menu · 10 liens par sous-menu ». Entrée : poignée, badge de type (Page neutre / Rubrique `brand-soft` / Lien externe Attention / Groupe `brand-soft`), libellé 600, cible, boutons ↑ ↓ indenter (`indent-increase`, désactivé au 2e niveau) ✎ 🗑. Groupe ouvert = bordure `brand`, sous-entrées indentées 40 px fond `bg-sidebar` avec `indent-decrease`, « + Ajouter dans « Vie pratique » » ; sous-menu plein → compteur « 10 sur 10 » et bouton désactivé. Liens de pied de page en liste séparée. Preview 440 px : menu bureau (barre `#2C4F7C`, sous-menu déroulé) + tiroir mobile (cadre 220 px).

### 6.10 Réglages (gabarit commun)
Barre 56 px « Informations de la commune · Dernier enregistrement : hier à 16:30 · Annuler les modifications · **Enregistrer** » (pas d'autosave sur les réglages). Colonne 760 px, sommaire 230 px « MON SITE » listant les 6 écrans (point orange = champ de conformité manquant).
- Informations : Nom*, Logo (SVG/PNG transparent ≥ 512 px, aperçu, « Changer »), Favicon, Population, Coordonnées GPS, Adresse, Téléphone, E-mail, Texte d'introduction du formulaire de contact, **Horaires** (une ligne par jour lun→dim, plages « 09:00 → 12:00 » en chips bordées, « + Plage », « Copier lundi sur les autres jours », Fermé ; Fermetures exceptionnelles en liste datée + « Ajouter une fermeture »).
- Accessibilité : radios carte Non conforme / Partiellement conforme / Totalement conforme (une ligne d'explication chacune), Déclaration (modèle pré-rempli), Lien schéma pluriannuel (obligatoire si non totalement conforme — erreur montrée), Lien plan d'action.
- Mentions légales et RGPD : SIRET (aide « Pré-rempli à la création, à vérifier. » en Attention), Hébergeur (désactivé, « Renseigné par Communeo »), Directeur de publication (badge Requis) + Fonction, DPO (nom, e-mail, téléphone), Politique de données personnelles.
- Réseaux sociaux : lignes Plateforme (110 px) + lien + 🗑 ; select « Ajouter une plateforme » (LinkedIn, X, TikTok, autre).
- Démarches : switch Activé en tête de carte, Code INSEE, Publics affichés (cases Particuliers / Associations / Professionnels). Open data : switch (désactivé → seuls le switch et une phrase).

### 6.11 Médiathèque
Trois zones : dossiers 200 px (Tous les fichiers 486, Actualités, Documents officiels, Bâtiments, Événements, Logos et blasons ; « Nouveau dossier »), grille centrale (barre : recherche, Type, filtre **« ⚠ Sans texte alternatif · 7 »** en Attention, bascule grille/liste ; bandeau d'envoi `bg-sidebar` « Envoi de 3 fichiers en cours · 2 sur 3 terminés » avec barre par fichier et ✕ ; vignettes 104 px + nom + « JPG · 1,2 Mo », sélection bordure 2 px `brand`, alt manquant = bordure Attention + badge, fichier en cours d'envoi à 55 % d'opacité), fiche 320 px (aperçu 168 px, nom, « JPG · 1,2 Mo · 1600 × 1067 · envoyé le 12 sept. par Sophie Leroy », Texte alternatif*, Légende, Crédit, **« Utilisé dans 2 contenus »** en liens, Enregistrer + 🗑 rouge). Liste : colonnes format, poids, dimensions, date.
**Sélection de média** (Dialog 780 × 540) : onglets Médiathèque / Envoyer un fichier, recherche, grille 4 colonnes, panneau droit 280 px avec aperçu + Texte alternatif* (« Enregistré avec le fichier, réutilisé partout. »), « Insérer l'image » désactivé sans sélection. **Vide** : grande zone de dépôt pointillée, « JPG, PNG, SVG, PDF, Word et Excel. 20 Mo maximum par fichier. », « Parcourir mes fichiers ».

### 6.12 Mise en ligne et domaine
Carte d'état en tête à 3 variantes : **en attente** (pastille Attention, « 7 modifications attendent d'être mises en ligne », « La mise en ligne prend environ 30 secondes. Le site reste accessible pendant l'opération. », bouton « Mettre en ligne maintenant ») ; **en cours** (pastille Info loader, barre de progression, étapes nommées : Vérification des contenus ✓ · Préparation des pages ✓ · **Publication sur le site** · Vidage du cache ; « Vous pouvez quitter cette page, l'opération continue. ») ; **échec** (bordure rouge, « La mise en ligne a échoué », « Le service de publication n'a pas répondu. **Rien n'a été modifié sur votre site**… », « Réessayer » + « Contacter l'assistance », référence `MEL-2026-0918-1120`) ; **à jour** (« Votre site est à jour », lien du site).
« Ce qui sera mis en ligne » : liste 2 colonnes des modifications (icône pencil/plus/trash + description). Historique : tableau Date · Déclenchée par (personne ou « Publication programmée ») · Durée · Résultat (badge + « Détail » sur un échec).
**Domaine** (admin) : 4 étapes (Votre domaine · Configuration DNS · Vérification · HTTPS). Étape DNS : nom du domaine + badge « En attente de configuration », tableau Type / Nom / Valeur (A @ 185.42.117.20 ; CNAME www saint-aubin-sur-loire.communeo.fr) avec bouton copier par ligne, « Envoyer par e-mail », « Vérifier maintenant », « Dernier essai il y a 20 min ». **Vérifié** : pastille lock succès, « certificat HTTPS actif, renouvelé automatiquement », badge Actif, « Retirer ce domaine » (tertiaire rouge). **Erreur** : « L'enregistrement A ne pointe pas vers la bonne adresse… », deux encarts Attendu / Trouvé (monospace, trouvé sur fond `#FBF3F2`), « Vérifier à nouveau », « Revoir les instructions DNS ».

### 6.13 Contenus spécifiques
- **Documents officiels** : onglets par année (2026 38 · 2025 61 · …), liste compacte 40 px (icône, titre-lien, Référence `DEL-2026-041`, Date, « PDF · 310 Ko », statut, ⋯), 50 par page. Formulaire : Titre*, Type* (Procès-verbal, Délibération, Arrêté, PLU, SCOT, Carte communale, Budget primitif, Compte administratif, Rapport d'orientations budgétaires, Autre), Numéro de référence, Date du document*, Date de séance, Année (désactivée, calculée), Description, Fichier principal* (carte fichier + « Remplacer »), Annexes (liste + « Ajouter une annexe »).
- **Équipe municipale** : groupes en cartes (MAIRE · ADJOINTS « l'ordre est celui du tableau » · CONSEILLERS 18 repliés · SERVICES), ligne = poignée, photo 40 px ronde ou initiales `brand-soft`, nom 600, fonction · délégation, ↑ ↓, ✎ ; fiche en Sheet : prénom, nom, fonction, délégation, photo facultative, biographie.
- **Associations** : onglets « Publiées 14 » / « Propositions à examiner ② » ; fiche proposition : nom 17, catégorie · date, badge « À examiner » (Info), description, encart `bg-sidebar` Demandeur / E-mail / Téléphone / Siège, boutons « Publier » · « Modifier avant de publier » · « Refuser… ». **Refuser** (alertdialog) : « Refuser « X » ? », « Hélène Garnier recevra votre motif par e-mail… », Motif* avec 3 raccourcis (Association hors commune · Informations incomplètes · Déjà référencée) + textarea pré-rédigée, « Refuser et envoyer le motif » (destructif).
- **Alertes et perturbations** — formulaire rapide, identique mobile/desktop : Titre*, Sévérité* (3 boutons 48 px avec point coloré : Information Info / Attention / Urgent Erreur ; sélection = bordure 2 px + fond sémantique), Type (Travaux, Coupure d'eau, Coupure d'électricité, Déviation, Intempérie, Autre), Message*, Début* / Fin* (fin = début + 4 h par défaut, obligatoire), Zone, Lien. Étape 2 mobile : **aperçu du bandeau** tel qu'il apparaîtra (bordure gauche `#B8860B`, fond `#FBEBD0`, icône, « Attention — Titre », message, zone · horaires), récapitulatif (Sévérité, Affichée, Retrait automatique), « Modifier » / « Publier l'alerte » + note « Mise en ligne immédiate, sans attendre la prochaine mise en ligne du site. ». Desktop : carte alerte active (bordure `#E8C98F`, boutons Modifier / Prolonger / Terminer maintenant), liste des alertes passées avec « Réutiliser ».
- **Collecte des déchets** : tableau Type (Ordures ménagères, Tri sélectif, Verre, Déchets verts, Encombrants) · Jour · Fréquence · Zone · ✎ ; « Ajouter une collecte » ; Notes affichées sur le site.
- **Cantine** : navigation semaine (◀ « Semaine du 22 au 26 septembre » ▶), select école, bascule **Détaillé / Simple (PDF)**, « Dupliquer la semaine précédente » (secondaire), « Publier la semaine ». Grille lundi→vendredi × Entrée / Plat / Accompagnement / Produit laitier / Dessert / Goûter ; cellule = boîte bordée rayon 6 avec le plat + pastilles 10 px de labels (Bio succès, Local info, Fait maison attention, Végétarien neutre) ; « — » si vide, « Pas de cantine » le mercredi ; cellule active avec anneau. Édition au clic, labels en cases à cocher.

### 6.14 Messages
Boîte : liste 440 px (titre + « 5 non lus », recherche « nom, objet, référence », pills Tous / Non lus / Catégorie / Statut) + détail. Ligne : point `brand` si non lu, nom 600, date, objet 600 tronqué, badge catégorie (RGPD en Erreur), « SVE-2026-0042 · Reçu » ; **RGPD** : fond `#FBF3F2`, bordure gauche 3 px rouge, « 28 jours restants » ; statuts colorés en texte (En cours info, Traité succès, Clos neutre). Détail : badge + « SVE-2026-0042 · reçu le 22 septembre à 09:14 », objet 20/600, select Statut (Reçu / En cours / Traité / Clos) 150 px, ⋯ ; **bandeau RGPD** `role=alert` « Demande RGPD : réponse obligatoire avant le 22 octobre (délai légal d'un mois). 28 jours restants. Modèle de réponse » ; encart Expéditeur / E-mail / Téléphone ; corps du message + pièces jointes ; HISTORIQUE (reçu via le formulaire, ouvert par …) ; **zone de réponse** en bas : textarea 92 px, « Joindre un fichier », « La réponse est envoyée par e-mail à … et conservée ici. », case « Marquer comme traité » (cochée), « Envoyer » (send). Catégories : Général, Urbanisme, État civil, Voirie, Associations, RGPD, Autre. Mobile : cartes puis détail plein écran avec select statut + « Répondre » fixes en bas.

### 6.15 Newsletter
3 chiffres (312 abonnés · 298 actifs · +11 nouveaux en septembre), « Exporter (CSV) », tableau E-mail · Nom · Inscrit le · État (Actif / Désabonné — jamais de suppression) · ⋯, pagination « 1–20 sur 312 ».

### 6.16 Utilisateurs (admin)
Tableau Nom (avatar initiales + e-mail) · Rôle (Administratrice / Éditeur) · État (Actif / Invitation en attente Info / Désactivé) · Dernière connexion · ⋯ (menu ci-dessus). Ligne d'invitation : avatar pointillé, « Invitation envoyée ». **Inviter** (Dialog 520) : Prénom, Nom, E-mail* (« lien valable 7 jours »), Rôle en radios carte : **Éditeur** « Rédige et publie les contenus, répond aux messages. Ne gère ni les utilisateurs, ni le thème, ni le domaine. » / **Administrateur** « Tout ce que fait un éditeur, plus les utilisateurs, le thème, le domaine et les réglages légaux. », « Envoyer l'invitation ».

### 6.17 Conformité
Jauge 96 px « 72 % », « Conformité : partiellement conforme », « 13 points sur 18 sont en ordre… ». 5 cartes (Mentions légales 3/4 · RGPD 4/4 · Accessibilité 1/4 · Publication des actes 3/3 · Cookies 2/3) : compteur coloré (succès si complet, sinon attention), points faits = ✓ succès texte gris, points à faire = cercle bordé Attention + **lien 600 vers l'écran** (ex. « 7 images sans texte alternatif » → médiathèque filtrée).

### 6.18 Onboarding (7 étapes, ~20 min)
Gabarit : logo Communeo 120 px + « Étape n sur 7 », indicateur de 7 barres avec libellés, contenu 760 px centré, barre basse (« Retour » secondaire · « Enregistrer et continuer plus tard » ou « Passer cette étape » tertiaire · « Continuer » principal). Chaque étape est enregistrée en la quittant.
1. Bienvenue : « Créons le site de Saint-Aubin-sur-Loire », « Sept étapes courtes… en **20 minutes environ**. », encart « Utile à avoir sous la main » (logo, SIRET, directeur de publication), « Commencer ».
2. Votre commune : recherche « Saint-Aubin-sur-Loire (58300) », état succès « Informations trouvées. Vérifiez-les et corrigez si besoin. », champs pré-remplis avec badge de source (INSEE 2023, Annuaire du service public), E-mail « Non trouvé, à renseigner. », horaires en résumé + Modifier.
3. Votre logo : aperçus côte à côte sur fond clair et sur fond `#1E3A5F`, fichier, « Pas de logo pour l'instant ? Continuez… ».
4. Votre thème : 4 cartes radio avec le nom de la commune rendu dans la vignette, lien « Aperçu », bouton « Continuer avec Institutionnel ».
5. Obligations légales : 3 lignes (Données personnelles ✓, Accessibilité ✓, Mentions légales « 2 informations manquantes » sur fond `#FBF3F2` avec SIRET* et Directeur de publication* en erreur), « Compléter plus tard » possible.
6. Premières pages : 5 modèles à cocher (Location de la salle des fêtes, État civil, Urbanisme, Inscriptions scolaires, Contacter les services), « Créer 4 pages et continuer ».
7. Mise en ligne : récapitulatif (commune, thème, logo, pages créées, obligations « 2 informations à compléter », adresse `saint-aubin-sur-loire.communeo.fr` en monospace), « Mettre le site en ligne ». **Succès** : ✓ 72 px, « Le site de Saint-Aubin-sur-Loire est en ligne », « Mise en ligne réussie en 27 secondes. », bouton lien du site, « Aller au tableau de bord », encart « Pour finir votre site » (3 points repris par la checklist du tableau de bord).
Mobile : logo 96 + « Étape n sur 7 », 7 barres sans libellés, champs 48 px, barre basse ← + « Continuer ».

### 6.19 Authentification
Carte 460 px centrée sur beige, logo 160 px au-dessus. Connexion : E-mail, Mot de passe (œil pour afficher, « Mot de passe oublié ? » aligné au libellé), « Rester connectée sur cet ordinateur », « Se connecter ». Erreur : alerte unique « E-mail ou mot de passe incorrect. Vérifiez votre saisie ; après 5 essais, le compte est bloqué 15 minutes. », les deux champs bordés rouge. Mot de passe oublié : confirmation identique que l'adresse existe ou non (« Si un compte existe pour …, un e-mail vient d'être envoyé avec un lien valable 1 heure. »). Invitation : « Bienvenue, Anne », « Claire Martin vous invite… comme éditrice », Mot de passe (10 caractères min., indicateur 3 barres : rouge 1/3 « Trop court : 8 caractères sur 10 minimum. Ajoutez des mots. » / vert 3/3 « Robuste · 18 caractères », aide « Une phrase avec des mots séparés est plus facile à retenir… »), Confirmez, « Créer mon compte » (désactivé si invalide). Lien expiré : pastille clock Attention, « Ce lien n'est plus valable », « L'invitation envoyée le 11 septembre a expiré : elle était valable 7 jours. », « Demander une nouvelle invitation ».
Session expirée (6.5) : Dialog « Votre session a expiré », « Par sécurité, vous êtes déconnectée après 8 heures d'inactivité. Vos modifications sont conservées sur cet ordinateur. », mot de passe, « Se reconnecter ». Droits insuffisants : page « Cette page est réservée aux administrateurs », nom des admins à contacter, « Retour au tableau de bord ».

### 6.20 Super admin
Barre latérale **fond `brand`**, texte blanc, 3 entrées (Communes, Utilisateurs, Statistiques), actif = `rgba(255,255,255,.14)`. En-tête avec recherche globale 320 px. Communes : « 64 communes · 58 sites en ligne · 6 en création », « Créer une commune », filtres (Thème, État, **« Inactives depuis 30 jours · 4 »** en Attention), tableau Commune (nom-lien + domaine · habitants) · Thème · Mise en ligne (badge : À jour / En attente · 12 modifs / Échec / En création · étape 4/7) · Utilisateurs · Dernière activité (⚠ « 81 jours » en Attention, ligne fond `#FDF9F1`) · « Entrer dans l'admin » (contour `brand`, log-in). Fiche : fil d'Ariane, « Entrer dans l'administration » (principal), 3 tuiles (Site/domaine, Thème, Mise en ligne), utilisateurs, 4 chiffres (pages, actualités, documents, conformité), « Renvoyer une invitation admin », « Suspendre la commune… ». Créer : Nom*, Adresse du site* (suffixe `.communeo.fr`, « ✓ Disponible »), E-mail du premier administrateur*, « Créer et inviter ». Statistiques : 4 chiffres + répartition des thèmes en barres.

---

## Interactions et comportements clés

- **Autosave** dans l'éditeur et les formulaires de contenu (toutes les ~5 s après modification), état textuel dans la barre. Les écrans de **réglages** ont un bouton Enregistrer explicite.
- **Publier** valide : titre obligatoire, alt obligatoire sur toute image (en-tête, bloc Image, chaque image de galerie), champs marqués *. Échec → récapitulatif focalisé, blocs en erreur ouverts et bordés. Succès → statut Publié, toast, mise en ligne automatique du site.
- **Programmer** : date + heure (pas 15 min), la publication programmée déclenche une mise en ligne (apparaît dans l'historique comme « Publication programmée »).
- **Mise en ligne** : file de modifications ; en-tête « Modifications en attente » → « Site à jour ». Échec : rien n'est modifié, version précédente en ligne. Les **alertes** se publient immédiatement, hors file.
- **Glisser-déposer** (blocs, galerie, menu, accès rapides, équipe) toujours doublé de boutons Monter / Descendre au clavier, avec annonce live de la nouvelle position.
- **Navigation au clavier** : lien d'évitement, focus visible partout, Échap ferme menus / fenêtres / tiroirs, focus piégé dans les fenêtres, focus initial sur Annuler pour les suppressions.
- **Départ avec modifications non enregistrées** : dialog à 3 issues (réglages uniquement ; l'éditeur autosave).
- **Session** : expiration après 8 h d'inactivité, dialog de reconnexion in situ, brouillons conservés localement. Connexion perdue : toast persistant, enregistrement local.
- **Limites** : menu 7 entrées, 1 niveau, 10 liens par sous-menu ; galerie 3–12 images ; bouton/lien 1–3 boutons ; accès rapides 4–8 ; alertes : fin obligatoire ; mot de passe ≥ 10 caractères, 5 essais puis blocage 15 min ; invitation valable 7 jours ; lien mot de passe oublié 1 h ; réponse RGPD sous 1 mois.
- **Densité** : « Compact » sur les listes (40 px, 50/page), défaut pour Documents officiels.
- **Preview** : iframe du site réel rendu par le thème, rechargée après autosave, largeurs 390 / 768 / 1280, redimensionnable, masquable, plein écran, toujours en clair.
- **Rôles** : `editor` ne voit ni Utilisateurs, ni Apparence, ni Domaine (page « réservée aux administrateurs » si URL directe) ; `admin` tout ; `super_admin` navigation propre + bandeau d'impersonation.

## État applicatif (indicatif)

- Session : utilisateur, rôle, commune courante, impersonation (super admin), thème clair/sombre.
- Contenu en édition : brouillon (titre, chapô, image, alt, slug, dansLeMenu, blocs[], seo), état d'autosave (`saved | saving | error`, horodatage), erreurs de validation par champ / bloc, bloc ouvert, bloc en déplacement, preview (largeur, visible, largeur du panneau).
- Listes : filtres, tri, page, densité, sélection multiple.
- Mise en ligne : état (`idle | pending(n) | running(step) | failed(ref) | ok`), historique.
- Domaine : étape (1–4), état de vérification (`pending | verified | error{expected, found}`).
- Onboarding : étape courante, données par étape, progression persistée.
- Médiathèque : dossier, vue, filtre alt manquant, sélection, envois en cours (progression par fichier).
- Messages : filtre, message ouvert, statut, brouillon de réponse.

## Assets

- `assets/logo-vert.svg` — logo Communeo (fourni par le client). Prévoir une déclinaison claire pour le mode sombre (non fournie).
- Icônes : [Lucide](https://lucide.dev) (`lucide-react`), trait 1,75.
- Police : DM Sans (Google Fonts) ou auto-hébergée, graisses 400/500/600/700.
- Images de démonstration : placeholders hachurés ; aucune photo réelle fournie.
