# PHIP Health App

PHIP is a personal, exercise-first health application. V1 focuses on the loop from onboarding to generated workout, set-by-set logging, post-workout feedback, and next-workout adaptation.

The broader product direction is a Personal Health Intelligence Platform that can later incorporate body composition, nutrition, biomarkers, device integrations, and longitudinal health insights.

## Current Milestone

The project is currently in Phase 0: repo and planning hygiene.

Primary planning documents:

- `docs/product-architecture-plan.md`: product direction and long-term roadmap.
- `docs/implementation-architecture-spec.md`: implementation architecture contract.
- `docs/phased-implementation-plan.md`: Codex-executable phased build plan.

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

## Repository Rules

- Keep implementation work aligned with `docs/implementation-architecture-spec.md`.
- Keep phase work aligned with `docs/phased-implementation-plan.md`.
- Keep business logic out of UI wrappers, route handlers, and server actions.
- Validate inputs at service/API/job/AI boundaries.
- Never commit `.env`, API keys, database dumps, Postgres data directories, or backups.
