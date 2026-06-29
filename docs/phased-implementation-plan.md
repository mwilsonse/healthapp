# PHIP V1 Phased Implementation Plan

## Purpose

This plan breaks the PHIP V1 Implementation Architecture Spec into executable chunks suitable for Codex sessions. Each phase should leave the repo in a working, testable state and should avoid large unfinished rewrites.

The preferred build style is thin vertical slices. Build enough foundation to support the first real user loop, then expand behavior through small, verified increments.

## Human Setup Needed Before Active Development

These items require human action, account access, or machine-level setup outside normal Codex implementation.

- Install and run Docker Desktop or equivalent Docker support on the development machine.
- Run Postgres in Docker for both local testing and the eventual Synology/Linux deployment.
- Decide the final Synology/Linux host paths for Postgres data and backups before NAS deployment.
- Provide an AI API key when AI-backed generation begins.
- Manage the local app access secret or passcode directly through environment configuration.
- Confirm whether the default single user display name and timezone should be seeded as real personal values or placeholders.
- Review any generated exercise seed data before relying on it for actual training.
- Review destructive delete/reset behavior before using it on real data.

## Phase 0: Repo And Planning Hygiene

Goal: make the repo ready for repeatable Codex work.

Codex tasks:

- Keep `docs/product-architecture-plan.md` as product direction.
- Keep `docs/implementation-architecture-spec.md` as the build contract.
- Add this phased plan as the execution roadmap.
- Add a concise `README.md` describing the project, local setup placeholder, and current milestone.
- Add a `.env.example` with non-secret placeholders for required configuration.

Acceptance checks:

- Repo contains product plan, implementation spec, phased plan, README, `.gitignore`, and `.env.example`.
- No real secrets are committed.
- `git status` is clean after commit.

Human needed:

- Confirm the README wording if it will be public-facing on GitHub.

## Phase 1: Application Foundation

Goal: scaffold the app and establish strict development rails.

Codex tasks:

- Scaffold a Next.js App Router TypeScript application in the existing repo.
- Configure strict TypeScript.
- Configure Tailwind CSS and shadcn/ui.
- Configure ESLint and Prettier.
- Add Vitest for unit/integration tests.
- Add Playwright for UI tests, but only a basic smoke test initially.
- Create the planned source folder structure:
  - `src/app`
  - `src/components`
  - `src/features`
  - `src/server`
  - `src/worker`
  - `src/lib`
  - `src/tests`
- Add basic app shell routes for `Today`, `Plan`, `Logs`, `Profile`, and `Onboarding`.
- Add a simple mobile-first navigation shell.

