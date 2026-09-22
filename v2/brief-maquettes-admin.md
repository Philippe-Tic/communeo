# Brief de maquettes : administration Communeo V2 (back-office)

> Document à fournir à Claude Design pour générer les maquettes de **l'interface d'administration** de Communeo, c'est-à-dire l'outil avec lequel les mairies gèrent leur site.
> Les sites publics (thèmes) ont leur propre brief : `brief-maquettes-themes.md`.

---

## 1. Contexte

Communeo est un CMS pour mairies. Chaque commune a son site public, généré à partir d'un **thème** qu'elle choisit parmi 4 (Institutionnel, Moderne, Journal, Bourg). L'administration sert à :
- rédiger et publier les contenus : pages, actualités, agenda, documents officiels, etc. ;
- tenir à jour les informations pratiques : horaires, alertes, collecte des déchets, cantine ;
- traiter ce que les habitants envoient : messages, propositions d'associations, inscriptions à la newsletter ;
- choisir le thème et voir le résultat **exactement comme il sera publié**.

L'admin actuelle (V1) est réécrite entièrement. Les maquettes définissent la nouvelle interface : **plus claire, cohérente d'un écran à l'autre, accessible, et qui guide l'utilisateur**.

### Ce qui change par rapport à la V1 (à refléter dans les maquettes)
- **Éditeur de blocs** à la place d'un éditeur de texte libre : une page est une suite de blocs pris dans un catalogue fermé (voir §6). L'utilisateur ne peut pas « casser » la mise en page.
- **Preview fidèle** : un panneau affiche la vraie page rendue par le thème, dans un iframe, en largeur mobile, tablette ou bureau.
- **Brouillon, publié, programmé** : chaque contenu a un état clair. On peut programmer une publication.
- **Pas de réglage de couleurs** : la commune choisit un thème, point. L'identité se limite au logo et au nom.
- **Accueil décrit en intentions** : la commune dit ce qu'elle veut mettre en avant (« les 3 dernières actualités », « le mot du maire »…) et le thème décide de la mise en page.

---

## 2. Qui utilise l'admin

| Profil | Rôle technique | Ce qu'il fait | Ce qu'il ne peut pas faire |
|---|---|---|---|
| **Secrétaire de mairie** (utilisateur principal) | `editor` ou `admin` | Publie les actualités, l'agenda, les documents, met à jour les horaires, répond aux messages | — |
| **Maire ou élu référent** | `admin` | Valide, gère les utilisateurs, choisit le thème, gère le domaine | — |
| **Agent ou élu contributeur** | `editor` | Rédige et publie des contenus | Gérer les utilisateurs, le domaine, le thème |
| **Équipe Communeo** | `super_admin` | Crée les communes, gère tous les comptes, peut « entrer » dans l'admin d'une commune pour l'aider | — |

**Profil type à garder en tête :** une secrétaire de mairie d'une commune de 3 000 habitants, qui gère le site en plus de beaucoup d'autres tâches. Elle n'est pas technicienne, a peu de temps, travaille sur un ordinateur de bureau parfois ancien avec un écran de 1366 px, et doit pouvoir publier une alerte de coupure d'eau depuis son téléphone.

**Vocabulaire :** simple et en français, sans jargon technique. Dire « Publier », « Brouillon », « Programmer », « Aperçu », « Mettre en ligne » ; ne pas dire « Deploy », « Build », « Slug », « Draft ». L'adresse d'une page s'appelle « Adresse de la page ».

---

## 3. Contraintes non négociables

### Accessibilité (RGAA 4.1 / WCAG 2.1 AA)
L'admin est un outil utilisé par des agents publics, elle doit elle aussi être accessible.
- Contraste du texte ≥ 4,5:1 et des éléments d'interface ≥ 3:1, en mode clair **et** en mode sombre.
- **Focus clavier visible** sur tous les éléments interactifs. Le dessiner dans les maquettes.
- **Chaque champ a un libellé visible** (pas seulement un placeholder), une aide si nécessaire, et un message d'erreur sous le champ.
- Formulaire en erreur : **récapitulatif des erreurs** en haut, avec des liens vers les champs concernés.
- Les éléments cliquables sont de vrais liens ou boutons. Une carte cliquable ne doit pas être un simple bloc.
- L'information ne passe jamais par la couleur seule : un statut (Brouillon, Publié, Programmé, En erreur) a toujours un libellé.
- Glisser-déposer toujours doublé d'une alternative au clavier (boutons « Monter » et « Descendre »).
- Lien d'évitement « Aller au contenu ».
- Tenir avec un zoom à 200 %.

