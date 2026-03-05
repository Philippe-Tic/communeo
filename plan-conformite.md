
# Plan de mise en conformite - CMS Mairies

## Contexte

Le guide `guide-obligations-site-mairie.md` recense toutes les obligations legales, techniques et fonctionnelles des sites de mairies en France. Ce plan compare l'existant du CMS avec ces exigences et propose une feuille de route concrete en 7 phases.

### Etat actuel du CMS

| Couche | Ce qui existe |
|--------|--------------|
| **Backend (Strapi)** | 5 content types : Site, Page, Article, Evenement, Deployment. Middleware site-isolation multi-tenant. Services deployment/netlify/domain. |
| **Admin (React)** | CRUD complet Articles/Pages/Events. Config site, deployments, domaines. Dashboard stats. Auth role-based. Dark/light mode. |
| **Sites (Astro)** | Homepage, pages dynamiques, articles, evenements, 404. 1 seul composant (Navigation). Footer copie-colle dans 7 fichiers. Aucune page legale. |

### Ce qui manque (vs obligations)

- Mentions legales, RGPD, accessibilite, cookies
- Formulaire de contact / SVE (Saisine par Voie Electronique)
- Documents officiels (PV, deliberations, urbanisme, budget)
- Open data (communes > 3500 hab.)
- Composant Footer avec liens legaux obligatoires
- Dashboard de conformite
- Equipe municipale, annuaire associations, demarches en ligne

---

## Phase 1 : Fondations legales (CRITIQUE)

> Mentions legales, RGPD, accessibilite, footer - Obligations sous peine d'amendes (375 000EUR / 50 000EUR)

### 1.1 Backend : Enrichir le content type Site

**Fichier** : `backend/src/api/site/content-types/site/schema.json`

Ajouter les champs structures :

| Groupe | Champs |
|--------|--------|
| **Mentions legales** | `siret`, `publication_director`, `publication_director_title`, `hebergeur_name`, `hebergeur_address`, `hebergeur_phone`, `credits` (richtext), `mentions_legales_extra` (richtext) |
| **RGPD** | `rgpd_policy` (richtext), `dpo_name`, `dpo_email`, `dpo_phone` |
| **Accessibilite** | `accessibility_level` (enum: non-conforme/partiellement-conforme/conforme), `accessibility_declaration` (richtext), `accessibility_schema_url`, `accessibility_action_plan_url` |
| **Infos pratiques** | `opening_hours` (json), `population` (integer) |

> Rationale : 1 seul exemplaire par site, pas besoin d'un content type separe.

### 1.2 Admin : Etendre la config site en onglets

**Fichiers** : `admin/src/pages/SiteConfigEdit.tsx`, `admin/src/hooks/api/useSites.ts`

Reorganiser en 5 onglets (composant shadcn `Tabs` existant) :
1. Informations generales (existant)
2. Mentions legales (SIRET, directeur publication, hebergeur, credits)
3. RGPD & Confidentialite (DPO, politique richtext)
4. Accessibilite (niveau, declaration, schema URL, plan action URL)
5. Informations pratiques (horaires JSON, population)

### 1.3 Sites : Composant Footer

**Creer** : `sites/src/components/Footer.astro`
- Coordonnees mairie (adresse, tel, email, horaires)
- Liens legaux obligatoires : Mentions legales, Politique de confidentialite
- Mention obligatoire RGAA : "Accessibilite : [niveau]" (pied de page)
- Copyright dynamique

**Modifier** : les 7 fichiers de pages pour remplacer le footer inline par `<Footer />`

### 1.4 Sites : Pages legales statiques

**Creer** 3 pages Astro qui tirent les donnees du Site :
- `sites/src/pages/mentions-legales.astro` - genere automatiquement depuis les champs Site
- `sites/src/pages/politique-confidentialite.astro` - affiche `rgpd_policy` + infos DPO
- `sites/src/pages/accessibilite.astro` - declaration, niveau, liens schema/plan

> Template de fallback si champs vides (texte par defaut a personnaliser).

### 1.5 Sites : Corriger le template Contact

**Modifier** : `sites/src/pages/[...slug].astro` - remplacer les donnees en dur par les champs dynamiques du Site (adresse, tel, email, horaires).

---

## Phase 2 : Cookies & SVE (HAUTE PRIORITE)

> Bandeau cookies CNIL + formulaire de contact electronique avec accuse de reception

### 2.1 Sites : Bandeau de consentement cookies

