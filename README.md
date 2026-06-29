# PHIP Health App

PHIP is a personal, exercise-first health application. V1 focuses on the loop from onboarding to generated workout, set-by-set logging, post-workout feedback, and next-workout adaptation.

The broader product direction is a Personal Health Intelligence Platform that can later incorporate body composition, nutrition, biomarkers, device integrations, and longitudinal health insights.

## Current Milestone

The project is currently implementing the late V1 hardening phases: personal
data export/reset, backups, self-hosting readiness, and reliability polish.

Primary planning documents:

- `docs/product-architecture-plan.md`: product direction and long-term roadmap.
- `docs/implementation-architecture-spec.md`: implementation architecture contract.
- `docs/phased-implementation-plan.md`: Codex-executable phased build plan.
- `docs/self-hosting/synology-nas.md`: Synology/Linux deployment, backup,
  restore, and laptop-to-NAS migration notes.

## Planned Stack

- Next.js App Router
- TypeScript with strict mode
- Tailwind CSS and shadcn/ui
- Prisma
- PostgreSQL
- Docker Compose
- Postgres-backed worker queue
- External AI API provider behind an adapter

## Local Development Direction

Development should happen from this repo on the local development machine. Postgres should run in Docker for both local testing and the eventual Synology/Linux deployment.

Do not commit real secrets. Copy `.env.example` to `.env` later and fill in local values.

```bash
cp .env.example .env
```

Application scaffolding begins in Phase 1.

## Common Commands

Use `pnpm` for project scripts.

```bash
pnpm dev
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run build
pnpm worker
pnpm run docker:config
pnpm run docker:db
pnpm run docker:dev
pnpm run backup:postgres
```

## Deployment Direction

The default runtime target is Synology NAS or Linux using Docker Compose.

Expected persistent host paths on Synology:

```text
/volume1/docker/healthapp/
  postgres-data/
  backups/postgres/
  secrets/
  logs/
```

Postgres should run inside a Docker container. Its data should persist through a host bind mount or Docker volume, and backups should be written outside the live database data directory.

See `docs/self-hosting/synology-nas.md` before moving data from the laptop to
the NAS. Test restore before relying on NAS backups.

## Repository Rules

- Keep implementation work aligned with `docs/implementation-architecture-spec.md`.
- Keep phase work aligned with `docs/phased-implementation-plan.md`.
- Keep business logic out of UI wrappers, route handlers, and server actions.
- Validate inputs at service/API/job/AI boundaries.
- Never commit `.env`, API keys, database dumps, Postgres data directories, or backups.
