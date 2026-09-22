# Brief maquettes : thèmes de sites publics Communeo V2

> Document à fournir à Claude Design pour générer les maquettes des **deux premiers thèmes** de sites de mairies.
> Il décrit **tout le contenu** qu'un thème doit savoir afficher. La mise en page, le style et la composition sont libres : c'est le rôle du thème.

---

## 1. Contexte

Communeo est un CMS qui permet à une mairie de créer et gérer son site internet. Chaque commune choisit un **thème**, comme un thème WordPress. Tous les thèmes affichent **exactement les mêmes contenus**, mais avec une **mise en page totalement différente** : structure, navigation, composition de l'accueil, forme des listes, rendu des blocs. Ce n'est pas une simple variation de couleurs.

- **Personnalisation par la commune** : **aucune**. Elle ne fournit que son **logo** (ou blason), son nom et ses contenus. Chaque thème a donc sa **propre palette et sa propre typographie, fixes**, et doit bien rendre avec n'importe quel logo : couleur, monochrome, horizontal, carré ou blason.
- **Public des sites** : tous les habitants, dont des personnes âgées, des personnes en situation de handicap et des personnes peu à l'aise avec le numérique. La majorité des visites se font **sur mobile**.
- **Rendu technique** : sites statiques générés avec Astro. Pas d'animation complexe ni de dépendance JS lourde. Quelques composants interactifs légers sont possibles (menu, accordéon, galerie, filtres).

---

## 2. Contraintes non négociables

### Accessibilité (RGAA 4.1 / WCAG 2.1 AA, obligation légale des communes)
- Contraste du texte **≥ 4,5:1**, et ≥ 3:1 pour les grands textes et les éléments d'interface (bordures de champs, icônes porteuses de sens).
- **Focus clavier visible** sur tous les éléments interactifs. Le dessiner dans les maquettes.
- Zones cliquables d'au moins **44 × 44 px** sur mobile.
- L'information ne passe **jamais par la couleur seule** (sévérité d'une alerte, catégorie, statut) : toujours accompagnée d'un texte ou d'une icône avec libellé.
- **Lien d'évitement** (« Aller au contenu », « Aller au menu ») : visible au focus, à prévoir dans le header.
- Hiérarchie de titres logique : un seul H1 par page, puis H2 et H3 sans sauter de niveau.
- La mise en page doit tenir avec un **zoom texte à 200 %** et en largeur **320 px** : pas de texte tronqué, pas de hauteur fixe sur les blocs de texte.
- Liens reconnaissables sans la couleur (soulignés dans le texte courant).
- Liens externes et téléchargements signalés : icône, et pour un fichier, son format et son poids (ex. « PDF – 1,2 Mo »).
- Animations désactivables (`prefers-reduced-motion`). Pas de carrousel automatique. Si carrousel il y a, prévoir des boutons pause, précédent et suivant.

### Identité visuelle
- **Ne pas utiliser le DSFR, la police Marianne ni le bloc-marque « République Française »** : ils sont réservés aux services de l'État, pas aux collectivités.
- Pas de photos de personnes réelles identifiables : utiliser des placeholders ou des visuels génériques (paysages, bâtiments).

### Responsive
Maquettes attendues en **mobile 390 px** et **desktop 1440 px**. La tablette (768 px) est facultative, à montrer seulement si la mise en page change vraiment.

---

## 3. Commune de démonstration (données à utiliser dans les maquettes)

| Champ | Valeur |
|---|---|
| Nom | **Saint-Aubin-sur-Loire** (fictive) |
| Population | 3 240 habitants |
| Adresse de la mairie | 1 place de la Mairie, 49000 Saint-Aubin-sur-Loire |
| Téléphone | 02 41 00 00 00 |
| E-mail | contact@saint-aubin-sur-loire.fr |
| Horaires | Lun–Ven 9h–12h / 14h–17h30, Sam 9h–12h, fermé le mercredi après-midi |
| Maire | Claire Martin |
| Réseaux | Facebook, Instagram |
| Niveau d'accessibilité déclaré | Partiellement conforme |