**Creer** : `sites/src/components/CookieBanner.astro`
- JS pur client-side (pas de dependance externe)
- 3 boutons : Accepter / Refuser / Parametrer
- Stockage consentement en localStorage
- Bloque scripts non-essentiels avant consentement
- Conforme CNIL : refus aussi simple qu'acceptation
- Accessible clavier + ARIA

**Modifier** : `sites/src/layouts/Layout.astro` - integrer le banner

### 2.2 Backend : Content type Contact Submission

**Creer** : `backend/src/api/contact-submission/`

| Champ | Type | Requis |
|-------|------|--------|
| `first_name` | string | oui |
| `last_name` | string | oui |
| `email` | email | oui |
| `phone` | string | non |
| `subject` | string | oui |
| `message` | text | oui |
| `category` | enum (general, urbanisme, etat-civil, voirie, associations, rgpd, autre) | oui |
| `status` | enum (received, in_progress, resolved, closed) | oui |
| `reference_number` | string unique | oui (auto) |
| `acknowledgment_sent` | boolean | - |
| `acknowledged_at` | datetime | - |
| `response` | richtext | non |
| `responded_at` | datetime | - |
| `attachments` | media multiple | non |
| `site` | relation -> Site | oui |

**Controller custom** : generer ref `SVE-{YYYY}-{N}`, envoyer accuse de reception email (obligation SVE : sous 10 jours ouvres, avec date reception, reference, service charge).

**Endpoint public** : autoriser `create` pour le role public (le site statique n'a pas d'auth).

### 2.3 Sites : Formulaire de contact SVE

**Modifier** le template contact dans `[...slug].astro` :
- Formulaire reel qui POST vers Strapi (`/api/contact-submissions`)
- Champs : nom, prenom, email, tel, objet, categorie, message, pieces jointes
- Case RGPD obligatoire
- Message de confirmation avec numero de reference

### 2.4 Admin : Gestion des messages

**Creer** :
- `admin/src/pages/ContactSubmissions.tsx` - liste filtrable (statut, categorie, date)
- `admin/src/pages/ContactSubmissionDetail.tsx` - detail, changer statut, repondre
- `admin/src/hooks/api/useContactSubmissions.ts`

**Modifier** : Sidebar (ajout "Messages"), App.tsx (routes `/messages`, `/messages/:id`), Dashboard (stat "Messages non traites")

### 2.5 Sites : Page exercice des droits RGPD

**Creer** : `sites/src/pages/exercice-droits.astro` - formulaire dedie pour acces, rectification, effacement, opposition, portabilite. Liee depuis la politique de confidentialite.

**Mises a jour transverses** : middleware site-isolation, bootstrap permissions, types TS.

---

## Phase 3 : Documents officiels (HAUTE PRIORITE)

> PV, deliberations, urbanisme, budget - Obligations CGCT

### 3.1 Backend : Content type Official Document

**Creer** : `backend/src/api/official-document/`

| Champ | Type |
|-------|------|
| `title` | string (req) |
| `slug` | uid |
| `description` | text |
| `document_type` | enum : pv-conseil-municipal, deliberation, arrete, plu, scot, carte-communale, budget-primitif, compte-administratif, rapport-orientations-budgetaires, autre |
| `document_date` | date (req) |
| `session_date` | date |
| `file` | media fichier (req, PDF) |
| `additional_files` | media multiple |
| `status` | enum : draft/published/archived |
| `reference_number` | string |
| `year` | integer (req) |
| `site` | relation -> Site (req) |

### 3.2 Admin : CRUD Documents officiels

**Creer** :
- `OfficialDocuments.tsx` - liste avec filtres (type, annee, statut)
- `OfficialDocumentForm.tsx` - formulaire avec upload PDF
- `OfficialDocumentDetail.tsx` - consultation
- `useOfficialDocuments.ts` - hooks TanStack Query

**Modifier** : Sidebar, routes, Dashboard stats

### 3.3 Sites : Section Documents

**Creer** :
- `sites/src/pages/documents/index.astro` - liste organisee par type (onglets : Conseils municipaux, Deliberations, Urbanisme, Budget, Arretes)
- `sites/src/pages/documents/[slug].astro` - detail + telechargement PDF

**Modifier** : `strapi.ts` (fonctions fetch), `strapi.ts` types, Navigation (lien Documents), Footer (lien Documents)

**Mises a jour transverses** : middleware, bootstrap, relation inverse sur Site.

---

## Phase 4 : Dashboard de conformite (PRIORITE MOYENNE)

> Aide les mairies a suivre leur etat de conformite

### 4.1 Admin : Page Conformite

**Creer** : `admin/src/pages/Compliance.tsx`

Checklist auto-evaluee qui detecte l'etat des champs :

