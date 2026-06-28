# PHIP V1 Implementation Architecture Spec

## 1. Purpose

This document is the build contract for PHIP V1. The product architecture plan defines the why and the user experience direction; this spec defines how the first version should be implemented.

V1 is an exercise-first personal health application. It must support the first complete loop:

1. Onboard the user.
2. Capture profile, goals, constraints, equipment, and available loads.
3. Generate a two-week training block.
4. Generate today's concrete workout.
5. Log the workout set by set.
6. Produce post-workout feedback.
7. Generate the next workout from the current plan and recent logs.

The system is single-user and self-hosted first, but it should not paint the architecture into a corner. Core tables should include `user_id`, service boundaries should be portable, and worker/job design should be able to move later to managed infrastructure.

## 2. Technology Decisions

### Application Stack

- Framework: Next.js App Router.
- Language: TypeScript with strict mode enabled.
- UI: Tailwind CSS and shadcn/ui.
- Database: PostgreSQL.
- ORM and migrations: Prisma.
- Validation: Zod for form inputs, service inputs, route payloads, job payloads, and AI outputs.
- Tests: Vitest for unit/integration tests and Playwright for core UI flows.
- Runtime packaging: Docker Compose for Synology NAS/Linux.
- AI: external API providers behind an internal adapter.

### Quality Baseline

The project should use:

- Strict TypeScript.
- ESLint.
- Prettier.
- Type-safe environment variable parsing.
- Zod schemas at trust boundaries.
- No business logic embedded directly in React components, server actions, or route handlers.

## 3. Repository Structure

Use this structure unless implementation discovers a strong reason to adjust it:

```text
.
├── docs/
│   ├── product-architecture-plan.md
│   └── implementation-architecture-spec.md
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
│       ├── exercises.ts
│       └── demo-user.ts
├── src/
│   ├── app/
│   │   ├── (app)/
│   │   │   ├── today/
│   │   │   ├── plan/
│   │   │   ├── logs/
│   │   │   └── profile/
│   │   ├── api/
│   │   │   ├── coach/
│   │   │   ├── jobs/
│   │   │   ├── export/
│   │   │   └── health/
│   │   ├── onboarding/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   └── layout/
│   ├── features/
│   │   ├── onboarding/
│   │   ├── today/
│   │   ├── plan/
│   │   ├── logs/
│   │   ├── profile/
│   │   └── coach/
│   ├── server/
│   │   ├── ai/
│   │   ├── auth/
│   │   ├── db/
│   │   ├── env/
│   │   ├── jobs/
│   │   ├── logging/
│   │   └── services/
│   ├── worker/
│   │   └── index.ts
│   ├── lib/
│   └── tests/
├── docker/
│   ├── app.Dockerfile
│   ├── backup.Dockerfile
│   └── backup.sh
├── docker-compose.yml
├── package.json
└── README.md
```

Server actions and route handlers are transport adapters. They validate input, call shared service functions, and return typed results. Shared application behavior belongs under `src/server/services`.

## 4. Runtime Architecture

### Docker Compose Services

V1 should run with:

- `web`: Next.js app. Serves UI, server actions, route handlers, and health checks.
- `worker`: Node process from the same codebase. Claims and runs jobs.
- `postgres`: PostgreSQL with a persistent volume.
- `backup`: scheduled or manually invokable backup container/script.

Optional later services:

- Reverse proxy.
- Sentry or other error monitoring.
- Managed job platform.
- Managed Postgres.

Do not require Redis, Trigger.dev, Inngest, enterprise auth, analytics, payments, or remote access for V1.

### Environment Variables

Required:

- `DATABASE_URL`
- `APP_BASE_URL`
- `APP_SECRET`
- `AI_PROVIDER`
- `AI_API_KEY` or provider-specific secret file path
- `BACKUP_RETENTION_DAYS`
- `BACKUP_DIR`

Recommended:

- `LOG_LEVEL`
- `JOB_WORKER_CONCURRENCY`
- `JOB_MAX_RETRIES`
- `JOB_POLL_INTERVAL_MS`
- `DEFAULT_USER_ID`

Secrets should support local `.env` during development and Docker secret file paths for self-hosting.

## 5. Access Model

V1 is single-user.

