#!/usr/bin/env bash
set -euo pipefail

backup_dir="${BACKUP_DIR:-./backups/postgres}"
retention_days="${BACKUP_RETENTION_DAYS:-30}"
postgres_host="${POSTGRES_HOST:-localhost}"
postgres_db="${POSTGRES_DB:-phip}"
postgres_user="${POSTGRES_USER:-phip}"

if ! [[ "${retention_days}" =~ ^[0-9]+$ ]] || [[ "${retention_days}" -lt 1 ]]; then
  echo "BACKUP_RETENTION_DAYS must be a positive integer." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required but was not found." >&2
  exit 1
fi

umask 077
mkdir -p "${backup_dir}"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_file="${backup_dir}/${postgres_db}-${timestamp}.sql.gz"

echo "Creating compressed Postgres backup: ${backup_file}"
PGPASSWORD="${POSTGRES_PASSWORD:-}" pg_dump \
  --host="${postgres_host}" \
  --username="${postgres_user}" \
  --dbname="${postgres_db}" \
  --no-owner \
  --no-acl \
  | gzip > "${backup_file}"

removed_count="$(
  find "${backup_dir}" -type f -name "*.sql.gz" -mtime "+${retention_days}" -print -delete | wc -l | tr -d " "
)"

echo "Backup complete: ${backup_file}"
echo "Retention cleanup removed ${removed_count} old backup(s)."
