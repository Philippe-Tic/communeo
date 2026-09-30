# Brief Claude Design : site internet de Communeo (communeo.fr)

> Prompt à fournir à Claude Design pour concevoir **le site vitrine de Communeo** : pages, contenus rédigés et maquettes. Ticket #315.
> Tout ce qui est affirmé ici est **vrai aujourd'hui** dans le produit. Ne rien ajouter qui n'y figure pas ; ce qui est incertain est signalé **[à confirmer]**.

---

## 0. Ta mission

Tu es directeur artistique et rédacteur web. Conçois le **site public de Communeo**, le service qui donne à une mairie son site internet et l'outil pour le tenir à jour. Le site doit convaincre un ou une **élue** ou une **secrétaire de mairie** d'une petite commune de **créer le site de sa commune** (essai gratuit de 30 jours, sans engagement).

Livrables attendus, dans cet ordre :
1. **La direction artistique** (§ 4.9) : planche d'ambiance, logo, palette, typographie, style d'illustration, trois pistes d'accroche. Je valide avant la suite.
2. **L'arborescence** du site et le rôle de chaque page.
3. **Les textes complets**, rédigés en français, prêts à publier (titres, sous-titres, paragraphes, boutons, FAQ, micro-textes, balises title et meta description de chaque page).
4. **Les maquettes** de chaque page, en **mobile (390 px)** et **ordinateur (1440 px)**, en mode clair ; le mode sombre en option pour l'accueil.
5. **La bibliothèque de composants** utilisée (en-tête, pied de page, boutons, cartes, tableau des tarifs, FAQ en accordéon, bandeau d'appel à l'action, formulaire de contact), avec leurs états (survol, focus clavier, désactivé, erreur).
6. **Les storyboards** des vidéos et les fiches des animations (§ 4.7 et 4.8) : je produirai vidéos et motion ensuite.

---

## 1. Communeo en une phrase, et en trente secondes

**Une phrase** : « Le site internet de votre commune, prêt en une journée, conforme et facile à tenir à jour, sans prestataire. »

**En trente secondes** : une mairie s'inscrit en ligne ; Communeo remplit déjà son site avec les données publiques (coordonnées, horaires, population). La commune choisit un thème parmi quatre, complète ses contenus depuis un navigateur, et met son site en ligne en un clic. Pendant 30 jours, tout est gratuit. Pour continuer, le maire valide un devis en ligne ; l'abonnement annuel dépend de la population, sans frais de mise en service. La facture arrive par Chorus Pro et se règle par virement, comme n'importe quelle dépense de la commune.

---

## 2. À qui s'adresse le site

### Cible principale
- **Communes de moins de 5 000 habitants**, en particulier les communes rurales : la grande majorité des communes françaises.
- **Qui décide** : le ou la maire, un ou une adjointe (souvent à la communication).
- **Qui fait** : le ou la **secrétaire de mairie**, souvent seul·e, à temps partiel, qui gère déjà l'état civil, l'urbanisme, la comptabilité. Pas de service informatique, pas de service communication.

### Leurs situations
- Pas de site, ou un vieux site qu'on ne sait plus mettre à jour (agence disparue, prestataire trop cher, identifiants perdus).
- Un site fait par un bénévole ou un élu, qui s'en va à la fin du mandat.
- Une page Facebook qui tient lieu de site : les habitants âgés et les nouveaux arrivants n'y trouvent pas les horaires, les démarches, les comptes rendus du conseil.
- La peur de la loi : accessibilité (RGAA), RGPD, mentions légales, publication des actes. Ils savent qu'il y a des obligations, sans savoir lesquelles.

### Ce qui les convainc
- **Simplicité** : « je le fais moi-même, sans formation, pendant la permanence ».
- **Temps** : un site en ligne en une journée, pas en trois mois.
- **Prix clair** et adapté à la taille de la commune, pas de frais cachés, pas de mise en service facturée.
- **Conformité** : on leur dit ce que la loi demande, et le site le fait.
- **Sérénité administrative** : devis en bonne et due forme, facture sur Chorus Pro, paiement par virement (mandat administratif), marché de faible montant sans mise en concurrence.
- **Pas d'engagement** pour essayer.

### Ce qui les fait fuir
- Le jargon technique (CMS, SaaS, hébergement, DNS, Astro…), les anglicismes.
- Les promesses creuses et les superlatifs (« révolutionnaire », « le meilleur »).
- Un site vitrine lui-même inaccessible ou illisible : c'est leur premier indice de sérieux.

---

## 3. Ton et règles de rédaction

- **Vouvoiement**, phrases courtes, mots simples, verbes d'action. On s'adresse à la commune : « votre commune », « vos habitants », « votre secrétariat ».
- Chaleureux et rassurant, **jamais condescendant**. Parler comme un collègue compétent d'une autre mairie.
- **Concret** : des exemples de la vie d'une commune (coupure d'eau, fête du village, menu de la cantine, conseil municipal, ramassage des encombrants, location de la salle des fêtes).
- **Pas de jargon technique**. Si un terme est inévitable (Chorus Pro, RGAA, RGPD, SIRET), il est expliqué en quelques mots la première fois.
- **Aucun chiffre ni promesse inventés** : pas de nombre de communes clientes, pas de témoignages, pas de note, pas de logo de client, pas de « hébergé en France » (voir § 9). Si une maquette a besoin d'un témoignage, mets un emplacement clairement marqué « [Témoignage à venir] ».
- Typographie française : espaces insécables avant « : ; ! ? », guillemets « », apostrophe typographique ’, nombres « 1 290 € ».
- Écriture inclusive : formulations neutres (« les élus et agents », « la personne qui signe ») plutôt que les points médians.
- Boutons : un verbe, un résultat. « Créer le site de ma commune », « Voir les tarifs », « Essayer gratuitement 30 jours ».