Implementation requirements:

- Create exactly one default user during seed/setup.
- Include `user_id` on core tables.
- Do not build signup, teams, organizations, SAML, OAuth, or billing.
- If the app needs protection beyond trusted local network access, implement a simple local app passcode or admin secret gate.
- Any future public exposure requires revisiting auth before deployment.

## 6. Prisma Data Model

Store canonical metric units internally. Display US units by default.

Recommended internal units:

- Mass: kilograms.
- Length: centimeters.
- Distance: meters.
- Duration: seconds.
- Energy: kilocalories.

### Core Enums

Define enums for:

- `GoalStatus`: `active`, `paused`, `completed`, `abandoned`.
- `GoalPriority`: `low`, `medium`, `high`, `primary`.
- `EquipmentType`: `barbell`, `dumbbell`, `kettlebell`, `machine`, `cable`, `band`, `bodyweight`, `cardio_machine`, `other`.
- `ExerciseStatus`: `active`, `pending_review`, `archived`.
- `ExerciseModality`: `strength`, `cardio`, `mobility`, `warmup`, `recovery`.
- `MovementPattern`: `squat`, `hinge`, `push`, `pull`, `lunge`, `carry`, `rotation`, `gait`, `isolation`, `cardio`, `mobility`, `other`.
- `PlanStatus`: `draft`, `active`, `completed`, `superseded`, `failed`.
- `WorkoutStatus`: `planned`, `in_progress`, `completed`, `skipped`, `partial`, `superseded`.
- `SetStatus`: `planned`, `completed`, `skipped`, `modified`.
- `JobType`: `biweekly_plan_review`, `next_workout_generation`, `post_workout_feedback`, `coach_note_refresh`.
- `JobStatus`: `pending`, `running`, `succeeded`, `failed`, `cancelled`.
- `AiInteractionType`: `plan_generation`, `workout_generation`, `post_workout_feedback`, `coach_note_refresh`, `coach_chat`.
- `CoachActionStatus`: `suggested`, `confirmed`, `applied`, `dismissed`, `failed`.

### Core Models

`User`

- `id`
- `displayName`
- `timezone`
- `unitPreference`
- `createdAt`
- `updatedAt`

`UserProfile`

- `id`
- `userId`
- `birthDate`
- `sex`
- `heightCm`
- `currentWeightKg`
- `restingHeartRateBpm`
- `sleepBaselineNotes`
- `nutritionNotes`
- `preferredTrainingTimes` as JSON
- `generalConstraints` as text
- `createdAt`
- `updatedAt`

`UserMeasurement`

- `id`
- `userId`
- `measuredAt`
- `weightKg`
- `bodyFatPercent`
- `chestCm`
- `waistCm`
- `stomachCm`
- `hipsCm`
- `pantlineCm`
- `neckCm`
- `armCm`
- `thighCm`
- `restingHeartRateBpm`
- `source`
- `notes`
- indexes on `userId, measuredAt`

`Goal`

- `id`
- `userId`
- `title`
- `description`
- `priority`
- `status`
- `targetDate`
- `supportingMetrics` as JSON
- `notes`
- `createdAt`
- `updatedAt`
- indexes on `userId, status, priority`

`Equipment`

- `id`
- `userId`
- `name`
- `type`
- `description`
- `isAvailable`
- `notes`
- `createdAt`
- `updatedAt`
- index on `userId, type`

`AvailableLoad`

- `id`
- `userId`
- `equipmentId`
- `loadKg`
- `label`
- `quantity`
- `isPair`
- `notes`
- indexes on `userId, equipmentId, loadKg`

`Exercise`

- `id`
- `name`
- `status`
- `modality`
- `movementPattern`
- `primaryMuscles` as JSON
- `secondaryMuscles` as JSON
- `equipmentTypes` as JSON
- `contraindicationTags` as JSON
- `substitutionTags` as JSON
- `instructions`
- `createdByUserId` nullable
- `createdByAiInteractionId` nullable
- `createdAt`
- `updatedAt`
- unique normalized name

`ExercisePreference`

- `id`
- `userId`
- `exerciseId`
- `preference`: enjoy, neutral, avoid
- `reason`
- `createdAt`
- `updatedAt`
- unique `userId, exerciseId`

