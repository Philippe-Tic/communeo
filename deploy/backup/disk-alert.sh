#!/bin/sh
# Alerte disque (#381) : quand le disque du serveur (celui des volumes Docker) est rempli à
# DISK_ALERT_THRESHOLD % ou plus (85 par défaut), un e-mail part vers l'équipe (DISK_ALERT_TO =
# SIGNUP_NOTIFY_EMAIL, par Resend), puis au plus une fois par jour tant que ça dure.
# Lancé toutes les 15 minutes par entrypoint.sh ; à la main : docker compose exec backup disk-alert.sh
set -eu

threshold=${DISK_ALERT_THRESHOLD:-85}
state="$BACKUP_DIR/.disk-alert"
used=$(df -P "$BACKUP_DIR" | awk 'NR == 2 { sub("%", "", $5); print $5 }')

if [ "$used" -lt "$threshold" ]; then
  [ ! -f "$state" ] || { rm -f "$state"; echo "[disque] $used % utilisés : sous le seuil de $threshold %"; }
  exit 0
fi
echo "[disque] ALERTE : $used % utilisés (seuil : $threshold %)"
# Déjà signalé il y a moins de 24 heures
[ -z "$(find "$state" -mmin -1440 2>/dev/null)" ] || exit 0

if [ -z "${RESEND_API_KEY:-}" ] || [ -z "${DISK_ALERT_TO:-}" ]; then
  echo "[disque] e-mail non envoyé : RESEND_API_KEY ou SIGNUP_NOTIFY_EMAIL n'est pas défini"
  exit 0
fi

text="Le disque du serveur Communeo est rempli à $used % (seuil d'alerte : $threshold %).

$(df -h "$BACKUP_DIR" | awk 'NR == 2 { print "Taille : " $2 ", utilisé : " $3 ", libre : " $4 }')
Fichiers envoyés : $(du -sh "$UPLOADS_DIR" 2>/dev/null | cut -f1), sauvegardes sur le serveur : $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

Que faire : voir « Disque plein » dans PRODUCTION.md (anciennes images Docker, volumes strapi-uploads et
backups, journaux). Ce message est renvoyé chaque jour tant que le disque reste au-dessus du seuil."

from=${EMAIL_DEFAULT_FROM:-noreply@communeo.fr}
case $from in *"<"*) ;; *) from="Communeo <$from>" ;; esac
jq -n --arg from "$from" --arg to "$DISK_ALERT_TO" \
  --arg subject "Serveur Communeo : disque rempli à $used %" --arg text "$text" \
  '{ from: $from, to: [$to], subject: $subject, text: $text }' |
  curl -fsS --max-time 30 -o /dev/null "${RESEND_API_URL:-https://api.resend.com/emails}" \
    -H "Authorization: Bearer $RESEND_API_KEY" -H 'Content-Type: application/json' --data @-
touch "$state"
echo "[disque] e-mail envoyé à $DISK_ALERT_TO"
