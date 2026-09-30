# Handoff : site vitrine Communeo (communeo.fr)

## Vue d’ensemble
Site marketing de Communeo, service SaaS qui fournit aux mairies françaises leur site internet et l’outil pour le tenir à jour. Objectif : convaincre une secrétaire de mairie ou un élu de lancer l’essai gratuit de 30 jours. 10 pages + composants partagés. Le brief complet est dans `brief-site-communeo.md`.

## À propos des fichiers
Les fichiers de `pages/` sont des **références de design en HTML** (prototypes montrant l’apparence et le comportement attendus), pas du code de production à copier. La tâche est de **recréer ces designs dans l’environnement cible** avec ses conventions. S’il n’existe pas encore de codebase, recommandation : **Astro** (site statique, HTML sans JS par défaut, îlots interactifs pour les quelques composants dynamiques) ou Next.js en export statique. Aucun traceur, aucune dépendance tierce au chargement.

Pour ouvrir les prototypes : servir le dossier `pages/` avec un serveur statique (`npx serve pages`) puis ouvrir `Accueil.dc.html`. Chaque fichier `.dc.html` contient un template (balisage à styles inline, trous `{{ … }}`) et une classe `Component` (logique, style composant React à classe) ; `support.js` est le runtime du prototype, à ne pas reprendre.

## Fidélité
**Haute fidélité.** Couleurs, typographie, espacements, textes et interactions sont finaux. Recréer au pixel près. Les textes sont validés : **ne pas les réécrire** (pas de tiret long, ton simple et factuel). Les éléments entre crochets `[…]` sont des emplacements à fournir par le client.

## Pages
| Fichier prototype | URL cible | Rôle |
|---|---|---|
| Accueil.dc.html | `/` | 13 sections, voir ci-dessous |
| Fonctionnalites.dc.html | `/fonctionnalites` | 5 groupes par besoin, sous-navigation collante |
| Themes.dc.html | `/themes` | Sélecteur interactif + une section par thème |
| Tarifs.dc.html | `/tarifs` | Simulateur, grille, compris, facturation, FAQ |
| Comment-ca-marche.dc.html | `/comment-ca-marche` | Frise verticale des 7 étapes |
| Questions.dc.html | `/questions` | 23 questions, 6 groupes, sommaire |
| Contact.dc.html | `/contact` | Formulaire validé + confirmation |
| A-propos.dc.html | `/a-propos` | Emplacements à fournir |
| Legal.dc.html | `/mentions-legales`, `/conditions`, `/donnees-personnelles`, `/accessibilite`, `/plan-du-site` | Regroupées en une page avec ancres dans le prototype ; à scinder en pages distinctes |
| Page-introuvable.dc.html | 404 | |

Liens externes : `https://app.communeo.fr/inscription` (tous les CTA d’essai), `https://app.communeo.fr/connexion`.

### Structure commune à chaque page
1. `EnTete` : fond sapin `#0E4033`. Lien d’évitement « Aller au contenu » (visible au focus). Logo papier 172 px (138 px mobile). Nav : Fonctionnalités, Thèmes, Tarifs, Comment ça marche, Questions ; page courante = `aria-current="page"` + soulignement blé `#E3B55B` 2 px, offset 8 px. À droite « Se connecter » + bouton papier « Essayer gratuitement ». **Sous 1240 px** : bouton « Menu » (bordure papier 1,5 px) qui déplie un panneau vertical (`aria-expanded`, `aria-controls`), items 56 px de haut.
2. `BandeauPage` (sauf Accueil et 404) : fond sapin, motif de courbes de niveau, surtitre blé capitales 15 px letter-spacing .16em, H1 DM Serif Display fluide, chapô papier.
3. Contenu `<main>`.
4. Section d’appel final sapin (sauf Legal, Questions, Contact, 404).
5. `PiedDePage` : fond `#F7F6F2`, 4 colonnes auto-fit (min 220 px) : marque, Produit, Communeo, Informations légales. Ligne basse : « Communeo, édité par Philippe Chevreul, entrepreneur individuel » / « Ce site ne dépose aucun traceur publicitaire. »

