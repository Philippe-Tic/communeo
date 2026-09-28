# Installation du serveur Communeo chez OVH — pas à pas

VPS-2 OVH (Gravelines, Ubuntu 26.04, options : snapshot), sauvegardes dans l'Object Storage OVH (Paris), DNS communeo.fr chez Netlify.
Compter environ 2 heures. Chaque étape se termine par une **vérification** : ne pas passer à la suite tant
qu'elle n'est pas bonne. Référence complète : [DEPLOYMENT.md](../DEPLOYMENT.md), exploitation : [PRODUCTION.md](../PRODUCTION.md).

Dans les commandes, remplacer `IP_DU_VPS` par l'adresse IPv4 du VPS (e-mail d'OVH).

---

## Étape 1 — Se connecter au VPS

Depuis le terminal du Mac :

```bash
ssh ubuntu@IP_DU_VPS
```

Avec la clé SSH ajoutée à la commande : connexion directe. Sinon : mot de passe reçu d'OVH (il peut demander
d'en choisir un nouveau : le noter dans le gestionnaire de mots de passe).

**Vérification** : le prompt affiche `ubuntu@vps-…:~$`.

---

## Étape 2 — Préparer le serveur (≈ 3 min)

```bash
# Mises à jour (DEBIAN_FRONTEND : pas de question pendant la mise à jour, normal sur Ubuntu)
sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y

# Pare-feu : SSH, HTTP et HTTPS seulement (SSH autorisé AVANT l'activation)
sudo apt install -y ufw
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw --force enable

# Docker, utilisable par l'utilisateur ubuntu
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu

# Swap de 4 Go (les builds des sites consomment de la mémoire par pics)
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Se déconnecter puis se reconnecter (droits Docker) :

```bash
exit
ssh ubuntu@IP_DU_VPS
docker --version && docker compose version && sudo ufw status
```

**Vérification** : une version de Docker et de Docker Compose s'affiche ; `ufw` est `active` avec `OpenSSH`, `80/tcp`, `443/tcp`.

---

## Étape 3 — DNS (dans Netlify)

**Domains → communeo.fr → DNS settings → Add new record**, deux fois :

| Type | Name | Value |
|------|------|-------|
| A | `app` | IP_DU_VPS |
| A | `preview` | IP_DU_VPS |

**Vérification** (sur le Mac, après quelques minutes) :
x@
```bash
dig +short app.communeo.fr && dig +short preview.communeo.fr
```

Les deux renvoient l'IP du VPS.

---

## Étape 4 — Récupérer les accès (≈ 20 min)

À garder dans le gestionnaire de mots de passe, avec les clés S3 :

1. **Jeton Netlify** : Netlify → avatar → **User settings → Applications → Personal access tokens → New access token**
   (sans expiration, ou longue).
2. **Resend** (resend.com, e-mails de la plateforme) :
   - **Domains → Add domain** → `communeo.fr`, région **EU** ;
   - Resend affiche des enregistrements DNS (MX, TXT pour SPF et DKIM) : les ajouter un par un dans la zone
     communeo.fr de Netlify, puis **Verify** dans Resend (quelques minutes) ;
   - **API Keys → Create API Key** (droit « Sending access »).

Pas de jeton GitHub : le dépôt et les images de la plateforme sont publics.

**Vérification** : deux jetons notés ; le domaine est « Verified » dans Resend.

---

## Étape 5 — Dossier et fichiers de la plateforme

Sur le VPS :

```bash
mkdir -p ~/communeo && cd ~/communeo
curl -fsSLO https://raw.githubusercontent.com/Philippe-Tic/communeo/main/docker-compose.yml
curl -fsSLO https://raw.githubusercontent.com/Philippe-Tic/communeo/main/deploy/server/deploy.sh && chmod +x deploy.sh
```

**Vérification** : `ls` affiche `docker-compose.yml  deploy.sh`.

---

## Étape 6 — Le fichier `.env` (secrets)

Génère tous les secrets d'un coup (les valeurs entre `$(…)` sont calculées automatiquement) :

```bash
cd ~/communeo
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
COMMUNEO_IBAN=
COMMUNEO_BIC=

SEED_SUPER_ADMIN_EMAIL=
SEED_SUPER_ADMIN_PASSWORD=

