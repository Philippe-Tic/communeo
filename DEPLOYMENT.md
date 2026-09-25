# Mise en production — Communeo V2

Installation initiale du serveur. L'exploitation courante (déployer, revenir en arrière, sauvegardes,
restauration, supervision, incidents) est dans [PRODUCTION.md](PRODUCTION.md).

## Architecture

```
                         ┌──────────────── VPS (Scaleway ou OVH, France) ─────────────────┐
app.communeo.fr ────────►│ nginx « web » :443 ─┬─ /            admin (fichiers statiques)  │
                         │  (admin compilée,   ├─ /api, /uploads, /admin  → strapi :1337   │
preview.communeo.fr ────►│   TLS Let's Encrypt)└─ preview.*   → preview :4321 (SSR)       │
                         │                                                                 │
                         │ strapi ── postgres (contenus + file des builds pg-boss)         │
                         │ worker ── construit chaque site (Astro) et le publie ───────────┼──► Netlify
                         │ backup ── chaque nuit : base + fichiers, sur place et vers S3 ──┼──► stockage objet
                         │ certbot ── renouvelle les certificats                           │
                         └─────────────────────────────────────────────────────────────────┘
<commune>.communeo.fr et domaines des communes ─────────────────────────────────────► Netlify
```

Images : publiées sur GHCR par `.github/workflows/deploy.yml` (`ghcr.io/philippe-tic/communeo-{backend,worker,preview,web,backup}`),
une version par commit (`IMAGE_TAG`). Le serveur n'a pas le code source : seulement `docker-compose.yml`, `deploy.sh` et `.env`.

## 1. Le serveur

- **Taille** : 4 vCPU et 8 Go de RAM au minimum (le worker construit les sites avec Astro), 80 Go de disque.
  Ubuntu 24.04. Hébergeur en France : Scaleway ou OVH.
- **Sécuriser** : utilisateur `deploy` (sudo, clé SSH), pare-feu, accès root coupé.

```bash
ssh root@IP_DU_VPS
apt update && apt upgrade -y
adduser deploy && usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

apt install -y ufw && ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
curl -fsSL https://get.docker.com | sh && usermod -aG docker deploy

# Swap : les builds de sites consomment de la mémoire par pics
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Tester `ssh deploy@IP_DU_VPS` depuis un autre terminal, **puis seulement** couper root :
`sed -i 's/^PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config && systemctl restart ssh`.

## 2. DNS

La zone communeo.fr est gérée par Netlify (les adresses des sites y sont créées automatiquement). Y ajouter :

| Nom | Type | Valeur |
|-----|------|--------|
| `app.communeo.fr` | A | IP du VPS |
| `preview.communeo.fr` | A | IP du VPS |

L'admin et la preview partagent le même domaine parent : le cookie de la preview est envoyé dans le
panneau d'aperçu de l'éditeur.

## 3. Fichiers et secrets

```bash
ssh deploy@IP_DU_VPS
mkdir -p ~/communeo && cd ~/communeo
# docker-compose.yml et deploy.sh : copiés par le workflow à chaque déploiement ; la première fois, à la main
curl -fsSLO https://raw.githubusercontent.com/Philippe-Tic/communeo/main/docker-compose.yml
curl -fsSLO https://raw.githubusercontent.com/Philippe-Tic/communeo/main/deploy/server/deploy.sh && chmod +x deploy.sh
# Accès aux images (dépôt privé) : jeton GitHub avec le droit read:packages
echo "$GHCR_TOKEN" | docker login ghcr.io -u philippe-tic --password-stdin
```

Créer `~/communeo/.env` (droits 600). Les secrets se génèrent tous d'avance, **tokens d'API compris** :
Strapi crée au premier démarrage le « Build Token » et le « Preview Token » avec ces valeurs.

```bash
secret() { openssl rand -hex 32; }
cat > .env <<ENV
DOMAIN=app.communeo.fr
PREVIEW_DOMAIN=preview.communeo.fr
SITES_DOMAIN=communeo.fr

POSTGRES_PASSWORD=$(secret)
APP_KEYS=$(secret),$(secret)
API_TOKEN_SALT=$(secret)
ADMIN_JWT_SECRET=$(secret)
TRANSFER_TOKEN_SALT=$(secret)
JWT_SECRET=$(secret)
ENCRYPTION_KEY=$(secret)
STRAPI_API_TOKEN=$(openssl rand -hex 64)
PREVIEW_API_TOKEN=$(openssl rand -hex 64)
WORKER_SECRET=$(secret)
PREVIEW_SECRET=$(secret)

NETLIFY_TOKEN=
RESEND_API_KEY=
EMAIL_DEFAULT_FROM=noreply@communeo.fr
SIGNUP_NOTIFY_EMAIL=

HOSTING_NAME=
HOSTING_ADDRESS=
HOSTING_PHONE=
COMMUNEO_LEGAL_NAME=
COMMUNEO_LEGAL_ADDRESS=
COMMUNEO_SIRET=
COMMUNEO_BILLING_EMAIL=
COMMUNEO_VAT_RATE=0

# Premier démarrage : compte de l'équipe Communeo
SEED_SUPER_ADMIN_EMAIL=
SEED_SUPER_ADMIN_PASSWORD=

# Sauvegardes hors du serveur (stockage objet S3), chiffrées
BACKUP_S3_BUCKET=
BACKUP_S3_PROVIDER=Scaleway
BACKUP_S3_ENDPOINT=s3.fr-par.scw.cloud
BACKUP_S3_REGION=fr-par
BACKUP_S3_ACCESS_KEY_ID=
BACKUP_S3_SECRET_ACCESS_KEY=
BACKUP_PASSPHRASE=$(openssl rand -base64 48)
ENV
chmod 600 .env
```