Acceptance checks:

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm test` passes.
- `npm run build` passes.
- App can run locally and render the shell.

Human needed:

- None expected if standard Next.js tooling installs successfully.

## Phase 2: Docker And Environment Foundation

Goal: make local/self-hosted runtime repeatable.

Codex tasks:

- Add `docker-compose.yml` with `web`, `worker`, and `postgres` services.
- Add an app Dockerfile suitable for both web and worker commands.
- Add environment parsing under `src/server/env`.
- Add `GET /api/health`.
- Add local structured logger under `src/server/logging`.
- Add documented npm scripts for local dev, Docker dev, typecheck, lint, test, build, Prisma, worker.
- Add placeholder backup script and Docker service wiring, without turning on destructive operations.

Acceptance checks:

- App runs outside Docker.
- Docker Compose can start Postgres.
- Docker Compose config validates.
- Health route works in local app runtime.
- Environment parser fails clearly when required variables are missing.

Human needed:

- Docker must be installed and running.
- Human may need to approve local ports if conflicts exist.

## Phase 3: Prisma Schema And Database Migrations

Goal: implement the database backbone described in the architecture spec.

Codex tasks:

- Install and configure Prisma.
- Add `prisma/schema.prisma`.
- Define all core enums from the implementation spec.
- Define V1 core models:
  - `User`
  - `UserProfile`
  - `UserMeasurement`
  - `Goal`
  - `Equipment`
  - `AvailableLoad`
  - `Exercise`
  - `ExercisePreference`
  - `TrainingPlan`
  - `PlannedWorkout`
  - `PlannedWorkoutExercise`
  - `PlannedWorkoutSet`
  - `CompletedWorkout`
  - `CompletedWorkoutExercise`
  - `CompletedExerciseSet`
  - `CardioActivity`
  - `CoachNote`
  - `RecommendationRationale`
  - `AiInteraction`
  - `Job`
  - `JobRun`
- Define future placeholder models:
  - `HealthMetric`
  - `NutritionEntry`
  - `BiomarkerResult`
  - `DeviceIntegration`
  - `IntegrationSyncJob`
  - `InsightEvent`
- Add indexes and uniqueness constraints from the spec.
- Add Prisma client helper under `src/server/db`.
- Add initial migration.

Acceptance checks:

- Prisma schema validates.
- Migration applies against local Postgres.
- Prisma client generates.
- Typecheck passes.

Human needed:

- None expected after Docker/Postgres is working.

## Phase 4: Seed Data And Core Utilities

Goal: create enough reliable data to build the first vertical slice.

Codex tasks:

- Add seed script for the default single user.
- Add starter exercise library with modest, reviewed categories:
  - squat
  - hinge
  - push
  - pull
  - lunge
  - carry
  - rotation
  - isolation
  - warmup
  - mobility
  - basic cardio
- Add unit conversion utilities.
- Add available-load rounding utility.
- Add tests for US display units, metric storage conversion, and load rounding.
- Add exercise filtering helpers for equipment, avoid preferences, contraindication tags, and modality.

Acceptance checks:

- Seed script runs idempotently.
- Default user exists.
- Starter exercise library exists.
- Unit/load tests pass.

Human needed:

- Human should review starter exercises before using the app for actual workouts.

## Phase 5: Service Layer Skeleton

Goal: establish business-logic boundaries before UI gets complex.

Codex tasks:

- Add service modules:
  - `profileService`
  - `equipmentService`
  - `goalService`
  - `exerciseService`
  - `planningService`
  - `workoutService`
  - `coachService`
  - `jobService`
  - `aiRecommendationService`
  - `exportService`
- Add shared result/error conventions.
- Add Zod input schemas for the first real mutations.
- Add single-user resolver.
- Keep server actions and route handlers thin.

Acceptance checks:

- Services compile and have basic unit tests where behavior exists.
- No React imports from `src/server`.
- Server actions call services rather than containing business logic.

Human needed:

- None expected.

## Phase 6: Onboarding Vertical Slice

Goal: capture the minimum real user data needed to generate workouts.

Codex tasks:

- Build onboarding UI for:
  - profile basics
  - baseline measurements
  - goals
  - constraints/injuries
  - exercise preferences
  - preferred training times
  - equipment
  - available loads
- Add server actions around shared services.
- Add profile review/edit screen for entered data.
- Persist all onboarding data in Postgres.
- Add tests for onboarding service behavior.
- Add Playwright happy-path onboarding test.

Acceptance checks:

- A fresh seeded user can complete onboarding.
- Data is persisted and visible in Profile.
- Validation errors are clear and non-technical.
- Typecheck, lint, unit tests, and onboarding UI smoke test pass.

Human needed:

- Human should enter real equipment and load inventory when ready.

## Phase 7: Job Queue And Worker Foundation

Goal: create durable background work before adding AI generation.

Codex tasks:

- Implement Postgres-backed job enqueueing.
- Implement job claim/start/success/failure lifecycle.
- Implement retry and backoff.
- Implement `JobRun` records.
- Add worker entrypoint under `src/worker/index.ts`.
- Add route handlers for:
  - job status
  - manual replay
- Add local structured logging for worker events.
- Add fake/no-op handlers for required job types.

Acceptance checks:

- Worker can claim and complete a test job.
- Failed test job retries and eventually terminally fails.
- Job status can be inspected.
- Manual replay works from stored input.
- Tests cover enqueue, claim, retry, failure, and replay.

Human needed:

- None expected.

## Phase 8: AI Adapter And Structured Output Contracts

Goal: isolate AI provider calls and make generated data safe to persist.

Codex tasks:

- Add AI provider interface.
- Add provider adapter implementation scaffold.
- Add Zod schemas:
  - `TrainingPlanOutputV1`
  - `PlannedWorkoutOutputV1`
  - `PostWorkoutFeedbackOutputV1`
  - `CoachNoteRefreshOutputV1`
  - `CoachChatOutputV1`
- Add `AiInteraction` persistence helpers.
- Add validation failure handling.
- Add a deterministic fake AI provider for tests and local development.
- Add OpenAI or provider-specific adapter only after fake provider tests pass.

Acceptance checks:

- Fake provider can generate valid plan/workout/feedback outputs.
- Invalid AI output is rejected and logged.
- No invalid AI output mutates plan or workout tables.
- AI interaction metadata is stored.

Human needed:

- Provide AI API key before real provider integration.
- Decide whether real provider calls are allowed in local development by default or only behind an explicit flag.

## Phase 9: First Plan And Today Workout

Goal: generate and display the first actionable workout.

Codex tasks:

- Implement `biweekly_plan_review` using the AI adapter or fake provider.
- Implement `next_workout_generation` using the active plan, equipment, constraints, preferences, and recent logs.
- Persist `TrainingPlan`, `PlannedWorkout`, planned exercises, planned sets, and rationale.
- Build Today screen for:
  - planning status
  - warmup
  - exercises
  - sets
  - target reps/load/rest/intensity
  - rationale
  - coach notes placeholder
- Enforce equipment and load constraints before saving generated workout.

Acceptance checks:

- App can create an active two-week plan.
- App can create today's planned workout.
- Generated loads are achievable with entered equipment.
- Today screen renders the generated workout.
- Invalid generation keeps the last valid plan/workout.

Human needed:

- Human should inspect initial generated workouts before following them physically.

## Phase 10: Workout Logging

Goal: complete the core exercise log loop.

Codex tasks:

- Build set-by-set logging UI.
- Support actual reps, actual load, RPE/RIR, skipped sets, pain flag, and notes.
- Support exercise substitution with a reason.
- Support workout completion, skip, and partial completion.
- Preserve planned versus actual values.
- Add quick controls for reduce/increase intensity, duration adjustment, and skip.

Acceptance checks:

- A planned workout can be started.
- Every planned set can be logged or skipped.
- Completed workout records preserve planned and actual data.
- Partial and skipped workouts store reasons.
- Tests cover planned vs actual preservation.

Human needed:

- None expected.

## Phase 11: Post-Workout Feedback And Adaptation

Goal: close the loop from completed workout to next workout.

Codex tasks:

- On complete/skip/partial, enqueue:
  - `post_workout_feedback`
  - `next_workout_generation`
  - `coach_note_refresh`
- Implement post-workout feedback persistence as coach notes/rationale.
- Implement next-workout generation from active plan and recent completed workout.
- Implement conservative adaptation rules for pain, missed work, underperformance, and completion quality.
- Add UI state for generation pending, success, and failure.

Acceptance checks:

- Completing a workout creates required jobs.
- Worker creates feedback.
- Worker creates the next planned workout.
- Failed generation does not overwrite last valid workout.
- User can see feedback after workout.

Human needed:

- Human should review whether feedback tone/content is useful after several real logs.

## Phase 12: Plan And Logs Views

Goal: make progress and plan status visible.

Codex tasks:

- Build Plan screen showing active two-week plan, weekly structure, planned sessions, rationale, and committed changes.
- Build Logs screen showing completed workouts, planned vs actual summaries, skips/partials, and basic exercise trends.
- Add exercise-focused insights:
  - consistency
  - load progression
  - missed or modified sessions
  - goal alignment
- Add UI to commit or keep one-off plan edits.

Acceptance checks:

- Active plan is readable.
- Workout history is readable.
- Basic insights are generated without requiring future PHIP domains.
- Plan edit commitment updates planning context.

Human needed:

- Human should decide after using this whether insights are too sparse or too noisy.

## Phase 13: Coach Chat

Goal: add contextual coach assistance without unsafe silent mutations.

Codex tasks:

- Add coach chat route handler.
- Provide context from current workout, equipment, goals, constraints, recent logs, and coach notes.
- Use structured `CoachChatOutputV1`.
- Support suggested actions.
- Build confirm-then-mutate UI.
- Store action statuses.
- Route confirmed actions through existing services.

Acceptance checks:

- Coach chat answers workout-context questions.
- Suggested changes require explicit confirmation.
- Confirmed changes mutate through services.
- Dismissed suggestions do not mutate data.

Human needed:

- Human should test with real mid-workout questions and decide if context is sufficient.

## Phase 14: Export, Delete, Backups, And Self-Hosting Hardening

Goal: make personal data and self-hosting responsible enough for real use.

Codex tasks:

- Implement JSON export for the single user.
- Implement destructive reset/delete flow with confirmation.
- Add backup script for compressed Postgres dumps.
- Add retention cleanup.
- Document restore steps.
- Finalize Docker Compose for Synology/Linux assumptions.
- Add logs that avoid sensitive health data by default.

Acceptance checks:

- Export returns complete expected data.
- Delete/reset removes user-owned data safely.
- Backup script creates timestamped compressed dump.
- Retention cleanup works.
- Restore instructions are clear.

Human needed:

- Human must choose backup storage location.
- Human should test restore before relying on backups.
- Human must be careful with destructive delete/reset on real data.

## Phase 15: Polish, Reliability, And V1 Readiness

Goal: make the exercise-first app stable enough for daily use.

Codex tasks:

- Improve mobile ergonomics for gym use.
- Add empty states and failure states.
- Add loading/pending states around planning jobs.
- Review accessibility basics.
- Add documentation for local development and self-hosting.
- Expand tests around the full loop:
  - onboarding
  - plan generation
  - today workout
  - set logging
  - post-workout jobs
  - next workout
- Do a final pass against the implementation architecture spec.

Acceptance checks:

- Full loop works from clean database.
- Full loop works after at least two completed workouts.
- App handles AI/job failure without data loss.
- App is usable on mobile viewport.
- README can guide a future setup session.

Human needed:

- Human should complete at least one real or simulated workout before calling V1 usable.
- Human should decide whether remote access remains unnecessary before deploying on Synology.

## Recommended Codex Execution Order

Use one Codex session per phase when possible. If a phase grows large, split it at the service/UI boundary.

Best first implementation prompts:

1. "Implement Phase 0 from `docs/phased-implementation-plan.md`."
2. "Implement Phase 1 from `docs/phased-implementation-plan.md`."
3. "Implement Phase 2 from `docs/phased-implementation-plan.md`."

Do not start real AI provider integration until:

- Phase 7 job queue is working.
- Phase 8 fake provider passes tests.
- Human provides an API key.

Do not use the app for real exercise decisions until:

- Equipment inventory is accurate.
- Human has reviewed seed exercises.
- Generated workouts have been sanity-checked.
- Failure behavior has been tested.

## Cross-Phase Rules

- Keep each phase shippable and committed before moving on.
- Keep business logic in services, not in UI or route wrappers.
- Validate all inputs at boundaries.
- Prefer fake providers and deterministic tests before real AI calls.
- Never commit secrets.
- Never let failed generation destroy the last valid plan or workout.
- Keep future PHIP domains as placeholders until exercise V1 is stable.
