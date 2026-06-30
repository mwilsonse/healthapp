import {
  EquipmentType,
  ExerciseModality,
  ExercisePreferenceValue,
  ExerciseStatus,
  GoalPriority,
  GoalStatus,
  JobStatus,
  JobType,
  MovementPattern,
  SetStatus,
  WorkoutStatus
} from "@prisma/client";
import { z } from "zod";

export const decimalNumberSchema = z.number().finite().nonnegative().optional();

export const upsertProfileInputSchema = z.object({
  birthDate: z.coerce.date().optional(),
  currentWeightKg: decimalNumberSchema,
  generalConstraints: z.string().trim().optional(),
  heightCm: decimalNumberSchema,
  nutritionNotes: z.string().trim().optional(),
  preferredTrainingTimes: z.unknown().optional(),
  restingHeartRateBpm: z.number().int().positive().optional(),
  sex: z.string().trim().optional(),
  sleepBaselineNotes: z.string().trim().optional()
});

export const createGoalInputSchema = z.object({
  description: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  priority: z.nativeEnum(GoalPriority).default(GoalPriority.MEDIUM),
  status: z.nativeEnum(GoalStatus).default(GoalStatus.ACTIVE),
  supportingMetrics: z.unknown().optional(),
  targetDate: z.coerce.date().optional(),
  title: z.string().trim().min(1)
});

export const createEquipmentInputSchema = z.object({
  description: z.string().trim().optional(),
  isAvailable: z.boolean().default(true),
  name: z.string().trim().min(1),
  notes: z.string().trim().optional(),
  type: z.nativeEnum(EquipmentType)
});

export const createAvailableLoadInputSchema = z.object({
  equipmentId: z.string().min(1),
  isPair: z.boolean().default(false),
  label: z.string().trim().optional(),
  loadKg: z.number().finite().positive(),
  notes: z.string().trim().optional(),
  quantity: z.number().int().positive().default(1)
});

export const createMeasurementInputSchema = z.object({
  armCm: decimalNumberSchema,
  bodyFatPercent: decimalNumberSchema,
  chestCm: decimalNumberSchema,
  hipsCm: decimalNumberSchema,
  measuredAt: z.coerce.date().default(() => new Date()),
  neckCm: decimalNumberSchema,
  notes: z.string().trim().optional(),
  pantlineCm: decimalNumberSchema,
  restingHeartRateBpm: z.number().int().positive().optional(),
  source: z.string().trim().default("manual"),
  stomachCm: decimalNumberSchema,
  thighCm: decimalNumberSchema,
  waistCm: decimalNumberSchema,
  weightKg: decimalNumberSchema
});

export const createExerciseInputSchema = z.object({
  contraindicationTags: z.array(z.string()).default([]),
  equipmentTypes: z.array(z.string()).default([]),
  instructions: z.string().trim().optional(),
  modality: z.nativeEnum(ExerciseModality),
  movementPattern: z.nativeEnum(MovementPattern),
  name: z.string().trim().min(1),
  primaryMuscles: z.array(z.string()).default([]),
  secondaryMuscles: z.array(z.string()).default([]),
  status: z.nativeEnum(ExerciseStatus).default(ExerciseStatus.PENDING_REVIEW),
  substitutionTags: z.array(z.string()).default([])
});

export const setExercisePreferenceInputSchema = z.object({
  exerciseId: z.string().min(1),
  preference: z.nativeEnum(ExercisePreferenceValue),
  reason: z.string().trim().optional()
});

export const filterExercisesInputSchema = z.object({
  availableEquipmentTypes: z.array(z.string()).default([]),
  avoidContraindicationTags: z.array(z.string()).default([]),
  modalities: z.array(z.nativeEnum(ExerciseModality)).default([]),
  preferences: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        preference: z.nativeEnum(ExercisePreferenceValue)
      })
    )
    .default([])
});

export const enqueueJobInputSchema = z.object({
  availableAt: z.coerce.date().optional(),
  inputSnapshot: z.unknown().optional(),
  maxRetries: z.number().int().nonnegative().default(3),
  scheduledAt: z.coerce.date().optional(),
  status: z.nativeEnum(JobStatus).default(JobStatus.PENDING),
  type: z.nativeEnum(JobType)
});

const logWorkoutStatusSchema = z.union([
  z.literal(WorkoutStatus.COMPLETED),
  z.literal(WorkoutStatus.PARTIAL),
  z.literal(WorkoutStatus.SKIPPED)
]);