### Accueil, sections dans l’ordre
1. **Accroche** (sapin + courbes) : surtitre « POUR LES MAIRIES DE TOUTES TAILLES », H1 « Votre commune a *sa place* en ligne. » avec souligné à la main blé sous « sa place », chapô, 2 CTA (« Essayer gratuitement 30 jours » papier plein ; « Voir les tarifs » fond `#0A2F26` + bordure `#86C2AE`), 3 réassurances cochées. À droite : étiquette de carte « SAINT-AUBIN-SUR-LOIRE · COMMUNE DE DÉMONSTRATION » avec point blé, téléphone `TelephoneCommune` animé, tampon « 30 JOURS GRATUITS ».
2. Vidéo V1 (emplacement).
3. **Le constat** : 3 cartes blanches (illustration 16/9, titre, texte, réponse avec pictogramme).
4. **Promesses** (sapin) : 01 Simple / 02 Prêt tout de suite / 03 Conforme, numéros blé 56 px.
5. **Le site de votre commune** : 8 tuiles icône + téléphone statique.
6. **Quatre thèmes** : boutons `aria-pressed`, aperçu en fondu 450 ms, description en `aria-live`.
7. **L’administration** : capture tableau de bord + 5 fonctions + démo du bouton « Mettre en ligne ».
8. **Service-Public** : « 3 000 fiches officielles » + maquette de recherche.
9. **Alertes** (fond sauge) : téléphone où le bandeau d’alerte descend, compteur 0:00 → 0:42.
10. **Conformité** : liste + encadré information + capture.
11. **Tarifs** : 5 tranches + lien.
12. **Comment ça marche** : 4 étapes, courbe de liaison visible seulement ≥ 1150 px.
13. **FAQ** (5 questions, accordéon) puis **appel final**.

## Interactions et comportement
Courbe d’animation partout : `cubic-bezier(0.2, 0.8, 0.2, 1)`. **Tout doit respecter `prefers-reduced-motion: reduce`** : afficher l’état final directement.

- **Téléphone qui se remplit** (`TelephoneCommune`) : 4 champs squelettes (nom de commune, horaires, adresse, population) remplacés un par un, fondu + translateY 6→0 px, 500 ms, départ 500 ms puis toutes les 650 ms ; enfin la pastille « Données publiques ». Joué une fois au montage.
- **Sélecteur de thème** : 4 aperçus superposés en grid-area commune, opacité 0/1, 450 ms. Les aperçus non actifs ont `aria-hidden`.
- **Mettre en ligne** : clic → libellés « Vérification… », « Génération des pages… », « Publication… » (900 ms chacun) puis « En ligne » (fond `#0E5A34`, icône coche). Liste d’étapes en `aria-live`.
- **Alerte** : IntersectionObserver seuil 0,45 → compteur 1,6 s (ease-out cubique) de 0:00 à 0:42, puis le bandeau glisse (hauteur 0→86 px, 500 ms).
- **Frise 7 étapes** : ligne de progression verticale remplie selon le défilement (point de référence à 65 % de la hauteur de fenêtre) ; chaque pastille passe au plein sapin quand la ligne l’atteint.
- **Simulateur de tarifs** : champ numérique (chiffres seuls) + 4 raccourcis (180, 800, 2 400, 12 000 hab.). Tranche : <500 → 290 €, 500-1 999 → 390 €, 2 000-4 999 → 590 €, 5 000-9 999 → 890 €, ≥10 000 → 1 290 € HT/an ; mensuel 24/33/49/74/108 €. Chiffres en colonnes défilantes (translateY, 450 ms). Tranche active surlignée dans la grille (fond sapin, `aria-current`). Annonce lecteur d’écran « 390 € HT par an pour 800 habitants » en `aria-live`.
- **Accordéon** : `<h3><button aria-expanded aria-controls>`, région `role="region"`, ouverture en `grid-template-rows 0fr→1fr` 250 ms, chevron qui pivote de 180°. Plusieurs panneaux ouvrables en même temps.
- **Formulaire contact** : champs Nom et prénom, Fonction (aide « Par exemple : secrétaire de mairie, maire, adjoint »), Commune, Adresse e-mail, Message, case de consentement. Validation à la soumission : récapitulatif `role="alert"` (« N erreurs. Corrigez les champs signalés ci-dessous. »), messages sous chaque champ reliés par `aria-describedby`, bordure 2 px `#9B2C1F`, focus sur le premier champ invalide. Succès : panneau `role="status"` « Merci, votre message est bien parti. » avec l’e-mail saisi. Envoi réel à brancher (aucun backend dans le prototype).
- **Survol des CTA** : l’espace icône/texte passe de 10 à 16 px, fond plus clair. Focus : anneau 3 px décalé de 3 px (sapin sur fond clair, blé sur fond sapin).
- **Vidéos V1, V2, V3, V5** : boutons de lecture sur emplacements ; lecteur à prévoir, avec sous-titres et transcription, chargement seulement après clic.

