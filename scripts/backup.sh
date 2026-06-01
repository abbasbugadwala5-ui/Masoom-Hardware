#!/usr/bin/env bash
# Encrypted nightly Postgres dump + retention. Run via cron.
set -euo pipefail

: "${POSTGRES_CONTAINER:=masoom-postgres}"
: "${POSTGRES_USER:=masoom}"
: "${POSTGRES_DB:=masoom}"
: "${BACKUP_DIR:=/var/backups/masoom}"
: "${RETENTION_DAYS:=30}"

mkdir -p "$BACKUP_DIR"
ts=$(date +%F-%H%M)
file="$BACKUP_DIR/masoom-$ts.sql.gz"

docker exec "$POSTGRES_CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip -9 > "$file"

# Retain only last N days
find "$BACKUP_DIR" -name 'masoom-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Backup written: $file"
