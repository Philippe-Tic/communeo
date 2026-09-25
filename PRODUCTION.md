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

Chaque nuit à `BACKUP_TIME` (03:15, heure de Paris), le service `backup` sauvegarde la base (contenus,
comptes, file des builds) et les fichiers envoyés dans le volume `backups` (14 jours), et une copie
chiffrée dans le stockage objet (`BACKUP_S3_*`, 90 jours). Il est `unhealthy` si la dernière sauvegarde
réussie date de plus de 26 heures.

```bash
docker compose exec backup backup.sh    # sauvegarde immédiate (avant une opération risquée)
docker compose exec backup ls -lh /backups
docker compose exec backup cat /backups/last-success
```

### Restaurer

```bash
docker compose exec backup ls /backups                    # choisir l'horodatage (ou « latest »)
docker compose stop strapi worker
docker compose run --rm backup restore.sh 20261002T011500Z
docker compose up -d strapi worker
```

Depuis le stockage objet (serveur perdu) : sur le nouveau serveur installé (DEPLOYMENT.md, **même `.env`**),

```bash
docker compose run --rm backup sh -c '
  rclone copy "remote:$BACKUP_S3_BUCKET/$BACKUP_S3_PREFIX" /backups --include "*20261002T011500Z*"
  cd /backups && for f in *.enc; do
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in "$f" -out "${f%.enc}" && rm "$f"
  done'
docker compose stop strapi worker && docker compose run --rm backup restore.sh 20261002T011500Z && docker compose up -d
```

Les sites des communes sont chez Netlify : ils restent en ligne pendant l'incident, et une mise en ligne
les reconstruit à partir de la base restaurée.

**Tester une restauration** une fois par trimestre : `deploy/e2e/run.sh` le fait sur une stack jetable
(en local ou en CI à chaque déploiement).

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
| Disque plein | `docker image prune -a` (anciennes versions), taille du volume `backups`, `BACKUP_RETENTION_DAYS` |
| `backup` unhealthy | `docker compose logs backup` (base, place disque, identifiants S3), puis `docker compose exec backup backup.sh` |

## Base de données

```bash
docker compose exec postgres psql -U strapi strapi
```

Ne jamais modifier les données à la main sans sauvegarde immédiate avant (`docker compose exec backup backup.sh`).

## Mises à jour du système

Mensuel : `sudo apt update && sudo apt upgrade -y`, redémarrage si le noyau change (`docker compose up -d`
relance tout). Les images de base (Node, Postgres, nginx) sont mises à jour à chaque déploiement.