## Responsive
Fluide de 320 px à 1440 px (contenu max 1312 px, gouttières `clamp(20px, 4.4vw, 64px)`).
- **Aucun bouton ni lien de navigation ne passe sur deux lignes** (`white-space: nowrap`) ; la taille des gros boutons est `clamp(15px, 13px + .6vw, 18px)` et le padding horizontal `clamp(16px, 4vw, 26px)` pour que « Essayer gratuitement 30 jours » tienne à 320 px.
- Grilles en `repeat(auto-fit, minmax(min(100%, Npx), 1fr))`, colonnes flex qui passent à la ligne.
- En-tête : menu repliable sous 1240 px.
- Sommaires collants (Questions, Legal) : statiques et au-dessus du contenu sous 900 px.
- Sélecteurs de thème en grille (2 × 2 sur mobile).
- Tampon de l’accroche : taille `clamp(96px, 28vw, 136px)`, ne sort pas de l’écran.
- Pastilles de frise : `clamp(44px, 8vw, 60px)`.

## État
- EnTete : `mobile` (largeur < 1240), `open`.
- Accueil : `theme`, `pub` (-1 à 3), `secs`, `alertOn`, `wide` (≥ 1150).
- Themes : `theme`.
- Tarifs : `pop` (nombre ou vide, défaut 800).
- Comment ça marche : `p` (progression 0-1 au défilement).
- Accordeon : `open` (dictionnaire index → booléen).
- Contact : valeurs, `tried`, `sent`.
Aucune donnée distante. Les prix, questions et textes sont statiques (à mettre en fichiers de contenu).

## Design tokens
### Couleurs
| Nom | Hex | Usage |
|---|---|---|
| Sapin | `#0E4033` | Logo, boutons, liens, titres, fonds de section sombres |
| Sapin profond | `#0A2F26` | Survol des boutons sapin, fond du bouton secondaire sur sapin |
| Sapin moyen | `#155C4A` | Survol secondaire, séparateurs du menu mobile |
| Sapin éclairci | `#86C2AE` | Courbes de niveau, bordures sur fond sapin |
| Sauge | `#E1E9E4` | Encadrés, badges, section Alertes |
| Papier | `#EFECE5` | Fond général, texte sur sapin |
| Papier clair | `#F7F6F2` | Sections alternées, pied de page |
| Blanc | `#FFFFFF` | Cartes, champs |
| Encre | `#1C1B18` | Texte courant |
| Encre douce | `#4A4942` | Texte secondaire |
| Grège | `#D9D6C9` | Bordures, séparateurs |
| Taupe | `#8F8C7E` | Bordures de champs (sur blanc uniquement) |
| Tuile | `#A8452A` | Surtitres sur fond clair, tampon |
| Blé | `#E3B55B` | Surtitres, soulignés, tampon sur fond sapin ; jamais de texte sur fond clair |
| Succès | `#0E5A34` sur `#DCEFE3` | |
| Information | `#2B4A9B` sur `#E3E8F5` | |
| Vigilance | `#7A4B00` sur `#FBEBD0` | |
| Erreur | `#9B2C1F` sur `#F8E1DE` | |

