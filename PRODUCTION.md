# Mises à jour en production

Guide rapide pour déployer des mises à jour de code sur le VPS.
Pour le setup initial complet, voir [DEPLOYMENT.md](./DEPLOYMENT.md).

> Le déploiement V2 complet (worker, serveur de preview, file de publication, sauvegardes, CI) est en préparation dans le ticket #179 ; ce guide couvre le backend et l'admin.

---

## Prérequis

```bash
# Connexion au VPS
ssh deploy@IP_DU_VPS
cd /opt/communeo
```

Variables requises dans `/opt/communeo/.env` (déjà configurées lors du setup initial).

---

## Déployer le backend (Strapi)

```bash
ssh deploy@IP_DU_VPS
cd /opt/communeo

git pull
docker compose build strapi
docker compose up -d strapi
```

Vérifier que Strapi redémarre correctement :

```bash
docker compose logs -f strapi
# Attendre "Server started" puis Ctrl+C
```

---

## Deployer le frontend (Admin SPA)

Le build se fait **en local** (pas de Node.js sur le VPS).

```bash
# En local
VITE_API_URL=https://app.communeo.fr pnpm --filter @communeo/admin build

# IMPORTANT : vider l'ancien build puis copier le CONTENU (dist/*)
ssh deploy@IP_DU_VPS "rm -rf /opt/communeo/apps/admin/dist/*"
scp -r apps/admin/dist/* deploy@IP_DU_VPS:/opt/communeo/apps/admin/dist/
```

Puis sur le VPS :

```bash
ssh deploy@IP_DU_VPS
cd /opt/communeo
docker compose restart nginx
```

**Vérifier** que `index.html` pointe sur le bon hash :

```bash
ssh deploy@IP_DU_VPS "grep 'index-' /opt/communeo/apps/admin/dist/index.html"
```

Le hash (ex: `index-C9TciKGh.js`) doit correspondre au build local dans `apps/admin/dist/assets/`.

> **Piège scp** : `scp -r dist/ dest/` copie le dossier `dist` **dans** `dest`, donnant `dest/dist/`. Toujours utiliser `dist/*` pour copier le contenu.

---

## Déployer les deux

```bash
# En local — build admin
VITE_API_URL=https://app.communeo.fr pnpm --filter @communeo/admin build

# Upload admin + pull code sur le VPS
ssh deploy@IP_DU_VPS "rm -rf /opt/communeo/apps/admin/dist/*"
scp -r apps/admin/dist/* deploy@IP_DU_VPS:/opt/communeo/apps/admin/dist/
ssh deploy@IP_DU_VPS "cd /opt/communeo && git pull && docker compose build strapi && docker compose up -d"
```

---

## Commandes utiles

### Logs

```bash
docker compose logs -f strapi     # Logs Strapi
docker compose logs -f nginx      # Logs Nginx
docker compose logs -f postgres   # Logs PostgreSQL
docker compose logs -f            # Tous les services
```

### Status

```bash
docker compose ps                 # État des containers
docker compose top                # Processus dans chaque container
df -h                             # Espace disque
free -h                           # Mémoire
```

### Restart

```bash
docker compose restart strapi     # Restart Strapi seul
docker compose restart nginx      # Restart Nginx seul
docker compose restart            # Restart tous les services
docker compose down && docker compose up -d  # Arrêt complet + relance
```

### Backup manuel

```bash
/opt/communeo/scripts/backup.sh
ls -la /opt/communeo/backups/
```

### Nettoyage Docker

```bash
docker system prune -f            # Supprimer images/containers inutilisés
docker image prune -a -f          # Supprimer toutes les images non utilisées
```

---

## Dépannage

### Strapi ne démarre pas

```bash
docker compose logs strapi --tail=50
docker compose exec strapi sh -c "env | grep DATABASE"   # Vérifier les variables
docker compose restart strapi
```

### Nginx erreur 502 (Bad Gateway)

Strapi n'est pas encore prêt ou a crashé :

```bash
docker compose ps                 # Vérifier que strapi est "Up"
docker compose logs strapi --tail=20
docker compose restart strapi
```

### Espace disque plein

```bash
df -h
docker system prune -f
sudo journalctl --vacuum-size=100M
```

### Certificat SSL expiré

```bash
docker compose run --rm certbot renew
docker compose restart nginx
```

### Base de données — accès direct

```bash
docker compose exec postgres psql -U strapi strapi
```

### Super admin non visible

Si le super admin ne voit pas l'interface `/super-admin` après connexion :

```bash
# Vérifier le rôle en base
docker compose exec postgres psql -U strapi strapi -c \
  "SELECT id, email, municipality_role FROM up_users;"

# Corriger le rôle si nécessaire
docker compose exec postgres psql -U strapi strapi -c \
  "UPDATE up_users SET municipality_role = 'super_admin' WHERE email = 'VOTRE_EMAIL';"
```

Puis se déconnecter et reconnecter dans le dashboard.

### Rollback rapide

```bash
cd /opt/communeo
git log --oneline -5              # Trouver le commit précédent
git checkout <commit-hash>        # Revenir au commit
docker compose build strapi
docker compose up -d
```

---

## Incidents résolus

### Super admin redirigé vers /dashboard en prod (2026-03-04)

**Symptôme** : Le super admin fonctionnait en local mais pas en prod. `curl /api/users/me` retournait bien `municipality_role: "super_admin"`, mais le frontend redirigeait vers `/dashboard`.

**Deux causes** :

1. **Cache TanStack Query après login** : `useLogin.onSuccess` appelait `queryClient.setQueryData()` avec la réponse de `/api/auth/local`, qui ne contenait pas `municipality_role`. `SuperAdminRoute` lisait ces données incomplètes et redirigeait immédiatement, avant que le refetch de `/api/users/me` (qui lui contient `municipality_role`) ait le temps de répondre.

2. **Commande `scp` incorrecte** : `scp -r dist/ dest/` crée `dest/dist/` au lieu d'écraser le contenu. Résultat : `index.html` sur le serveur pointait encore sur l'ancien bundle JS, donc les corrections de code n'étaient même pas chargées.

**Fix** :
- Supprimé `setQueryData` dans `useLogin`, `useRegister`, `useResetPassword` — seul `invalidateQueries` est appelé, forçant un fetch frais de `/api/users/me?populate=site` qui contient toutes les données
- Ajouté headers `Cache-Control: no-store` sur les réponses API dans nginx (`nginx/templates/default.conf.template`)
- Corrigé la procédure de déploiement : `rm -rf dist/*` + `scp -r dist/*` (voir section "Déployer le frontend")

**Leçon** : Toujours vérifier le hash dans `index.html` sur le serveur après un déploiement (`grep 'index-' .../index.html`).
