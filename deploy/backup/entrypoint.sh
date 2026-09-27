#!/bin/sh
# Planificateur minimal : une sauvegarde au démarrage s'il n'y en a pas encore, puis chaque jour à
# BACKUP_TIME (heure de Paris). `docker compose run --rm backup backup.sh` ou `restore.sh` à la main.
set -eu

if [ "$#" -gt 0 ]; then exec "$@"; fi

mkdir -p "$BACKUP_DIR"
[ -f "$BACKUP_DIR/last-success" ] || backup.sh || echo "[backup] première sauvegarde en échec, nouvel essai à $BACKUP_TIME"

last_day=""
while :; do
  now=$(date +%H:%M)
  today=$(date +%F)
  if [ "$now" = "$BACKUP_TIME" ] && [ "$today" != "$last_day" ]; then
    last_day=$today
    backup.sh || echo "[backup] ÉCHEC de la sauvegarde du $today"
  fi
  sleep 30
done
