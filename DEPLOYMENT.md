# Mise en production — Communeo V2

Installation initiale du serveur. Pas à pas pour OVH (VPS-2, Object Storage, DNS chez Netlify) :
[deploy/INSTALL-OVH.md](deploy/INSTALL-OVH.md). L'exploitation courante (déployer, revenir en arrière, sauvegardes,
restauration, supervision, incidents) est dans [PRODUCTION.md](PRODUCTION.md).

## Architecture

```
                           ┌──────────────── VPS (OVH, Gravelines) ─────────────────────────────┐
app.communeo.fr ──────────►│ caddy « web » :443 ─┬─ /            admin (fichiers statiques)      │
                           │  (admin compilée,   ├─ /api, /uploads, /admin  → strapi :1337       │
preview.communeo.fr ──────►│   certificats Let's ├─ preview.*   → preview :4321 (SSR)           │
                           │   Encrypt)          └─ origine.*   → /srv/sites/<slug>/ (volume)   │
origine.communeo.fr ──────►│                        (en-tête secret du CDN, sinon 403)          │
  (CDN Bunny, #382)        │ strapi ── postgres (contenus + file des builds pg-boss)             │
                           │ worker ── construit chaque site (Astro) et le publie ───────────────┼──► Netlify
                           │           (sans NETLIFY_TOKEN : volume sites + rechargement Caddy)  │
                           │ backup ── chaque nuit : base + fichiers, sur place et vers S3 ──────┼──► stockage objet
                           │           alerte disque (e-mail à l'équipe)                         │
                           └─────────────────────────────────────────────────────────────────────┘
<commune>.communeo.fr et domaines des communes ─────────────────────────────────────────► Netlify
```

