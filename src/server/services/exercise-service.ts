import type { Exercise, ExercisePreference, PrismaClient } from "@prisma/client";

import { filterExercises } from "@/lib/exercise-filtering";
import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import {
  failure,
  success,
  validationFailure,
  type ServiceResult
} from "@/server/services/service-result";
import {
  createExerciseInputSchema,
  filterExercisesInputSchema,
  setExercisePreferenceInputSchema,
  type CreateExerciseInput,
  type FilterExercisesInput,
  type SetExercisePreferenceInput
} from "@/server/services/schemas";

function normalizeExerciseName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function jsonArray(value: unknown): string[] | null {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : null;
}

export const exerciseService = {
  async listExercises(db: PrismaClient = prisma): Promise<ServiceResult<Exercise[]>> {
    const exercises = await db.exercise.findMany({
      orderBy: { name: "asc" }
    });

    return success(exercises);
  },

  async createUserExercise(
    input: CreateExerciseInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Exercise>> {
    const parsed = createExerciseInputSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten());
    }

    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return failure(userResult.error.code, userResult.error.message);
    }

    const exercise = await db.exercise.upsert({
      where: { normalizedName: normalizeExerciseName(parsed.data.name) },
      update: parsed.data,
      create: {
        ...parsed.data,
        normalizedName: normalizeExerciseName(parsed.data.name),
        createdByUserId: userResult.data.id
      }
    });

    return success(exercise);
  },

  async filterAvailableExercises(
    input: FilterExercisesInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Exercise[]>> {
    const parsed = filterExercisesInputSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten());
    }

    const exercises = await db.exercise.findMany();
    const filterableExercises = exercises.map((exercise) => ({
      ...exercise,
      contraindicationTags: jsonArray(exercise.contraindicationTags),
      equipmentTypes: jsonArray(exercise.equipmentTypes)
    }));

    return success(filterExercises(filterableExercises, parsed.data));
  },

  async listExercisePreferences(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<ExercisePreference[]>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const preferences = await db.exercisePreference.findMany({
      where: { userId: userResult.data.id },
      orderBy: { updatedAt: "desc" }
    });

    return success(preferences);
  },

  async setExercisePreference(
    input: SetExercisePreferenceInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<ExercisePreference>> {
    const parsed = setExercisePreferenceInputSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten());
    }

    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return failure(userResult.error.code, userResult.error.message);
    }

    const preference = await db.exercisePreference.upsert({
      where: {
        userId_exerciseId: {
          exerciseId: parsed.data.exerciseId,
          userId: userResult.data.id
        }
      },
      update: {
        preference: parsed.data.preference,
        reason: parsed.data.reason
      },
      create: {
        exerciseId: parsed.data.exerciseId,
        preference: parsed.data.preference,
        reason: parsed.data.reason,
        userId: userResult.data.id
      }
    });

    return success(preference);
  }
};