### Identité visuelle
- Communeo est un produit privé : **pas de DSFR, pas de police Marianne**, pas d'imitation d'un site de l'État.
- Sobre, rassurant, professionnel. L'admin ne doit pas concurrencer visuellement la preview du site.
- **Modes clair et sombre** à maquetter pour les écrans principaux.
- Stack prévue : React + Tailwind + shadcn/ui. Les maquettes peuvent s'appuyer sur ce type de composants, sans obligation.

### Responsive
- **Desktop 1440 px** (référence) et **1366 px** (écran de mairie courant), pour les écrans denses.
- **Mobile 390 px** pour les tâches rapides : tableau de bord, publier une alerte, lire un message, publier une actualité simple. L'éditeur de blocs complet et la preview côte à côte sont pensés pour le desktop, avec un mode dégradé acceptable sur mobile (preview en plein écran par un bouton).

---

## 4. Données de démonstration

Même commune fictive que le brief des thèmes.

| Élément | Valeur |
|---|---|
| Commune | **Saint-Aubin-sur-Loire** (3 240 habitants) |
| Thème actif | Institutionnel |
| Utilisateurs | Claire Martin (maire, admin) · Sophie Leroy (secrétaire de mairie, admin) · Julien Morel (adjoint vie associative, éditeur) · une invitation en attente |
| Adresse du site | `saint-aubin-sur-loire.fr` (domaine personnalisé vérifié) |
| Contenus | 12 pages, 48 actualités dont 2 brouillons et 1 programmée, 9 événements à venir, 214 documents officiels, 23 élus, 14 associations dont 2 propositions en attente |
| Messages | 5 non lus, dont une demande RGPD |
| Newsletter | 312 abonnés |
| Alerte active | « Coupure d'eau rue des Lilas, jeudi 8h–12h » (Attention) |
| Dernière mise en ligne | il y a 2 heures, réussie en 24 secondes |

Prévoir des contenus réalistes, avec au moins un titre long (~90 caractères).

---

## 5. Structure générale

### Navigation principale (proposition, à challenger)
Barre latérale sur desktop, menu repliable sur mobile.

- **Tableau de bord**
- **Contenus**
  - Pages
  - Actualités
  - Agenda
  - Documents officiels
  - Équipe municipale
  - Associations
- **Vie pratique**
  - Alertes et perturbations
  - Collecte des déchets
  - Cantine
- **Habitants**
  - Messages (avec compteur de non lus)
  - Newsletter
- **Médiathèque**
- **Mon site**
  - Apparence (thème)
  - Page d'accueil
  - Menu du site
  - Informations de la commune
  - Mentions légales et RGPD
  - Accessibilité
  - Réseaux sociaux
  - Démarches (Service-Public.fr)
  - Open data
- **Mise en ligne** (état, historique, domaine)
- **Utilisateurs** (admin uniquement)
- **Conformité** (score et checklist)

**En-tête :**
- nom et logo de la commune ;
- bouton **« Voir le site »** ;
- état de mise en ligne (« Site à jour » ou « Modifications en attente de mise en ligne ») ;
- aide ;
- menu du compte (profil, mot de passe, déconnexion) ;
- bascule clair/sombre.

**Mode super admin :**
- navigation propre : Communes, Utilisateurs, Statistiques ;
- quand il entre dans une commune, un **bandeau très visible** l'indique : « Vous consultez l'administration de Saint-Aubin-sur-Loire — Quitter ».

---

## 6. Écrans à maquetter (par priorité)

### Priorité 1 : le cœur de l'outil (à livrer en premier)

#### 6.1 Shell de l'application
Navigation latérale, en-tête, zone de contenu, bandeau d'impersonation super admin. Desktop, mobile avec le menu ouvert, modes clair et sombre.