---

## 4. Identité visuelle et direction artistique

Communeo a déjà une identité, portée par son **logo** (vert sapin #0E4033, beige papier #EFECE5) et reprise par l'administration (DM Sans, fonds papier) : **la garder et l'amplifier**, pas la réinventer. Ce sont les **couleurs du logo** qui font référence : l'administration, aujourd'hui en #004643 / #EFEDE4 et une couleur en plus si besoin qui va bien avec en complément, sera alignée dessus. Le site vitrine est l'endroit où cette identité prend de l'ampleur : plus d'espace, plus de caractère, des illustrations et du mouvement.

### 4.1 Le concept : « le papier et le sapin »

Communeo, c'est **le soin d'un document public bien fait**, en version d'aujourd'hui. Les références ne sont pas les start-up, mais ce qu'on voit dans une commune :
- l'**affiche de mairie** et le **bulletin municipal** : grands titres, colonnes, informations hiérarchisées, papier crème ;
- le **plan cadastral** et la **carte IGN** : parcelles, chemins, **courbes de niveau**, lignes fines ;
- le **tampon de la mairie** : un cachet rond, officiel et un peu artisanal ;
- les **panneaux** d'entrée de commune et de signalétique : lisibles de loin, sans fioriture.

Le résultat attendu : **calme, net, chaleureux et sérieux**. On doit sentir qu'un site Communeo est fiable comme un acte administratif, et agréable comme une place de village un jour de marché. Ni « tech », ni « institutionnel poussiéreux ».

Trois mots à tester sur chaque maquette : **clair, rassurant, vivant**.

À éviter : dégradés violets, glassmorphism, blobs 3D, illustrations « corporate » aux personnages sans visage à grands bras, photos de banque d'images avec poignées de main, bleu-blanc-rouge et Marianne (Communeo n'est pas l'État), clichés « tech » (code, circuits, fusées).

### 4.2 Le logo

Le logo existe (fichier fourni : `apps/admin/src/assets/logo-communeo.svg`, vectoriel, une couleur) :
- un **pictogramme** : une silhouette de maison au toit pointu (ou d'écusson), traversée de lignes courbes qui évoquent des champs, des chemins ou des courbes de niveau ;
- un **logotype** « Communeo » dessiné, à fort contraste de pleins et déliés, aux terminaisons en goutte ; le dernier « o » est traité comme une graine ou un globe.

Ce qu'on attend de toi :
- **Planche logo** : version horizontale (pictogramme + logotype), pictogramme seul (favicon, avatar, image de partage), version sapin #0E4033 sur papier #EFECE5, version papier sur sapin, version claire pour le mode sombre, version noire pour l'impression.
- **Règles** : zone de protection (la hauteur du « o » tout autour), tailles minimales (pictogramme 20 px, logo complet 120 px de large), et ce qu'il ne faut pas faire (déformer, changer la couleur, ajouter une ombre, poser sur une photo chargée).
- **Favicon et icône** : l'actuel est un « C » blanc dans un carré vert en police système ; remplace-le par le **pictogramme** (favicon 32 px, icône 180 px et 512 px, SVG).
- **Le pictogramme comme motif** : ses lignes courbes deviennent le fil graphique du site (fonds de sections, séparateurs, frise « Comment ça marche », illustrations). Montre 2 ou 3 usages.
- **Logo animé** (2 s, pour l'intro et la fin des vidéos, et en option au premier affichage de l'accueil) : les lignes du pictogramme se tracent, puis le logotype apparaît. Fournis le storyboard en 4 images clés et la version fixe finale.

Pas de refonte : tu peux proposer un ajustement discret (épaisseurs des lignes du pictogramme à petite taille, par exemple), en le signalant.

### 4.3 Les couleurs

Partir des **deux couleurs du logo**, sapin #0E4033 et papier #EFECE5, compléter avec les neutres de l'administration, et ajouter **une couleur chaude** propre au site vitrine. Règle de dosage indicative : 60 % papier et blanc, 30 % vert sapin et encre, 10 % accents.

| Rôle | Nom | Valeur | Usage | Contraste vérifié |
|---|---|---|---|---|
| Principale (logo) | Sapin | **#0E4033** | logo, boutons, liens, titres forts, grands aplats | 11,7:1 sur blanc, 9,9:1 sur papier ; papier sur sapin 9,9:1 |
| Principale, survol | Sapin profond | #0A2F26 | survol et appui des boutons | blanc dessus 14,5:1 |
| Fond doux | Sauge | #E1E9E4 | encadrés, badges, fonds de sections | sapin sur sauge 9,4:1 |
| Fond (logo) | Papier | **#EFECE5** | fond général du site | |
| Fond clair | Papier clair | #F7F6F2 | alternance de sections, cartes sur papier | sapin dessus 10,8:1 |
| Surface | Blanc | #FFFFFF | cartes, champs de formulaire, cadres d'écran | |
| Texte | Encre | #1C1B18 | texte courant | 14,6:1 sur papier |
| Texte secondaire | Encre douce | #4A4942 | sous-titres, légendes | 7,7:1 sur papier |
| Bordure | Grège | #D9D6C9 | séparateurs, contours de cartes (décoratif) | |
| Bordure de champ | Taupe | #8F8C7E | contour des champs, **sur fond blanc uniquement** | 3,4:1 sur blanc (2,9:1 sur papier : insuffisant) |
| **Accent chaud** (nouveau) | Tuile | **#A8452A** | petits accents : étiquettes, mots soulignés à la main, tampon, détails d'illustration | 5,9:1 sur blanc, 5,0:1 sur papier ; blanc sur tuile 5,9:1 |
| **Lumière** (nouveau) | Blé | #E3B55B | illustrations, surlignage, soleil, champs ; **jamais pour du texte sur fond clair** | blé sur sapin 6,1:1 ; encre sur blé 9,0:1 |

Couleurs de statut (alertes, messages de formulaire), reprises de l'administration : succès #0E5A34 sur #DCEFE3, information #2B4A9B sur #E3E8F5, vigilance #7A4B00 sur #FBEBD0, erreur #9B2C1F sur #F8E1DE. Toujours accompagnées d'une icône et d'un libellé.

**Mode sombre** (repris de l'administration) : fond #12120E, surfaces #26251E, texte #F1EFE6 (16,3:1), texte secondaire #B4B1A4 (8,7:1), sapin éclairci #86C2AE pour les liens, les accents et le logo (9,3:1 ; 7,6:1 sur surface), boutons #155C4A avec texte #F1EFE6 (6,9:1), tuile éclaircie #E89A7A (8,3:1), blé #E3B55B. Pas d'ombres en sombre : les niveaux passent par la valeur du fond et une bordure.

Le vert sapin en grand aplat est la signature : prévois au moins une section « pleine page » sapin #0E4033 avec texte papier #EFECE5, exactement les couleurs du logo, (bandeau des promesses ou appel final).

### 4.4 La typographie

- **Texte et interface** : **DM Sans** (variable, Google Fonts), comme l'administration. Corps 18 px sur ordinateur, 17 px sur mobile, interligne 1,6, 70 caractères par ligne au plus.
- **Grands titres** (proposition) : une **serif de caractère** qui dialogue avec le logotype (pleins et déliés, terminaisons en goutte), par exemple **Fraunces** (Google Fonts, variable, axes « soft » et « wonk »), réservée au H1, aux H2 et aux grands chiffres (prix, « 30 jours », « 3 000 fiches »). Tout le reste en DM Sans. Montre l'accueil avec et sans cette serif, et recommande l'une des deux.
- **Échelle** fluide (valeurs `clamp()` entre 390 et 1440 px) : H1 40 → 72 px, H2 30 → 48 px, H3 22 → 28 px, chapô 20 → 24 px, texte 17 → 18 px, petit texte 15 px minimum (jamais en dessous).
- **Chiffres tabulaires** dans les tarifs et le simulateur, pour que les montants ne « sautent » pas.
- Typographie française (§ 3) respectée dans les maquettes, y compris les espaces insécables.

### 4.5 La direction artistique, section par section

- **Mise en page** : grille de 12 colonnes, largeur de lecture limitée, beaucoup de blanc. Alternance de sections papier, papier clair, blanc et une ou deux sections sapin. Des compositions asymétriques (texte à gauche, écran qui déborde à droite) plutôt que tout centré.
- **Formes** : coins arrondis 8 à 12 px pour les cartes et boutons, 16 à 24 px pour les grands cadres d'écran. Ombres très discrètes, uniquement sous les écrans mis en scène.
- **Motif « courbes de niveau »** : lignes fines (1 à 1,5 px, sauge ou sapin à faible opacité) tirées du pictogramme, en fond de l'accroche, derrière les écrans produit et le long de la frise des étapes. Décoratif uniquement (`aria-hidden`).
- **Le tampon** : un cachet rond, couleur tuile, légèrement incliné, pour 2 ou 3 messages forts au plus : « 30 jours gratuits », « Sans frais de mise en service », « Pensé pour l'accessibilité ». Le texte reste aussi présent en HTML à côté (jamais d'information dans l'image seule).
- **Soulignés « à la main »** : un trait tuile ou blé sous un mot clé d'un titre (« *votre* commune »), en SVG décoratif.
- **Iconographie** : icônes au trait, 1,5 à 2 px, coins arrondis, cohérentes avec **Lucide** (utilisée dans l'administration). Pas d'icônes en couleurs pleines ni d'emoji.
- **Fil rouge narratif** : toutes les images du site montrent **la même commune fictive, Saint-Aubin-sur-Loire** (celle de la démo), son logo, ses actualités, sa fête du village, sa coupure d'eau. On suit une commune du début à la fin, pas des exemples dispersés.

### 4.6 Les images

Trois familles, par ordre de priorité :

**1. Le produit, en vrai.** C'est la meilleure preuve.
- Vignettes des quatre thèmes (`themes/<id>/thumbnail.png`, 1200 × 800) et captures de l'administration (`docs/src/assets/captures/` : tableau de bord, éditeur de page, alertes, mise en ligne, conformité, facturation). Fournies en pièces jointes si possible ; sinon, dessine des écrans simplifiés fidèles.
- Mise en scène : cadres de navigateur et de téléphone **dessinés sobrement** (pas de modèle d'appareil de marque), posés à plat ou très légèrement superposés, un détail agrandi à la loupe (le bloc « ouvert / fermé », le bandeau d'alerte, le bouton « Mettre en ligne »).
- Montre le **même contenu dans les quatre thèmes** côte à côte : c'est le message clé de la page Thèmes.

**2. Les illustrations.** Style : **dessin au trait** (ligne sapin régulière, 2 px), aplats limités à la sauge, au blé et à la tuile, beaucoup de papier, perspective simple, **aucun visage détaillé**. Inspirées des lignes du pictogramme et des cartes IGN. Liste à dessiner :
- **Accroche** : un village vu de loin (clocher, mairie, école, lavoir, champs en courbes de niveau), duquel « sort » le site de la commune sur un téléphone.
- **Le constat** (3 vignettes) : un ordinateur poussiéreux avec un cadenas (identifiants perdus) ; une chaise vide avec un carton (le bénévole parti) ; une pile de textes de loi avec un point d'interrogation.
- **Les 7 étapes** : un pictogramme illustré par étape (enveloppe, sablier 30 jours, téléphone avec bandeau « en préparation », stylo et devis, globe et nom de domaine, facture Chorus Pro, carton d'archives pour la fin d'essai).
- **Pages secondaires** : page introuvable (panneau de direction « Communeo » perdu dans un champ), confirmation d'envoi du formulaire de contact (boîte aux lettres de mairie).
- **Image de partage** (Open Graph) : modèle 1200 × 630, logo + titre de page + motif courbes de niveau, décliné pour chaque page.

**3. Les photos (facultatives).** Seulement si elles apportent quelque chose : villages, mairies, places du marché, lavoirs, en France, **sans visage identifiable**, lumière naturelle, légèrement désaturées et réchauffées pour s'accorder au papier. Jamais de bureau open space ni de mains sur clavier. Emplacements marqués **[Photo à fournir : …]** avec le sujet attendu et le cadrage.

Toute image porteuse de sens a un **texte alternatif** rédigé (donne-le dans les maquettes) ; les images décoratives sont marquées comme telles.

### 4.7 Vidéo et motion à produire plus tard

Je produirai ces contenus après la maquette : **prévois leurs emplacements** et donne pour chacun le **storyboard** (6 à 10 images clés avec le texte à l'écran) et l'**image d'attente** (poster) dessinée. Dans les maquettes, un emplacement vidéo est une image fixe avec un bouton lecture, une durée et l'étiquette **[Vidéo à produire : V1]**.

| Réf. | Contenu | Durée | Format | Où |
|---|---|---|---|---|
| **V1** | **Démo complète** : de l'inscription au site en ligne, sur l'exemple de Saint-Aubin-sur-Loire (inscription, site pré-rempli, choix du thème, une actualité, une alerte, mise en ligne) | 90 s | 16:9, 1920 × 1080 | accueil (sous l'accroche), Comment ça marche |
| **V2** | **Une alerte en moins d'une minute** : la secrétaire publie « Coupure d'eau mardi 9 h – 12 h », le bandeau apparaît sur le téléphone d'un habitant, chronomètre à l'écran | 20 s | 16:9 et 4:5 (réseaux sociaux) | accueil § Alertes, Fonctionnalités |
| **V3** | **Même contenu, quatre thèmes** : la page d'accueil passe d'Institutionnel à Moderne, Journal puis Bourg | 15 s | 16:10 | Thèmes |
| **V4** | **Écrire une page** : l'éditeur par blocs, enregistrement automatique, aperçu, publication programmée | 30 s | 16:10 | Fonctionnalités |
| **V5** | **Le devis en ligne** : la population s'affiche, le prix, la validation, le PDF | 20 s | 16:10 | Tarifs |
| **M1** | **Logo animé** (§ 4.2) | 2 s | SVG animé + MP4 | intro et fin des vidéos |
| **M2** | Courtes **animations d'interface** en boucle unique (voir § 4.8), réalisables en CSS/SVG | 3 à 5 s | intégrées | accueil, Fonctionnalités |

Règles pour toutes les vidéos :
- **Jamais de lecture automatique** : lecture au clic, commandes du lecteur accessibles au clavier.
- **Sous-titres** français incrustables (fichier séparé), **transcription texte** sous la vidéo (lien « Lire la transcription »), et une version **audiodécrite** ou une transcription qui décrit ce qu'on voit (RGAA).
- Voix off posée, féminine ou masculine [à choisir], sans musique envahissante ; la vidéo doit se comprendre **sans le son** (texte à l'écran).
- Aucun traceur : lecteur vidéo hébergé sur le site (fichiers MP4 H.264 + WebM, poster), **pas de YouTube ni de Vimeo intégrés**.
- Couleurs, typographie et motif du site ; écrans réels du produit ; la commune fictive Saint-Aubin-sur-Loire.

### 4.8 Les animations

Principe : **une animation explique, elle ne décore pas**. Chacune montre en quelques secondes ce qu'un paragraphe mettrait dix lignes à dire. Décris dans les maquettes, pour chacune : le déclencheur, la durée, la courbe, et l'état final fixe.

Animations signatures (à dessiner en 3 ou 4 étapes chacune) :
1. **Le site se remplit tout seul** (accroche) : sur le téléphone de l'accroche, les champs du site vide se remplissent l'un après l'autre (nom de la commune, horaires, adresse, population) avec la mention « Données publiques » : c'est l'assistant de démarrage.
2. **Changer de thème** (Thèmes et accueil) : un sélecteur à quatre boutons que **l'utilisateur actionne** ; la même page change de mise en page par un fondu enchaîné. Rien ne tourne tout seul.
3. **L'alerte arrive** (accueil § Alertes) : le bandeau glisse en haut du téléphone quand la section entre à l'écran, une seule fois, avec un compteur « 0:42 ».
4. **La frise se trace** (Comment ça marche) : une ligne de courbe de niveau relie les étapes au fil du défilement ; chaque étape s'allume quand elle devient visible.
5. **Le prix s'affiche** (simulateur) : le montant change avec un court défilement des chiffres (chiffres tabulaires) quand on saisit la population.
6. **Mettre en ligne** : le bouton « Mettre en ligne » passe par ses étapes réelles (vérification → génération → publication → en ligne) avec une coche finale.

Micro-interactions : boutons (survol : fond plus sombre + légère flèche qui avance ; appui : léger enfoncement), cartes (survol : bordure sapin, pas de soulèvement exagéré), accordéons FAQ (ouverture en hauteur, chevron qui pivote), liens (soulignement qui s'épaissit).

Règles :
- Durées : 150 à 250 ms pour l'interface, 400 à 700 ms pour les apparitions, 5 s au plus pour une animation explicative, **jamais en boucle infinie** ; au-delà de 5 s, un bouton pause visible.
- Courbe de sortie douce (type `cubic-bezier(0.2, 0.8, 0.2, 1)`), aucun rebond ni effet élastique.
- Apparitions au défilement **discrètes** (fondu + 8 à 16 px de translation), une seule fois, jamais sur le texte principal ni sur le H1 (lisible tout de suite).
- **Pas** de parallaxe, pas de défilement détourné, pas de curseur personnalisé, pas de carrousel automatique, pas de clignotement.
- **`prefers-reduced-motion`** : toutes les animations sont remplacées par leur état final (ou un simple fondu) ; rien n'est perdu en information.
- Réalisables en **CSS et SVG** (et transitions de vue du navigateur) ; aucune bibliothèque lourde, le site reste léger.

### 4.9 Livrables de direction artistique

À fournir **avant** les maquettes des pages, pour validation :
1. **Planche logo** (§ 4.2) et favicon.
2. **Palette** avec rapports de contraste, clair et sombre (§ 4.3).
3. **Échelle typographique** (§ 4.4) sur une page d'exemple.
4. **Trois pistes d'accroche** de l'accueil (desktop et mobile), qui explorent le concept différemment ; je choisis, tu déclines.
5. **Style d'illustration** : deux illustrations de la liste § 4.6 finalisées, les autres en croquis.
6. **Storyboards** V1 à V5 et M1 (§ 4.7) et fiches des animations signatures (§ 4.8).

---

## 5. Contraintes non négociables (le site vitrine lui-même)

Le site de Communeo vend de l'accessibilité : il doit être exemplaire.
- **WCAG 2.2 AA / RGAA 4.1** : contraste ≥ 4,5:1 (3:1 pour les grands textes et les bordures de champs), focus clavier **visible et dessiné** dans les maquettes, cibles ≥ 44 × 44 px sur mobile, jamais d'information par la couleur seule.
- **Lien d'évitement** « Aller au contenu » visible au focus.
- Un seul **H1** par page, titres sans saut de niveau.
- Tient à **320 px** de large et avec le **texte agrandi à 200 %** : pas de hauteur fixe sur les blocs de texte, pas de texte dans les images.
- Pas de carrousel automatique, pas de vidéo en lecture automatique, animations respectant `prefers-reduced-motion` (règles détaillées § 4.8) ; vidéos sous-titrées et transcrites (§ 4.7).
- Liens soulignés dans le texte ; liens externes signalés « (nouvelle fenêtre) ».
- **Aucun traceur publicitaire ni outil de mesure d'audience intrusif** : pas de bandeau cookies nécessaire si rien n'est déposé. Ne dessine pas de bandeau cookies.
- Site statique, léger, rapide : pas d'effet lourd.

---

## 6. Ce que fait Communeo (faits vérifiés, à utiliser tels quels)

### 6.1 Le site public de la commune
- **4 thèmes**, de vraies mises en page différentes (pas une simple couleur) ; la commune en change quand elle veut, ses contenus suivent :
  - **Institutionnel** : sobre et très lisible, pour tous les publics.
  - **Moderne** : dynamique et typographique : photos en grand, agenda et actualités dès le premier écran.
  - **Journal** : le journal de la commune : navigation en barre latérale, une de journal, rubriques en colonnes.
  - **Bourg** : chaleureux et pratique : mairie, alertes, collectes et météo toujours à portée de main.
- La commune n'a rien à dessiner : elle fournit son **logo ou son blason**, son nom et ses contenus ; le thème fait le reste.
- **Page d'accueil à la carte** : la commune active les rubriques qu'elle veut parmi 15 : accroche, accès rapides, actualités à la une, agenda, mot du maire, chiffres clés, infos pratiques, météo, prochaines collectes, perturbations en cours, menu de la cantine, associations, partenaires, lettre d'information, contenu libre. Le thème décide de la disposition.
- **Rubriques** : pages (services, lieux, démarches locales), actualités par catégories, agenda (événements, lieu, inscription), documents officiels (délibérations, procès-verbaux, arrêtés, budgets, classés par type et par année), équipe municipale (élus et services), associations, contact, cantine, collecte des déchets, perturbations.
- **Alertes en bandeau** (coupure d'eau, route barrée, vigilance météo) : publiées depuis l'administration, **visibles sur le site en moins d'une minute**, avec un niveau de gravité et une date de fin.
- **Démarches administratives Service-Public.fr** intégrées au site : plus de 3 000 fiches officielles tenues à jour par l'État (carte d'identité, passeport, état civil, urbanisme, élections…), consultables et **recherchables** depuis le site de la commune ; quand une fiche indique « Où s'adresser : mairie », le lien mène à la page contact de la commune.
- **Recherche** sur tout le site (pages, actualités, documents et démarches).
- **Formulaire de contact** avec catégories (état civil, urbanisme, voirie…), les messages arrivent dans l'administration et on y répond depuis celle-ci ; demandes RGPD identifiées.
- **Lettre d'information** : les habitants s'inscrivent depuis le site ; la commune retrouve la liste des inscrits.
- **Associations** : elles proposent leur fiche depuis le site, la commune la publie ou la refuse.
- **Horaires d'ouverture** de la mairie avec l'indication « ouvert / fermé » en direct.
- **Réseaux sociaux** de la commune, **open data** (lien), **vidéos et cartes** chargées seulement après accord de l'habitant (pas de traceur par défaut).
- **Adresse** : le site est en ligne sur une adresse Communeo (`nom-de-la-commune.communeo.fr`) dès l'essai, puis sur **le domaine de la commune** (par exemple `mairie-saint-aubin.fr`) au passage à l'abonnement, avec certificat HTTPS.
- **Pages légales générées** : mentions légales, données personnelles, déclaration d'accessibilité, gestion des cookies, exercice des droits, plan du site. Elles se remplissent avec les informations de la commune.
- Sites très **rapides et légers** (pages statiques), lisibles sur mobile, qui fonctionnent même sur une connexion lente.

### 6.2 L'administration (l'outil de la mairie)
- S'utilise **dans un navigateur**, sur ordinateur, tablette ou téléphone. Rien à installer.
- **Assistant de démarrage** : à l'inscription, Communeo va chercher les **données publiques** de la commune (coordonnées et horaires de la mairie dans l'Annuaire de l'administration, population INSEE) et pré-remplit le site. Une liste de premiers pas guide la suite.
- **Éditeur de pages par blocs**, simple : texte, image, boutons, encadré, documents à télécharger, galerie, questions-réponses, contact, vidéo. Enregistrement automatique pendant la saisie.
- **Aperçu** du brouillon dans le thème avant publication ; **publication programmée** (date et heure) ; **historique des versions** d'une page (revenir à une version précédente).
- **Médiathèque** commune : images et documents réutilisables, texte alternatif demandé pour chaque image (accessibilité).
- **Mise en ligne automatique** quelques instants après les changements, ou immédiate d'un clic ; environ 30 secondes.
- **Rôles** : administrateur (tout) et rédacteur (contenus, vie pratique, messages, médiathèque). Plusieurs personnes peuvent travailler sur le site ; **journal d'activité** (qui a fait quoi, 6 mois).
- **Écran Conformité** : ce que la loi demande au site d'une commune, point par point (mentions légales, RGPD, accessibilité, publication des actes…), avec l'écran où le compléter.
- **Aide intégrée** à chaque écran et **documentation** complète en ligne, avec captures.
- **Mode sombre**, navigation complète au clavier, pensée pour les lecteurs d'écran.

### 6.3 Conformité et sécurité
- Construit pour les obligations d'un site de commune : **accessibilité (RGAA)**, **RGPD**, **mentions légales**, **pas de traceur publicitaire**.
- Les thèmes sont **testés automatiquement à chaque modification**, sur chaque page : contrastes, structure (titres, zones, liens explicites), focus clavier visible, affichage à 320 px et texte agrandi à 200 %. Des vérifications manuelles au lecteur d'écran complètent ces tests.
- **Sauvegardes chiffrées quotidiennes**, conservées 90 jours hors du serveur.
- Chaque commune ne voit que ses propres données (cloisonnement strict).
- Formulation honnête sur l'accessibilité : Communeo **aide** la commune à être conforme et **teste** ses thèmes ; la conformité finale dépend aussi des contenus publiés (textes alternatifs, PDF). Ne jamais écrire « 100 % conforme RGAA » ni « certifié ».

---

## 7. Parcours d'une commune (à raconter en « Comment ça marche »)

1. **Inscription en ligne** (2 minutes) : on cherche sa commune, on indique son nom et son e-mail. Pour vérifier que la demande vient bien de la mairie, la confirmation est envoyée à **l'adresse officielle de la mairie** connue de l'Annuaire de l'administration ; si elle n'y figure pas, l'équipe Communeo vérifie la demande.
2. **Essai gratuit de 30 jours**, toutes les fonctions comprises, sans carte bancaire ni engagement. Le site est pré-rempli ; on choisit son thème, on complète, on invite ses collègues.
3. **Le site en ligne dès l'essai** sur son adresse Communeo, avec un bandeau « Site en préparation » et sans apparaître dans Google tant que l'essai dure. Rappels par e-mail 7 jours et 1 jour avant la fin.
4. **Passer à l'abonnement** : le prix s'affiche selon la population INSEE ; le maire ou une personne ayant délégation **valide le devis en ligne** (devis et bon de commande en PDF, horodaté).
5. **Mise en ligne définitive** après validation par l'équipe Communeo : le bandeau disparaît, le site est visible dans les moteurs de recherche, et peut passer sur le **domaine de la commune**.
6. **Facturation** : la facture est transmise par **Chorus Pro**, payable par **virement** sous 30 jours ; l'abonnement est **annuel**, reconduit tacitement, résiliable à l'échéance avec un mois de préavis.
7. Sans passage à l'abonnement, à la fin de l'essai, le site est retiré et l'administration passe en lecture seule ; les données sont conservées 6 mois, le temps de changer d'avis, puis supprimées.

Lien de chaque bouton d'inscription : **https://app.communeo.fr/inscription**. Lien « Se connecter » : **https://app.communeo.fr/connexion**.

---

## 8. Tarifs (grille actuelle)

Abonnement **annuel**, **hors taxes**, **sans frais de mise en service**, selon la **population municipale INSEE** :

| Population | Prix HT par an | Soit par mois |
|---|---|---|
| Moins de 500 habitants | **290 €** | 24 € |
| De 500 à 1 999 habitants | **390 €** | 33 € |
| De 2 000 à 4 999 habitants | **590 €** | 49 € |
| De 5 000 à 9 999 habitants | **890 €** | 74 € |
| 10 000 habitants et plus | **1 290 €** | 108 € |

Compris dans l'abonnement (liste exacte du devis) :
- Site internet de la commune, sur son adresse Communeo et sur le domaine de la commune, avec certificat HTTPS.
- Tous les thèmes, modules et mises à jour, sans frais de mise en service.
- Conformité : mentions légales, RGPD, déclaration d'accessibilité, démarches Service-Public.
- Assistance par e-mail.

Mentions à afficher près de la grille :
- « TVA non applicable, art. 293 B du CGI » : le prix HT est le prix payé.
- 30 jours d'essai gratuit, sans engagement.
- Devis validé en ligne, facture sur Chorus Pro, paiement par virement (mandat administratif) sous 30 jours.
- Marché de faible montant : dispensé de publicité et de mise en concurrence (art. R. 2122-8 du Code de la commande publique).
- Le nom de domaine de la commune (par exemple `mairie-saint-aubin.fr`) reste à la charge de la commune s'il n'en a pas déjà un.

Propose un **simulateur simple** : « Combien d'habitants dans votre commune ? » → le prix s'affiche (ou un tableau lisible sur mobile : cartes empilées plutôt que tableau large).

---

## 9. Ce qu'il ne faut PAS écrire (faux ou non garanti aujourd'hui)

- « Hébergé en France » ou « souverain » : l'administration est hébergée en France, mais **les sites publics sont servis par un prestataire international**. N'en parle pas.
- « Certifié RGAA », « 100 % accessible », « conforme à 100 % ».
- Un nombre de communes clientes, des témoignages, des logos de collectivités, des labels, des partenariats (AMF, AMRF…).
- « Assistance par téléphone », « formation sur place », « chat en direct », « application mobile » : seule l'**assistance par e-mail** et la **documentation en ligne** existent.
- « Intelligence artificielle », « personnalisation des couleurs par la commune » (les palettes sont celles des thèmes), « multilingue », « paiement en ligne des services communaux », « réservation de salle en ligne », « prise de rendez-vous », « portail famille ».
- Des comparaisons nommées avec des concurrents.

---

## 10. Arborescence proposée

1. **Accueil** (`/`)
2. **Fonctionnalités** (`/fonctionnalites`) : le site public, l'administration, la conformité.
3. **Thèmes** (`/themes`) : les quatre thèmes, chacun avec sa vignette, sa description et « pour quelle commune ».
4. **Tarifs** (`/tarifs`) : la grille, ce qui est compris, la facturation, la FAQ tarifaire.
5. **Comment ça marche** (`/comment-ca-marche`) : les 7 étapes du parcours.
6. **Questions fréquentes** (`/questions`)
7. **Contact** (`/contact`)
8. **À propos** (`/a-propos`) : qui fait Communeo et pourquoi. [contenu à fournir : parcours de Philippe Chevreul, motivation]
9. Pages légales (pied de page) : **Mentions légales**, **Conditions générales** (CGV/CGU, texte fourni séparément), **Données personnelles**, **Accessibilité** (déclaration d'accessibilité de Communeo, déjà rédigée dans la documentation), **Plan du site**.
10. Liens externes : **Documentation** (aide en ligne), **Se connecter**, **Créer le site de ma commune**.

En-tête : logo, navigation (Fonctionnalités, Thèmes, Tarifs, Comment ça marche, Questions), « Se connecter » (lien discret), bouton principal « Essayer gratuitement ». Sur mobile : menu accessible (bouton « Menu » avec libellé, pas seulement une icône).

Pied de page : présentation courte, liens des pages, contact, liens légaux, mention « Communeo – Philippe Chevreul, entrepreneur individuel ».

---

## 11. Contenu détaillé par page

### 11.1 Accueil
Sections, dans cet ordre (propose mieux si tu as une bonne raison) :
1. **Accroche** (H1) : promesse claire + sous-titre + deux boutons « Essayer gratuitement 30 jours » et « Voir les tarifs ». Visuel : le site d'une commune fictive sur téléphone et ordinateur (thème Institutionnel ou Moderne). Ligne de réassurance sous les boutons : « Sans engagement · Sans carte bancaire · Sans frais de mise en service ».
2. **Le constat** : trois situations que vit une petite mairie (vieux site impossible à mettre à jour ; site fait par un bénévole parti ; obligations légales floues) → Communeo répond à chacune.
3. **Trois promesses** : Simple (on le fait soi-même, sans formation) ; Prêt tout de suite (pré-rempli avec les données publiques, en ligne dès le premier jour) ; Conforme (accessibilité, RGPD, mentions légales, démarches Service-Public).
4. **Le site de votre commune** : ce que trouvent les habitants (horaires, actualités, agenda, démarches, alertes, cantine, collectes, documents du conseil). Visuel du site sur mobile.
5. **Quatre thèmes** : aperçu des vignettes, lien vers la page Thèmes.
6. **L'administration** : « aussi simple qu'un traitement de texte » ; éditeur par blocs, aperçu, publication programmée, alertes en direct, mise en ligne en un clic. Visuel de l'administration.
7. **Les démarches Service-Public intégrées** : 3 000 fiches officielles, à jour, recherchables depuis le site de la commune.
8. **Alertes en direct** : un exemple concret (« Coupure d'eau mardi de 9 h à 12 h ») visible en moins d'une minute.
9. **Conformité** : l'écran Conformité, les pages légales générées, les thèmes testés en continu (formulation honnête, § 6.3).
10. **Tarifs** : résumé de la grille + « Voir le détail ».
11. **Comment ça marche** : les étapes en 4 temps (Inscription → Essai 30 jours → Devis en ligne → En ligne sur votre domaine).
12. **FAQ courte** (5 questions) + lien vers la FAQ complète.
13. **Appel final** : « Votre commune mérite un site à jour. » + bouton.

### 11.2 Fonctionnalités
Trois grandes parties (le site public, l'administration, conformité et sécurité), reprenant les faits du § 6, organisées par besoin de la mairie plutôt que par liste technique (« Informer vos habitants », « Publier sans stress », « Répondre aux habitants », « Être dans les règles », « Travailler à plusieurs »). Chaque fonction : un titre, une phrase, un exemple concret. Visuels d'écrans.

### 11.3 Thèmes
Pour chaque thème : grande vignette (mobile et ordinateur), nom, description (§ 6.1), « idéal pour… » (ex. Institutionnel : communes qui veulent la lisibilité avant tout ; Moderne : communes qui publient beaucoup de photos et d'événements ; Journal : communes à l'actualité riche ; Bourg : villages qui veulent le pratique au premier plan), points forts. Rappeler : même contenu, changement de thème à tout moment, logo ou blason de la commune, palettes pensées pour le contraste.

### 11.4 Tarifs
Grille (§ 8), simulateur par population, « Ce qui est compris », « Comment se passe la facturation » (devis en ligne, Chorus Pro, virement, reconduction annuelle, résiliation), mentions (TVA, marché de faible montant), FAQ tarifaire : Y a-t-il des frais de mise en service ? Que se passe-t-il après l'essai ? Puis-je résilier ? Comment est calculée la population ? Pouvons-nous payer par virement / mandat administratif ? Le nom de domaine est-il compris ? Faut-il une mise en concurrence ?

### 11.5 Comment ça marche
Les 7 étapes du § 7, en frise verticale sur mobile, horizontale sur ordinateur, chacune avec « ce que vous faites » et « ce que fait Communeo ». Durées indicatives réalistes (inscription 2 minutes, mise en ligne en une journée).

### 11.6 Questions fréquentes
Rédige 20 à 25 questions-réponses, groupées (Démarrer ; Le site ; L'administration ; Conformité ; Tarifs et facturation ; Données et sécurité). Réponses courtes, exactes, fondées sur ce brief. Exemples de questions :
- Faut-il des compétences en informatique ?
- Combien de temps pour avoir un site en ligne ?
- Pouvons-nous garder notre nom de domaine actuel ?
- Que deviennent nos contenus si nous arrêtons ?
- Le site est-il accessible aux personnes handicapées ?
- Qui peut modifier le site ? Combien d'utilisateurs ?
- Le site apparaît-il dans Google ?
- Comment les habitants sont-ils prévenus d'une coupure d'eau ?
- Les démarches Service-Public sont-elles à jour ?
- Le site dépose-t-il des cookies ?
- Comment se passe la facturation pour une commune ?
- Pouvons-nous changer de thème ?
- Que se passe-t-il à la fin de l'essai ?
- Comment obtenir de l'aide ?
(Une réponse inconnue ou non garantie : ne pas l'inventer, la marquer [à confirmer].)

### 11.7 Contact
Formulaire : nom, fonction, commune, e-mail, message, case de consentement RGPD claire ; adresse **contact@communeo.fr** ; délai de réponse sous 72 heures. Pas de téléphone.


### 11.9 Mentions légales (données connues)
- Éditeur : **Philippe Chevreul, entrepreneur individuel (EI)**, exerçant sous le nom commercial Communeo ; SIREN **911 592 764** ; adresse [à compléter] ; e-mail contact@communeo.fr ; directeur de la publication : Philippe Chevreul.
- Hébergeur du site vitrine : [à compléter selon l'hébergement retenu].
- Propose la mise en page ; les textes juridiques définitifs (CGV/CGU, contrat de sous-traitance RGPD) sont fournis séparément.

---

## 12. SEO et partage
- Pour chaque page : **title** (≤ 60 caractères, « … · Communeo ») et **meta description** (≤ 155 caractères).
- Mots-clés naturels : « site internet mairie », « site commune », « site internet petite commune », « site mairie accessible RGAA », « site internet commune prix ».
- Image de partage (Open Graph) 1200 × 630 : modèle décliné par page (§ 4.6).
- Balisage de la FAQ (questions et réponses) et de l'organisation.

---

## 13. Format de ta réponse
1. Direction artistique (§ 4.9), à valider avant le reste.
2. Arborescence commentée.
3. Pour chaque page : textes complets (dans l'ordre d'affichage, avec les niveaux de titre H1/H2/H3), title, meta description, textes alternatifs des images.
4. Maquettes mobile puis ordinateur de chaque page, avec les emplacements vidéo, illustration et photo étiquetés.
5. Composants et leurs états, palette (avec rapports de contraste), échelle typographique, espacements, jetons de mouvement (durées, courbes).
6. Storyboards des vidéos V1 à V5 et du logo animé M1, fiches des animations signatures.
7. Liste de tout ce que tu as marqué **[à confirmer]**, **[à fournir]**, **[Photo à fournir]** ou **[Vidéo à produire]**, pour que je le complète.
