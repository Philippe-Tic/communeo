# Sauvegardes (#179) : base Postgres (Strapi et file des builds) et fichiers envoyés, chaque nuit,
# conservés sur le serveur et copiés vers un stockage objet S3 (Scaleway, OVH…) s'il est configuré.
FROM postgres:16-alpine

RUN apk add --no-cache rclone openssl tzdata
COPY backup.sh restore.sh entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/restore.sh /usr/local/bin/entrypoint.sh

ENV TZ=Europe/Paris \
    BACKUP_DIR=/backups \
    UPLOADS_DIR=/uploads \
    BACKUP_TIME=03:15 \
    BACKUP_RETENTION_DAYS=14 \
    BACKUP_REMOTE_RETENTION_DAYS=90

# Dernière sauvegarde réussie de moins de 26 heures
HEALTHCHECK --interval=10m --timeout=10s --start-period=15m CMD find /backups/last-success -mmin -1560 | grep -q . || exit 1

ENTRYPOINT ["entrypoint.sh"]
