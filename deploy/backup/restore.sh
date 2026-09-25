#!/bin/sh
# Restauration d'une sauvegarde locale : restore.sh <horodatage> (ex. 20261002T011500Z), ou `latest`.
# À lancer Strapi et worker arrêtés (voir PRODUCTION.md) :
#   docker compose stop strapi worker && docker compose run --rm backup restore.sh latest && docker compose up -d
# Une sauvegarde chiffrée récupérée du stockage S3 se déchiffre d'abord :
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE -in X.enc -out X
set -eu

dir="$BACKUP_DIR"
stamp="${1:-}"
if [ "$stamp" = "latest" ]; then
  stamp=$(ls "$dir" | sed -n 's/^db-\(.*\)\.dump$/\1/p' | sort | tail -n 1)
fi
[ -n "$stamp" ] || { echo "Usage : restore.sh <horodatage|latest>"; ls "$dir"; exit 2; }
[ -f "$dir/db-$stamp.dump" ] || { echo "Sauvegarde $stamp introuvable dans $dir"; exit 2; }

( cd "$dir" && sha256sum -c "$stamp.sha256" )
echo "[restore] base $stamp"
# Base recréée à neuf : pg_restore --clean ne sait pas retirer les tables partitionnées de pg-boss
psql --dbname=postgres --quiet --command="DROP DATABASE IF EXISTS \"$PGDATABASE\" WITH (FORCE)" --command="CREATE DATABASE \"$PGDATABASE\""
pg_restore --no-owner --single-transaction --exit-on-error --dbname="$PGDATABASE" "$dir/db-$stamp.dump"
echo "[restore] fichiers $stamp"
find "$UPLOADS_DIR" -mindepth 1 -delete
tar -xzf "$dir/uploads-$stamp.tar.gz" -C "$UPLOADS_DIR"
echo "[restore] terminée : redémarrez strapi et worker"