| Obligation | Detection |
|-----------|-----------|
| Mentions legales | SIRET + directeur pub + hebergeur remplis ? |
| RGPD | `rgpd_policy` non vide ? |
| DPO | `dpo_name` + `dpo_email` remplis ? |
| Accessibilite | declaration renseignee ? |
| Cookies | toujours OK (integre au template) |
| HTTPS | toujours OK (Netlify) |
| Contact/SVE | page contact existante ? |
| PV conseil | au moins 1 doc type `pv-conseil-municipal` ? |
| Deliberations | docs type `deliberation` existent ? |
| Urbanisme | docs PLU/SCoT existent ? |
| Open data | conditionnel si `population > 3500` |
| Budget | conditionnel si `population > 3500` |

Chaque item : statut (vert/orange/rouge), lien vers la page admin pour corriger, reference legale.

### 4.2 Admin : Assistant de configuration initiale

**Creer** : `admin/src/pages/LegalSetupWizard.tsx`

Wizard en etapes pour les nouvelles communes :
1. Identite (nom, SIRET, adresse, tel, email)
2. Directeur de publication & hebergeur
3. DPO
4. Niveau accessibilite
5. Politique confidentialite (template pre-rempli)
6. Apercu mentions legales generees

Suggestion affichee sur le Dashboard quand champs legaux incomplets.

---

## Phase 5 : Open Data & Publications avancees (PRIORITE MOYENNE)

> Obligations specifiques aux communes > 3500 hab.

### 5.1 Backend : Champs Open Data sur Site

Ajouter : `open_data_enabled` (bool), `open_data_url` (string), `open_data_platform` (enum: data-gouv-fr, opendatasoft, custom, none)

### 5.2 Sites : Page Open Data

**Creer** : `sites/src/pages/open-data.astro` - liens portails, datasets, lien data.gouv.fr

### 5.3 Sites : Vue budget dediee

Filtrage conditionnel dans `documents/index.astro` base sur `population > 3500`.

---

## Phase 6 : Ecoconception RGESN (PRIORITE BASSE)

> Recommande mais pas sanctionne

- Utiliser `<Image />` Astro pour compression WebP/responsive automatique
- `loading="lazy"` sur images below-the-fold
- Resource hints (`preconnect` vers Strapi)
- Optimisation cache navigateur
- Minimiser scripts tiers

---

## Phase 7 : Contenus fonctionnels enrichis (PRIORITE BASSE)

> Features recommandees, pas obligatoires

### 7.1 Equipe municipale

**Content type** `team-member` : nom, prenom, role (maire/adjoint/conseiller/DGS/agent), photo, delegation, bio, ordre affichage, site
**Admin** : CRUD + tri par drag-and-drop
**Site** : `sites/src/pages/equipe-municipale.astro`

### 7.2 Annuaire associations

**Content type** `association` : nom, description, categorie (sport/culture/social/environnement/education), contact, site web, adresse, logo, site
**Admin** : CRUD
**Site** : `sites/src/pages/associations/index.astro`

### 7.3 Demarches en ligne

**Page** : `sites/src/pages/demarches.astro` - liens curetes vers teleservices nationaux (Service-Public.fr, ANTS, Geoportail urbanisme)

---

## Recapitulatif

| Phase | Contenu | Priorite | Depend de |
|-------|---------|----------|-----------|
| **1** | Footer + Mentions legales + RGPD + Accessibilite | CRITIQUE | - |
| **2** | Cookies + SVE Contact + Messages admin | HAUTE | Phase 1 |
| **3** | Documents officiels (PV, deliberations, urbanisme) | HAUTE | Phase 1 |
| **4** | Dashboard conformite + Wizard setup | MOYENNE | Phases 1-3 |
| **5** | Open data + Budget (> 3500 hab.) | MOYENNE | Phase 3 |
| **6** | Ecoconception RGESN | BASSE | Phase 1 |
| **7** | Equipe municipale + Associations + Demarches | BASSE | Phase 1 |

## Verification

Pour chaque phase :
1. Backend : `npm run dev` dans `backend/`, verifier schemas via Strapi admin ou MCP tools
2. Admin : `npm run dev` dans `admin/`, tester CRUD complet, verifier affichage onglets/pages
3. Sites : `SITE_DOCUMENT_ID=xxx SITE_SLUG=xxx npm run dev` dans `sites/`, verifier rendu des pages legales, footer, documents
4. Multi-tenant : verifier que le middleware site-isolation filtre bien les nouveaux content types
5. Conformite : parcourir la checklist du guide section par section et verifier chaque point
