# Guide de mise en production — CMS Mairies

## Architecture cible

```
Internet → DNS (A record) → [VPS OVH VLE-2 — ~4,20€ HT/mois]
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

1. Se connecter sur [OVHcloud](https://www.ovhcloud.com/fr/vps/)
2. Commander un VPS **VLE-2** (2 vCPU, 4 Go RAM, 80 Go SSD) — datacenter disponible (ex: **Madrid**, la latence depuis la France reste excellente ~15-20ms)
3. OS : **Ubuntu 24.04**
4. Ajouter ta clé SSH publique lors de la commande

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

# Désactiver l'accès root SSH
sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd
```

### 1.3 Configurer le firewall

```bash
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

### 1.5 Configurer le DNS

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

git clone https://github.com/TON_USER/cms-mairies.git /opt/cms-mairies
cd /opt/cms-mairies
```

### 3.2 Générer les secrets et créer le .env

```bash
cd /opt/cms-mairies

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
- Les identifiants SMTP Brevo (voir Phase 5)
- Laisser `STRAPI_API_TOKEN=` vide pour l'instant (sera rempli à l'étape 3.7)

### 3.3 Builder l'admin SPA sur le VPS

Si tu n'as pas copié `admin/dist/` depuis ta machine locale :

```bash
cd /opt/cms-mairies/admin
npm ci
VITE_API_URL=https://cms.tondomaine.fr npm run build
```

Ou bien copier depuis ta machine locale :

```bash
# Depuis ta machine locale
scp -r admin/dist deploy@IP_DU_VPS:/opt/cms-mairies/admin/dist
```

### 3.4 Obtenir le certificat SSL

Avant de lancer tout docker-compose, il faut obtenir le certificat SSL. On lance Nginx temporairement en HTTP uniquement.

```bash
cd /opt/cms-mairies

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
    -d cms.tondomaine.fr \
    --email ton@email.fr \
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
  -v cms-mairies_certbot-certs:/dest \
  alpine sh -c "cp -a /source/. /dest/"

# Nettoyer les volumes temporaires
docker volume rm cms-certbot-webroot cms-certbot-certs
```

### 3.5 Lancer l'application

```bash
cd /opt/cms-mairies
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

### 3.6 Créer le premier super-admin Strapi

Accéder au panel d'admin Strapi : `https://cms.tondomaine.fr/admin`

Strapi affiche un formulaire de création du premier compte super-admin au premier démarrage. Remplir avec tes identifiants.

### 3.7 Créer un API Token

Dans le panel admin Strapi :

1. Aller dans **Settings** > **API Tokens**
2. Cliquer **Create new API Token**
3. Nom : `Site Builder`
4. Type : **Full access**
5. Copier le token généré

Mettre à jour le `.env` sur le serveur :

```bash
nano /opt/cms-mairies/.env
# Remplir STRAPI_API_TOKEN=le_token_copié
```

Redémarrer Strapi pour prendre en compte le token :

```bash
docker compose restart strapi
```

---

## Phase 4 — Email (Brevo)

### 4.1 Créer un compte Brevo

1. S'inscrire sur [brevo.com](https://www.brevo.com/) (tier gratuit = 300 emails/jour)
2. Aller dans **Settings** > **SMTP & API**
3. Générer une **clé SMTP**
4. Noter :
   - **SMTP_HOST** : `smtp-relay.brevo.com`
   - **SMTP_PORT** : `587`
   - **SMTP_USERNAME** : ton email Brevo
   - **SMTP_PASSWORD** : la clé SMTP générée

### 4.2 Configurer le DNS pour les emails

Chez ton registrar DNS, ajouter les enregistrements DKIM/SPF fournis par Brevo (dans Settings > Senders & Domains) pour améliorer la délivrabilité.

### 4.3 Mettre à jour le .env

```bash
nano /opt/cms-mairies/.env
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
sudo mkdir -p /opt/cms-mairies/backups
sudo chown deploy:deploy /opt/cms-mairies/backups

# Tester le backup manuellement
/opt/cms-mairies/scripts/backup.sh

# Ajouter au cron (tous les jours à 3h)
crontab -e
# Ajouter cette ligne :
0 3 * * * /opt/cms-mairies/scripts/backup.sh >> /var/log/cms-backup.log 2>&1
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
cd /opt/cms-mairies
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
gunzip -c /opt/cms-mairies/backups/db_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U strapi strapi

# Restaurer les uploads
docker compose cp /opt/cms-mairies/backups/uploads_YYYYMMDD_HHMMSS.tar.gz strapi:/tmp/
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
| OVH VPS VLE-2 | ~4,20 € HT/mois (~5,04 € TTC) |
| Brevo (email) | Gratuit (300 emails/jour) |
| Let's Encrypt (SSL) | Gratuit |
| UptimeRobot (monitoring) | Gratuit |
| Netlify (sites municipaux) | Gratuit (tier starter) |
| **Total** | **~5 €/mois TTC** |