#### 6.2 Gabarit « liste » (exemple : Actualités)
Tous les types de contenu suivent ce gabarit, les maquettes n'ont donc pas besoin de dessiner chaque liste.
- Titre de la page, bouton principal « Nouvelle actualité ».
- Recherche, filtres (statut, catégorie, date), tri.
- Tableau ou liste de lignes. Chaque ligne affiche :
  - la vignette et le titre (le titre est un lien) ;
  - le statut (Brouillon, Publié, Programmé le…) ;
  - la catégorie et la date ;
  - l'auteur ;
  - un menu d'actions (Modifier, Dupliquer, Voir sur le site, Supprimer).
- Sélection multiple et actions groupées (Publier, Dépublier, Supprimer).
- Pagination.
- **États** : liste normale, **liste vide** (premier usage, avec une aide « Publiez votre première actualité »), aucun résultat de recherche, chargement.
- **Mobile** : lignes empilées en cartes.

#### 6.3 Éditeur de contenu avec blocs et preview (exemple : page « Location de la salle des fêtes »)
**C'est l'écran le plus important.**

**Mise en page desktop :** zone d'édition à gauche et **panneau de preview** à droite, redimensionnable ou masquable.

**Barre d'actions :**
- état (« Brouillon enregistré il y a 5 s » : l'autosave est visible) ;
- « Aperçu plein écran » ;
- « Programmer » ;
- **« Publier »** ;
- menu (Dupliquer, Supprimer, Voir l'historique).

**Zone d'édition :**
- Champs d'en-tête :
  - titre ;
  - chapô (facultatif) ;
  - image principale (facultative, texte alternatif obligatoire) ;
  - adresse de la page, générée automatiquement et modifiable ;
  - pour une page : afficher dans le menu ou non.
- **Liste des blocs.** Chaque bloc a :
  - un en-tête (type, résumé du contenu) ;
  - des actions : replier, monter, descendre, dupliquer, supprimer ;
  - une poignée de glisser-déposer.
- Bouton **« + Ajouter un bloc »** entre les blocs et en bas : il ouvre le **catalogue** (voir ci-dessous).
- Panneau latéral ou section repliable « Référencement » : description pour les moteurs de recherche.

**Catalogue des 9 blocs** (fenêtre ou panneau, avec icône, nom et courte description de chaque bloc) :

| Bloc | Champs du formulaire |
|---|---|
| **Texte** | Éditeur de texte riche **limité** : titres de niveau 2 et 3 (« Titre », « Sous-titre »), paragraphes, listes à puces et numérotées, gras, italique, liens. Barre d'outils réduite. |
| **Image** | image (depuis la médiathèque ou envoi), **texte alternatif (obligatoire, avec aide « Décrivez l'image pour les personnes qui ne la voient pas »)**, légende, crédit, largeur (normale ou pleine largeur) |
| **Bouton / lien** | libellé, lien (page du site ou adresse externe), style (principal ou secondaire). 1 à 3 boutons. |
| **Encadré** | type (Information, Attention, Important, Conseil), titre facultatif, texte |
| **Documents à télécharger** | liste de fichiers (depuis la médiathèque) : titre, format et poids affichés automatiquement |
| **Galerie** | 3 à 12 images réordonnables, texte alternatif et légende pour chacune |
| **Questions / réponses** | liste de paires question / réponse, réordonnables |
| **Contact / lieu** | nom, adresse, téléphone, e-mail, horaires, afficher une carte (oui ou non) |
| **Vidéo** | lien YouTube, Dailymotion ou Vimeo, titre, transcription facultative |

**Panneau de preview :**
- sélecteur de largeur : Mobile, Tablette, Bureau ;
- indicateur « Aperçu du brouillon — thème Institutionnel » ;
- rechargement après chaque enregistrement automatique ;
- bouton plein écran.

**États à maquetter :**
- éditeur vide, avec invitation à ajouter un premier bloc ;
- page complète avec les 9 blocs ;
- catalogue ouvert ;
- bloc en cours de déplacement ;
- **erreurs de validation** : image sans texte alternatif, titre manquant, avec le récapitulatif ;
- fenêtre « Programmer la publication » (date et heure) ;
- confirmation de publication (« Publié. Votre site sera mis à jour dans quelques instants. »).

**Mobile :** édition seule, preview par un bouton « Aperçu » en plein écran.

#### 6.4 Gabarit « formulaire simple » (exemple : Nouvel événement)
Pour les contenus avec surtout des champs, plus quelques blocs pour la description.
- **Champs d'un événement :**
  - titre ;
  - catégorie (Culture, Sport, Réunion, Fête, Atelier, Conférence) ;
  - date et heure de début, date et heure de fin (**événement sur plusieurs jours**) ;
  - lieu et adresse ;
  - tarif (Gratuit ou montant) ;
  - organisateur ;
  - e-mail et téléphone de contact ;
  - lien externe ;
  - inscription obligatoire (oui ou non), date limite, nombre de places ;
  - image ;
  - « Mettre à la une » ;
  - description en blocs.
- Regroupement des champs en sections lisibles.
- **États** : normal, erreurs (récapitulatif et messages sous les champs), enregistrement en cours, succès.

#### 6.5 Fenêtres de confirmation et notifications
Suppression (« Supprimer « Fête de la musique » ? Cette action est définitive. »), dépublication, départ avec des modifications non enregistrées, toasts de succès et d'erreur.

---

### Priorité 2 : paramétrage et publication

#### 6.6 Tableau de bord
- Accueil personnalisé (« Bonjour Sophie »).
- **Prochaine action recommandée** (issue de la checklist, par exemple « Complétez votre déclaration d'accessibilité »).
- Raccourcis : Nouvelle actualité, Nouvel événement, Publier une alerte.
- Messages non lus (3 derniers).
- Prochains événements, derniers contenus modifiés.
- État de mise en ligne (dernière mise en ligne, statut).
- Score de conformité (jauge et libellé).
- **Mobile** : priorité aux raccourcis et aux messages.

#### 6.7 Apparence : sélecteur de thème
- Galerie des 4 thèmes : vignette, nom, description courte, thème actif signalé.
- **Aperçu du site de la commune dans le thème choisi**, avant de valider : preview plein écran avec navigation, et bascule entre les thèmes.
- Confirmation : « Passer au thème Moderne ? Vos contenus sont conservés, seule la présentation change. »

#### 6.8 Page d'accueil (sections en intentions)
- Liste des sections que **le thème actif sait afficher** : accroche, accès rapides, actualités à la une, agenda, mot du maire, chiffres clés, infos pratiques, météo, prochaines collectes, perturbations, cantine, associations, partenaires, newsletter, contenu libre.
- Chaque section peut être activée ou désactivée et a son formulaire :
  - **Accroche** : titre, sous-titre, image, bouton principal et bouton secondaire (libellé et lien).
  - **Accès rapides** : 4 à 8 liens (libellé, description, lien, icône choisie dans une liste).
  - **Mot du maire** : titre, texte, photo, signature.
  - **Chiffres clés** : 3 ou 4 (valeur, libellé, icône).
  - **Partenaires** : logo, nom, lien.
  - Les autres sections se limitent à un interrupteur et au nombre d'éléments.
- Pas d'ordre ni de mise en page à régler : c'est le thème qui décide. Le dire clairement à l'utilisateur.
- Preview de l'accueil à côté.

#### 6.9 Menu du site
- Arbre du menu principal : **7 entrées maximum**, **un niveau de sous-menu**, 10 liens par sous-menu.
- Une entrée est une page du site, une rubrique (Actualités, Agenda, Documents…), un lien externe ou un groupe.
- Réordonnancement par glisser-déposer **et** au clavier.
- Liens de pied de page.
- Preview du menu.

#### 6.10 Informations de la commune et pages légales
Une série d'écrans de réglages, avec le même gabarit (sections, enregistrement, état) :
- **Informations** :
  - nom, logo (conseils de format), favicon ;
  - adresse, téléphone, e-mail ;
  - **horaires d'ouverture** : éditeur par jour, plusieurs plages, fermetures exceptionnelles ;
  - population, coordonnées GPS ;
  - texte d'introduction du formulaire de contact.
- **Mentions légales et RGPD** : SIRET, directeur de publication (nom, fonction), hébergeur, crédits, texte complémentaire, politique de données personnelles, délégué à la protection des données (nom, e-mail, téléphone).
- **Accessibilité** : niveau de conformité (Non conforme, Partiellement conforme, Conforme), déclaration, liens vers le schéma pluriannuel et le plan d'action.
- **Réseaux sociaux** : liste de plateformes (Facebook, Instagram, LinkedIn, X, YouTube, TikTok, autre) avec leur lien.
- **Démarches** : activer le service, code INSEE, publics affichés (Particuliers, Professionnels, Associations).
- **Open data** : activer, plateforme, lien.

#### 6.11 Médiathèque
- Grille et liste, dossiers, recherche, envoi par glisser-déposer (avec progression).
- Fiche d'un fichier : aperçu, nom, **texte alternatif**, légende, crédit, format, poids, dimensions, « utilisé dans » (liste des contenus).
- Signalement des images sans texte alternatif.
- Fenêtre de sélection de média, ouverte depuis un bloc.

#### 6.12 Mise en ligne
- **État** : site à jour, mise en ligne en cours (progression), ou échec (message compréhensible et bouton « Réessayer »).
- Bouton « Mettre en ligne maintenant ».
- Historique : date, déclenchée par qui, durée, résultat.
- **Domaine** (admin uniquement), en étapes :
  1. saisie du domaine ;
  2. instructions DNS à transmettre au prestataire, avec boutons de copie ;
  3. vérification ;
  4. HTTPS actif.

  Maquetter les états : en attente, vérifié, en erreur.

---

### Priorité 3 : le reste des contenus, les habitants et l'onboarding

#### 6.13 Écrans de contenus spécifiques
Ils reprennent les gabarits 6.2, 6.3 et 6.4. Maquetter seulement ce qui diffère :
- **Documents officiels** :
  - Liste dense, pour plusieurs centaines de documents, avec filtres par type et année. Les types sont : Procès-verbal de conseil municipal, Délibération, Arrêté, PLU, SCOT, Carte communale, Budget primitif, Compte administratif, Rapport d'orientations budgétaires, Autre.
  - Formulaire : titre, type, date du document, date de séance, numéro de référence, année, description, fichier principal (obligatoire), fichiers annexes.
- **Équipe municipale** : groupes (Maire, Adjoints, Conseillers, Services), réordonnancement, fiche (prénom, nom, fonction, délégation, photo facultative, biographie).
- **Associations** :
  - onglets « Publiées » et « **Propositions à examiner** » ;
  - la fiche d'une proposition affiche les coordonnées du demandeur, avec les boutons « Publier » et « Refuser ».
- **Alertes et perturbations** :
  - formulaire **rapide**, également sur mobile : titre, message, sévérité (Information, Attention, Urgent), type (Travaux, Coupure d'eau, Coupure d'électricité, Déviation, Intempérie, Autre), zone, dates de début et de fin, lien ;
  - aperçu du bandeau tel qu'il apparaîtra.
- **Collecte des déchets** : par type (Ordures ménagères, Tri sélectif, Verre, Déchets verts, Encombrants), jour, fréquence, zone, notes.
- **Cantine** :
  - semaine, école ;
  - **mode détaillé** : grille lundi–vendredi × entrée, plat, accompagnement, produit laitier, dessert, goûter, avec des labels Bio, Local, Fait maison, Végétarien ;
  - **mode simple** : dépôt d'une image ou d'un PDF ;
  - duplication de la semaine précédente.

#### 6.14 Messages des habitants
- Liste :
  - numéro de référence (SVE-2026-0042) ;
  - expéditeur, objet ;
  - catégorie (Général, Urbanisme, État civil, Voirie, Associations, **RGPD**, Autre) ;
  - statut (Reçu, En cours, Traité, Clos) ;
  - date ;
  - non lus en gras.
- Détail : message, pièces jointes, coordonnées, changement de statut, **zone de réponse**, historique.
- Les demandes RGPD sont mises en évidence, avec le rappel du délai légal de réponse.

#### 6.15 Newsletter
Liste des abonnés (e-mail, nom, date, actif ou non), statistiques (total, actifs, nouveaux ce mois-ci), export.

#### 6.16 Utilisateurs (admin)
- Liste : nom, e-mail, rôle, état (Actif, Invitation en attente, Désactivé), dernière connexion.
- Inviter un utilisateur : prénom, nom, e-mail, rôle (Administrateur ou Éditeur, avec une explication de chaque rôle).
- Actions : renvoyer l'invitation, réinitialiser le mot de passe, désactiver, supprimer.

#### 6.17 Conformité
Score global, checklist par thème (mentions légales, RGPD, accessibilité, publication des actes, cookies), avec pour chaque point son état et un lien direct vers l'écran à compléter.

#### 6.18 Onboarding : assistant de création
Parcours en étapes, avec indicateur de progression, retour possible et sauvegarde à chaque étape :
1. **Bienvenue** : présentation en une phrase et durée estimée (« environ 20 minutes »).
2. **Votre commune** : recherche par nom ou code postal, puis **pré-remplissage automatique** (population, adresse, téléphone et horaires de la mairie, depuis les données publiques). Maquetter l'état « informations trouvées, vérifiez-les ».
3. **Votre logo** : envoi, aperçu sur fond clair et sombre, conseils.
4. **Votre thème** : les 4 thèmes avec **la commune déjà affichée dedans**.
5. **Vos obligations légales** : pages pré-remplies à relire (mentions, données personnelles, accessibilité), avec les champs manquants mis en évidence (SIRET, directeur de publication).
6. **Vos premières pages** : choix de modèles (Salle des fêtes, État civil, Urbanisme, Inscriptions scolaires, Contacter les services).
7. **Mise en ligne** : récapitulatif, puis publication, puis écran de succès avec le lien vers le site.

Ensuite, la **checklist** reste visible sur le tableau de bord jusqu'à ce que le site soit complet.

#### 6.19 Authentification
Connexion, mot de passe oublié, acceptation d'invitation (choix du mot de passe, **10 caractères minimum**, indicateur de robustesse), lien expiré. Maquetter les erreurs.

#### 6.20 Super admin
- Liste des communes : nom, thème, état de mise en ligne, nombre d'utilisateurs, dernière activité.
- Création d'une commune : nom, adresse du site, e-mail du premier administrateur.
- Fiche d'une commune, avec le bouton « Entrer dans l'administration ».
- Tous les utilisateurs.
- Statistiques globales.

---

## 7. États transverses à couvrir

- **Chargement** : squelettes plutôt que des spinners plein écran.
- **Listes vides** au premier usage, avec une aide à l'action.
- **Erreurs** : de formulaire, réseau (« Connexion perdue, vos modifications sont enregistrées localement »), droits insuffisants (un éditeur qui ouvre une URL réservée aux admins).
- **Modifications non enregistrées** au moment de quitter un écran.
- **Session expirée**.
- Contenus longs : titres de 90 caractères, listes de plusieurs centaines d'éléments.

---

## 8. Livrables attendus de Claude Design

1. **Fondations** :
   - palette avec ses contrastes, en modes clair et sombre ;
   - typographie ;
   - échelle d'espacements, rayons, ombres ;
   - style du focus ;
   - icônes (une seule famille).
2. **Composants** :
   - navigation, en-tête, bandeau d'impersonation ;
   - boutons, champs (tous les états), sélecteurs, interrupteurs, sélecteurs de date et d'heure ;
   - tableaux et listes, filtres, pagination ;
   - badges de statut ;
   - fenêtres de confirmation, toasts ;
   - onglets, étapes d'assistant ;
   - carte de bloc de l'éditeur, catalogue de blocs, panneau de preview.
3. **Écrans** dans l'ordre de priorité du §6 :
   - **Priorité 1** (6.1 à 6.5) en desktop et mobile, modes clair et sombre ;
   - **Priorités 2 et 3** en desktop, plus en mobile pour le tableau de bord, les alertes, les messages et l'onboarding.
4. **Parcours annotés** :
   - créer et publier une actualité ;
   - publier une alerte depuis un téléphone ;
   - changer de thème avec aperçu ;
   - onboarding complet.
