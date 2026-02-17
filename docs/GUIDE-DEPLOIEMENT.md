# Guide : Tester la mise en ligne d'un site

## Prérequis

### Services à démarrer

```bash
# Terminal 1 — Backend Strapi
cd backend
npm run dev
# → http://localhost:1337
```

```bash
# Terminal 2 — Admin Dashboard
cd admin
npm run dev
# → http://localhost:5173
```

### Variables d'environnement requises (backend/.env)

| Variable | Rôle | Où la trouver |
|----------|------|---------------|
| `NETLIFY_TOKEN` | Token API Netlify | https://app.netlify.com/user/applications → Personal access tokens |
| `STRAPI_PUBLIC_URL` | URL publique du backend | `http://localhost:1337` en local |
| `STRAPI_API_TOKEN` | Token API Strapi (lecture) | Admin Strapi → Settings → API Tokens → Create (Full access) |

### Données minimum dans Strapi

Avant de déployer, le site doit avoir au minimum :
- Un **Site** créé (nom, slug, email de contact)
- Au moins une **Page** avec `is_homepage: true` et `status: published`
- Un **utilisateur** assigné au site

---

## Étape 1 — Préparer le site

1. Ouvrir l'admin : http://localhost:5173
2. Se connecter avec un compte assigné à un site
3. Aller dans **Configuration du site** et vérifier :
   - Nom du site renseigné
   - Email de contact renseigné
   - Au moins une page d'accueil publiée

---

## Étape 2 — Lancer le déploiement

1. Dans l'admin, aller dans **Déploiement** (menu latéral)
2. Cliquer sur **"Publier le site"**
3. Le statut passe en **"Building"** (badge bleu)

---

## Étape 3 — Suivre la progression

L'admin affiche en temps réel :
- **Statut** : Building → Ready (vert) ou Error (rouge)
- **Historique** : tableau des 5 derniers déploiements
- **Polling auto** : rafraîchissement toutes les 10s pendant le build, 30s au repos

### Ce qui se passe en coulisses

```
1. Le backend récupère les données du site depuis Strapi
2. Il crée un site Netlify nommé {slug}-mairie (si inexistant)
3. Il copie le code Astro dans un dossier temporaire
4. Il lance npm ci + npx astro build avec les variables d'environnement :
   - SITE_DOCUMENT_ID = UUID du site
   - SITE_SLUG = slug du site
   - STRAPI_URL = URL publique du backend
   - STRAPI_TOKEN = token API lecture
5. Il zippe le dossier dist/
6. Il upload le ZIP sur Netlify via l'API
7. Il attend que Netlify confirme le déploiement
8. Il met à jour le statut en "Ready" ou "Error"
```

### Durée typique

- Build Astro : ~30-60s
- Upload Netlify : ~5-10s
- Activation Netlify : ~5-15s
- **Total : ~1-2 minutes**

---

## Étape 4 — Vérifier le résultat

### Si statut "Ready"

Le site est en ligne. L'URL apparaît dans l'admin :
```
https://{slug}-mairie.netlify.app
```

Vérifier :
- [ ] La page d'accueil s'affiche correctement
- [ ] La navigation fonctionne (pages, articles, événements)
- [ ] Le footer affiche les coordonnées et liens légaux
- [ ] Le niveau d'accessibilité est affiché dans le footer
- [ ] Les images se chargent (vérifier la console navigateur)

### Si statut "Error"

Deux endroits pour diagnostiquer :

**1. Logs du backend (terminal)**
```
Le service de déploiement log chaque étape :
[deployment] Step 1: Fetching site data...
[deployment] Step 3: Building site...
[deployment] ERROR: Build failed: ...
```

**2. Endpoint de debug**
```bash
curl -H "Authorization: Bearer <JWT>" http://localhost:1337/api/deployment/debug
```

Retourne : variables d'environnement (masquées), statut système, derniers déploiements.

---

## Erreurs courantes

### "NETLIFY_TOKEN is not configured"
→ Ajouter `NETLIFY_TOKEN=nfp_xxx` dans `backend/.env`

### "STRAPI_API_TOKEN is not configured"
→ Créer un token API dans l'admin Strapi natif (http://localhost:1337/admin) → Settings → API Tokens

