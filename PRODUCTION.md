# Mises à jour en production

Guide rapide pour déployer des mises à jour de code sur le VPS.
Pour le setup initial complet, voir [DEPLOYMENT.md](./DEPLOYMENT.md).

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

## Déployer le frontend (Admin SPA)

Le build se fait **en local** (pas de Node.js sur le VPS).

```bash
# En local
cd admin
npm run build
scp -r dist/ deploy@IP_DU_VPS:/opt/communeo/admin/dist
```

Puis sur le VPS :

```bash
ssh deploy@IP_DU_VPS
cd /opt/communeo
docker compose restart nginx
```

> **Note** : Le fichier `admin/.env.production` contient `VITE_API_URL=https://app.communeo.fr`. Vite le charge automatiquement lors de `npm run build`, donc pas besoin de préfixer la commande.

---

## Déployer les deux

```bash
# En local — build admin
cd admin
npm run build
cd ..

# Upload admin + pull code sur le VPS
scp -r admin/dist/ deploy@IP_DU_VPS:/opt/communeo/admin/dist
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

### Rollback rapide

```bash
cd /opt/communeo
git log --oneline -5              # Trouver le commit précédent
git checkout <commit-hash>        # Revenir au commit
docker compose build strapi
docker compose up -d
```
