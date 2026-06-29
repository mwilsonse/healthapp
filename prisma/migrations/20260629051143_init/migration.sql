-- CreateEnum
CREATE TYPE "UnitPreference" AS ENUM ('US', 'METRIC');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'paused', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('low', 'medium', 'high', 'primary');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'band', 'bodyweight', 'cardio_machine', 'other');

-- CreateEnum
CREATE TYPE "ExerciseStatus" AS ENUM ('active', 'pending_review', 'archived');

-- CreateEnum
CREATE TYPE "ExerciseModality" AS ENUM ('strength', 'cardio', 'mobility', 'warmup', 'recovery');

-- CreateEnum
CREATE TYPE "MovementPattern" AS ENUM ('squat', 'hinge', 'push', 'pull', 'lunge', 'carry', 'rotation', 'gait', 'isolation', 'cardio', 'mobility', 'other');

-- CreateEnum
CREATE TYPE "ExercisePreferenceValue" AS ENUM ('enjoy', 'neutral', 'avoid');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('draft', 'active', 'completed', 'superseded', 'failed');

-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('planned', 'in_progress', 'completed', 'skipped', 'partial', 'superseded');

-- CreateEnum
CREATE TYPE "SetStatus" AS ENUM ('planned', 'completed', 'skipped', 'modified');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('biweekly_plan_review', 'next_workout_generation', 'post_workout_feedback', 'coach_note_refresh');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'running', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "AiInteractionType" AS ENUM ('plan_generation', 'workout_generation', 'post_workout_feedback', 'coach_note_refresh', 'coach_chat');

