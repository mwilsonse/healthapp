# Synology/Linux Self-Hosting

PHIP V1 is intended to run on a Synology NAS or Linux host with Docker Compose.
The app is single-user and should stay on a trusted private network unless the
access model is revisited.

## Host Paths

Recommended Synology layout:

```text
/volume1/docker/healthapp/
  postgres-data/
  backups/postgres/
  secrets/
  logs/
```

Use equivalent absolute paths on a non-Synology Linux host.

## Environment

Create a NAS `.env` next to `docker-compose.yml`:

```bash
APP_BASE_URL=http://nas-hostname-or-ip:3000
APP_SECRET=replace-with-long-random-secret
APP_ACCESS_PASSCODE=replace-with-local-passcode
DEFAULT_USER_ID=default-user

POSTGRES_DB=phip
POSTGRES_USER=phip
POSTGRES_PASSWORD=replace-with-long-random-password
POSTGRES_PORT=5432
POSTGRES_DATA_DIR=/volume1/docker/healthapp/postgres-data
DATABASE_URL=postgresql://phip:replace-with-long-random-password@postgres:5432/phip?schema=public

AI_PROVIDER=fake
AI_MODEL=gpt-4.1-mini
AI_API_KEY=

JOB_WORKER_CONCURRENCY=1
JOB_MAX_RETRIES=3
JOB_POLL_INTERVAL_MS=5000

BACKUP_RETENTION_DAYS=30
BACKUP_DIR=/volume1/docker/healthapp/backups/postgres
LOG_LEVEL=info
```

Do not commit this file.

## First Start On NAS

```bash
docker compose up -d postgres
docker compose run --rm web pnpm prisma:deploy
docker compose run --rm web pnpm seed
docker compose up -d web worker
```

Open `APP_BASE_URL` and check `/api/health`.

## Backups

Run a manual backup:

```bash
docker compose --profile backup run --rm backup
```

This writes a timestamped `*.sql.gz` dump to `BACKUP_DIR` and removes dumps
older than `BACKUP_RETENTION_DAYS`.

Schedule the same command with Synology Task Scheduler or cron. Keep backups
outside the live Postgres data directory.

## Restore

Stop the app processes before restoring:

```bash
docker compose stop web worker
```

Restore a selected backup into the Postgres container:

```bash
gzip -dc /volume1/docker/healthapp/backups/postgres/phip-YYYYMMDD-HHMMSS.sql.gz \
  | docker compose exec -T postgres psql -U phip -d phip
```

Then run migrations and restart the app:

```bash
docker compose run --rm web pnpm prisma:deploy
docker compose up -d web worker
```

Check `/api/health` and use the Profile data summary to confirm records are
present.

## Laptop To NAS Migration

1. On the laptop, create a final backup:

   ```bash
   pnpm run backup:postgres
   ```

2. Copy the newest `*.sql.gz` backup to:

   ```text
   /volume1/docker/healthapp/backups/postgres/
   ```

3. Copy the repo or deployment bundle to the NAS.
4. Create the NAS `.env` with NAS paths and new secrets.
5. Start Postgres on the NAS:

   ```bash
   docker compose up -d postgres
   ```

6. Restore the copied backup with the restore command above.
7. Run migrations:

   ```bash
   docker compose run --rm web pnpm prisma:deploy
   ```

8. Start `web` and `worker`:

   ```bash
   docker compose up -d web worker
   ```

9. Open the app on the NAS URL, confirm Profile data, then run a fresh NAS
   backup.

Keep the laptop database unchanged until the NAS restore and fresh NAS backup
have both been verified.
