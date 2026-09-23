# Guide de mise en production — Communeo

## Architecture cible

```
Internet → DNS (A record) → [VPS Scaleway START-2-S — 6,99€ HT/mois]
                                    │
                                 [Nginx :443]
                                    ├── /             → Admin SPA (React, fichiers statiques)
                                    ├── /api/*        → Reverse proxy → Strapi :1337
                                    ├── /uploads/*    → Reverse proxy → Strapi :1337
                                    └── /admin/*      → Reverse proxy → Strapi admin panel

                              [Docker Compose]
                                ├── postgres:16-alpine (port 5432, interne uniquement)
                                ├── strapi (port 1337, interne uniquement)
                                ├── nginx (ports 80/443, exposé)
                                └── certbot (renouvellement SSL automatique)
```

---

## Phase 1 — Provisionner le VPS

### 1.1 Créer le serveur

1. Se connecter sur la [console Scaleway](https://console.scaleway.com/)
2. Créer une instance **START-2-S** (2 vCPU, 2 Go RAM, 30 Go NVMe) — datacenter : **Barcelona** (latence ~10-15 ms depuis la France, UE)
3. OS : **Ubuntu 24.04**
4. Ajouter ta clé SSH publique lors de la création

### 1.2 Sécuriser le serveur

```bash
# Se connecter en root
ssh root@IP_DU_VPS

# Mettre à jour le système
apt update && apt upgrade -y

# Créer un utilisateur non-root
adduser deploy
usermod -aG sudo deploy

# Copier la clé SSH vers le nouvel utilisateur
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

> **Note** : On désactivera l'accès root SSH **après** avoir installé Docker et configuré le firewall (étape 1.6), pour éviter de se retrouver bloqué en cas de problème.

### 1.3 Configurer le firewall

```bash
# ufw n'est pas préinstallé sur Scaleway Ubuntu 24.04
sudo apt install ufw -y

# En tant que deploy (ou root avant de couper l'accès)
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 1.4 Installer Docker

```bash
# Installer Docker (script officiel)
curl -fsSL https://get.docker.com | sudo sh

# Ajouter deploy au groupe docker (évite sudo pour docker)
sudo usermod -aG docker deploy

# Se reconnecter pour appliquer le groupe
exit
ssh deploy@IP_DU_VPS

# Vérifier
docker --version
docker compose version
```

### 1.5 Configurer le swap

Avec 2 Go de RAM, ajouter du swap évite les OOM kills lors des builds Strapi :

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 1.6 Désactiver l'accès root SSH

Maintenant que Docker, le firewall et le swap sont en place, on peut sécuriser l'accès SSH.

```bash
# D'abord, tester la connexion avec l'utilisateur deploy depuis un AUTRE terminal
ssh deploy@IP_DU_VPS
# Si ça fonctionne, continuer ci-dessous. Sinon, NE PAS désactiver root !

# Désactiver l'accès root SSH (gère les deux cas : "yes" et "prohibit-password")
sudo sed -i 's/^PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### 1.7 Configurer le DNS

Chez ton registrar DNS, créer un **enregistrement A** :

```
cms.tondomaine.fr  →  IP_DU_VPS
```

Attendre la propagation DNS (quelques minutes à quelques heures).

```bash
# Vérifier la propagation
dig cms.tondomaine.fr +short
# Doit retourner l'IP du VPS
```

---

## Phase 2 — Préparer le code (en local)

### 2.1 Builder l'admin SPA

```bash
cd admin
VITE_API_URL=https://cms.tondomaine.fr npm run build
```

Cela génère `admin/dist/` qui sera servi par Nginx en production.

### 2.2 Commit et push

```bash
git add -A
git commit -m "feat: production deployment setup"
git push
```

---

## Phase 3 — Déployer sur le VPS

### 3.1 Cloner le projet

```bash
ssh deploy@IP_DU_VPS

# Créer le répertoire cible (appartient à deploy, pas à root)
sudo mkdir -p /opt/communeo
sudo chown deploy:deploy /opt/communeo

git clone https://github.com/TON_USER/cms-mairies.git /opt/communeo
cd /opt/communeo
```

### 3.2 Générer les secrets et créer le .env

```bash
cd /opt/communeo

# Générer tous les secrets d'un coup
echo "# --- Secrets générés ---"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "APP_KEYS=$(openssl rand -base64 16),$(openssl rand -base64 16),$(openssl rand -base64 16),$(openssl rand -base64 16)"
echo "API_TOKEN_SALT=$(openssl rand -base64 16)"
echo "ADMIN_JWT_SECRET=$(openssl rand -base64 16)"
echo "TRANSFER_TOKEN_SALT=$(openssl rand -base64 16)"
echo "JWT_SECRET=$(openssl rand -base64 16)"
```

Copier le template et remplacer les valeurs :

```bash
cp .env.production .env
nano .env
```

Remplir le `.env` avec :
- Les secrets générés ci-dessus
- Ton domaine (`DOMAIN=cms.tondomaine.fr`)
- Ton token Netlify (`NETLIFY_TOKEN=...`)
- Le domaine de la preview des brouillons (`PREVIEW_DOMAIN=preview.tondomaine.fr`, certificat : `certbot certonly --webroot -w /var/www/certbot -d preview.tondomaine.fr`) `PREVIEW_API_TOKEN` (comme `STRAPI_API_TOKEN`, affiché dans les logs au premier démarrage de Strapi) et le secret des jetons de preview (`PREVIEW_SECRET=$(openssl rand -hex 32)`). L'administration et la preview doivent partager le même domaine (`app.tondomaine.fr` et `preview.tondomaine.fr`) : le cookie de la preview est ainsi envoyé dans le panneau d'aperçu de l'éditeur
- Un secret partagé Strapi ⇄ worker de build (`WORKER_SECRET=$(openssl rand -hex 32)`) : le service `worker` du docker-compose construit et publie les sites
- Les identifiants SMTP Resend (voir Phase 4)
- Laisser `STRAPI_API_TOKEN=` vide pour l'instant (sera rempli à l'étape 3.7)

### 3.3 Copier l'admin SPA sur le VPS

**Méthode recommandée** — copier le build local (pas besoin de Node.js sur le VPS) :

```bash
# Depuis ta machine locale (après avoir fait le build en Phase 2.1)
scp -r admin/dist deploy@IP_DU_VPS:/opt/communeo/admin/dist
```

Alternative — builder directement sur le VPS (nécessite Node.js installé) :

```bash
cd /opt/communeo/admin
npm ci
VITE_API_URL=https://cms.tondomaine.fr npm run build
```

### 3.4 Obtenir le certificat SSL

Avant de lancer tout docker-compose, il faut obtenir le certificat SSL. On lance Nginx temporairement en HTTP uniquement.

```bash
cd /opt/communeo

# Créer une config Nginx temporaire (HTTP uniquement pour le challenge ACME)
mkdir -p nginx/conf.d-init
cat > nginx/conf.d-init/default.conf << 'EOF'
server {
    listen 80;
    server_name _;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# Lancer Nginx temporairement avec la config HTTP
docker run -d --name nginx-init \
  -p 80:80 \
  -v $(pwd)/nginx/conf.d-init:/etc/nginx/conf.d:ro \
  -v cms-certbot-webroot:/var/www/certbot \
  nginx:alpine

# Obtenir le certificat
docker run --rm \
  -v cms-certbot-webroot:/var/www/certbot \
  -v cms-certbot-certs:/etc/letsencrypt \
  certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d app.communeo.fr \
    --email contact@communeo.fr \
    --agree-tos \
    --no-eff-email

# Arrêter et supprimer le Nginx temporaire
docker stop nginx-init && docker rm nginx-init
rm -rf nginx/conf.d-init
```

> **Important** : Les volumes `cms-certbot-webroot` et `cms-certbot-certs` créés ici seront les memes que ceux utilisés par docker-compose (Docker les retrouve par nom). Si docker-compose utilise un préfixe de projet différent, il faudra adapter. Pour s'assurer de la cohérence, on peut renommer les volumes dans docker-compose ou utiliser des volumes nommés explicites.

Pour forcer la cohérence, copier les certificats vers les volumes de docker-compose :

```bash
# Lancer docker-compose qui va créer ses propres volumes
docker compose up -d postgres
docker compose down

# Copier les certificats dans le volume de docker-compose
docker run --rm \
  -v cms-certbot-certs:/source:ro \
  -v communeo_certbot-certs:/dest \
  alpine sh -c "cp -a /source/. /dest/"

# Nettoyer les volumes temporaires
docker volume rm cms-certbot-webroot cms-certbot-certs
```

### 3.5 Lancer l'application

```bash
cd /opt/communeo
docker compose up -d
```

Vérifier que tout démarre correctement :

```bash
# Voir les logs en temps réel
docker compose logs -f

# Vérifier le statut des containers
docker compose ps
```

Attendre que Strapi soit prêt (peut prendre 30-60 secondes au premier démarrage, le temps de créer les tables dans PostgreSQL).

### 3.6 Créer le premier admin du dashboard

Au premier démarrage, si aucun utilisateur n'existe, Strapi crée automatiquement un site + admin via le seed bootstrap.

**Configurer le `.env` avant le premier `docker compose up`** (optionnel — des valeurs par défaut sont utilisées sinon) :

```bash
# Seed initial admin (first boot uniquement)
SEED_SITE_NAME=Ma Commune
SEED_SITE_SLUG=ma-commune
SEED_ADMIN_EMAIL=admin@communeo.fr
SEED_ADMIN_PASSWORD=ChangeMe123!

# Super admin (optionnel — accès gestion multi-sites)
SEED_SUPER_ADMIN_EMAIL=superadmin@communeo.fr
SEED_SUPER_ADMIN_PASSWORD=ChangeMe456!
```

Après le démarrage, vérifier dans les logs :
```bash
docker compose logs strapi | grep "seed"
# Doit afficher : "Created seed site" et "Created seed admin"
```

Se connecter sur `https://app.communeo.fr/login` avec les identifiants configurés, puis **changer le mot de passe immédiatement**.

### 3.7 Créer un API Token

Dans le panel admin Strapi :

1. Aller dans **Settings** > **API Tokens**
2. Cliquer **Create new API Token**
3. Nom : `Site Builder`
4. Type : **Full access**
5. Copier le token généré

Mettre à jour le `.env` sur le serveur :

```bash
nano /opt/communeo/.env
# Remplir STRAPI_API_TOKEN=le_token_copié
```

Redémarrer Strapi pour prendre en compte le token :

```bash
docker compose restart strapi
```

---

## Phase 4 — Email (Resend)

### 4.1 Configurer Resend

1. Se connecter sur [resend.com](https://resend.com/) (tier gratuit = 100 emails/jour, 3 000/mois)
2. Aller dans **Settings** > **API Keys**
3. Créer une **API Key**
4. Aller dans **SMTP** et noter :
   - **SMTP_HOST** : `smtp.resend.com`
   - **SMTP_PORT** : `587`
   - **SMTP_USERNAME** : `resend`
   - **SMTP_PASSWORD** : ton API Key (commence par `re_`)

### 4.2 Configurer le DNS pour les emails

Chez ton registrar DNS, ajouter les enregistrements DKIM/SPF/DMARC fournis par Resend (dans **Domains** > **Add Domain**) pour améliorer la délivrabilité. Si tu utilises déjà Resend pour ta landing page, ces enregistrements sont probablement déjà en place.

### 4.3 Mettre à jour le .env

```bash
nano /opt/communeo/.env
# Remplir les variables SMTP_*
```

```bash
docker compose restart strapi
```

---

## Phase 5 — Vérification

### Checklist

| Test | Commande / Action | Attendu |
|------|-------------------|---------|
| Admin SPA charge | Naviguer vers `https://cms.tondomaine.fr/` | Page de login visible |
| API Strapi répond | `curl https://cms.tondomaine.fr/api/` | Réponse JSON |
| SSL valide | Vérifier le cadenas dans le navigateur | Certificat Let's Encrypt valide |
| Login admin | Se connecter avec les identifiants | Dashboard affiché |
| Créer du contenu | Créer un article dans l'admin | Article sauvegardé |
| Déployer un site | Déclencher un déploiement | Site Netlify mis à jour |
| Email | Inviter un utilisateur | Email reçu |
| HTTPS redirect | `curl -I http://cms.tondomaine.fr/` | 301 → https |

---

## Phase 6 — Post-déploiement

### 6.1 Configurer les backups automatiques

```bash
# Créer le dossier de backups
sudo mkdir -p /opt/communeo/backups
sudo chown deploy:deploy /opt/communeo/backups

# Tester le backup manuellement
/opt/communeo/scripts/backup.sh

# Ajouter au cron (tous les jours à 3h)
crontab -e
# Ajouter cette ligne :
0 3 * * * /opt/communeo/scripts/backup.sh >> /var/log/cms-backup.log 2>&1
```

### 6.2 Monitoring

Configurer [UptimeRobot](https://uptimerobot.com/) (gratuit, 5 min d'intervalle) :

- Monitor 1 : `https://cms.tondomaine.fr/api/` (API health)
- Monitor 2 : `https://cms.tondomaine.fr/` (Admin SPA)
- Notification par email en cas de downtime

### 6.3 Créer la première municipalité

1. Se connecter au panel Strapi (`/admin`)
2. Créer un **Site** (Content Manager > Sites > Create)
3. Revenir dans l'admin SPA (`/`) et créer le contenu

---

## Maintenance courante

### Mettre à jour le code

```bash
cd /opt/communeo
git pull

# Rebuilder l'admin SPA si le frontend a changé
cd admin && VITE_API_URL=https://cms.tondomaine.fr npm run build && cd ..

# Rebuilder et redémarrer Strapi
docker compose build strapi
docker compose up -d
```

### Consulter les logs

```bash
docker compose logs -f strapi    # Logs Strapi
docker compose logs -f nginx     # Logs Nginx
docker compose logs -f postgres  # Logs PostgreSQL
```

### Renouvellement SSL

Le container `certbot` renouvelle automatiquement les certificats toutes les 12h (si nécessaire). Pour forcer un renouvellement :

```bash
docker compose run --rm certbot renew
docker compose restart nginx
```

### Restaurer un backup

```bash
# Restaurer la base de données
gunzip -c /opt/communeo/backups/db_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U strapi strapi

# Restaurer les uploads
docker compose cp /opt/communeo/backups/uploads_YYYYMMDD_HHMMSS.tar.gz strapi:/tmp/
docker compose exec strapi sh -c "cd /app/public && tar xzf /tmp/uploads_*.tar.gz"
```

### Mises à jour système

```bash
# Mensuel
sudo apt update && sudo apt upgrade -y

# Docker
docker system prune -f   # Nettoyer les images/containers inutilisés
```

---

## Coûts estimés

| Service | Coût |
|---------|------|
| Scaleway START-2-S | 6,99 € HT/mois (~8,39 € TTC) |
| Resend (email) | Gratuit (100 emails/jour) |
| Let's Encrypt (SSL) | Gratuit |
| UptimeRobot (monitoring) | Gratuit |
| Netlify (sites municipaux) | Gratuit (tier starter) |
| **Total** | **~9 €/mois TTC** |