-- CreateEnum
CREATE TYPE "CoachActionStatus" AS ENUM ('suggested', 'confirmed', 'applied', 'dismissed', 'failed');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('active', 'disconnected', 'error', 'paused');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "unitPreference" "UnitPreference" NOT NULL DEFAULT 'US',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "sex" TEXT,
    "heightCm" DECIMAL(7,2),
    "currentWeightKg" DECIMAL(7,3),
    "restingHeartRateBpm" INTEGER,
    "sleepBaselineNotes" TEXT,
    "nutritionNotes" TEXT,
    "preferredTrainingTimes" JSONB,
    "generalConstraints" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_measurements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DECIMAL(7,3),
    "bodyFatPercent" DECIMAL(5,2),
    "chestCm" DECIMAL(7,2),
    "waistCm" DECIMAL(7,2),
    "stomachCm" DECIMAL(7,2),
    "hipsCm" DECIMAL(7,2),
    "pantlineCm" DECIMAL(7,2),
    "neckCm" DECIMAL(7,2),
    "armCm" DECIMAL(7,2),
    "thighCm" DECIMAL(7,2),
    "restingHeartRateBpm" INTEGER,
    "source" TEXT,
    "notes" TEXT,

    CONSTRAINT "user_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "GoalPriority" NOT NULL DEFAULT 'medium',
    "status" "GoalStatus" NOT NULL DEFAULT 'active',
    "targetDate" TIMESTAMP(3),
    "supportingMetrics" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "description" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "available_loads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "loadKg" DECIMAL(7,3) NOT NULL,
    "label" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isPair" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "available_loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "status" "ExerciseStatus" NOT NULL DEFAULT 'active',
    "modality" "ExerciseModality" NOT NULL,
    "movementPattern" "MovementPattern" NOT NULL,
    "primaryMuscles" JSONB,
    "secondaryMuscles" JSONB,
    "equipmentTypes" JSONB,
    "contraindicationTags" JSONB,
    "substitutionTags" JSONB,
    "instructions" TEXT,
    "createdByUserId" TEXT,
    "createdByAiInteractionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "preference" "ExercisePreferenceValue" NOT NULL DEFAULT 'neutral',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'draft',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "primaryGoalId" TEXT,
    "summary" TEXT,
    "weeklyStructure" JSONB,
    "progressionGuidance" TEXT,
    "recoveryGuidance" TEXT,
    "measurementReminders" JSONB,
    "rationaleId" TEXT,
    "createdByJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_workouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainingPlanId" TEXT NOT NULL,
    "status" "WorkoutStatus" NOT NULL DEFAULT 'planned',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "workoutType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "warmup" TEXT,
    "targetDurationSeconds" INTEGER,
    "rationaleId" TEXT,
    "createdByJobId" TEXT,
    "supersededByWorkoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planned_workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_workout_exercises" (
    "id" TEXT NOT NULL,
    "plannedWorkoutId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "notes" TEXT,
    "restSeconds" INTEGER,
    "targetRpe" DECIMAL(4,1),
    "targetRir" DECIMAL(4,1),

    CONSTRAINT "planned_workout_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_workout_sets" (
    "id" TEXT NOT NULL,
    "plannedWorkoutExerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "targetReps" INTEGER,
    "targetWeightKg" DECIMAL(7,3),
    "targetDurationSeconds" INTEGER,
    "targetDistanceMeters" INTEGER,
    "targetRpe" DECIMAL(4,1),
    "targetRir" DECIMAL(4,1),
    "notes" TEXT,

    CONSTRAINT "planned_workout_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completed_workouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plannedWorkoutId" TEXT,
    "status" "WorkoutStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "skipReason" TEXT,
    "overallRpe" DECIMAL(4,1),
    "painNotes" TEXT,
    "userNotes" TEXT,
    "coachFeedbackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "completed_workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completed_workout_exercises" (
    "id" TEXT NOT NULL,
    "completedWorkoutId" TEXT NOT NULL,
    "plannedWorkoutExerciseId" TEXT,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "substitutionReason" TEXT,
    "notes" TEXT,

    CONSTRAINT "completed_workout_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completed_exercise_sets" (
    "id" TEXT NOT NULL,
    "completedWorkoutExerciseId" TEXT NOT NULL,
    "plannedWorkoutSetId" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "status" "SetStatus" NOT NULL DEFAULT 'completed',
    "actualReps" INTEGER,
    "actualWeightKg" DECIMAL(7,3),
    "actualDurationSeconds" INTEGER,
    "actualDistanceMeters" INTEGER,
    "actualRpe" DECIMAL(4,1),
    "actualRir" DECIMAL(4,1),
    "painFlag" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "completed_exercise_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cardio_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plannedWorkoutId" TEXT,
    "completedWorkoutId" TEXT,
    "activityType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "durationSeconds" INTEGER,
    "distanceMeters" INTEGER,
    "averagePaceSecondsPerKm" INTEGER,
    "averageHeartRateBpm" INTEGER,
    "maxHeartRateBpm" INTEGER,
    "caloriesKcal" INTEGER,
    "source" TEXT,
    "notes" TEXT,

    CONSTRAINT "cardio_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "sourceJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_rationales" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "evidenceRefs" JSONB,
    "createdByAiInteractionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_rationales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_interactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AiInteractionType" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputSnapshot" JSONB,
    "validatedOutput" JSONB,
    "outputSchemaVersion" TEXT NOT NULL,
    "tokenUsage" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "scheduledAt" TIMESTAMP(3),
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "inputSnapshot" JSONB,
    "outputRef" JSONB,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "JobStatus" NOT NULL,
    "workerId" TEXT,
    "error" TEXT,
    "logs" JSONB,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "metadata" JSONB,

    CONSTRAINT "health_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "caloriesKcal" INTEGER,
    "proteinGrams" DECIMAL(8,2),
    "carbGrams" DECIMAL(8,2),
    "fatGrams" DECIMAL(8,2),
    "source" TEXT,
    "metadata" JSONB,

    CONSTRAINT "nutrition_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biomarker_results" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "markerName" TEXT NOT NULL,
    "value" DECIMAL(12,4),
    "unit" TEXT,
    "referenceRange" TEXT,
    "provider" TEXT,
    "metadata" JSONB,

    CONSTRAINT "biomarker_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_integrations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'disconnected',
    "tokenMetadata" JSONB,
    "syncSettings" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),

    CONSTRAINT "device_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_jobs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceIntegrationId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "integration_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "insightType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "sourceRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insight_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- CreateIndex
CREATE INDEX "user_measurements_userId_measuredAt_idx" ON "user_measurements"("userId", "measuredAt");

-- CreateIndex
CREATE INDEX "goals_userId_status_priority_idx" ON "goals"("userId", "status", "priority");

-- CreateIndex
CREATE INDEX "equipment_userId_type_idx" ON "equipment"("userId", "type");

-- CreateIndex
CREATE INDEX "available_loads_userId_equipmentId_loadKg_idx" ON "available_loads"("userId", "equipmentId", "loadKg");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_normalizedName_key" ON "exercises"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_preferences_userId_exerciseId_key" ON "exercise_preferences"("userId", "exerciseId");

-- CreateIndex
CREATE INDEX "training_plans_userId_status_startDate_idx" ON "training_plans"("userId", "status", "startDate");

-- CreateIndex
CREATE INDEX "planned_workouts_userId_status_scheduledFor_idx" ON "planned_workouts"("userId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "planned_workout_exercises_plannedWorkoutId_orderIndex_idx" ON "planned_workout_exercises"("plannedWorkoutId", "orderIndex");

-- CreateIndex
CREATE INDEX "planned_workout_sets_plannedWorkoutExerciseId_orderIndex_idx" ON "planned_workout_sets"("plannedWorkoutExerciseId", "orderIndex");

-- CreateIndex
CREATE INDEX "completed_workouts_userId_completedAt_status_idx" ON "completed_workouts"("userId", "completedAt", "status");

-- CreateIndex
CREATE INDEX "completed_workout_exercises_completedWorkoutId_orderIndex_idx" ON "completed_workout_exercises"("completedWorkoutId", "orderIndex");

-- CreateIndex
CREATE INDEX "completed_exercise_sets_completedWorkoutExerciseId_orderInd_idx" ON "completed_exercise_sets"("completedWorkoutExerciseId", "orderIndex");

-- CreateIndex
CREATE INDEX "cardio_activities_userId_startedAt_idx" ON "cardio_activities"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "coach_notes_userId_scope_validFrom_idx" ON "coach_notes"("userId", "scope", "validFrom");

-- CreateIndex
CREATE INDEX "ai_interactions_userId_type_createdAt_idx" ON "ai_interactions"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "jobs_status_availableAt_idx" ON "jobs"("status", "availableAt");

-- CreateIndex
CREATE INDEX "jobs_userId_type_createdAt_idx" ON "jobs"("userId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "job_runs_jobId_startedAt_idx" ON "job_runs"("jobId", "startedAt");

-- CreateIndex
CREATE INDEX "health_metrics_userId_metricType_recordedAt_idx" ON "health_metrics"("userId", "metricType", "recordedAt");

-- CreateIndex
CREATE INDEX "nutrition_entries_userId_occurredAt_idx" ON "nutrition_entries"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "biomarker_results_userId_markerName_collectedAt_idx" ON "biomarker_results"("userId", "markerName", "collectedAt");

-- CreateIndex
CREATE INDEX "device_integrations_userId_provider_status_idx" ON "device_integrations"("userId", "provider", "status");

-- CreateIndex
CREATE INDEX "integration_sync_jobs_userId_status_idx" ON "integration_sync_jobs"("userId", "status");

-- CreateIndex
CREATE INDEX "insight_events_userId_insightType_createdAt_idx" ON "insight_events"("userId", "insightType", "createdAt");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_measurements" ADD CONSTRAINT "user_measurements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "available_loads" ADD CONSTRAINT "available_loads_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "available_loads" ADD CONSTRAINT "available_loads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_createdByAiInteractionId_fkey" FOREIGN KEY ("createdByAiInteractionId") REFERENCES "ai_interactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_preferences" ADD CONSTRAINT "exercise_preferences_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_preferences" ADD CONSTRAINT "exercise_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_createdByJobId_fkey" FOREIGN KEY ("createdByJobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_primaryGoalId_fkey" FOREIGN KEY ("primaryGoalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_rationaleId_fkey" FOREIGN KEY ("rationaleId") REFERENCES "recommendation_rationales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_createdByJobId_fkey" FOREIGN KEY ("createdByJobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_rationaleId_fkey" FOREIGN KEY ("rationaleId") REFERENCES "recommendation_rationales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_supersededByWorkoutId_fkey" FOREIGN KEY ("supersededByWorkoutId") REFERENCES "planned_workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "training_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_workout_exercises" ADD CONSTRAINT "planned_workout_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_workout_exercises" ADD CONSTRAINT "planned_workout_exercises_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "planned_workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_workout_sets" ADD CONSTRAINT "planned_workout_sets_plannedWorkoutExerciseId_fkey" FOREIGN KEY ("plannedWorkoutExerciseId") REFERENCES "planned_workout_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_workouts" ADD CONSTRAINT "completed_workouts_coachFeedbackId_fkey" FOREIGN KEY ("coachFeedbackId") REFERENCES "coach_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_workouts" ADD CONSTRAINT "completed_workouts_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "planned_workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_workouts" ADD CONSTRAINT "completed_workouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_workout_exercises" ADD CONSTRAINT "completed_workout_exercises_completedWorkoutId_fkey" FOREIGN KEY ("completedWorkoutId") REFERENCES "completed_workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_workout_exercises" ADD CONSTRAINT "completed_workout_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_workout_exercises" ADD CONSTRAINT "completed_workout_exercises_plannedWorkoutExerciseId_fkey" FOREIGN KEY ("plannedWorkoutExerciseId") REFERENCES "planned_workout_exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_exercise_sets" ADD CONSTRAINT "completed_exercise_sets_completedWorkoutExerciseId_fkey" FOREIGN KEY ("completedWorkoutExerciseId") REFERENCES "completed_workout_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_exercise_sets" ADD CONSTRAINT "completed_exercise_sets_plannedWorkoutSetId_fkey" FOREIGN KEY ("plannedWorkoutSetId") REFERENCES "planned_workout_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cardio_activities" ADD CONSTRAINT "cardio_activities_completedWorkoutId_fkey" FOREIGN KEY ("completedWorkoutId") REFERENCES "completed_workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cardio_activities" ADD CONSTRAINT "cardio_activities_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "planned_workouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cardio_activities" ADD CONSTRAINT "cardio_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_sourceJobId_fkey" FOREIGN KEY ("sourceJobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_rationales" ADD CONSTRAINT "recommendation_rationales_createdByAiInteractionId_fkey" FOREIGN KEY ("createdByAiInteractionId") REFERENCES "ai_interactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_rationales" ADD CONSTRAINT "recommendation_rationales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_interactions" ADD CONSTRAINT "ai_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_entries" ADD CONSTRAINT "nutrition_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biomarker_results" ADD CONSTRAINT "biomarker_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_integrations" ADD CONSTRAINT "device_integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_deviceIntegrationId_fkey" FOREIGN KEY ("deviceIntegrationId") REFERENCES "device_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_events" ADD CONSTRAINT "insight_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
