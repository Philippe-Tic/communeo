#!/bin/sh
# Une sauvegarde : dump Postgres (format custom, toutes les tables dont le schéma pgboss), archive des
# fichiers envoyés, empreintes SHA-256. Rétention locale BACKUP_RETENTION_DAYS jours.
# Copie hors du serveur si BACKUP_S3_BUCKET est défini (rclone, variables RCLONE_CONFIG_REMOTE_*),
# chiffrée (AES-256, openssl) si BACKUP_PASSPHRASE est défini : la base contient des données personnelles.
set -eu

stamp=$(date -u +%Y%m%dT%H%M%SZ)
dir="$BACKUP_DIR"
mkdir -p "$dir"
echo "[backup] $stamp : début"

pg_dump --format=custom --no-owner --file="$dir/db-$stamp.dump"
tar -czf "$dir/uploads-$stamp.tar.gz" -C "$UPLOADS_DIR" .
( cd "$dir" && sha256sum "db-$stamp.dump" "uploads-$stamp.tar.gz" > "$stamp.sha256" )

if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  outbox="$dir/outbox-$stamp"
  mkdir -p "$outbox"
  for file in "db-$stamp.dump" "uploads-$stamp.tar.gz" "$stamp.sha256"; do
    if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
      openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_PASSPHRASE -in "$dir/$file" -out "$outbox/$file.enc"
    else
      cp "$dir/$file" "$outbox/$file"
    fi
  done
  target="remote:$BACKUP_S3_BUCKET/${BACKUP_S3_PREFIX:-communeo}"
  rclone copy "$outbox" "$target" --no-traverse
  rclone delete "$target" --min-age "${BACKUP_REMOTE_RETENTION_DAYS}d"
  rm -rf "$outbox"
  echo "[backup] copie envoyée vers $target"
fi

find "$dir" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' -o -name '*.sha256' \) -mtime +"$BACKUP_RETENTION_DAYS" -delete
date -u +%Y-%m-%dT%H:%M:%SZ > "$dir/last-success"
echo "[backup] $stamp : terminée ($(du -sh "$dir" | cut -f1) sur le serveur)"