Caddy (#381) a remplacé nginx et certbot : il obtient et renouvelle seul les certificats (volume `caddy-data`),
sa configuration est dans l'image « web » (`caddy/Caddyfile`). Les sites des communes restent chez Netlify
jusqu'à la bascule (#383) : l'adaptateur Bunny (#382, section 10) est prêt mais ne sert qu'avec
`SITES_PUBLISHER=bunny`. Après la bascule :

```
<commune>.communeo.fr, www.<domaine de la commune> ──► Bunny CDN (une Pull Zone par commune, cache, https)
                                                        └─► https://origine.communeo.fr/sites/<slug>/ (en-tête secret)
<domaine nu de la commune> (A → VPS) ──► Caddy : 301 vers www.<domaine> (certificat à la demande)
```

Images : publiées sur GHCR par `.github/workflows/deploy.yml` (`ghcr.io/philippe-tic/communeo-{backend,worker,preview,web,backup}`),
une version par commit (`IMAGE_TAG`, tenue à jour dans le `.env` par `deploy.sh`). Le serveur n'a pas le code source : seulement `docker-compose.yml`, `deploy.sh` et `.env`. Après une modification du `.env` : `./deploy.sh restart`.

## 1. Le serveur

- **Taille** : 4 vCPU, 8 Go de RAM, 75 Go de disque (OVH VPS-2 ou équivalent Scaleway), Ubuntu 26.04 LTS,
  datacenter en France. Mesuré : ~600 Mo de RAM au repos, ~0,5 Go de plus pendant un build.
- **Capacité** : le disque limite en premier (photos et PDF des communes, 0,2 à 1 Go chacune, plus leur copie
  miroir) : environ **30 à 100 communes** sur 75 Go. Au-delà : disque supplémentaire, ou fichiers envoyés
  directement dans le stockage objet (provider d'upload S3 de Strapi), ou serveur plus grand.
- **OVH** : l'utilisateur par défaut est `ubuntu` (sudo) et non `root` ; il peut servir d'utilisateur de
  déploiement (`DEPLOY_USER=ubuntu`, `DEPLOY_PATH=/home/ubuntu/communeo`).
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
| `origine.communeo.fr` | A | IP du VPS (origine des sites, #381) |

Caddy demande les trois certificats à son premier démarrage : les enregistrements doivent déjà pointer vers
le VPS (sinon il réessaie seul, avec un délai croissant).

Ne pas mettre le `.env` de production dans le dépôt : tous les `.env*` sont ignorés par git (sauf les
`.env.example`), et un fichier ignoré peut être écrasé sans avertissement par un changement de branche.
Sa place : le serveur et un gestionnaire de mots de passe.

L'admin et la preview partagent le même domaine parent : le cookie de la preview est envoyé dans le
panneau d'aperçu de l'éditeur.

## 3. Fichiers et secrets

```bash
ssh deploy@IP_DU_VPS
mkdir -p ~/communeo && cd ~/communeo
# docker-compose.yml et deploy.sh : copiés par le workflow à chaque déploiement ; la première fois, à la main
curl -fsSLO https://raw.githubusercontent.com/Philippe-Tic/communeo/main/docker-compose.yml
curl -fsSLO https://raw.githubusercontent.com/Philippe-Tic/communeo/main/deploy/server/deploy.sh && chmod +x deploy.sh
# Images publiques sur GHCR (dépôt public) : pas de docker login
```

Créer `~/communeo/.env` (droits 600). Les secrets se génèrent tous d'avance, **tokens d'API compris** :
Strapi crée au premier démarrage le « Build Token » et le « Preview Token » avec ces valeurs.

```bash
secret() { openssl rand -hex 32; }
cat > .env <<ENV
DOMAIN=app.communeo.fr
PREVIEW_DOMAIN=preview.communeo.fr
ORIGIN_DOMAIN=origine.communeo.fr
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
# En-tête secret ajouté par le CDN (Bunny, #382) vers l'origine des sites : hexadécimal uniquement
SITES_ORIGIN_SECRET=$(secret)
# Alerte disque (e-mail à SIGNUP_NOTIFY_EMAIL), en % du disque
DISK_ALERT_THRESHOLD=85

NETLIFY_TOKEN=
# Bunny CDN (#382, section 10) : vides jusqu'à la bascule (#383) ; SITES_PUBLISHER=bunny pour l'activer
SITES_PUBLISHER=
BUNNY_API_KEY=
BUNNY_DNS_ZONE_ID=
RESEND_API_KEY=
EMAIL_DEFAULT_FROM=noreply@communeo.fr
SIGNUP_NOTIFY_EMAIL=
SIGNUP_TEST_EMAILS=

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
- **Sauvegardes** : bucket de stockage objet dans **une autre région que le serveur**, clé d'accès limitée à ce bucket.
  Scaleway : Object Storage, valeurs ci-dessus. OVH : Public Cloud → Object Storage (utilisateur S3 + conteneur
  « Standard »), `BACKUP_S3_PROVIDER=Other`, `BACKUP_S3_ENDPOINT=https://s3.sbg.io.cloud.ovh.net`, `BACKUP_S3_REGION=sbg`
  (région du conteneur : `sbg`, `gra`, `rbx`…).

## 4. Certificats

Rien à faire : Caddy obtient les certificats Let's Encrypt de `DOMAIN`, `PREVIEW_DOMAIN` et `ORIGIN_DOMAIN`
à son premier démarrage (ports 80 et 443 ouverts, DNS de l'étape 2 en place), puis les renouvelle seul.
Ils sont gardés dans le volume `communeo_caddy-data` : ne pas le supprimer (Let's Encrypt limite le nombre
de certificats par semaine). Suivi : `docker compose logs caddy | grep -i certificate`.

## 5. Premier lancement

```bash
cd ~/communeo && ./deploy.sh latest
```

Vérifier : `https://app.communeo.fr` (connexion avec le compte `SEED_SUPER_ADMIN_*`), `docker compose ps`
(tous les services `healthy`), `curl -sI https://origine.communeo.fr/sites/x/` (403 : origine fermée sans le CDN), `docker compose logs backup` (première sauvegarde faite), puis retirer
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
(`deploy/e2e/run.sh`), puis déployée par `deploy.sh` (retour automatique à la version précédente, avec son
`docker-compose.yml`, si Strapi ou Caddy ne démarrent pas sains). Sans `DEPLOY_HOST`, le workflow s'arrête après les tests.

## 7. Supervision

- Contrôles de santé Docker sur strapi, preview, caddy et backup (`docker compose ps`).
- Moniteur externe gratuit (UptimeRobot, Better Stack…), alerte par e-mail : `https://app.communeo.fr/healthz`
  (Caddy), `https://app.communeo.fr/api/health` (Strapi et sa base) et un site de commune (Netlify).
- Sauvegardes : le service `backup` devient `unhealthy` si la dernière réussie date de plus de 26 heures.
- Disque : le service `backup` le vérifie toutes les 15 minutes ; au-delà de `DISK_ALERT_THRESHOLD` % (85 par
  défaut), e-mail à `SIGNUP_NOTIFY_EMAIL` (par Resend), renvoyé chaque jour tant que ça dure.
- Le worker est limité à 2 cœurs sur 4 (`cpus` dans docker-compose.yml) : un build ne ralentit pas l'admin.

## 8. Origine des sites des communes (#381)

Caddy sert `https://origine.communeo.fr/sites/<slug>/…` depuis le volume `sites` (`/srv/sites/<slug>/`), écrit
par le worker quand il publie sans `NETLIFY_TOKEN` (`PUBLISH_DIR`, `LocalPublisher` de `packages/pipeline`) :

- `/sites/<slug>/x` sert `x`, `x.html` ou `x/index.html` ; sinon la page `404.html` du site, en 404 ;
- cache : pages et autres fichiers `public, max-age=0, must-revalidate` (le CDN est vidé à chaque publication),
  `/_astro/*` un an, `immutable` ;
- **origine protégée** : seules les requêtes portant `X-Communeo-Origine: <SITES_ORIGIN_SECRET>` sont servies
  (le CDN l'ajoute, #382) ; sinon 403. Secret vide : tout est refusé ;
- **règles par site** : `/srv/sites/<slug>/.regles/site.caddy`, réécrit à chaque publication (jamais servi),
  importé dans le bloc de l'origine du `caddy/Caddyfile` et appliqué avant les fichiers :
  `X-Robots-Tag: noindex, nofollow` pendant l'essai, redirections 301 de l'ancien site (#335, destinations
  relatives). La redirection vers l'adresse principale (domaine de la commune) n'est pas faite ici mais par Bunny,
  avant son cache (section 10) : Bunny n'envoie pas `X-Forwarded-Host` (seulement `CDN-Host`) et transmet tel quel
  celui d'un visiteur, qui ferait mettre en cache une redirection pour tout le monde. Générées par `caddySiteRules` (`packages/pipeline/src/publisher/caddy.ts`,
  format détaillé en tête du fichier) ;
- après chaque publication, le worker recharge Caddy par son API d'administration (`CADDY_ADMIN_URL`,
  `http://caddy:2019`, port jamais publié : réseau interne de la stack seulement). Une règle refusée par Caddy :
  la version précédente du site est remise en place et la mise en ligne échoue (nouvelle tentative).

## 9. Passage de nginx + certbot à Caddy (#381), sans coupure

À faire **avant de merger** la PR :

1. **DNS** (Netlify → communeo.fr → DNS settings) : `A` `origine` → IP du VPS. Vérifier
   `dig +short origine.communeo.fr`.
2. **`.env` du serveur** (`ssh ubuntu@IP_DU_VPS`, `cd ~/communeo`, `nano .env`), ajouter :
   ```
   ORIGIN_DOMAIN=origine.communeo.fr
   SITES_ORIGIN_SECRET=<résultat de : openssl rand -hex 32>
   DISK_ALERT_THRESHOLD=85
   ```
   (`SIGNUP_NOTIFY_EMAIL` et `RESEND_API_KEY` y sont déjà : l'alerte disque les utilise.) Mettre à jour la copie
   du `.env` dans le gestionnaire de mots de passe. Pas de `./deploy.sh restart` : le déploiement s'en charge.
3. **Filet de sécurité du retour arrière** : `cp docker-compose.yml .deployed-compose.yml` (le `deploy.sh` actuel
   ne garde pas cette copie ; sans elle, le nouveau la récupère sur GitHub).

Au merge, le workflow copie le nouveau `docker-compose.yml` et `deploy.sh`, puis `deploy.sh` lance
`docker compose up -d --remove-orphans` : les conteneurs `nginx` et `certbot` (services retirés) sont arrêtés et
supprimés **avant** le démarrage de `caddy`, qui reprend les ports 80 et 443 et obtient aussitôt les certificats
d'app, de preview et d'origine (quelques secondes pendant lesquelles l'admin ne répond pas). Si Strapi ou Caddy ne
deviennent pas sains, `deploy.sh` remet la version précédente avec son `docker-compose.yml` (nginx et certbot, dont
les volumes de certificats sont toujours là).

Après le déploiement :

```bash
docker compose ps                                            # caddy « healthy », plus de nginx ni de certbot
docker compose logs caddy | grep -i "certificate obtained"   # app, preview et origine
curl -sI https://app.communeo.fr/healthz                     # 200
curl -sI https://origine.communeo.fr/sites/x/                # 403
```

Puis dans le navigateur : admin, connexion, aperçu d'une page (preview), envoi d'une image dans la médiathèque.
Deux semaines plus tard, si tout va bien : `docker volume rm communeo_certbot-certs communeo_certbot-webroot`
(gardés jusque-là pour un retour arrière vers nginx).

## 10. Bunny CDN devant l'origine (#382)

`BunnyPublisher` (`packages/pipeline/src/publisher/bunny.ts`) remplace Netlify quand **`SITES_PUBLISHER=bunny`**
et que `BUNNY_API_KEY`, `SITES_ORIGIN_SECRET` et `ORIGIN_DOMAIN` sont définis (sinon : publication indisponible,
jamais un repli silencieux vers Netlify). Sans `SITES_PUBLISHER=bunny`, rien ne change.

| Variable | Où | Rôle |
|----------|----|------|
| `SITES_PUBLISHER` | strapi, worker | `bunny` pour publier chez Bunny ; vide : Netlify (`NETLIFY_TOKEN`) ou le volume seul |
| `BUNNY_API_KEY` | strapi, worker | clé du compte Bunny (Account settings → API key), jamais dans le dépôt |
| `BUNNY_DNS_ZONE_ID` | strapi, worker | identifiant de la zone Bunny DNS de `SITES_DOMAIN` (adresses `<slug>.communeo.fr`) |
| `SITES_ORIGIN_SECRET` | strapi, worker, caddy | en-tête `X-Communeo-Origine` ajouté par chaque Pull Zone, exigé par l'origine |
| `ORIGIN_DOMAIN` | strapi, worker, caddy | origine des sites (`origine.communeo.fr`) ; ses adresses IP sont aussi la cible des domaines nus |

Ce que fait l'adaptateur :

- **une Pull Zone par commune** (`communeo-<slug>`, `dev-communeo-<slug>` hors production), origine
  `https://origine.communeo.fr/sites/<slug>/`, régions **Europe + Amérique du Nord** (même prix ; Antilles,
  Saint-Pierre-et-Miquelon), les autres régions (plus chères) servies depuis l'Europe ; `UseStaleWhileOffline` et
  `UseStaleWhileUpdating` ; cache de Bunny d'un an **vidé à chaque publication**, erreurs jamais en cache, une
  entrée de cache par requête (`/?p=12` redirige, `/` non) ; journaux sans adresse IP complète ;
- **règles de la Pull Zone** (Edge Rules `Communeo : …`, tenues à jour à chaque publication, les autres jamais
  touchées) : en-tête secret vers l'origine, redirection 301 des autres adresses vers le domaine vérifié (avant le
  cache), `X-Robots-Tag: noindex` sur l'adresse technique `communeo-<slug>.b-cdn.net` ;
- **adresse `<slug>.communeo.fr`** : ajoutée à la Pull Zone, CNAME vers `communeo-<slug>.b-cdn.net` dans la zone
  Bunny DNS, certificat Let's Encrypt gratuit de Bunny puis https forcé. Tant que la zone communeo.fr n'est pas
  servie par Bunny (avant #383), le certificat échoue sans bloquer : il est redemandé à chaque publication. Le
  site se teste sur `https://communeo-<slug>.b-cdn.net` ;
- **publication** : écriture atomique dans le volume `sites` (logique de `LocalPublisher`, règles Caddy du site,
  rechargement de Caddy), puis vidage du cache de la Pull Zone (un échec fait échouer la mise en ligne, relancée) ;
- **domaine de la commune** : sous-domaine (`www.mairie-x.fr`) → un CNAME vers la Pull Zone. **Domaine nu**
  (`mairie-x.fr`) : Bunny ne peut le servir que si la commune utilise Bunny DNS ; la commune crée donc un CNAME
  `www` vers la Pull Zone et un enregistrement **A** `@` vers le serveur (adresses de `ORIGIN_DOMAIN`), et Caddy
  redirige `mairie-x.fr` vers `www.mairie-x.fr` (bloc `https://` du Caddyfile, certificat à la demande autorisé par
  `GET /api/domain/certificate-check` de Strapi pour les seuls domaines vérifiés d'une commune, fermé au public).
  Le site est alors servi sur `www.mairie-x.fr` (adresse canonique des pages) ;
- **suppression** (commune supprimée, fin d'essai) : Pull Zone, CNAME de la commune et dossier du site. Strapi
  monte le volume `sites` pour supprimer ce dossier (il n'y écrit rien d'autre).

Limites du compte Bunny (documentation « CDN Limits and Defaults ») : **500 Pull Zones** par compte, 10 adresses par
Pull Zone, 50 Edge Rules par Pull Zone ; Bunny DNS : 500 zones, 5 000 enregistrements par zone. Les limites sont
relevées sur demande au support : le demander dès 300 communes.

Vérification sur le serveur, sans rien modifier (copié avec `deploy.sh` par le workflow) :

```bash
./bunny-check.sh           # clé, nombre de Pull Zones, zone DNS, origine fermée sans secret / ouverte avec
./bunny-check.sh lyon      # et le site de la commune « lyon » servi par l'origine
```

### Avant le merge de #382

Rien d'obligatoire : sans `SITES_PUBLISHER=bunny`, la production reste sur Netlify. Le merge ajoute seulement le
volume `sites` à Strapi, la route d'autorisation des certificats et le bloc des domaines nus dans Caddy (sans effet
tant qu'aucun domaine nu ne pointe vers le serveur).

### À la bascule (#383)

1. Bunny → **DNS** → **Add DNS Zone** `communeo.fr` (copier d'abord les enregistrements de la zone Netlify :
   `app`, `preview`, `origine`, MX, SPF/DKIM de Resend…), noter son **identifiant** (URL du tableau de bord ou
   `GET /dnszone`).
2. `.env` du serveur (et sa copie dans le gestionnaire de mots de passe) :
   ```
   BUNNY_API_KEY=<clé du compte Bunny>
   BUNNY_DNS_ZONE_ID=<identifiant de la zone communeo.fr>
   ```
   puis `./bunny-check.sh` (tout en ✓, sauf les serveurs de noms tant que la délégation n'est pas faite).
3. `SITES_PUBLISHER=bunny` dans le `.env`, `./deploy.sh restart`, puis une mise en ligne de chaque commune :
   Pull Zones, adresses et enregistrements DNS créés ; tester sur `https://communeo-<slug>.b-cdn.net`.
4. Délégation de communeo.fr vers Bunny DNS (serveurs `kiki.bunny.net` et `coco.bunny.net` chez le registraire) ;
   une nouvelle mise en ligne demande les certificats des adresses `<slug>.communeo.fr`.
5. Communes avec un domaine : nouvelles instructions DNS (CNAME `www` vers la Pull Zone ; pour un domaine nu,
   A vers le serveur au lieu de Netlify), puis vérification depuis l'admin.

## Essayer la stack en local

```bash
deploy/e2e/run.sh              # construit les images, démarre, publie une commune servie par l'origine, sauvegarde, restaure
E2E_KEEP=1 deploy/e2e/run.sh   # garde la stack ouverte sur https://localhost:8443 (equipe@communeo.test ; http : 8088)
```

En test, Caddy utilise son autorité interne (`local_certs`) : son certificat racine est copié dans
`$TMPDIR/communeo-e2e-caddy-root.crt` (à importer dans le navigateur, ou accepter l'avertissement). Domaines de
test : `localhost`, `preview.localhost`, `origine.localhost` (en-tête `X-Communeo-Origine: e2e0rigin5ecret`).