### "Build failed: astro check found errors"
→ Le code Astro a des erreurs TypeScript. Tester localement :
```bash
cd sites
SITE_DOCUMENT_ID=<uuid> SITE_SLUG=<slug> STRAPI_URL=http://localhost:1337 npm run build
```

### "Site with documentId xxx not found"
→ Le `SITE_DOCUMENT_ID` ne correspond à aucun site dans Strapi. Vérifier dans l'admin Strapi natif que le site existe.

### "No published homepage found"
→ Créer une page avec `is_homepage: true` et `status: published` dans l'admin.

### Le site est en ligne mais les pages sont vides
→ Vérifier que `STRAPI_PUBLIC_URL` dans `.env` est accessible depuis le process de build. En local : `http://localhost:1337`. En production : l'URL publique du backend.

### Les images ne s'affichent pas
→ Les images Strapi sont servies depuis le backend. Vérifier que l'URL de base Strapi est correcte et accessible.

### "Aucun site associé à votre compte" / "Utilisateur sans site assigné"
→ L'utilisateur connecté n'a pas de site assigné dans Strapi. Pour corriger :
1. Ouvrir l'admin Strapi natif : http://localhost:1337/admin
2. Aller dans **Content Manager → User** (collection Users & Permissions)
3. Éditer l'utilisateur concerné
4. Dans le champ **Site**, sélectionner le site à assigner
5. Sauvegarder et se reconnecter dans l'admin dashboard

> **Note :** En développement, le bootstrap (`backend/src/bootstrap.ts`) crée automatiquement un site de test et l'assigne à l'utilisateur par défaut. Ce problème ne devrait pas survenir sauf si l'utilisateur a été créé manuellement.

---

## Tester un déploiement en local (sans Netlify)

Pour tester le build sans déployer sur Netlify :

```bash
cd sites

# Récupérer le documentId de votre site depuis Strapi
# (visible dans l'admin Strapi ou via API : GET /api/sites)

SITE_DOCUMENT_ID=<uuid> \
SITE_SLUG=<slug> \
STRAPI_URL=http://localhost:1337 \
npm run build

# Le site statique est généré dans sites/dist/
# Pour le visualiser :
npx serve dist
# → http://localhost:3000
```

---

## Tester avec un domaine personnalisé

1. **Admin** → Configuration du site → section Domaines
2. Entrer le domaine (ex: `mairie-lyon.fr`)
3. Le système génère des instructions DNS :
   - Ajouter un enregistrement TXT `_netlify-cms-verification.mairie-lyon.fr` avec le token fourni
   - Ajouter un CNAME pointant vers `{slug}-mairie.netlify.app`
4. Attendre la propagation DNS (5-30 minutes)
5. Cliquer sur "Vérifier le domaine"
6. Si OK → le SSL est automatiquement provisionné par Netlify
7. Le site est accessible sur `https://mairie-lyon.fr`

---

## Architecture du pipeline

```
Admin UI (React)
  │
  ├─ POST /api/deployment/trigger
  │   → Démarre le build en arrière-plan
  │   → Retour immédiat : status="building"
  │
  ├─ GET /api/deployment/check/:id  (polling 10s)
  │   → Vérifie le statut auprès de Netlify
  │
  └─ GET /api/deployment/status  (polling 30s)
      → Dernier déploiement + historique
```

```
Backend (Strapi + Node.js)
  │
  ├─ Fetch données site (pages, articles, événements)
  ├─ Créer site Netlify si nécessaire ({slug}-mairie)
  ├─ Copier sources Astro → /tmp/
  ├─ npm ci + astro build (avec env vars du site)
  ├─ ZIP dist/ → Upload sur Netlify API
  └─ Attendre confirmation → status="ready"
```

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `backend/src/services/deployment.ts` | Orchestration build + deploy |
| `backend/src/services/netlify.ts` | Client API Netlify |
| `backend/src/api/deployment/controllers/deployment.ts` | Endpoints API |
| `admin/src/components/deployment/DeploymentPanel.tsx` | Interface admin |
| `admin/src/hooks/useDeployment.ts` | Logique polling + mutations |
| `sites/astro.config.mjs` | Configuration Astro (env vars) |
