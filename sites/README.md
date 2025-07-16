# Sites Astro Multi-Tenant pour Mairies

Ce projet Astro génère des sites statiques multi-tenant où chaque mairie dispose de son propre site avec ses données isolées, récupérées depuis l'API Strapi.

## 🏗️ Architecture

- **Admin React** : Interface d'administration par mairie (`/admin`)
- **API Strapi** : Backend multi-tenant avec isolation par site (`/backend`)
- **Sites Astro** : Génération de sites statiques par mairie (`/sites`)

## 🚀 Démarrage rapide

### Installation

```bash
npm install
```

### Lancement en développement

```bash
# Pour Lyon (SITE_DOCUMENT_ID=documentId_du_site_lyon)
SITE_DOCUMENT_ID=documentId_du_site_lyon SITE_SLUG=lyon STRAPI_URL=http://localhost:1337 npm run dev

# Pour Paris (SITE_DOCUMENT_ID=documentId_du_site_paris)
SITE_DOCUMENT_ID=documentId_du_site_paris SITE_SLUG=paris STRAPI_URL=http://localhost:1337 npm run dev
```

### Build de production

```bash
# Build pour Lyon
SITE_DOCUMENT_ID=documentId_du_site_lyon SITE_SLUG=lyon STRAPI_URL=http://localhost:1337 STRAPI_TOKEN=your-token npm run build

# Build pour Paris
SITE_DOCUMENT_ID=documentId_du_site_paris SITE_SLUG=paris STRAPI_URL=http://localhost:1337 STRAPI_TOKEN=your-token npm run build
```

## 🔧 Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `SITE_DOCUMENT_ID` | Document ID de la mairie dans Strapi (UUID) | `abcd1234-5678-90ef-ghij-klmnopqrstuv` |
| `SITE_SLUG` | Slug pour l'URL du site | `lyon` |
| `STRAPI_URL` | URL de l'API Strapi | `http://localhost:1337` |
| `STRAPI_TOKEN` | Token d'authentification (optionnel en dev) | `your-token-here` |

### 🔍 Comment obtenir le SITE_DOCUMENT_ID

Le `SITE_DOCUMENT_ID` est l'identifiant unique (UUID) du site dans Strapi v5. Pour le récupérer :

1. **Via l'interface admin Strapi** :
   - Connectez-vous à votre admin Strapi (`http://localhost:1337/admin`)
   - Allez dans "Sites"
   - Cliquez sur un site pour l'éditer
   - L'URL contient le documentId : `/admin/content-manager/collection-types/api::site.site/{documentId}`

2. **Via l'API** :
   ```bash
   # Lister tous les sites
   curl "http://localhost:1337/api/sites"

   # Le documentId sera dans la réponse :
   # { "data": [{ "id": 1, "documentId": "abcd1234-5678-90ef...", "attributes": {...} }] }
   ```

3. **Via la base de données** :
   ```sql
   SELECT id, document_id, name, slug FROM sites;
   ```

4. **Via le script utilitaire** :
   ```bash
   # Exécuter le script pour lister tous les sites et leurs documentId
   node get-site-ids.js

   # Ou avec une URL Strapi spécifique
   node get-site-ids.js http://votre-strapi.com
   ```

## 📁 Structure du projet

```
sites/
├── src/
│   ├── components/
│   │   └── Navigation.astro          # Navigation dynamique
│   ├── layouts/
│   │   └── Layout.astro              # Layout principal adaptatif
│   ├── pages/
│   │   ├── index.astro               # Page d'accueil
│   │   ├── [...slug].astro           # Pages CMS dynamiques
│   │   ├── articles/
│   │   │   ├── index.astro           # Liste des articles
│   │   │   └── [slug].astro          # Détail d'un article
│   │   ├── evenements/
│   │   │   ├── index.astro           # Liste des événements
│   │   │   └── [slug].astro          # Détail d'un événement
│   │   └── 404.astro                 # Page d'erreur
│   ├── types/
│   │   └── strapi.ts                 # Types TypeScript
│   ├── utils/
│   │   └── strapi.ts                 # Client API Strapi
│   └── env.d.ts                      # Types d'environnement
├── package.json
├── astro.config.mjs                  # Configuration Astro dynamique
├── tailwind.config.mjs               # Configuration Tailwind
└── tsconfig.json                     # Configuration TypeScript
```

## 🎨 Fonctionnalités

### Système multi-tenant

- **Filtrage automatique** : Toutes les requêtes API sont automatiquement filtrées par `SITE_DOCUMENT_ID`
- **Configuration dynamique** : URL du site, thème et couleurs selon la mairie
- **Isolation des données** : Chaque site ne voit que ses propres contenus

### Types de contenu supportés

- **Pages CMS** : Pages statiques avec templates spécialisés
- **Articles** : Actualités avec catégories et mise en avant
- **Événements** : Événements avec dates, lieux et inscriptions

### Génération statique

- **getStaticPaths** : Génération de toutes les pages au build
- **Performance** : Sites ultra-rapides avec pré-génération
- **SEO optimisé** : Meta tags dynamiques par page et mairie

### Design adaptatif

- **Thèmes** : Classic, Modern, Accessible
- **Couleurs** : Primaire et secondaire configurables par mairie
- **Responsive** : Design mobile-first avec Tailwind CSS
- **Accessibilité** : Navigation clavier, ARIA, contrastes