`TrainingPlan`

- `id`
- `userId`
- `status`
- `startDate`
- `endDate`
- `title`
- `primaryGoalId`
- `summary`
- `weeklyStructure` as JSON
- `progressionGuidance`
- `recoveryGuidance`
- `measurementReminders` as JSON
- `rationaleId`
- `createdByJobId`
- `createdAt`
- `updatedAt`
- indexes on `userId, status, startDate`

`PlannedWorkout`

- `id`
- `userId`
- `trainingPlanId`
- `status`
- `scheduledFor`
- `workoutType`
- `title`
- `summary`
- `warmup`
- `targetDurationSeconds`
- `rationaleId`
- `createdByJobId`
- `supersededByWorkoutId`
- `createdAt`
- `updatedAt`
- indexes on `userId, status, scheduledFor`

`PlannedWorkoutExercise`

- `id`
- `plannedWorkoutId`
- `exerciseId`
- `orderIndex`
- `nameSnapshot`
- `notes`
- `restSeconds`
- `targetRpe`
- `targetRir`

`PlannedWorkoutSet`

- `id`
- `plannedWorkoutExerciseId`
- `orderIndex`
- `targetReps`
- `targetWeightKg`
- `targetDurationSeconds`
- `targetDistanceMeters`
- `targetRpe`
- `targetRir`
- `notes`

`CompletedWorkout`

- `id`
- `userId`
- `plannedWorkoutId`
- `status`
- `startedAt`
- `completedAt`
- `skipReason`
- `overallRpe`
- `painNotes`
- `userNotes`
- `coachFeedbackId`
- `createdAt`
- `updatedAt`
- indexes on `userId, completedAt, status`

`CompletedWorkoutExercise`

- `id`
- `completedWorkoutId`
- `plannedWorkoutExerciseId`
- `exerciseId`
- `orderIndex`
- `nameSnapshot`
- `substitutionReason`
- `notes`

`CompletedExerciseSet`

- `id`
- `completedWorkoutExerciseId`
- `plannedWorkoutSetId`
- `orderIndex`
- `status`
- `actualReps`
- `actualWeightKg`
- `actualDurationSeconds`
- `actualDistanceMeters`
- `actualRpe`
- `actualRir`
- `painFlag`
- `notes`

`CardioActivity`

- `id`
- `userId`
- `plannedWorkoutId`
- `completedWorkoutId`
- `activityType`
- `startedAt`
- `durationSeconds`
- `distanceMeters`
- `averagePaceSecondsPerKm`
- `averageHeartRateBpm`
- `maxHeartRateBpm`
- `caloriesKcal`
- `source`
- `notes`
- index on `userId, startedAt`

`CoachNote`

- `id`
- `userId`
- `scope`
- `title`
- `body`
- `validFrom`
- `validUntil`
- `sourceJobId`
- `createdAt`
- `updatedAt`

`RecommendationRationale`

- `id`
- `userId`
- `summary`
- `details` as JSON
- `evidenceRefs` as JSON
- `createdByAiInteractionId`
- `createdAt`

`AiInteraction`

- `id`
- `userId`
- `type`
- `provider`
- `model`
- `inputSnapshot` as JSON
- `validatedOutput` as JSON
- `outputSchemaVersion`
- `tokenUsage` as JSON
- `error`
- `createdAt`
- indexes on `userId, type, createdAt`

`Job`

- `id`
- `userId`
- `type`
- `status`
- `scheduledAt`
- `availableAt`
- `startedAt`
- `finishedAt`
- `retryCount`
- `maxRetries`
- `inputSnapshot` as JSON
- `outputRef` as JSON
- `lastError`
- `lockedAt`
- `lockedBy`
- `createdAt`
- `updatedAt`
- indexes on `status, availableAt`, `userId, type, createdAt`

`JobRun`

- `id`
- `jobId`
- `startedAt`
- `finishedAt`
- `status`
- `workerId`
- `error`
- `logs` as JSON

### Future Placeholder Models

Keep these intentionally minimal in V1:

`HealthMetric`

- Generic time-series metric table for future body composition, sleep, recovery, or other values.
- Fields: `userId`, `metricType`, `value`, `unit`, `recordedAt`, `source`, `metadata`.

