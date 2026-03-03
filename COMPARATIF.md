# Comparatif CMS Mairies vs 123mairie.fr

Analyse concurrentielle entre **cms-mairies** et **123mairie.fr** (leader du marché des sites de mairies clé en main).
Objectif : identifier les fonctionnalités manquantes pour atteindre la parité fonctionnelle.

---

## 1. Gestion de contenu

| Fonctionnalité | cms-mairies | 123mairie | Notes |
|---|:---:|:---:|---|
| Pages CMS hiérarchiques | ✅ | ✅ | Parité |
| Articles / Actualités | ✅ | ✅ | Parité |
| Événements / Agenda | ✅ | ✅ | Parité |
| Éditeur richtext avancé (TipTap) | ✅ | ✅ | **cms-mairies supérieur** (colonnes, tableaux, slash commands) |
| Statut draft / published / archived | ✅ | ✅ | Parité |
| Publication programmée | ✅ | ✅ | Parité |
| Compteur de vues articles | ✅ | ❓ | cms-mairies a cette feature |
| Blocs de contenu réutilisables | ✅ | ❓ | ContentBlock dans cms-mairies |

## 2. Modules municipaux

| Fonctionnalité | cms-mairies | 123mairie | Notes |
|---|:---:|:---:|---|
| Équipe municipale | ✅ | ✅ | Parité |
| Associations (annuaire + soumission publique) | ✅ | ✅ | Parité |
| Documents officiels (PV, délibérations, PLU…) | ✅ | ✅ | Parité |
| Alertes / bannière urgence | ✅ | ✅ | Parité |
| Démarches CNI / Passeport (RDV) | ✅ | ✅ | Parité |
| Formulaire de contact SVE | ✅ | ✅ | Parité |
| **Annuaire communal / services** | ❌ | ✅ | Annuaire des services publics, écoles, commerces avec fiches et carte |
| **Signalement citoyen** | ❌ | ✅ | Formulaire de signalement d'anomalie (voirie, propreté, éclairage…) avec géolocalisation et photo |
| **Formulaire nouvel arrivant** | ❌ | ✅ | Kit de bienvenue numérique pour nouveaux habitants |
| **Offres d'emploi (API France Travail)** | ❌ | ✅ | Intégration API France Travail pour afficher les offres locales |
| **Menu scolaire / cantine** | ❌ | ✅ | Affichage des menus de la cantine scolaire |
| **Portail citoyen / Compte famille** | ❌ | ✅ | Espace connecté pour les citoyens (Berger-Levrault ou autre) |

## 3. Communication & Engagement

| Fonctionnalité | cms-mairies | 123mairie | Notes |
|---|:---:|:---:|---|
| RSS Feed | ✅ | ✅ | Parité |
| **Newsletter** | ❌ | ✅ | Création et envoi de newsletters, gestion abonnés, widget d'inscription |
| **Alertes SMS** | ❌ | ✅ | Envoi d'alertes SMS aux habitants inscrits |
| **Bulletin municipal flipbook** | ❌ | ✅ | Conversion PDF en flipbook interactif (alternative à ISSUU) |
| **Application mobile** | ❌ | ✅ | App générique publiable iOS/Android avec push notifications |

## 4. Paiement & E-services

| Fonctionnalité | cms-mairies | 123mairie | Notes |
|---|:---:|:---:|---|
| **TIPI / PayFip (paiement en ligne)** | ❌ | ✅ | Paiement de factures de services publics (cantine, garderie…) |
| **Recueil des actes administratifs** | 🔶 | ✅ | cms-mairies a OfficialDocument mais pas de module "recueil" dématérialisé formalisé |
| **Billetterie en ligne** | ❌ | ✅ | Intégration billetterie (ex: Festik) pour événements |

## 5. Thèmes & Personnalisation

| Fonctionnalité | cms-mairies | 123mairie | Notes |
|---|:---:|:---:|---|
| Couleurs personnalisables | ✅ | ✅ | Parité |
| Logo & favicon | ✅ | ✅ | Parité |
| Navigation configurable (drag & drop) | ✅ | ✅ | Parité |
| Homepage configurable (sections toggle) | ✅ | ✅ | Parité |
| **Catalogue de thèmes (15+)** | ❌ | ✅ | 123mairie propose 15+ templates, cms-mairies n'a qu'un seul design |
| **Boutons accessibilité (taille texte)** | ❌ | ✅ | Augmenter/réduire la taille du texte côté public |

## 6. SEO & Technique

| Fonctionnalité | cms-mairies | 123mairie | Notes |
|---|:---:|:---:|---|
| Meta tags OG / Twitter | ✅ | ✅ | Parité |
| JSON-LD structured data | ✅ | 🔶 | **cms-mairies supérieur** (GovernmentOrganization, FAQPage, etc.) |
| Sitemap auto | ✅ | ✅ | Parité |
| Robots.txt | ✅ | ✅ | Parité |
| Recherche full-text (Pagefind) | ✅ | ✅ | Parité |
| PWA / Web App Manifest | ✅ | ❌ | **cms-mairies supérieur** |

