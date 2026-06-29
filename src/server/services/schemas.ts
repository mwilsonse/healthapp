import {
  EquipmentType,
  ExerciseModality,
  ExercisePreferenceValue,
  ExerciseStatus,
  GoalPriority,
  GoalStatus,
  JobStatus,
  JobType,
  MovementPattern
} from "@prisma/client";
import { z } from "zod";

export const decimalNumberSchema = z
  .number()
  .finite()
  .nonnegative()
  .optional();

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

export type UpsertProfileInput = z.infer<typeof upsertProfileInputSchema>;
export type CreateGoalInput = z.infer<typeof createGoalInputSchema>;
export type CreateEquipmentInput = z.infer<typeof createEquipmentInputSchema>;
export type CreateAvailableLoadInput = z.infer<
  typeof createAvailableLoadInputSchema
>;
export type CreateExerciseInput = z.infer<typeof createExerciseInputSchema>;
export type FilterExercisesInput = z.infer<typeof filterExercisesInputSchema>;
export type EnqueueJobInput = z.infer<typeof enqueueJobInputSchema>;