export const intensityAdjustmentSchema = z
  .union([
    z.literal("AS_PLANNED"),
    z.literal("REDUCED"),
    z.literal("INCREASED")
  ])
  .default("AS_PLANNED");

export const logWorkoutSetInputSchema = z.object({
  actualDistanceMeters: z.number().int().nonnegative().optional(),
  actualDurationSeconds: z.number().int().nonnegative().optional(),
  actualReps: z.number().int().nonnegative().optional(),
  actualRir: decimalNumberSchema,
  actualRpe: decimalNumberSchema,
  actualWeightKg: decimalNumberSchema,
  notes: z.string().trim().optional(),
  orderIndex: z.number().int().nonnegative().optional(),
  painFlag: z.boolean().default(false),
  plannedWorkoutSetId: z.string().min(1).optional(),
  status: z.nativeEnum(SetStatus).default(SetStatus.COMPLETED)
});

export const logWorkoutExerciseInputSchema = z.object({
  notes: z.string().trim().optional(),
  plannedWorkoutExerciseId: z.string().min(1),
  sets: z.array(logWorkoutSetInputSchema).default([]),
  substitutionExerciseName: z.string().trim().optional(),
  substitutionReason: z.string().trim().optional()
});

export const extraWorkoutExerciseInputSchema = z.object({
  exerciseName: z.string().trim().min(1, "Exercise name is required."),
  notes: z.string().trim().optional(),
  sets: z.array(logWorkoutSetInputSchema).min(1, "Add at least one set.")
});

export const completeWorkoutInputSchema = z
  .object({
    durationAdjustmentMinutes: z.number().int().optional(),
    exercises: z.array(logWorkoutExerciseInputSchema).default([]),
    extraExercises: z.array(extraWorkoutExerciseInputSchema).default([]),
    intensityAdjustment: intensityAdjustmentSchema,
    overallRpe: decimalNumberSchema,
    painNotes: z.string().trim().optional(),
    plannedWorkoutId: z.string().min(1),
    skipReason: z.string().trim().optional(),
    status: logWorkoutStatusSchema,
    userNotes: z.string().trim().optional()
  })
  .superRefine((input, context) => {
    if (input.status === WorkoutStatus.SKIPPED && !input.skipReason) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Skip reason is required.",
        path: ["skipReason"]
      });
    }

    if (
      input.status !== WorkoutStatus.SKIPPED &&
      input.exercises.length === 0 &&
      input.extraExercises.length === 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Log at least one exercise before completing the workout.",
        path: ["exercises"]
      });
    }
  });

export const decidePlanEditCommitmentInputSchema = z.object({
  commit: z.boolean(),
  completedWorkoutId: z.string().min(1)
});

export const coachChatInputSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  plannedWorkoutId: z.string().trim().min(1).optional()
});

export const coachChatActionDecisionInputSchema = z.object({
  actionId: z.string().trim().min(1),
  decision: z.union([z.literal("confirm"), z.literal("dismiss")])
});

export const resetUserDataInputSchema = z.object({
  confirmation: z.string().trim(),
  preserveUser: z.boolean().default(true)
});

export type UpsertProfileInput = z.infer<typeof upsertProfileInputSchema>;
export type CreateGoalInput = z.infer<typeof createGoalInputSchema>;
export type CreateEquipmentInput = z.infer<typeof createEquipmentInputSchema>;
export type CreateAvailableLoadInput = z.infer<
  typeof createAvailableLoadInputSchema
>;
export type CreateMeasurementInput = z.infer<
  typeof createMeasurementInputSchema
>;
export type CreateExerciseInput = z.infer<typeof createExerciseInputSchema>;
export type SetExercisePreferenceInput = z.infer<
  typeof setExercisePreferenceInputSchema
>;
export type FilterExercisesInput = z.infer<typeof filterExercisesInputSchema>;
export type EnqueueJobInput = z.input<typeof enqueueJobInputSchema>;
export type CompleteWorkoutInput = z.infer<typeof completeWorkoutInputSchema>;
export type DecidePlanEditCommitmentInput = z.infer<
  typeof decidePlanEditCommitmentInputSchema
>;
export type CoachChatInput = z.infer<typeof coachChatInputSchema>;
export type CoachChatActionDecisionInput = z.infer<
  typeof coachChatActionDecisionInputSchema
>;
export type ResetUserDataInput = z.infer<typeof resetUserDataInputSchema>;