Prévoir des contenus **réalistes et de longueur variable**. Au moins un titre long d'environ 90 caractères, par exemple « Réouverture de la médiathèque après travaux : nouveaux horaires et inscriptions pour la rentrée ».

---

## 4. Éléments globaux (présents sur toutes les pages)

### 4.1 Header
- Logo de la commune et nom de la commune. Le lien renvoie à l'accueil.
- **Menu principal** : jusqu'à **7 entrées** au premier niveau, **un seul niveau** de sous-menu, jusqu'à 10 liens par sous-menu. Une entrée peut être un lien direct ou un groupe.
- **Recherche** : champ ou bouton qui ouvre la recherche.
- Accès rapide « Contact » et/ou horaires de la mairie (au choix du thème).
- Mobile : menu repliable, accessible (bouton avec libellé, et fermeture par la touche Échap).
- Menu d'exemple : Accueil · Mairie (Équipe municipale, Documents officiels, Conseil municipal) · Vivre à Saint-Aubin (Associations, Cantine scolaire, Collecte des déchets) · Démarches · Actualités · Agenda · Contact.

### 4.2 Bandeau d'alerte (facultatif, en haut de page)
Affiché quand une alerte est active. Il faut le maquetter pour les **3 niveaux de sévérité** : `info`, `warning` (attention) et `critical` (urgent).
- Champs : titre, message court, lien facultatif (libellé et URL), type (travaux, coupure d'eau, coupure d'électricité, déviation, intempérie, autre).
- Peut être fermé par l'utilisateur, sauf s'il est critique.

### 4.3 Fil d'Ariane
Sur toutes les pages sauf l'accueil. Exemple : Accueil › Actualités › Titre de l'article.

### 4.4 Footer
- Coordonnées de la mairie : adresse, téléphone, e-mail.
- Horaires d'ouverture.
- Liens vers les réseaux sociaux (facebook, instagram, linkedin, x, youtube, tiktok, autre).
- Liens de pied de page configurables par la commune.
- **Liens légaux obligatoires** : Mentions légales · Données personnelles · Accessibilité : partiellement conforme · Gestion des cookies · Plan du site.
- Logos de partenaires (facultatif, si le thème les place ici).