## 🔌 API Strapi

### Configuration du site

```typescript
interface Site {
  name: string;            // "Mairie de Lyon"
  slug: string;            // "lyon"
  domain: string;          // "lyon"
  theme: 'classic' | 'modern' | 'accessible';
  primary_color: string;   // "#1f2937"
  secondary_color: string; // "#3b82f6"
  logo?: MediaAttribute;
  contact_email: string;
  // ...
}
```

### Content Types

Tous les content types incluent une relation obligatoire `site` :

- **Pages** : `show_in_menu`, `is_homepage`, `template`
- **Articles** : `category`, `featured`, `publication_date`
- **Événements** : `start_date`, `location`, `registration_required`

### Exemples d'endpoints

```
# Site
GET /api/sites/1?populate=logo

# Pages du menu
GET /api/pages?filters[site][id][$eq]=1&filters[show_in_menu][$eq]=true&sort=menu_order:asc

# Articles mis en avant
GET /api/articles?filters[site][id][$eq]=1&filters[featured][$eq]=true&populate=*

# Événements à venir
GET /api/evenements?filters[site][id][$eq]=1&filters[start_date][$gte]=2025-01-13&sort=start_date:asc
```

## 🎯 Templates de pages

### Page d'accueil

- Détection automatique via `is_homepage=true`
- Affichage des articles mis en avant
- Liste des événements à venir

### Pages CMS

- **default** : Template standard avec contenu riche
- **contact** : Template avec informations de contact
- **services** : Template avec call-to-action
- **about** : Template avec statistiques

### Articles

- Liste avec filtres par catégorie
- Détail avec partage et suggestions
- Support des images et contenus riches

### Événements

- Liste avec statuts et catégories
- Détail avec informations pratiques
- Gestion des dates et inscriptions

## 🛠️ Développement

### Ajout d'un nouveau site

1. Créer le site dans Strapi avec un ID unique
2. Configurer les variables d'environnement
3. Lancer le build avec les nouvelles variables

```bash
SITE_DOCUMENT_ID=documentId_du_site_marseille SITE_SLUG=marseille npm run dev
```

### Personnalisation du thème

Les couleurs sont définies via CSS custom properties :

```css
:root {
  --color-primary: 31, 41, 55;    /* RGB de primary_color */
  --color-secondary: 59, 130, 246; /* RGB de secondary_color */
}
```

### Ajout de contenu

1. Créer le contenu dans l'admin Strapi
2. Assigner le bon site via la relation
3. Le contenu apparaît automatiquement sur le site

## 🚢 Déploiement

### Build par mairie

```bash
# Script de build pour toutes les mairies
./scripts/build-all-sites.sh
```

Exemple de script :

```bash
#!/bin/bash

# Lyon
SITE_DOCUMENT_ID=documentId_du_site_lyon SITE_SLUG=lyon npm run build
mv dist dist-lyon

# Paris
SITE_DOCUMENT_ID=documentId_du_site_paris SITE_SLUG=paris npm run build
mv dist dist-paris

# Marseille
SITE_DOCUMENT_ID=documentId_du_site_marseille SITE_SLUG=marseille npm run build
mv dist dist-marseille
```

### Hébergement

Chaque build génère un site statique indépendant déployable sur :

- **Netlify** : Avec builds automatiques par branche
- **Vercel** : Avec preview par pull request
- **CDN** : Upload direct des fichiers statiques
- **Serveur classique** : Nginx/Apache avec fichiers HTML

### URLs de production

```
lyon.monservice.fr      → Build SITE_SLUG=lyon
paris.monservice.fr     → Build SITE_SLUG=paris
marseille.monservice.fr → Build SITE_SLUG=marseille
```

## 🔍 Debugging

### Vérification des données

```bash
# Tester la récupération des données
curl "http://localhost:1337/api/sites/1?populate=*"
curl "http://localhost:1337/api/pages?filters[site][id][\$eq]=1"
```

### Logs de développement

Les erreurs de récupération de données sont loggées dans la console :

```javascript
console.error('Erreur lors de la récupération des articles:', error);
```

### Mode développement

En développement, le système utilise des fallbacks si les données ne sont pas disponibles.

## 📝 Bonnes pratiques

### Performance

- ✅ Images optimisées avec `getStrapiImageUrl()`
- ✅ Requêtes parallèles avec `Promise.all()`
- ✅ Build statique pour des temps de chargement optimaux

### SEO

- ✅ Meta tags dynamiques par page
- ✅ URLs propres et sémantiques
- ✅ Sitemap automatique
- ✅ Support Open Graph et Twitter Cards

### Accessibilité

- ✅ Navigation clavier
- ✅ Attributs ARIA appropriés
- ✅ Contrastes respectés
- ✅ Skip links pour la navigation

### Maintenance

- ✅ Types TypeScript stricts
- ✅ Gestion d'erreurs gracieuse
- ✅ Code réutilisable et modulaire
- ✅ Documentation inline

## 🆘 Support

Pour toute question ou problème :

1. Vérifier que Strapi fonctionne correctement
2. Contrôler les variables d'environnement
3. Consulter les logs de la console
4. Vérifier que le site existe dans Strapi avec l'ID correct

## 📄 Licence

Ce projet est sous licence MIT.
