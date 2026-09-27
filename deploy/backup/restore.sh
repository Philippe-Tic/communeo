#!/bin/sh
# Restauration : restore.sh <horodatage|latest> (ex. 20261002T011500Z), Strapi et worker arrêtés :
#   docker compose stop strapi worker && docker compose run --rm backup restore.sh latest && docker compose up -d
# Depuis le stockage objet (serveur perdu) : restore.sh --from-s3 <horodatage|latest>, même .env.
# La base est recréée à neuf ; les fichiers sont remis dans l'état de la sauvegarde choisie (copie miroir,
# plus les fichiers supprimés ou remplacés depuis, repris dans l'historique).
set -eu

dir="$BACKUP_DIR"
if [ "${1:-}" = "--from-s3" ]; then
  shift
  . /usr/local/bin/remote.sh
  echo "[restore] récupération depuis $BACKUP_S3_BUCKET"
  mkdir -p "$dir/db"
  rclone copy "${target}db" "$dir/db" --quiet
  rclone sync "${target}uploads" "$dir/uploads" --quiet
  rclone copy "${target}uploads-history" "$dir/uploads-history" --quiet
fi

stamp="${1:-}"
if [ "$stamp" = "latest" ]; then
  stamp=$(ls "$dir/db" | sed -n 's/^db-\(.*\)\.dump$/\1/p' | sort | tail -n 1)
fi
[ -n "$stamp" ] || { echo "Usage : restore.sh [--from-s3] <horodatage|latest>"; ls "$dir/db"; exit 2; }
[ -f "$dir/db/db-$stamp.dump" ] || { echo "Sauvegarde $stamp introuvable dans $dir/db"; exit 2; }

( cd "$dir/db" && sha256sum -c "db-$stamp.sha256" )
echo "[restore] base $stamp"
# Base recréée à neuf : pg_restore --clean ne sait pas retirer les tables partitionnées de pg-boss
psql --dbname=postgres --quiet --command="DROP DATABASE IF EXISTS \"$PGDATABASE\" WITH (FORCE)" --command="CREATE DATABASE \"$PGDATABASE\""
pg_restore --no-owner --single-transaction --exit-on-error --dbname="$PGDATABASE" "$dir/db/db-$stamp.dump"

echo "[restore] fichiers $stamp"
rclone sync "$dir/uploads" "$UPLOADS_DIR" --quiet
# Fichiers supprimés ou remplacés après cette sauvegarde : du plus récent au plus ancien, pour garder
# à la fin la version présente à la date choisie
for later in $(ls "$dir/uploads-history" 2>/dev/null | sort -r); do
  if [ "$later" \> "$stamp" ]; then rclone copy "$dir/uploads-history/$later" "$UPLOADS_DIR" --quiet; fi
done
echo "[restore] terminée : redémarrez strapi et worker"