### 4.5 Bandeau de consentement cookies (CNIL)
- Premier niveau : texte court, puis boutons **« Tout accepter »**, **« Tout refuser »** (même importance visuelle que « Tout accepter ») et **« Personnaliser »**.
- Panneau de personnalisation : catégories avec interrupteur (nécessaires, toujours actifs ; mesure d'audience ; contenus tiers type vidéos ou cartes) et un bouton « Enregistrer ».
- **Placeholder de contenu bloqué** : une vidéo ou une carte refusée affiche un encart « Ce contenu est hébergé par YouTube. Accepter les cookies pour l'afficher » avec un bouton.

---

## 5. Page d'accueil

La commune ne choisit pas une mise en page : elle indique **ce qu'elle veut mettre en avant**, et le thème décide de l'ordre, de la forme et de l'emplacement. Chaque section est **facultative** : la maquette doit fonctionner avec toutes les sections, et aussi avec seulement 3 ou 4.

| Section | Données disponibles | Notes |
|---|---|---|
| **Accroche (hero)** | titre, sous-titre, image, bouton principal (libellé + URL), bouton secondaire | Image facultative : prévoir un rendu sans image |
| **Accès rapides** | 4 à 8 liens : libellé, description courte facultative, URL, icône* | Ex. : État civil, Urbanisme, Inscriptions scolaires, Salle des fêtes, Signaler un problème |
| **Actualités à la une** | 3 à 6 derniers articles (voir §6.2) | Lien « Toutes les actualités » |
| **Agenda** | 3 à 6 prochains événements (voir §6.3) | Lien « Tout l'agenda » |
| **Mot du maire** | titre, texte (1 à 3 paragraphes), photo facultative, signature (nom, fonction) | |
| **Chiffres clés** | 3 ou 4 éléments : valeur, libellé, icône** | Ex. : 3 240 habitants · 12 associations · 2 écoles · 18 km² |
| **Infos pratiques** | horaires de la mairie, adresse, téléphone | Ouvert ou fermé en ce moment (facultatif) |
| **Météo** | température, pictogramme, prévision sur 3 jours | Petit widget |
| **Prochaines collectes** | les prochains passages par type de déchet (voir §6.9) | Petit widget |
| **Perturbations en cours** | liste des alertes et travaux actifs (voir §4.2) | |
| **Menu de la cantine** | menu du jour ou de la semaine (voir §6.10) | |
| **Associations** | 3 à 6 associations (logo, nom, catégorie) | |
| **Partenaires** | logos avec lien (intercommunalité, département, etc.) | |
| **Newsletter** | champ e-mail, bouton, mention RGPD courte | États succès et erreur |
| **Contenu libre** | blocs (voir §7) | Texte de présentation de la commune |

\* Icônes des accès rapides : document, identity, folder, mail, alert, clock, phone, map, calendar, users, building, heart, info, shield, book, globe.
\*\* Icônes des chiffres clés : users, map, building, calendar, heart, book, globe, shield, tree, star.

---

## 6. Gabarits de pages

Pour chaque gabarit, maquetter l'état normal et, si c'est indiqué, l'état **vide** (« Aucun événement à venir »).

### 6.1 Page de contenu (générique)
- Titre (H1), chapô facultatif, image principale facultative, puis une **suite de blocs** (voir §7).
- Sommaire automatique facultatif, construit à partir des H2, pour les pages longues. À placer selon le thème.
- Date de mise à jour.
- Exemple à maquetter : « Salle des fêtes : location et tarifs », avec les blocs texte, encadré, image, documents, FAQ et contact.

### 6.2 Actualités
- **Liste** :
  - Cartes ou lignes avec titre, résumé, image (facultative), date de publication, catégorie.
  - Catégories : Actualité, Événement, Information, **Urgence** (doit se distinguer).
  - Filtre par catégorie, pagination.
  - Un article peut être « à la une » (mis en avant).
- **Détail** :
  - Titre, date, catégorie, auteur facultatif, image, résumé, contenu en blocs.
  - Boutons de partage facultatifs.
  - « Autres actualités » (2 ou 3).
- **État vide.**

### 6.3 Agenda (événements)
- **Liste** :
  - Chaque événement : date(s), titre, lieu, catégorie, image facultative.
  - Catégories : Culture, Sport, Réunion, Fête, Atelier, Conférence.
  - Filtres : catégorie, et mois ou période.
  - Prévoir un **événement sur plusieurs jours** (du 12 au 14 juillet) et un événement avec horaire (samedi 5 octobre, 14h–18h).
- **Détail** :
  - Titre, dates et horaires, lieu et adresse, description en blocs.
  - Tarif (« Gratuit » ou montant), organisateur.
  - Contact (e-mail, téléphone), lien externe.
  - **Inscription** : obligatoire ou non, date limite, nombre de places.
  - Bouton « Ajouter à mon agenda » (.ics).
- **État vide.**

### 6.4 Documents officiels (obligations légales de publication)
- **Liste** :
  - Titre, type, date du document, date de séance (pour un conseil municipal), numéro de référence, année.
  - Fichier : format et poids.
  - Types : Procès-verbal de conseil municipal, Délibération, Arrêté, PLU, SCOT, Carte communale, Budget primitif, Compte administratif, Rapport d'orientations budgétaires, Autre.
  - Filtres : type et année. Recherche. Il peut y avoir **plusieurs centaines de documents** : penser à la densité (liste ou tableau plutôt que des cartes).
- **Détail** : description, fichier principal, fichiers annexes.

### 6.5 Équipe municipale
- Groupes : **Maire**, **Adjoints** (avec leur délégation, ex. « Adjoint aux affaires scolaires »), **Conseillers municipaux**, et éventuellement **Services** (DGS, agents).
- Par personne : prénom, nom, fonction, délégation, photo **facultative** (prévoir le cas sans photo), biographie courte facultative.
- Page de détail facultative, ou un simple dépliant dans la liste.

### 6.6 Associations
- **Liste** :
  - Nom, logo (facultatif), catégorie, description courte.
  - Catégories : Sport, Culture, Social, Environnement, Éducation, Autre.
  - Filtre par catégorie.
- **Détail** : description, contact (nom, e-mail, téléphone), site web, adresse.
- **Formulaire « Proposer une association »** : champs de l'association et coordonnées du demandeur, mention RGPD, message de confirmation (« Votre demande sera examinée par la mairie »).

### 6.7 Démarches (données Service-Public.fr)
Contenu fourni automatiquement par Service-Public.fr (données DILA). Le thème ne fait que l'habiller.
- **Accueil des démarches** :
  - Recherche.
  - Choix du public : Particuliers, Professionnels, Associations.
  - Grands thèmes, par exemple Papiers-Citoyenneté, Famille, Social-Santé, Travail, Logement, Transports, Argent, Justice, Étranger, Loisirs.
- **Fiche démarche** : titre, fil de navigation par thème, texte structuré (sections, listes, encadrés « À savoir » ou « Attention »), liens vers les services en ligne et formulaires Cerfa, questions-réponses associées, date de vérification et source (« Service-Public.fr »).

### 6.8 Perturbations et travaux
Liste des alertes actives et à venir : type, sévérité, zone concernée, lieu, dates de début et de fin, message, lien. Filtre par type facultatif. Prévoir l'**état vide**.

### 6.9 Collecte des déchets
- Types : Ordures ménagères, Tri sélectif, Verre, Déchets verts, Encombrants.
- Pour chaque type : jour de collecte, fréquence (hebdomadaire, bimensuelle, mensuelle), zone ou quartier (facultatif), notes (« Sortir les bacs la veille au soir »).
- Mise en avant de la **prochaine collecte** pour chaque type.
- Chaque type a une couleur, mais aussi toujours un libellé et une icône.

### 6.10 Cantine scolaire
- Semaine du … au …, nom de l'école (facultatif), navigation semaine précédente et semaine suivante.
- **Mode détaillé** : pour chaque jour du lundi au vendredi, entrée, plat, accompagnement, produit laitier, dessert, goûter. Des labels par plat (Bio, Local, Fait maison, Végétarien) sous forme de pastille avec texte.
- **Mode image ou PDF** : la mairie a simplement déposé une image ou un PDF du menu. L'afficher avec un lien de téléchargement.

### 6.11 Contact
- Coordonnées, horaires, carte (avec placeholder de consentement, voir §4.5).
- **Formulaire** :
  - Champs : prénom, nom, e-mail, téléphone (facultatif), objet, catégorie, message, pièce jointe (facultative), case de consentement RGPD.
  - Maquetter les **erreurs de validation** (message sous le champ, et récapitulatif en haut du formulaire) et la **confirmation** avec un numéro de référence (« Votre demande n° SVE-2026-0042 a bien été reçue »).
- Texte d'introduction configurable.

### 6.12 Recherche
Champ, nombre de résultats, résultats (titre, extrait avec les termes surlignés, type de contenu), état « aucun résultat » avec suggestions.

### 6.13 Pages légales (communes à tous les thèmes, simplement habillées)
- **Mentions légales** : éditeur (commune, SIRET), directeur de publication, hébergeur, crédits, texte libre.
- **Données personnelles (RGPD)** : politique, et contact du délégué à la protection des données (nom, e-mail, téléphone).
- **Déclaration d'accessibilité** :
  - État de conformité (non conforme, partiellement conforme ou conforme), texte de la déclaration.
  - Liens vers le schéma pluriannuel et le plan d'action.
  - Voies de recours.
- **Exercer ses droits (RGPD)** : formulaire (type de demande : accès, rectification, effacement, etc.).
- **Gestion des cookies** : rouvre le panneau de préférences.
- **Plan du site.**

### 6.14 Autres
- **404** : message clair, recherche, liens utiles.
- **Désinscription de la newsletter** : confirmation.
- **Open data** : texte, et lien vers la plateforme (data.gouv.fr ou autre).

---

## 7. Catalogue des blocs de contenu

Les pages, articles et événements sont composés de **blocs** tirés de ce catalogue fermé. Chaque thème doit dessiner **chaque bloc**, sur mobile et sur desktop. Les communes ne peuvent pas modifier la mise en forme : ce que dessine le thème est le rendu final.

| Bloc | Champs | Variantes et états à maquetter |
|---|---|---|
| **Texte** | Texte riche limité : titres H2 et H3, paragraphes, listes à puces et numérotées, gras, italique, liens | Un exemple long avec tous les éléments |
| **Image** | image, texte alternatif, légende (facultative), crédit (facultatif) | Largeur normale ou pleine largeur. Portrait et paysage |
| **Bouton / lien** | libellé, URL, style (principal ou secondaire) | Lien externe signalé. 1 à 3 boutons côte à côte |
| **Encadré** | type (**Information**, **Attention**, **Important**, **Conseil**), titre (facultatif), texte | Les 4 types, distingués par une icône **et** un libellé |
| **Documents à télécharger** | liste de fichiers : titre, format, poids, date (facultative) | 1 fichier, et une liste de 6 fichiers |
| **Galerie** | 3 à 12 images avec texte alternatif et légende | Grille. Agrandissement accessible (lightbox avec focus piégé, Échap, flèches) |
| **Questions / réponses (accordéon)** | liste de questions et réponses (réponse en texte riche) | Fermé, et un élément ouvert |
| **Contact / lieu** | nom du lieu ou du service, adresse, téléphone, e-mail, horaires, carte (facultative) | Avec et sans carte |
| **Vidéo** | URL YouTube, Dailymotion ou Vimeo, titre, transcription (facultative) | Avec le placeholder de consentement cookies |

---

## 8. Cas limites à couvrir dans les maquettes

- Image absente (article, événement, association, élu) : le rendu doit rester propre.
- Titres très longs, et très courts.
- Listes avec 1 élément, 3 éléments, et beaucoup d'éléments (pagination).
- États vides.
- Logo de commune très horizontal, et logo carré ou blason.
- Aucune section d'accueil facultative activée (seulement l'accroche, les actualités et les infos pratiques).
- Formulaires : erreurs, succès, champ désactivé, chargement.

