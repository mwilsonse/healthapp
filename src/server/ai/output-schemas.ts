import { z } from "zod";

const isoDateSchema = z.string().min(1);
const optionalPositiveNumberSchema = z.number().finite().positive().optional();
const optionalNonnegativeNumberSchema = z
  .number()
  .finite()
  .nonnegative()
  .optional();

export const plannedSetOutputSchema = z.object({
  notes: z.string().optional(),
  orderIndex: z.number().int().nonnegative(),
  targetDistanceMeters: optionalPositiveNumberSchema,
  targetDurationSeconds: optionalPositiveNumberSchema,
  targetReps: z.number().int().positive().optional(),
  targetRir: optionalNonnegativeNumberSchema,
  targetRpe: optionalPositiveNumberSchema,
  targetWeightKg: optionalNonnegativeNumberSchema
});

export const plannedExerciseOutputSchema = z.object({
  exerciseName: z.string().min(1),
  notes: z.string().optional(),
  orderIndex: z.number().int().nonnegative(),
  restSeconds: optionalPositiveNumberSchema,
  sets: z.array(plannedSetOutputSchema).min(1),
  targetRir: optionalNonnegativeNumberSchema,
  targetRpe: optionalPositiveNumberSchema
});

export const plannedWorkoutOutputV1Schema = z.object({
  estimatedDurationSeconds: z.number().int().positive().optional(),
  exercises: z.array(plannedExerciseOutputSchema).min(1),
  rationale: z.string().min(1),
  scheduledFor: isoDateSchema,
  summary: z.string().min(1),
  title: z.string().min(1),
  warmup: z.string().optional(),
  workoutType: z.string().min(1)
});

export const trainingPlanOutputV1Schema = z.object({
  endDate: isoDateSchema,
  measurementReminders: z.array(z.string().min(1)).default([]),
  progressionGuidance: z.string().min(1),
  rationale: z.string().min(1),
  recoveryGuidance: z.string().min(1),
  startDate: isoDateSchema,
  summary: z.string().min(1),
  title: z.string().min(1),
  weeklyStructure: z.array(z.string().min(1)).min(1),
  workouts: z.array(plannedWorkoutOutputV1Schema).default([])
});

export const postWorkoutFeedbackOutputV1Schema = z.object({
  adaptationInstructions: z.array(z.string().min(1)).default([]),
  nextWorkoutFocus: z.string().min(1),
  recoveryRecommendation: z.string().min(1),
  summary: z.string().min(1)
});

export const coachNoteRefreshOutputV1Schema = z.object({
  notes: z
    .array(
      z.object({
        expiresAt: isoDateSchema.optional(),
        message: z.string().min(1),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        title: z.string().min(1)
      })
    )
    .default([])
});

export const coachChatOutputV1Schema = z.object({
  actions: z
    .array(
      z.object({
        confirmationRequired: z.boolean().default(true),
        description: z.string().min(1),
        input: z.unknown().optional(),
        type: z.string().min(1)
      })
    )
    .default([]),
  message: z.string().min(1)
});

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