`NutritionEntry`

- Meal-level placeholder.
- Fields: `userId`, `occurredAt`, `description`, `caloriesKcal`, `proteinGrams`, `carbGrams`, `fatGrams`, `source`, `metadata`.

`BiomarkerResult`

- Lab result placeholder.
- Fields: `userId`, `collectedAt`, `markerName`, `value`, `unit`, `referenceRange`, `provider`, `metadata`.

`DeviceIntegration`

- Future connected account placeholder.
- Fields: `userId`, `provider`, `status`, `tokenMetadata`, `syncSettings`, `lastSyncAt`, `lastSuccessfulSyncAt`.

`IntegrationSyncJob`

- Future sync tracking placeholder.
- Fields: `userId`, `deviceIntegrationId`, `status`, `startedAt`, `finishedAt`, `error`.

`InsightEvent`

- Future generated insight placeholder.
- Fields: `userId`, `insightType`, `summary`, `details`, `sourceRefs`, `createdAt`.

## 7. Service Boundaries

Create these service modules under `src/server/services`:

- `profileService`: user profile, measurements, constraints, preferences.
- `equipmentService`: equipment inventory, available loads, load rounding.
- `goalService`: goals, priority, status, supporting metrics.
- `exerciseService`: exercise library, seed data, preferences, pending-review exercises.
- `planningService`: two-week plans, workout generation orchestration, plan edit commitment.
- `workoutService`: active workout state, set logging, completion, skip, partial completion.
- `coachService`: coach notes, post-workout feedback, chat suggested actions.
- `jobService`: enqueue, claim, execute, retry, replay, and inspect jobs.
- `aiRecommendationService`: provider adapter orchestration and output validation.
- `exportService`: full data export and destructive reset/delete.

Services should receive validated inputs and return typed domain results. They should not import React components.

## 8. API And UI Boundaries

### Server Actions

Use server actions for:

- Onboarding form submission.
- Profile updates.
- Equipment updates.
- Goal updates.
- Workout set logging.
- Workout completion, skip, and partial completion.
- Confirming coach-suggested changes.

Server actions must:

1. Validate input.
2. Resolve the single user.
3. Call a service function.
4. Return typed success/error output.

### Route Handlers

Use route handlers for:

- `GET /api/health`
- `GET /api/jobs/:id`
- `POST /api/jobs/:id/replay`
- `POST /api/coach/chat`
- `GET /api/export`
- `POST /api/delete-data`

Route handlers should also be thin wrappers over services.

## 9. Job System

### Queue Design

Use the Postgres `Job` table as the queue.

Worker behavior:

1. Poll for jobs with `status = pending` and `availableAt <= now`.
2. Claim jobs atomically by setting `status = running`, `lockedAt`, `lockedBy`, and `startedAt`.
3. Create a `JobRun`.
4. Execute the job handler.
5. Persist output references.
6. Mark succeeded or failed.
7. On retryable failure, increment `retryCount`, set `status = pending`, and schedule `availableAt` with backoff.
8. On terminal failure, keep `status = failed` and persist `lastError`.

For V1 single-worker deployment, a Postgres job table is enough. The implementation should still use atomic updates so a future multi-worker setup is possible.

### Required Job Handlers

`biweekly_plan_review`

- Input: user profile snapshot, goals, constraints, equipment summary, recent workout/cardio history, current measurements, previous plan summary.
- Output: `TrainingPlan`, planned high-level structure, rationale, coach notes.

`next_workout_generation`

- Input: active training plan, recent completed workouts, equipment, constraints, committed plan edits, previous workout result.
- Output: next `PlannedWorkout`, planned exercises, planned sets, rationale.

`post_workout_feedback`

- Input: completed workout with planned vs actual sets, goals, active plan, recent trend summary.
- Output: coach feedback note, goal alignment summary, next-workout implications.

`coach_note_refresh`

- Input: profile, goals, active plan, recent logs, constraints, latest feedback.
- Output: persistent coach notes for pre-workout, in-workout, post-workout, and plan review contexts.

### Failure Rules

