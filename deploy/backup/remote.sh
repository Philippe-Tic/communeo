# Sourcé par backup.sh et restore.sh : $target = emplacement des sauvegardes dans le stockage objet,
# terminé par un séparateur (« ${target}db »).
# Avec BACKUP_PASSPHRASE, un remote rclone « crypt » chiffre noms et contenus par-dessus le S3 (remote:).
if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  export RCLONE_CONFIG_SECURE_TYPE=crypt
  export RCLONE_CONFIG_SECURE_REMOTE="remote:$BACKUP_S3_BUCKET/${BACKUP_S3_PREFIX:-communeo}"
  RCLONE_CONFIG_SECURE_PASSWORD=$(rclone obscure "$BACKUP_PASSPHRASE")
  export RCLONE_CONFIG_SECURE_PASSWORD
  target="secure:"
else
  target="remote:$BACKUP_S3_BUCKET/${BACKUP_S3_PREFIX:-communeo}/"
fi