---

## 9. Pistes de direction pour les deux premiers thèmes (à ajuster)

**Thème 1, « Institutionnel »**
- Sobre, rassurant, très lisible.
- Pour des communes rurales et petites villes, avec un public plutôt âgé.
- Header classique avec menu horizontal, accueil en sections empilées et accès rapides très visibles.
- Grande taille de texte de base (18 px), contrastes forts.

**Thème 2, « Moderne »** (ou « Magazine »)
- Éditorial et visuel.
- Pour des communes qui communiquent beaucoup (événements, vie locale).
- Grandes images, mise en page type magazine, navigation originale (latérale, méga-menu ou barre fixe).
- L'agenda est très mis en avant.

Les deux thèmes doivent être **clairement différents par la structure**, pas seulement par la couleur.

---

## 10. Livrables attendus de Claude Design (pour chaque thème)

1. **Fondations** :
   - Palette avec ses rapports de contraste.
   - Typographies (Google Fonts ou polices libres, auto-hébergeables).
   - Échelle typographique, espacements, rayons, ombres, style du focus.
2. **Composants** : header (desktop et mobile ouvert), footer, fil d'Ariane, bandeau d'alerte (3 niveaux), cartes (article, événement, association, document, élu), pagination, filtres, formulaires (tous les états), bandeau cookies et panneau de préférences, les **9 blocs** du §7.
3. **Écrans prioritaires** (mobile et desktop) :
   1. Accueil (toutes sections)
   2. Page de contenu avec blocs
   3. Liste des actualités
   4. Détail d'un article
   5. Agenda (liste)
   6. Détail d'un événement
   7. Documents officiels
   8. Équipe municipale
   9. Contact avec formulaire (dont l'état d'erreur)
   10. Fiche démarche
   11. Collecte des déchets
   12. Cantine
   13. Déclaration d'accessibilité
   14. 404
4. **Vignette de présentation du thème** (1200 × 800) pour le sélecteur de thème de l'admin.

Hors périmètre : l'interface d'administration (CMS), qui fera l'objet d'un brief séparé.