- Never delete the last valid active plan because a job failed.
- Never replace today's workout with invalid AI output.
- Store validation errors in `AiInteraction` and `Job`.
- Expose job status in the UI when generation is pending or failed.
- Allow manual replay of failed jobs from stored structured input.

## 10. AI Architecture

### Provider Adapter

Define an internal adapter interface:

```ts
interface AiProvider {
  generateStructured<TInput, TOutput>(request: {
    type: AiInteractionType;
    schemaName: string;
    schemaVersion: string;
    input: TInput;
  }): Promise<{
    provider: string;
    model: string;
    output: TOutput;
    tokenUsage?: unknown;
    rawMetadata?: unknown;
  }>;
}
```

Initial implementation may use OpenAI or another provider, but application code should call the adapter rather than the provider SDK directly.

### Structured Output Schemas

Define versioned Zod schemas for:

- `TrainingPlanOutputV1`
- `PlannedWorkoutOutputV1`
- `PostWorkoutFeedbackOutputV1`
- `CoachNoteRefreshOutputV1`
- `CoachChatOutputV1`

All AI outputs must validate before they can mutate the database.

### AI Data Storage

Store:

- Provider.
- Model.
- Interaction type.
- Input snapshot metadata.
- Validated output JSON.
- Schema version.
- Token usage when available.
- Errors and validation failures.

Avoid storing unnecessary raw prompt bloat by default. Add temporary debug logging only behind an explicit environment flag.

### Coach Chat Mutation Policy

Coach chat can propose changes. It may not silently mutate plans, workouts, logs, or profile data.

Flow:

1. User asks a question.
2. AI returns answer plus optional structured suggested actions.
3. UI displays suggested actions.
4. User confirms an action.
5. Server action validates and applies the mutation through the relevant service.
6. Store action status as suggested, confirmed, applied, dismissed, or failed.

## 11. Planning And Training Rules

Default training posture:

- Balanced strength plus cardio.
- Conservative progression.
- Favor adherence and injury avoidance over aggressive optimization.
- Use two-week plan blocks.

Load recommendation rules:

- Only recommend loads possible with available equipment.
- Round to the nearest available load.
- On ties, uncertainty, pain flags, or recent underperformance, favor the safer lower load.
- Cap load increases according to movement type and recent performance.

Plan edit rules:

- If the user edits a generated workout, ask whether to commit the change to future workouts in the current two-week cycle.
- One-off edits affect only the current workout.
- Committed edits become planning context for the rest of the active cycle.

Exercise creation rules:

- Seed a curated library.
- Allow user-created additions.
- If AI recommends an unknown exercise, create it as `pending_review` with metadata.
- Pending exercises may be used in the generated workout that introduced them.
- Pending exercises should not become generally reusable until reviewed, accepted, or repeatedly confirmed.

## 12. UX Architecture

### Navigation

Primary nav:

- Today.
- Plan.
- Logs.
- Profile.

### Initial Screens

Onboarding:

- Profile basics.
- Baseline measurements.
- Goals.
- Constraints/injuries.
- Exercise preferences.
- Preferred training times.
- Equipment.
- Available loads.

Today:

- Current workout.
- Planning status.
- Warmup.
- Exercise list.
- Set-by-set logging.
- Quick swap/intensity/duration/skip controls.
- Expandable rationale.
- Coach notes.
- Coach chat entry point.

Plan:

- Active two-week plan.
- Weekly structure.
- Planned sessions.
- Plan rationale.
- Committed changes.

Logs:

- Completed workouts.
- Planned vs actual summary.
- Exercise trends.
- Skips/partial sessions.

Profile:

- Profile.
- Measurements.
- Goals.
- Equipment.
- Constraints.
- Preferences.
- Export/delete controls.

## 13. Seed Data

Seed a starter exercise library with:

- Strength exercises across squat, hinge, push, pull, lunge, carry, rotation, isolation.
- Warmup and mobility movements.
- Basic cardio activities.
- Equipment requirements.
- Movement patterns.
- Contraindication tags.
- Substitution tags.

The seed library should be modest and reliable rather than exhaustive.

The seed should also create:

- Default single user.
- Optional demo equipment profile for development only.

## 14. Operations

### Backups

Provide automated compressed Postgres backups.

Requirements:

