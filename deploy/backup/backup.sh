#!/bin/sh
# Une sauvegarde :
# - base : dump Postgres (format custom, toutes les tables dont le schéma pgboss) + empreinte SHA-256,
#   BACKUP_RETENTION_DAYS jours sur le serveur ;
# - fichiers envoyés : copie miroir incrémentale (/backups/uploads) ; un fichier supprimé ou remplacé
#   est déplacé dans /backups/uploads-history/<horodatage>, ce qui permet de retrouver l'état d'une nuit
#   donnée (restore.sh). Place prise : environ une fois les fichiers, pas une fois par nuit.
# Hors du serveur si BACKUP_S3_BUCKET est défini : même organisation dans le stockage objet (rclone),
# chiffrée (noms et contenus, rclone crypt) si BACKUP_PASSPHRASE est défini : la base contient des
# données personnelles. Historique BACKUP_REMOTE_RETENTION_DAYS jours.
set -eu

stamp=$(date -u +%Y%m%dT%H%M%SZ)
dir="$BACKUP_DIR"
mkdir -p "$dir/db" "$dir/uploads" "$dir/uploads-history"
echo "[backup] $stamp : début"

pg_dump --format=custom --no-owner --file="$dir/db/db-$stamp.dump"
( cd "$dir/db" && sha256sum "db-$stamp.dump" > "db-$stamp.sha256" )

rclone sync "$UPLOADS_DIR" "$dir/uploads" --backup-dir "$dir/uploads-history/$stamp" --quiet

if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  . /usr/local/bin/remote.sh
  rclone copy "$dir/db" "${target}db" --include "db-$stamp.*" --quiet
  rclone sync "$UPLOADS_DIR" "${target}uploads" --backup-dir "${target}uploads-history/$stamp" --quiet
  rclone delete "${target}db" --min-age "${BACKUP_REMOTE_RETENTION_DAYS}d" --quiet
  rclone delete "${target}uploads-history" --min-age "${BACKUP_REMOTE_RETENTION_DAYS}d" --rmdirs --quiet
  echo "[backup] copie envoyée vers $BACKUP_S3_BUCKET/${BACKUP_S3_PREFIX:-communeo}${BACKUP_PASSPHRASE:+ (chiffrée)}"
fi

find "$dir/db" -type f -mtime +"$BACKUP_RETENTION_DAYS" -delete
find "$dir/uploads-history" -mindepth 1 -maxdepth 1 -type d -mtime +"$BACKUP_RETENTION_DAYS" -exec rm -rf {} +
date -u +%Y-%m-%dT%H:%M:%SZ > "$dir/last-success"
echo "[backup] $stamp : terminée ($(du -sh "$dir" | cut -f1) sur le serveur)"