BACKUP_S3_BUCKET=communeo-s3
BACKUP_S3_PROVIDER=Other
BACKUP_S3_ENDPOINT=https://s3.eu-west-par.io.cloud.ovh.net
BACKUP_S3_REGION=eu-west-par
BACKUP_S3_ACCESS_KEY_ID=
BACKUP_S3_SECRET_ACCESS_KEY=
BACKUP_PASSPHRASE=$(openssl rand -base64 48)
ENV
chmod 600 .env
```

Puis compléter à la main les lignes vides :

```bash
nano .env        # enregistrer : Ctrl+O puis Entrée ; quitter : Ctrl+X
```

| Variable | Valeur |
|----------|--------|
| `NETLIFY_TOKEN` | jeton Netlify (étape 4) |
| `RESEND_API_KEY` | clé Resend (étape 4) |
| `SIGNUP_NOTIFY_EMAIL` | adresse de l'équipe qui reçoit inscriptions, devis, demandes |
| `HOSTING_NAME`, `HOSTING_ADDRESS`, `HOSTING_PHONE` | hébergeur **des sites publics** pour les mentions légales des communes : Netlify (nom et adresse tels qu'indiqués sur leur page légale) |
| `COMMUNEO_LEGAL_NAME`, `COMMUNEO_LEGAL_ADDRESS`, `COMMUNEO_SIRET`, `COMMUNEO_BILLING_EMAIL` | ton identité sur les devis |
| `COMMUNEO_VAT_RATE` | `0` en micro-entreprise (franchise de TVA), `0.2` sinon |
| `COMMUNEO_IBAN`, `COMMUNEO_BIC` | le compte bancaire professionnel imprimé sur les factures (les mairies paient par virement) |
| `SEED_SUPER_ADMIN_EMAIL`, `SEED_SUPER_ADMIN_PASSWORD` | ton compte de l'équipe Communeo (mot de passe fort, ≥ 10 caractères) |
| `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` | clés de l'utilisateur S3 OVH |

**Important** : copier tout le contenu du `.env` dans le gestionnaire de mots de passe (`cat .env`).
Sans `BACKUP_PASSPHRASE`, les sauvegardes sont illisibles ; sans `ENCRYPTION_KEY`, les tokens d'API aussi.

**Vérification** : `grep -c '=$' .env` renvoie `0` (plus aucune ligne vide).

---

## Étape 7 — Certificats HTTPS (Let's Encrypt)

nginx a besoin des certificats pour démarrer : on les obtient une fois, avant le premier lancement
(remplacer l'adresse e-mail) :

```bash
cd ~/communeo
docker volume create communeo_certbot-certs && docker volume create communeo_certbot-webroot
docker run --rm -p 80:80 -v communeo_certbot-certs:/etc/letsencrypt certbot/certbot certonly --standalone \
  --non-interactive --agree-tos -m ton-adresse@communeo.fr \
  -d app.communeo.fr -d preview.communeo.fr --cert-name app.communeo.fr
docker run --rm -v communeo_certbot-certs:/etc/letsencrypt alpine sh -c \
  'ln -sfn app.communeo.fr /etc/letsencrypt/live/preview.communeo.fr'
```

**Vérification** : certbot affiche `Successfully received certificate`. En cas d'échec, le DNS de l'étape 3
n'est pas encore propagé : attendre et relancer.

---

## Étape 8 — Premier lancement

```bash
cd ~/communeo && ./deploy.sh latest
```

Le téléchargement des images prend quelques minutes, puis le script attend que Strapi et nginx soient sains.

**Vérification** :

```bash
docker compose ps                  # postgres, strapi, preview, nginx, backup : « healthy » ; worker, certbot : « running »
docker compose logs backup         # « [backup] … terminée » et « copie envoyée vers communeo-s3/communeo (chiffrée) »
```

Puis dans le navigateur : **https://app.communeo.fr** → connexion avec `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD`.

Une fois connecté, retirer le mot de passe du `.env` (le compte existe maintenant) :

```bash
sed -i 's/^SEED_SUPER_ADMIN_PASSWORD=.*/SEED_SUPER_ADMIN_PASSWORD=/' .env
```

---

## Étape 9 — Déploiement automatique depuis GitHub

Sur le **Mac**, créer une clé SSH dédiée au déploiement :

```bash
ssh-keygen -t ed25519 -N '' -C deploy-communeo -f ~/.ssh/communeo_deploy
cat ~/.ssh/communeo_deploy.pub            # clé publique : à ajouter sur le VPS
ssh-keyscan IP_DU_VPS                      # à copier dans DEPLOY_KNOWN_HOSTS
```

Sur le **VPS**, autoriser cette clé :

```bash
echo 'COLLER_ICI_LA_CLE_PUBLIQUE' >> ~/.ssh/authorized_keys
```

Dans **GitHub → dépôt communeo → Settings → Secrets and variables → Actions** :

| Onglet | Nom | Valeur |
|--------|-----|--------|
| Variables | `DEPLOY_HOST` | IP_DU_VPS |
| Variables | `DEPLOY_USER` | `ubuntu` |
| Variables | `DEPLOY_PATH` | `/home/ubuntu/communeo` |
| Secrets | `DEPLOY_SSH_KEY` | contenu de `~/.ssh/communeo_deploy` (la clé **privée**, sur le Mac : `cat ~/.ssh/communeo_deploy`) |
| Secrets | `DEPLOY_KNOWN_HOSTS` | sortie de `ssh-keyscan IP_DU_VPS` |

**Vérification** : GitHub → **Actions → Déploiement → Run workflow** (laisser la version vide) : les jobs
passent au vert jusqu'à « Serveur de production ». Ensuite, chaque commit sur `main` se déploie tout seul.

---

## Étape 10 — Supervision

Compte gratuit sur UptimeRobot (ou Better Stack), 3 moniteurs HTTP(S), alerte par e-mail :

- `https://app.communeo.fr/healthz`
- `https://app.communeo.fr/api/health`
- un site de commune, quand il y en aura un

---

## Étape 11 — Le lendemain

```bash
ssh ubuntu@IP_DU_VPS
cd ~/communeo && docker compose logs --since 24h backup
```

**Vérification** : la sauvegarde de 03:15 est « terminée » avec « copie envoyée » ; dans l'espace client OVH,
le conteneur `communeo-s3` contient des fichiers (noms illisibles : c'est le chiffrement).

---

## Récapitulatif de ce qui doit être gardé hors du serveur

- Le contenu complet du `.env` (surtout `BACKUP_PASSPHRASE` et `ENCRYPTION_KEY`)
- Les clés S3, les jetons Netlify et Resend
- La clé SSH de déploiement (`~/.ssh/communeo_deploy`)