- Backups run on a schedule.
- Backups include timestamped filenames.
- Retention is controlled by `BACKUP_RETENTION_DAYS`.
- Restore steps are documented.
- Backup location is configurable.

### Export And Delete

V1 must support:

- Full data export for the single user.
- Destructive reset/delete flow.
- Confirmation before destructive deletion.

Export can be JSON initially. CSV can be added later.

### Logging

Use local structured logs for:

- App startup.
- Worker startup.
- Job claim/start/success/failure.
- AI interaction success/failure.
- Backup success/failure.
- Export/delete events.

Logs should avoid dumping sensitive health data unless debug mode is explicitly enabled.

## 15. Testing Strategy

### Unit Tests

Cover:

- Unit conversion.
- Available-load rounding.
- Equipment constraints.
- Exercise filtering by constraints and preferences.
- AI output schema validation.
- Job retry/backoff.
- Plan edit commitment rules.

### Integration Tests

Cover:

- Onboarding stores profile, goals, constraints, equipment, and loads.
- Training plan creation writes the correct records.
- Next workout generation writes planned workout/exercise/set records.
- Set-by-set logging preserves planned versus actual values.
- Completing a workout enqueues post-workout feedback and next-workout generation.
- Skipping or partially completing a workout adapts the next workout context.
- Failed AI output does not overwrite a valid workout.
- Export returns expected user data.
- Delete/reset removes user data safely.

### UI Tests

Cover:

- First-run onboarding.
- Today workout display.
- Set logging.
- Completing a workout.
- Viewing plan and logs.
- Coach chat suggested action confirmation.

## 16. Build Milestones

### Milestone 1: Foundation

Acceptance criteria:

- Next.js App Router app runs locally.
- Tailwind and shadcn/ui are configured.
- Prisma connects to Postgres.
- Docker Compose runs web, worker, and Postgres.
- Strict TypeScript, linting, formatting, and tests are configured.

### Milestone 2: Schema And Seeds

Acceptance criteria:

- Prisma schema includes V1 core models and future placeholders.
- Migrations apply cleanly.
- Seed creates default user and starter exercise library.
- Unit conversion and load rounding tests pass.

### Milestone 3: Onboarding

Acceptance criteria:

- User can enter profile, goals, constraints, equipment, and available loads.
- Data persists in Postgres.
- Profile screen can review and edit the entered data.

### Milestone 4: First Plan And Workout

Acceptance criteria:

- App can create a two-week plan.
- App can create today's workout from the plan.
- Today screen shows warmup, exercises, sets, target reps/load/rest/intensity, and rationale.
- Generated loads are achievable with available equipment.

### Milestone 5: Workout Logging

Acceptance criteria:

- User can log each planned set.
- User can modify actual reps, load, RPE/RIR, pain flag, and notes.
- User can skip or partially complete a workout.
- Planned versus actual values are preserved.

### Milestone 6: Post-Workout Jobs

Acceptance criteria:

- Completing, skipping, or partially completing a workout enqueues the correct jobs.
- Worker runs post-workout feedback and next-workout generation.
- Failures are logged and retryable.
- Last valid plan/workout remains available after failure.

### Milestone 7: Plan, Logs, And Coach Chat

Acceptance criteria:

- Plan screen shows active two-week plan and committed changes.
- Logs screen shows completed workouts and basic exercise-focused insights.
- Coach chat can answer with context.
- Coach chat mutations require explicit confirmation.

## 17. Managed Deployment Readiness

Do not optimize for managed hosting in V1, but preserve portability:

- Keep business logic out of server actions.
- Keep AI provider behind an adapter.
- Keep job execution behind service interfaces.
- Keep database as the source of truth.
- Use environment-based configuration.
- Include `user_id` on core tables.
- Avoid Synology-specific assumptions in application code.

## 18. Implementation Defaults

- V1 is exercise-only.
- Default displayed units are US units.
- Internal storage uses canonical metric units.
- Self-hosting on Synology/Linux is the default deployment target.
- External AI API usage is required.
- Future PHIP domains use light placeholders.
- Load rounding uses nearest available load, favoring safer lower load on ties or uncertainty.
- AI-created exercises start as `pending_review`.
- First build path is thin vertical slices, not layer-by-layer isolation.