> Garder une copie de `.env` hors du serveur (gestionnaire de mots de passe) : **`BACKUP_PASSPHRASE`
> est indispensable pour relire les sauvegardes**, `ENCRYPTION_KEY` pour les tokens d'API.

- **Netlify** : jeton personnel du compte qui gère la zone communeo.fr (`NETLIFY_TOKEN`).
- **Resend** : domaine communeo.fr vérifié (enregistrements SPF/DKIM dans la zone Netlify), clé `RESEND_API_KEY`.
- **Sauvegardes** : bucket de stockage objet (Scaleway Object Storage ou OVH), clé d'accès limitée à ce bucket.
  OVH : `BACKUP_S3_PROVIDER=Other`, `BACKUP_S3_ENDPOINT=s3.gra.io.cloud.ovh.net`, `BACKUP_S3_REGION=gra`.

## 4. Certificats

nginx a besoin des certificats pour démarrer : les obtenir une fois, avant le premier lancement.

```bash
docker volume create communeo_certbot-certs && docker volume create communeo_certbot-webroot
docker run --rm -p 80:80 -v communeo_certbot-certs:/etc/letsencrypt certbot/certbot certonly --standalone \
  --non-interactive --agree-tos -m equipe@communeo.fr -d app.communeo.fr -d preview.communeo.fr --cert-name app.communeo.fr
docker run --rm -v communeo_certbot-certs:/etc/letsencrypt alpine sh -c \
  'ln -sfn app.communeo.fr /etc/letsencrypt/live/preview.communeo.fr'
```

Le service `certbot` les renouvelle ensuite ; nginx se recharge toutes les 12 heures pour les prendre en compte.

## 5. Premier lancement

```bash
cd ~/communeo && ./deploy.sh latest
```

Vérifier : `https://app.communeo.fr` (connexion avec le compte `SEED_SUPER_ADMIN_*`), `docker compose ps`
(tous les services `healthy`), `docker compose logs backup` (première sauvegarde faite), puis retirer
`SEED_SUPER_ADMIN_PASSWORD` du `.env`.

## 6. Déploiement continu

Dans GitHub, **Settings → Secrets and variables → Actions** (au niveau du dépôt : la condition du job de
déploiement lit `DEPLOY_HOST`, qu'une variable d'environnement ne fournirait pas). L'environnement `production`
(créé au premier déploiement) peut en plus exiger une approbation manuelle :

| Type | Nom | Valeur |
|------|-----|--------|
| Variable | `DEPLOY_HOST` | IP ou nom du VPS |
| Variable | `DEPLOY_USER` | `deploy` |
| Variable | `DEPLOY_PATH` | `/home/deploy/communeo` |
| Variable | `VITE_TERMS_URL` | adresse des conditions d'utilisation (#315) |
| Secret | `DEPLOY_SSH_KEY` | clé privée dédiée au déploiement (sa clé publique dans `~deploy/.ssh/authorized_keys`) |
| Secret | `DEPLOY_KNOWN_HOSTS` | sortie de `ssh-keyscan IP_DU_VPS` |

Ensuite, chaque commit sur `main` : images construites et publiées, stack testée de bout en bout sur la CI
(`deploy/e2e/run.sh`), puis déployée par `deploy.sh` (retour automatique à la version précédente si Strapi
ou nginx ne démarrent pas sains). Sans `DEPLOY_HOST`, le workflow s'arrête après les tests.

## 7. Supervision

- Contrôles de santé Docker sur strapi, preview, nginx et backup (`docker compose ps`).
- Moniteur externe gratuit (UptimeRobot, Better Stack…), alerte par e-mail : `https://app.communeo.fr/healthz`
  (nginx), `https://app.communeo.fr/api/health` (Strapi et sa base) et un site de commune (Netlify).
- Sauvegardes : le service `backup` devient `unhealthy` si la dernière réussie date de plus de 26 heures.

## Essayer la stack en local

```bash
deploy/e2e/run.sh              # construit les images, démarre, publie une commune, sauvegarde, restaure
E2E_KEEP=1 deploy/e2e/run.sh   # garde la stack ouverte sur http://localhost:8088 (equipe@communeo.test)
```