## 7. Conformité légale

| Fonctionnalité | cms-mairies | 123mairie | Notes |
|---|:---:|:---:|---|
| Mentions légales | ✅ | ✅ | Parité |
| RGPD / Politique confidentialité | ✅ | ✅ | Parité |
| Exercice des droits RGPD | ✅ | ❓ | cms-mairies a un formulaire dédié |
| Accessibilité (déclaration RGAA) | ✅ | ✅ | Parité |
| Cookie consent (CNIL) | ✅ | ✅ | Parité (tarteaucitron chez 123mairie) |
| Open Data (CRPA) | ✅ | ❓ | cms-mairies a cette feature |
| SVE (Saisine par Voie Électronique) | ✅ | ✅ | Parité |
| Dashboard conformité avec score | ✅ | ❌ | **cms-mairies supérieur** |
| Génération auto de politique RGPD | ✅ | ❌ | **cms-mairies supérieur** |

## 8. Déploiement & Domaines

| Fonctionnalité | cms-mairies | 123mairie | Notes |
|---|:---:|:---:|---|
| Déploiement automatique | ✅ | ✅ | Parité |
| Domaine personnalisé + SSL | ✅ | ✅ | Parité |
| Auto-deploy sur modification | ✅ | ❓ | Feature avancée de cms-mairies |
| **Sauvegardes quotidiennes** | ❌ | ✅ | Sauvegardes automatiques des données |

## 9. Admin & Multi-tenant

| Fonctionnalité | cms-mairies | 123mairie | Notes |
|---|:---:|:---:|---|
| Multi-tenant (isolation par site) | ✅ | ✅ | Parité |
| Gestion des utilisateurs | ✅ | ✅ | Parité |
| Médiathèque par site | ✅ | ✅ | Parité |
| Preview du site dans l'admin | ✅ | ❌ | **cms-mairies supérieur** |
| **Tutoriels vidéo intégrés** | ❌ | ✅ | Documentation vidéo pour la prise en main |
| **Édition front-end (inline)** | ❌ | ✅ | Édition directe sur le site public (WYSIWYG) |

---

## Features manquantes classées par priorité

### Priorité HAUTE — Différenciateurs majeurs

| # | Feature | Description |
|---|---|---|
| 1 | **Newsletter** | Création, envoi, gestion abonnés, widget d'inscription sur le site public |
| 2 | **Signalement citoyen** | Formulaire avec catégories (voirie, propreté, éclairage…), géolocalisation, photo, suivi de statut |
| 3 | **Annuaire communal** | Fiches services publics / commerces / écoles avec carte interactive (Leaflet) |
| 4 | **Catalogue de thèmes** | Au moins 3-5 templates graphiques différents au lieu d'un seul design |
| 5 | **Application mobile** | App ou PWA avancée avec push notifications |

### Priorité MOYENNE — Valeur ajoutée significative

| # | Feature | Description |
|---|---|---|
| 6 | **Bulletin municipal flipbook** | Conversion PDF en lecture interactive (pas besoin d'ISSUU) |
| 7 | **Formulaire nouvel arrivant** | Kit de bienvenue numérique |
| 8 | **Menu scolaire** | Module simple d'affichage des menus cantine |
| 9 | **Alertes SMS** | Envoi de SMS aux habitants (via API type OVH SMS, Twilio) |
| 10 | **Offres d'emploi (API France Travail)** | Widget d'affichage des offres locales |

### Priorité BASSE — Nice-to-have / intégrations tierces

| # | Feature | Description |
|---|---|---|
| 11 | **TIPI / PayFip** | Paiement en ligne de factures municipales |
| 12 | **Billetterie** | Intégration billetterie événements |
| 13 | **Portail citoyen** | Espace connecté famille (souvent via solution tierce type Berger-Levrault) |
| 14 | **Édition front-end** | Édition inline sur le site public |
| 15 | **Boutons accessibilité** | Contrôle taille du texte |
| 16 | **Sauvegardes quotidiennes** | Backup automatique de la base de données |
| 17 | **Tutoriels vidéo** | Documentation vidéo intégrée |

---

## Points forts de cms-mairies par rapport à 123mairie

| Avantage | Détail |
|---|---|
| **Éditeur richtext supérieur** | TipTap avec colonnes, tableaux, slash commands, drag & drop |
| **Dashboard de conformité légale** | Score automatique de conformité |
| **Génération auto de politique RGPD** | Texte légal généré à partir des données du site |
| **JSON-LD structured data** | GovernmentOrganization, FAQPage, SearchAction |
| **Preview du site dans l'admin** | Prévisualisation intégrée |
| **PWA / Web App Manifest** | Installable sur mobile sans app store |
| **Open Data (CRPA)** | Conformité Art. L312-1-1 |
| **Exercice des droits RGPD** | Formulaire dédié |
| **Auto-deploy** | Déploiement automatique avec debounce configurable |
| **Architecture moderne** | Astro SSG, React 19, Strapi v5 vs CMS legacy chez 123mairie |
