# Guide des obligations d'un site internet de mairie en France

> Référentiel complet des exigences légales, techniques et fonctionnelles — Février 2026

---

## Table des matières

1. [Introduction](#introduction)
2. [Mentions légales obligatoires](#1-mentions-légales-obligatoires)
3. [Protection des données personnelles (RGPD)](#2-protection-des-données-personnelles-rgpd)
4. [Accessibilité numérique (RGAA)](#3-accessibilité-numérique-rgaa)
5. [Saisine par voie électronique (SVE)](#4-saisine-par-voie-électronique-sve)
6. [Publications obligatoires sur le site](#5-publications-obligatoires-sur-le-site)
7. [Open data et transparence](#6-open-data-et-transparence)
8. [Sécurité et conformité technique](#7-sécurité-et-conformité-technique)
9. [Écoconception numérique (RGESN)](#8-écoconception-numérique-rgesn)
10. [Contenus fonctionnels attendus](#9-contenus-fonctionnels-attendus)
11. [Communication en période préélectorale](#10-communication-en-période-préélectorale)
12. [Tableau récapitulatif des obligations](#11-tableau-récapitulatif-des-obligations)
13. [Checklist de mise en conformité](#12-checklist-de-mise-en-conformité)

---

## Introduction

La présence en ligne d'une commune n'est pas obligatoire en soi : aucun texte n'impose à une mairie de disposer d'un site internet. En revanche, dès lors qu'une commune choisit de se doter d'un site web, elle est soumise à un ensemble conséquent d'obligations légales, réglementaires et techniques qui ne cessent de s'étoffer.

Ce document constitue un référentiel exhaustif de l'ensemble des obligations, requirements et bonnes pratiques applicables aux sites internet des mairies en France. Il couvre les dimensions juridiques (mentions légales, RGPD, LCEN), techniques (accessibilité RGAA, sécurité, écoconception) et fonctionnelles (publications obligatoires, saisine électronique, open data).

**Textes de référence principaux :**

- Loi pour la confiance dans l'économie numérique (LCEN, 2004)
- Règlement général sur la protection des données (RGPD, 2018)
- Référentiel général d'amélioration de l'accessibilité (RGAA v4)
- Loi pour une République numérique (2016)
- Code général des collectivités territoriales (CGCT)
- Ordonnance n° 2021-1310 du 7 octobre 2021
- Loi ELAN du 23 novembre 2018
- Loi REEN du 15 novembre 2021

---

## 1. Mentions légales obligatoires

La loi pour la confiance dans l'économie numérique (LCEN) du 21 juin 2004 impose à tout éditeur de site internet, y compris les collectivités territoriales, de publier une page de mentions légales accessible depuis toutes les pages du site (généralement via un lien en pied de page). Le non-respect de cette obligation est passible d'une amende pouvant aller jusqu'à **375 000 €** pour une personne morale.

### 1.1 Contenu obligatoire des mentions légales

Les mentions légales d'un site de mairie doivent comporter au minimum :

- **Identité de l'éditeur** : nom de la commune, adresse du siège (hôtel de ville), numéro de téléphone, adresse e-mail de contact
- **Directeur de la publication** : nom du maire ou de la personne responsable
- **Hébergeur du site** : raison sociale, adresse, numéro de téléphone de l'hébergeur
- **Numéro SIRET** de la commune
- **Conditions d'utilisation** du site et propriété intellectuelle des contenus
- **Informations relatives à la collecte de données personnelles** (renvoi vers la politique de confidentialité)
- **Crédits photos et droits d'auteur** le cas échéant

### 1.2 Politique de cookies

La directive européenne « paquet télécom », transposée en droit français, impose :

- D'informer les visiteurs de l'utilisation de cookies
- De recueillir leur consentement préalable avant tout dépôt de cookies non essentiels
- De proposer un bandeau ou une modale permettant d'accepter ou de refuser les cookies, avec une granularité suffisante
- Les cookies strictement nécessaires au fonctionnement du site sont exemptés de consentement

---

## 2. Protection des données personnelles (RGPD)

Depuis le 25 mai 2018, le Règlement général sur la protection des données (RGPD) s'applique à l'ensemble des organismes publics, y compris les collectivités territoriales. Les mairies traitent un volume important de données personnelles (état civil, listes électorales, cadastre, inscriptions scolaires, etc.) et leur site internet constitue un canal de collecte supplémentaire.

### 2.1 Désignation d'un Délégué à la protection des données (DPO)

- Toute collectivité territoriale est tenue de désigner un DPO (article 37 du RGPD)
- La CNIL a mis en demeure des communes n'ayant pas encore procédé à cette désignation
- Le DPO peut être mutualisé entre plusieurs communes (via un centre de gestion, un EPCI ou un service commun)
- Les conseillers municipaux, dont le maire, **ne peuvent pas** être désignés DPO en raison de leur rôle décisionnel

### 2.2 Obligations sur le site internet

- Publication d'une **politique de confidentialité** détaillant les traitements de données effectués via le site
- Information claire sur les **finalités de collecte**, les durées de conservation, les destinataires et les droits des personnes
- Mise en place d'un **formulaire ou d'un moyen de contact** pour l'exercice des droits (accès, rectification, effacement, opposition, portabilité)
- Recueil du **consentement explicite** avant toute collecte de données non nécessaire à une mission de service public
- **Bandeau de gestion des cookies** conforme aux recommandations de la CNIL
- Sécurisation du site avec un **certificat HTTPS/TLS** obligatoire

### 2.3 Registre des traitements

La commune doit tenir un registre des traitements de données personnelles (article 30 du RGPD). Ce registre documente chaque traitement : finalité, base légale, catégories de données, durées de conservation, mesures de sécurité.

Pour les collectivités, la base légale principale est généralement l'**obligation légale** ou l'**intérêt public**, plutôt que le consentement.

---

## 3. Accessibilité numérique (RGAA)

L'accessibilité numérique est une obligation légale issue de la loi du 11 février 2005 pour l'égalité des droits et des chances, renforcée par la directive européenne de 2016 et l'ordonnance du 6 septembre 2023. Tous les sites internet des collectivités territoriales, **sans distinction de taille**, doivent être conformes au Référentiel général d'amélioration de l'accessibilité (RGAA) dans sa version 4.

### 3.1 Les 106 critères du RGAA v4

Le RGAA v4 définit 106 critères de contrôle organisés en 13 thématiques :

| Thématique | Exemples de critères |
|---|---|
| Images | Alternatives textuelles pour toutes les images porteuses d'information |
| Cadres (iframes) | Titres pertinents pour chaque cadre |
| Couleurs | Contrastes suffisants, information non véhiculée uniquement par la couleur |
| Multimédia | Sous-titres, audiodescription, transcription textuelle |
| Tableaux | Structuration correcte des en-têtes et cellules |
| Liens | Intitulés explicites et balises titre renseignées |
| Scripts | Compatibilité avec les technologies d'assistance |
| Structure | Hiérarchie des titres (h1 unique, h2, h3…), sémantique HTML correcte |
| Formulaires | Étiquettes associées, messages d'erreur explicites |
| Navigation | Navigation au clavier possible, ordre de tabulation logique |

### 3.2 Obligations d'affichage

- **Déclaration d'accessibilité** : document publié sur le site indiquant le niveau de conformité (conforme, partiellement conforme, non conforme), les résultats de l'audit et les dérogations éventuelles
- **Mention obligatoire** : sur chaque page du site, un libellé de type « Accessibilité : [niveau de conformité] » doit être affiché, généralement dans le pied de page
- **Schéma pluriannuel de mise en accessibilité** : document stratégique décrivant les actions prévues sur une période maximale de 3 ans
- **Plan d'actions annuel** détaillé pour l'année en cours

### 3.3 Contrôles et sanctions

Depuis janvier 2024, l'**Arcom** (Autorité de régulation de la communication audiovisuelle et numérique) est chargée de contrôler l'accessibilité des sites publics. Les sanctions peuvent atteindre **50 000 €** par manquement constaté. L'Arcom utilise des méthodes de collecte automatisée pour identifier les sites non conformes et émet des injonctions préalables aux sanctions.

---

## 4. Saisine par voie électronique (SVE)

Depuis le 7 novembre 2016 (ordonnance n° 2014-1330), tout citoyen dispose du droit de saisir l'administration par voie électronique, avec la même valeur juridique qu'un courrier papier. Cette obligation s'applique aux communes.

### 4.1 Principes généraux

- La commune doit proposer un **téléservice** ou, à défaut, une **adresse électronique dédiée** pour recevoir les demandes des usagers
- L'administration doit **informer le public** des téléservices mis en place. À défaut, le public peut saisir l'administration par tout type d'envoi électronique
- Un **accusé de réception électronique (ARE)** doit être envoyé dans un délai maximum de 10 jours ouvrés
- L'ARE doit mentionner : la date de réception, le service chargé du dossier, son adresse et son numéro de téléphone
- En application du principe « silence vaut accord » (SVA), l'ARE doit indiquer si la demande est susceptible de donner lieu à une décision implicite d'acceptation ou de rejet

### 4.2 SVE et autorisations d'urbanisme

Depuis le **1er janvier 2022** (loi ELAN du 23 novembre 2018) :

- Toutes les communes doivent être en capacité de recevoir les demandes d'autorisation d'urbanisme (permis de construire, déclarations préalables, etc.) sous forme dématérialisée
- Les communes de plus de **3 500 habitants** doivent disposer d'une téléprocédure dédiée
- Les usagers conservent la possibilité de déposer leurs dossiers au format papier

---

## 5. Publications obligatoires sur le site

Dès lors qu'une commune dispose d'un site internet, certaines publications y sont rendues obligatoires par le Code général des collectivités territoriales (CGCT) et divers textes réglementaires.

### 5.1 Procès-verbaux des conseils municipaux

Conformément à l'article **L. 2121-15 du CGCT** (modifié par l'ordonnance n° 2021-1310 du 7 octobre 2021) :

- Le procès-verbal de chaque séance du conseil municipal doit être publié sous forme électronique, **de manière permanente et gratuite**, sur le site internet de la commune lorsqu'il existe
- Cette publication doit intervenir **dans la semaine** suivant la séance au cours de laquelle le PV a été arrêté
- Les documents doivent être publiés **dans leur intégralité**, sous un **format non modifiable** (PDF), dans des conditions permettant leur téléchargement et garantissant leur intégrité

**Contenu du PV :** date et heure de la séance, noms du président, des membres présents ou représentés, du ou des secrétaires de séance, quorum, ordre du jour, délibérations adoptées, résultat des scrutins, teneur des discussions.

### 5.2 Liste des délibérations

L'article **L. 2121-25 du CGCT** prévoit que la liste des délibérations examinées par le conseil municipal doit être :

- Affichée en mairie
- Mise en ligne sur le site internet de la commune
- Dans un **délai d'une semaine** à compter de l'examen

### 5.3 Documents d'urbanisme

Depuis le **1er janvier 2016**, les communes doivent rendre disponibles sur leur site internet leurs documents d'urbanisme opposables :

- Schéma de cohérence territoriale (SCoT)
- Plan local d'urbanisme (PLU)
- Carte communale
- Autres documents opposables

Ces documents doivent également être publiés au standard CNIG sur le **Géoportail de l'urbanisme**.

### 5.4 Informations budgétaires et financières

Les communes de plus de **3 500 habitants** doivent publier :

- Budgets primitifs
- Comptes administratifs
- Rapports d'orientations budgétaires

Pour les communes plus petites, cette publication est recommandée sans être strictement obligatoire.

### 5.5 Actes réglementaires

- Les communes de **3 500 habitants et plus** doivent publier leurs actes réglementaires (arrêtés, délibérations) sous forme électronique sur le site de la commune
- Pour les communes plus petites, l'option entre publication papier et électronique doit faire l'objet d'une **délibération du conseil municipal**
- La publication électronique doit se faire sous **format non modifiable**, dans des conditions permettant le **téléchargement** et dans l'intégralité du document

---

## 6. Open data et transparence

La loi pour une République numérique du 7 octobre 2016 a instauré un principe d'ouverture par défaut des données publiques.

### 6.1 Communes concernées

L'obligation de publication des données en open data s'applique aux collectivités remplissant **les deux conditions cumulatives** :

- Plus de **3 500 habitants**
- Plus de **50 agents** en équivalents temps plein

Les communes plus petites sont encouragées à publier leurs données mais n'y sont pas contraintes.

### 6.2 Données à publier

- Les **documents administratifs** communiqués au public (délibérations, arrêtés, etc.)
- Les **bases de données** produites ou reçues dans le cadre de la mission de service public
- Les données relatives aux **subventions attribuées**
- Les **données essentielles des marchés publics**

### 6.3 Règles de publication

- Les données doivent être publiées dans un **format ouvert**, aisément réutilisable et exploitable par un système de traitement automatisé
- Avant publication en ligne, les données à caractère personnel doivent être **anonymisées** conformément à l'article L. 312-1-2 du Code des relations entre le public et l'administration (CRPA)
- Exception : les noms des élus dans les PV de conseil municipal n'ont pas à être occultés lorsqu'ils agissent en cette qualité (avis CADA n° 20191602)

---

## 7. Sécurité et conformité technique

### 7.1 Protocole HTTPS (certificat TLS)

Le site internet de la mairie doit **obligatoirement** utiliser le protocole HTTPS (certificat TLS/SSL) pour sécuriser les échanges de données entre le navigateur de l'usager et le serveur. Cette obligation est renforcée par le RGPD qui impose des mesures de sécurité techniques et organisationnelles adaptées.

### 7.2 Référentiel général de sécurité (RGS)

Le Référentiel général de sécurité (RGS) s'applique aux systèmes d'information des administrations publiques. Il impose des exigences en matière de :

- **Confidentialité** des données
- **Intégrité** des échanges
- **Disponibilité** des services

La commune doit s'assurer que son hébergeur et ses prestataires respectent les exigences du RGS.

### 7.3 Hébergement des données

- Pour les données sensibles (données de santé, données personnelles), l'hébergement doit être réalisé sur le **territoire de l'Union européenne** ou dans un pays offrant un niveau de protection adéquat
- La doctrine « cloud au centre » de l'État recommande l'usage de solutions cloud qualifiées **SecNumCloud**
- L'hébergeur doit être clairement identifié dans les mentions légales

---

## 8. Écoconception numérique (RGESN)

Le Référentiel général d'écoconception de services numériques (RGESN) est un guide publié par l'État pour réduire l'impact environnemental des services numériques publics. Bien que les collectivités n'y soient pas encore juridiquement contraintes de manière coercitive, la **loi REEN** (Réduction de l'empreinte environnementale du numérique, 2021) encourage les collectivités à s'inscrire dans cette démarche.

**Bonnes pratiques à mettre en œuvre :**

- Optimisation du poids des pages
- Compression des images
- Limitation des requêtes serveur
- Choix d'un hébergement éco-responsable
- Conception sobre des interfaces
- Limitation de l'usage de scripts tiers (traqueurs, widgets superflus)
- Optimisation du cache navigateur

---

## 9. Contenus fonctionnels attendus

Au-delà des obligations strictement légales, certains contenus sont considérés comme indispensables sur un site de mairie pour répondre aux attentes des administrés et aux usages courants.

### 9.1 Informations pratiques

- Coordonnées complètes de la mairie (adresse, téléphone, horaires d'ouverture)
- Présentation du conseil municipal et de l'équipe municipale
- Formulaire de contact sécurisé conforme à la SVE
- Plan d'accès et localisation géographique

### 9.2 Vie municipale

- Agenda des événements et manifestations
- Bulletin municipal numérique ou lien de téléchargement
- Comptes rendus et procès-verbaux des conseils municipaux
- Annuaire des associations locales

### 9.3 Démarches en ligne

- Liens vers les téléservices nationaux (Service-Public.fr, ANTS, etc.)
- Inscriptions en ligne (cantine, périscolaire, activités municipales)
- Signalement de problèmes de voirie ou d'entretien
- Réservation de salles municipales

### 9.4 Urbanisme

- PLU et documents d'urbanisme en téléchargement
- Lien vers le Géoportail de l'urbanisme
- Téléservice pour les demandes d'autorisation d'urbanisme

---

## 10. Communication en période préélectorale

L'article **L. 52-1 du Code électoral** impose des restrictions sur la communication des collectivités dans les six mois précédant une élection. Le site internet de la commune est concerné par ces dispositions.

### 10.1 Règles à respecter

- **Interdiction** de toute campagne de promotion des réalisations ou de la gestion de la collectivité à partir des six mois précédant le scrutin
- Le site doit conserver sa **régularité** (même périodicité de mises à jour) et sa **neutralité**
- Le contenu ne doit pas mettre en valeur les exécutifs locaux candidats
- La publication des PV de conseils municipaux **reste obligatoire** et ne contrevient pas à ces dispositions si elle constitue la pratique habituelle
- Une refonte du site est possible en période préélectorale, mais le contenu doit rester neutre
- Le juge de l'élection vérifiera l'**antériorité**, la **régularité**, l'**identité** et la **neutralité** du site

---

## 11. Tableau récapitulatif des obligations

| Obligation | Texte de référence | Communes concernées | Sanction |
|---|---|---|---|
| Mentions légales | LCEN (21 juin 2004) | Toutes | Jusqu'à 375 000 € |
| Politique de cookies | Directive ePrivacy / CNIL | Toutes | Sanctions CNIL |
| Conformité RGPD | RGPD (25 mai 2018) | Toutes | Sanctions CNIL |
| Désignation DPO | Art. 37 RGPD | Toutes | Mise en demeure CNIL |
| Accessibilité RGAA | Loi 2005 / Ordonnance 2023 | Toutes | Jusqu'à 50 000 € |
| Déclaration d'accessibilité | RGAA v4 | Toutes | Jusqu'à 50 000 € |
| Saisine électronique (SVE) | Ordonnance 2014-1330 | Toutes | Silence vaut accord |
| SVE urbanisme | Loi ELAN (2018) | Toutes | Risque juridique |
| Publication PV | Art. L. 2121-15 CGCT | Avec site internet | Obligation légale |
| Liste délibérations | Art. L. 2121-25 CGCT | Avec site internet | Obligation légale |
| Documents urbanisme | Loi ALUR (2014) | Toutes | Inopposabilité |
| Open data | Loi République numérique (2016) | > 3 500 hab. et 50 ETP | Néant |
| Publication budgétaire | CGCT | > 3 500 hab. | Néant |
| Actes réglementaires | Ordonnance 2021-1310 | ≥ 3 500 hab. | Néant |
| HTTPS / TLS | RGPD / RGS | Toutes | Sanctions CNIL/ANSSI |
| Écoconception (RGESN) | Loi REEN (2021) | Recommandé | Néant |
| Communication préélectorale | Art. L. 52-1 Code électoral | Toutes | Annulation élection |

---

## 12. Checklist de mise en conformité

Cette checklist permet de vérifier rapidement la conformité d'un site de mairie :

### Mentions légales & RGPD

- [ ] Page de mentions légales complète et accessible depuis le pied de page
- [ ] Bandeau de gestion des cookies conforme (accepter / refuser / paramétrer)
- [ ] Politique de confidentialité RGPD publiée
- [ ] DPO désigné et coordonnées indiquées sur le site
- [ ] Formulaire d'exercice des droits RGPD disponible
- [ ] Certificat HTTPS valide sur l'ensemble du site

### Accessibilité

- [ ] Déclaration d'accessibilité publiée
- [ ] Mention « Accessibilité : [niveau] » en pied de page
- [ ] Schéma pluriannuel d'accessibilité publié
- [ ] Plan d'actions annuel publié
- [ ] Audit d'accessibilité RGAA réalisé

### Saisine électronique

- [ ] Formulaire de contact ou téléservice SVE opérationnel
- [ ] Accusé de réception automatique configuré
- [ ] Téléservice pour les demandes d'autorisation d'urbanisme

### Publications obligatoires

- [ ] Procès-verbaux du conseil municipal en ligne (format non modifiable)
- [ ] Liste des délibérations mise en ligne chaque semaine
- [ ] Documents d'urbanisme disponibles en téléchargement
- [ ] Données ouvertes publiées (si commune > 3 500 hab. et 50 ETP)
- [ ] Informations budgétaires publiées (si commune > 3 500 hab.)

### Divers

- [ ] Conformité période préélectorale vérifiée si élection à venir
- [ ] Hébergement conforme (UE, RGS)
- [ ] Démarche d'écoconception engagée (RGESN)

---

*Document de référence — Février 2026*
