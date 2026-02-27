#!/bin/bash
# =============================================================================
# CMS Mairies — Backup automatique
# =============================================================================
# Usage : ./scripts/backup.sh
# Cron  : 0 3 * * * /opt/cms-mairies/scripts/backup.sh >> /var/log/cms-backup.log 2>&1
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="/opt/cms-mairies/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Créer le dossier de backup
mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Début du backup..."

# 1. Dump PostgreSQL
echo "  → Dump PostgreSQL..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
  pg_dump -U strapi strapi | gzip > "$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
echo "  ✓ Dump PostgreSQL terminé"

# 2. Archive des uploads
echo "  → Archive des uploads..."
docker compose -f "$PROJECT_DIR/docker-compose.yml" cp \
  strapi:/app/public/uploads - | gzip > "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
echo "  ✓ Archive des uploads terminée"

# 3. Rotation des anciens backups
echo "  → Rotation des backups (suppression > ${RETENTION_DAYS} jours)..."
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo "  ✓ Rotation terminée"

echo "[$TIMESTAMP] Backup terminé avec succès."
echo "  Fichiers :"
echo "    - $BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
echo "    - $BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"
