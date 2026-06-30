import { z } from "zod";

const isoDateSchema = z.string().min(1);
const nullablePositiveNumberSchema = z.number().finite().positive().nullable();
const nullableNonnegativeNumberSchema = z
  .number()
  .finite()
  .nonnegative()
  .nullable();

export const plannedSetOutputSchema = z
  .object({
    notes: z.string().nullable(),
    orderIndex: z.number().int().nonnegative(),
    targetDistanceMeters: nullablePositiveNumberSchema,
    targetDurationSeconds: nullablePositiveNumberSchema,
    targetReps: z.number().int().positive().nullable(),
    targetRir: nullableNonnegativeNumberSchema,
    targetRpe: nullablePositiveNumberSchema,
    targetWeightKg: nullableNonnegativeNumberSchema
  })
  .strict();

export const plannedExerciseOutputSchema = z
  .object({
    exerciseName: z.string().min(1),
    notes: z.string().nullable(),
    orderIndex: z.number().int().nonnegative(),
    restSeconds: nullablePositiveNumberSchema,
    sets: z.array(plannedSetOutputSchema).min(1),
    targetRir: nullableNonnegativeNumberSchema,
    targetRpe: nullablePositiveNumberSchema
  })
  .strict();

export const plannedWorkoutOutputV1Schema = z
  .object({
    estimatedDurationSeconds: z.number().int().positive().nullable(),
    exercises: z.array(plannedExerciseOutputSchema).min(1),
    rationale: z.string().min(1),
    scheduledFor: isoDateSchema,
    summary: z.string().min(1),
    title: z.string().min(1),
    warmup: z.string().nullable(),
    workoutType: z.string().min(1)
  })
  .strict();

export const trainingPlanOutputV1Schema = z
  .object({
    endDate: isoDateSchema,
    measurementReminders: z.array(z.string().min(1)),
    progressionGuidance: z.string().min(1),
    rationale: z.string().min(1),
    recoveryGuidance: z.string().min(1),
    startDate: isoDateSchema,
    summary: z.string().min(1),
    title: z.string().min(1),
    weeklyStructure: z.array(z.string().min(1)).min(1),
    workouts: z.array(plannedWorkoutOutputV1Schema)
  })
  .strict();

export const postWorkoutFeedbackOutputV1Schema = z
  .object({
    adaptationInstructions: z.array(z.string().min(1)),
    nextWorkoutFocus: z.string().min(1),
    recoveryRecommendation: z.string().min(1),
    summary: z.string().min(1)
  })
  .strict();

export const coachNoteRefreshOutputV1Schema = z
  .object({
    notes: z.array(
      z
        .object({
          expiresAt: isoDateSchema.nullable(),
          message: z.string().min(1),
          priority: z.enum(["low", "medium", "high"]),
          title: z.string().min(1)
        })
        .strict()
    )
  })
  .strict();

const generateTodayWorkoutActionSchema = z
  .object({
    confirmationRequired: z.boolean(),
    description: z.string().min(1),
    input: z.object({}).strict(),
    type: z.literal("generate_today_workout")
  })
  .strict();

const startWorkoutActionSchema = z
  .object({
    confirmationRequired: z.boolean(),
    description: z.string().min(1),
    input: z
      .object({
        plannedWorkoutId: z.string().min(1).nullable()
      })
      .strict(),
    type: z.literal("start_workout")
  })
  .strict();

const commitPlanEditActionSchema = z
  .object({
    confirmationRequired: z.boolean(),
    description: z.string().min(1),
    input: z
      .object({
        completedWorkoutId: z.string().min(1)
      })
      .strict(),
    type: z.literal("commit_plan_edit")
  })
  .strict();

const keepPlanEditOneOffActionSchema = z
  .object({
    confirmationRequired: z.boolean(),
    description: z.string().min(1),
    input: z
      .object({
        completedWorkoutId: z.string().min(1)
      })
      .strict(),
    type: z.literal("keep_plan_edit_one_off")
  })
  .strict();

export const coachChatActionOutputSchema = z.discriminatedUnion("type", [
  generateTodayWorkoutActionSchema,
  startWorkoutActionSchema,
  commitPlanEditActionSchema,
  keepPlanEditOneOffActionSchema
]);

export const coachChatOutputV1Schema = z
  .object({
    actions: z.array(coachChatActionOutputSchema),
    message: z.string().min(1)
  })
  .strict();

export type TrainingPlanOutputV1 = z.infer<typeof trainingPlanOutputV1Schema>;
export type PlannedWorkoutOutputV1 = z.infer<
  typeof plannedWorkoutOutputV1Schema
>;
export type PostWorkoutFeedbackOutputV1 = z.infer<
  typeof postWorkoutFeedbackOutputV1Schema
>;
export type CoachNoteRefreshOutputV1 = z.infer<
  typeof coachNoteRefreshOutputV1Schema
>;
export type CoachChatOutputV1 = z.infer<typeof coachChatOutputV1Schema>;
