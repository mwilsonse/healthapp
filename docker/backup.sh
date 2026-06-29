#!/usr/bin/env bash
set -euo pipefail

backup_dir="${BACKUP_DIR:-./backups/postgres}"
retention_days="${BACKUP_RETENTION_DAYS:-30}"
postgres_host="${POSTGRES_HOST:-localhost}"
postgres_db="${POSTGRES_DB:-phip}"
postgres_user="${POSTGRES_USER:-phip}"

mkdir -p "${backup_dir}"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_file="${backup_dir}/${postgres_db}-${timestamp}.sql.gz"

echo "Creating Postgres backup: ${backup_file}"
PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump \
  --host="${postgres_host}" \
  --username="${postgres_user}" \
  --dbname="${postgres_db}" \
  --no-owner \
  --no-acl \
  | gzip > "${backup_file}"

find "${backup_dir}" -type f -name "*.sql.gz" -mtime "+${retention_days}" -delete

echo "Backup complete: ${backup_file}"