### Typographie
- Titres : **DM Serif Display** 400 (Google Fonts), letter-spacing -0.01em.
- Texte et interface : **DM Sans** 400-700 (axe opsz 9-40).
- H1 `clamp(2.5rem, 1.757rem + 3.048vw, 4.5rem)` interligne 1.04 (accroche de l’accueil : `clamp(2.75rem, 1.9rem + 3.4vw, 5.125rem)`).
- H2 `clamp(1.875rem, 1.457rem + 1.714vw, 3rem)` / 1.1.
- H3 `clamp(1.375rem, 1.236rem + .571vw, 1.75rem)`.
- Chapô `clamp(1.25rem, 1.157rem + .381vw, 1.5rem)` / 1.5.
- Texte 17-18 px / 1.6, 70 caractères max. Petit texte 15 px minimum.
- Surtitres : DM Sans 700, 15 px, capitales, letter-spacing .16em.
- Chiffres : `font-variant-numeric: tabular-nums`.

### Formes
- Rayons : boutons 10 px ; cartes 14-16 px ; blocs 20 px ; pastilles 20-30 px.
- Hauteur des boutons : 48 px (en-tête), 52-58 px (CTA), 44 px minimum partout.
- Ombre des captures : `0 40px 80px -48px rgba(14,64,51,.45)`.
- Espacement vertical des sections : `clamp(64px, 8vw, 120px)`.

### Motifs
- **Courbes de niveau** : contours fermés concentriques, jamais croisés, écart 54-58 px, trait 1,2 px `#86C2AE` à 14-16 % d’opacité sur sapin. Générés dans `topo()` (Accueil, BandeauPage) : pour chaque anneau i, rayon `r = r0 + i*gap`, `rr = r*(1 + .12 sin(3a+seed) + .05 sin(5a+2seed)) + gap*.18 sin(2a+seed+.35i)`, étirement horizontal ×1,35. À exporter en SVG statique.
- **Souligné à la main** : chemin SVG `M3 11 C 50 4, 120 2, 197 8`, trait 5 px arrondi, un seul mot par titre.
- **Tampon** : cercle 77 + 51, texte sur tracé circulaire, incliné de -9° à 8°. Décoratif (`aria-hidden`), l’information existe aussi en HTML.

## Assets
- `assets/logo-communeo.svg` : logo complet (538 × 70). Utilisé en masque CSS pour le recolorer (papier sur sapin, sapin sur clair). En production, préférer un SVG inline avec `fill="currentColor"`.
- `assets/picto-communeo.svg` : pictogramme (favicon, avatar, puces).
- `assets/captures/` : tableau-de-bord.png, conformite.png, messages.png, pages.png (captures réelles de l’administration).
- Icônes : tracés type Lucide, trait 2 px, dessinés en ligne ; on peut utiliser `lucide` directement.
- Les aperçus de thèmes (`ApercuTheme`) sont des maquettes simplifiées, à remplacer par les vraies vignettes `themes/<cle>/thumbnail.png`.

## À fournir par le client (marqués `[…]` dans les pages)
Texte et portrait « À propos » ; adresse de l’éditeur ; hébergeur du site vitrine ; CGV/CGU ; politique de données personnelles ; déclaration d’accessibilité ; lien de la documentation ; illustrations (constat ×3, contact, 404) ; vidéos V1, V2, V3, V5 ; vignettes des 4 thèmes ; délai de mise en ligne définitive ; nombre maximal d’utilisateurs ; reprise et export des contenus ; durée de conservation des messages ; statut d’accessibilité affiché dans le pied de page.

## Accessibilité (exigences)
RGAA 4.1 visé : un seul H1 par page, hiérarchie des titres respectée, landmarks (`header`, `nav` nommés, `main`, `footer`), lien d’évitement, focus toujours visible, cibles ≥ 44 px, contrastes ≥ 4,5:1 (vérifiés sur la palette ci-dessus), zoom 200 % et largeur 320 px sans perte, alternatives textuelles des captures (textes fournis dans les `alt` des prototypes), éléments décoratifs en `aria-hidden`.

## Fichiers
- `pages/*.dc.html` : prototypes (pages + composants EnTete, PiedDePage, BandeauPage, Accordeon, ApercuTheme, TelephoneCommune).
- `pages/Direction artistique.dc.html` : planche logo, palette, typographie, motifs et pistes d’accroche (piste retenue : 1b).
- `assets/` : logos et captures.
- `brief-site-communeo.md` : brief d’origine.
