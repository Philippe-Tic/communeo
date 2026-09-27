# Exploitation — Communeo V2

Guide du quotidien sur le serveur. Installation initiale : [DEPLOYMENT.md](DEPLOYMENT.md).
Tout se passe dans `~/communeo` (docker-compose.yml, deploy.sh, .env), en utilisateur `deploy`.

## Déployer

Automatique : chaque commit sur `main` passe par `.github/workflows/deploy.yml` (images, test de bout en
bout, déploiement). À la main depuis GitHub : **Actions → Déploiement → Run workflow**, avec une version
(commit) déjà publiée pour redéployer ou revenir en arrière sans reconstruire.

Sur le serveur :

```bash
./deploy.sh <commit>     # une version précise
./deploy.sh rollback     # la version précédente
cat .deployed-tag .previous-tag
```

`deploy.sh` récupère les images, redémarre et attend que Strapi et nginx soient sains ; sinon il remet la
version précédente et s'arrête en erreur. Les migrations de données (`apps/backend/database/migrations`)
s'appliquent au démarrage de Strapi : **un retour arrière ne défait pas une migration** ; en cas de doute,
restaurer la sauvegarde d'avant le déploiement.

## État et journaux

```bash
docker compose ps                       # tous les services doivent être « healthy » (worker et certbot : « running »)
docker compose logs -f --tail 100 strapi
docker compose logs --tail 100 worker   # mises en ligne des communes
docker compose logs backup              # sauvegardes
df -h && docker system df               # disque
```

## Sauvegardes

Chaque nuit à `BACKUP_TIME` (03:15, heure de Paris), le service `backup` :

- sauvegarde la base (contenus, comptes, devis, file des builds) : un dump par nuit, **3 jours** sur le serveur
  (`BACKUP_RETENTION_DAYS`) ;
- met à jour une **copie miroir** des fichiers envoyés (photos, PDF) : seuls les fichiers nouveaux ou modifiés
  sont copiés ; un fichier supprimé ou remplacé part dans un historique daté, ce qui permet de retrouver l'état
  des fichiers d'une nuit donnée ;
- envoie la même chose vers le stockage objet (`BACKUP_S3_*`), **chiffrée, noms compris** (`BACKUP_PASSPHRASE`),
  avec **90 jours** d'historique (`BACKUP_REMOTE_RETENTION_DAYS`).

Il est `unhealthy` si la dernière sauvegarde réussie date de plus de 26 heures. Place prise sur le serveur :
environ une fois les fichiers envoyés, plus quelques dumps de base.

```bash
docker compose exec backup backup.sh                # sauvegarde immédiate (avant une opération risquée)
docker compose exec backup ls /backups/db           # dumps disponibles
docker compose exec backup cat /backups/last-success
```

### Restaurer

```bash
docker compose stop strapi worker
docker compose run --rm backup restore.sh latest              # ou un horodatage : 20261002T011500Z
docker compose up -d strapi worker
```

Serveur perdu : nouveau serveur installé (DEPLOYMENT.md) avec **le même `.env`** (la phrase de passe
`BACKUP_PASSPHRASE` déchiffre les sauvegardes), puis :

```bash
./deploy.sh latest && docker compose stop strapi worker
docker compose run --rm backup restore.sh --from-s3 latest    # récupère, déchiffre et restaure
docker compose up -d
```

La base est recréée à neuf ; les fichiers sont remis dans l'état de la sauvegarde choisie. Les sites des
communes sont chez Netlify : ils restent en ligne pendant l'incident, une mise en ligne les reconstruit.

**Tester une restauration** une fois par trimestre : `deploy/e2e/run.sh` le fait sur une stack jetable, y
compris la restauration depuis le stockage objet seul (en local, et en CI à chaque déploiement).

## Supervision

- Moniteur externe (UptimeRobot, Better Stack…) : `https://app.communeo.fr/healthz`,
  `https://app.communeo.fr/api/health` et un site de commune, alerte par e-mail.
- `docker compose ps` : un service `unhealthy` est redémarré par Docker s'il s'arrête (`restart: unless-stopped`),
  mais pas s'il reste bloqué : regarder ses journaux.
- Mises en ligne en échec : espace équipe → fiche de la commune, ou `docker compose logs worker`
  (référence `MEL-…` donnée à la commune).

## Incidents

| Symptôme | Piste |
|----------|-------|
| 502 sur l'admin | `docker compose ps strapi`, `docker compose logs strapi` ; base joignable ? `docker compose exec postgres pg_isready` |
| Les mises en ligne restent « en attente » | worker arrêté ou file bloquée : `docker compose logs worker`, `docker compose restart worker` (les builds reprennent) |
| Aperçu : 401 dans l'éditeur | `PREVIEW_SECRET` différent entre strapi et preview, ou domaine de preview hors du domaine de l'admin |
| Certificat expiré | `docker compose logs certbot` ; `docker compose run --rm certbot renew` puis `docker compose exec nginx nginx -s reload` |
| Disque plein | `docker image prune -a` (anciennes versions), `du -sh` des volumes `strapi-uploads` et `backups` ; au-delà de ~60 Go de fichiers : voir « Capacité » dans DEPLOYMENT.md |
| `backup` unhealthy | `docker compose logs backup` (base, place disque, identifiants S3), puis `docker compose exec backup backup.sh` |

## Base de données

```bash
docker compose exec postgres psql -U strapi strapi
```

Ne jamais modifier les données à la main sans sauvegarde immédiate avant (`docker compose exec backup backup.sh`).

## Mises à jour du système

Mensuel : `sudo apt update && sudo apt upgrade -y`, redémarrage si le noyau change (`docker compose up -d`
relance tout). Les images de base (Node, Postgres, nginx) sont mises à jour à chaque déploiement.
