import {
  AiInteractionType,
  EquipmentType,
  ExerciseModality,
  ExerciseStatus,
  MovementPattern,
  PlanStatus,
  WorkoutStatus,
  type AiInteraction,
  type AvailableLoad,
  type Equipment,
  type Exercise,
  type PlannedWorkout,
  type PlannedWorkoutExercise,
  type PlannedWorkoutSet,
  type Prisma,
  type PrismaClient,
  type RecommendationRationale,
  type TrainingPlan
} from "@prisma/client";

import { roundToAvailableLoad } from "@/lib/load-rounding";
import {
  plannedWorkoutOutputV1Schema,
  trainingPlanOutputV1Schema,
  type PlannedWorkoutOutputV1
} from "@/server/ai";
import type { AiProvider } from "@/server/ai/provider";
import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import { aiRecommendationService } from "@/server/services/ai-recommendation-service";
import { equipmentService } from "@/server/services/equipment-service";
import { exerciseService } from "@/server/services/exercise-service";
import { goalService } from "@/server/services/goal-service";
import { profileService } from "@/server/services/profile-service";
import {
  failure,
  success,
  type ServiceResult
} from "@/server/services/service-result";

type EquipmentWithLoads = Equipment & { availableLoads: AvailableLoad[] };

export type PlannedWorkoutWithDetails = PlannedWorkout & {
  exercises: Array<
    PlannedWorkoutExercise & {
      exercise: Exercise;
      sets: PlannedWorkoutSet[];
    }
  >;
  rationale: RecommendationRationale | null;
  trainingPlan: TrainingPlan;
};

export type TrainingPlanWithWorkouts = TrainingPlan & {
  plannedWorkouts: PlannedWorkout[];
  rationale: RecommendationRationale | null;
};

interface GenerateOptions {
  db?: PrismaClient;
  now?: Date;
  provider?: AiProvider;
  sourceJobId?: string;
}

function normalizeExerciseName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid AI date value: ${value}`);
  }

  return date;
}

function dayBounds(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { end, start };
}

function equipmentTypeTag(type: EquipmentType) {
  if (type === EquipmentType.CARDIO_MACHINE) {
    return "cardio_machine";
  }

  return type.toLowerCase();
}

function stringArray(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function availableLoadNumbers(loads: AvailableLoad[]) {
  return loads.map((load) => Number(load.loadKg)).filter(Number.isFinite);
}

function equipmentLoadsForExercise(
  exercise: Exercise,
  equipment: EquipmentWithLoads[]
) {
  const exerciseEquipmentTypes = stringArray(exercise.equipmentTypes);

  if (exerciseEquipmentTypes.length === 0) {
    return [];
  }

  return equipment.flatMap((item) => {
    if (!item.isAvailable) {
      return [];
    }

    const tag = equipmentTypeTag(item.type);

    if (!exerciseEquipmentTypes.includes(tag)) {
      return [];
    }

    return item.availableLoads;
  });
}

function constrainSetLoad(
  plannedSet: PlannedWorkoutOutputV1["exercises"][number]["sets"][number],
  exercise: Exercise,
  equipment: EquipmentWithLoads[]
) {
  if (!plannedSet.targetWeightKg || plannedSet.targetWeightKg <= 0) {
    return {
      note: plannedSet.notes,
      targetWeightKg: null
    };
  }

  const loads = availableLoadNumbers(
    equipmentLoadsForExercise(exercise, equipment)
  );
  const rounded = roundToAvailableLoad(plannedSet.targetWeightKg, loads, {
    preferLowerOnTieOrUncertainty: true
  });

  if (!rounded) {
    return {
      note: [
        plannedSet.notes,
        `AI requested ${plannedSet.targetWeightKg} kg, but no compatible saved load was available.`
      ]
        .filter(Boolean)
        .join(" "),
      targetWeightKg: null
    };
  }

  return {
    note:
      rounded.exact || !plannedSet.notes
        ? plannedSet.notes
        : `${plannedSet.notes} Rounded from ${plannedSet.targetWeightKg} kg to an available load.`,
    targetWeightKg: rounded.roundedKg
  };
}

async function buildPlanningInput(db: PrismaClient) {
  const [profile, goals, equipment, exercises] = await Promise.all([
    profileService.getProfile(db),
    goalService.listGoals(db),
    equipmentService.listEquipment(db),
    exerciseService.listExercises(db)
  ]);

  if (!profile.ok) {
    return profile;
  }

  if (!goals.ok) {
    return goals;
  }

  if (!equipment.ok) {
    return equipment;
  }

  if (!exercises.ok) {
    return exercises;
  }

  return success({
    equipment: equipment.data.map((item) => ({
      availableLoadsKg: item.availableLoads.map((load) => Number(load.loadKg)),
      name: item.name,
      type: equipmentTypeTag(item.type)
    })),
    exerciseLibrary: exercises.data.map((exercise) => ({
      equipmentTypes: stringArray(exercise.equipmentTypes),
      modality: exercise.modality,
      name: exercise.name,
      status: exercise.status
    })),
    goals: goals.data.map((goal) => ({
      priority: goal.priority,
      targetDate: goal.targetDate?.toISOString(),
      title: goal.title
    })),
    profile: profile.data
  });
}

async function findOrCreateExercise(
  exerciseName: string,
  aiInteraction: AiInteraction,
  db: Prisma.TransactionClient
) {
  const normalizedName = normalizeExerciseName(exerciseName);
  const existing = await db.exercise.findUnique({ where: { normalizedName } });

  if (existing) {
    return existing;
  }

  return db.exercise.create({
    data: {
      createdByAiInteractionId: aiInteraction.id,
      equipmentTypes: ["bodyweight"],
      modality: ExerciseModality.STRENGTH,
      movementPattern: MovementPattern.OTHER,
      name: exerciseName,
      normalizedName,
      primaryMuscles: [],
      secondaryMuscles: [],
      status: ExerciseStatus.PENDING_REVIEW,
      substitutionTags: []
    }
  });
}

export const generationService = {
  async generateActiveTrainingPlan(
    options: GenerateOptions = {}
  ): Promise<ServiceResult<TrainingPlanWithWorkouts>> {
    const db = options.db ?? prisma;
    const now = options.now ?? new Date();
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const planningInput = await buildPlanningInput(db);

    if (!planningInput.ok) {
      return failure(planningInput.error.code, planningInput.error.message);
    }

    const aiResult = await aiRecommendationService.generateStructured(
      {
        input: {
          ...planningInput.data,
          requestedAt: now.toISOString()
        },
        schema: trainingPlanOutputV1Schema,
        schemaName: "TrainingPlanOutputV1",
        schemaVersion: "1",
        type: AiInteractionType.PLAN_GENERATION,
        userPrompt:
          "Create a conservative two-week exercise-only training plan for PHIP V1."
      },
      {
        db,
        provider: options.provider
      }
    );

    if (!aiResult.ok) {
      return failure(
        aiResult.error.code,
        aiResult.error.message,
        aiResult.error.details
      );
    }

    const output = aiResult.data.output;

    try {
      const plan = await db.$transaction(async (tx) => {
        await tx.trainingPlan.updateMany({
          data: { status: PlanStatus.SUPERSEDED },
          where: {
            status: PlanStatus.ACTIVE,
            userId: userResult.data.id
          }
        });

        const rationale = await tx.recommendationRationale.create({
          data: {
            createdByAiInteractionId: aiResult.data.interaction.id,
            details: {
              measurementReminders: output.measurementReminders,
              weeklyStructure: output.weeklyStructure
            },
            summary: output.rationale,
            userId: userResult.data.id
          }
        });

        return tx.trainingPlan.create({
          data: {
            createdByJobId: options.sourceJobId,
            endDate: parseDate(output.endDate),
            measurementReminders: output.measurementReminders,
            progressionGuidance: output.progressionGuidance,
            rationaleId: rationale.id,
            recoveryGuidance: output.recoveryGuidance,
            startDate: parseDate(output.startDate),
            status: PlanStatus.ACTIVE,
            summary: output.summary,
            title: output.title,
            userId: userResult.data.id,
            weeklyStructure: output.weeklyStructure
          },
          include: {
            plannedWorkouts: {
              orderBy: { scheduledFor: "asc" }
            },
            rationale: true
          }
        });
      });

      return success(plan);
    } catch (error) {
      return failure(
        "INTERNAL",
        error instanceof Error
          ? error.message
          : "Failed to persist training plan."
      );
    }
  },

  async generateTodayWorkout(
    options: GenerateOptions = {}
  ): Promise<ServiceResult<PlannedWorkoutWithDetails>> {
    const db = options.db ?? prisma;
    const now = options.now ?? new Date();
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const activePlan = await db.trainingPlan.findFirst({
      where: {
        status: PlanStatus.ACTIVE,
        userId: userResult.data.id
      },
      orderBy: { startDate: "desc" }
    });

    if (!activePlan) {
      return failure(
        "NOT_FOUND",
        "Create an active plan before generating a workout."
      );
    }

    const planningInput = await buildPlanningInput(db);

    if (!planningInput.ok) {
      return failure(planningInput.error.code, planningInput.error.message);
    }

    const aiResult = await aiRecommendationService.generateStructured(
      {
        input: {
          ...planningInput.data,
          activePlan: {
            endDate: activePlan.endDate.toISOString(),
            progressionGuidance: activePlan.progressionGuidance,
            recoveryGuidance: activePlan.recoveryGuidance,
            startDate: activePlan.startDate.toISOString(),
            title: activePlan.title,
            weeklyStructure: activePlan.weeklyStructure
          },
          requestedFor: now.toISOString()
        },
        schema: plannedWorkoutOutputV1Schema,
        schemaName: "PlannedWorkoutOutputV1",
        schemaVersion: "1",
        type: AiInteractionType.WORKOUT_GENERATION,
        userPrompt:
          "Create today's planned workout using only available equipment and conservative loads."
      },
      {
        db,
        provider: options.provider
      }
    );

    if (!aiResult.ok) {
      return failure(
        aiResult.error.code,
        aiResult.error.message,
        aiResult.error.details
      );
    }

    const output = aiResult.data.output;
    const { end, start } = dayBounds(now);
    const equipment = await db.equipment.findMany({
      include: { availableLoads: true },
      where: {
        isAvailable: true,
        userId: userResult.data.id
      }
    });

    try {
      const workout = await db.$transaction(async (tx) => {
        await tx.plannedWorkout.updateMany({
          data: { status: WorkoutStatus.SUPERSEDED },
          where: {
            scheduledFor: {
              gte: start,
              lte: end
            },
            status: WorkoutStatus.PLANNED,
            userId: userResult.data.id
          }
        });

        const rationale = await tx.recommendationRationale.create({
          data: {
            createdByAiInteractionId: aiResult.data.interaction.id,
            details: {
              generatedTitle: output.title,
              source: "planned_workout_generation"
            },
            summary: output.rationale,
            userId: userResult.data.id
          }
        });

        const plannedWorkout = await tx.plannedWorkout.create({
          data: {
            createdByJobId: options.sourceJobId,
            rationaleId: rationale.id,
            scheduledFor: now,
            status: WorkoutStatus.PLANNED,
            summary: output.summary,
            targetDurationSeconds: output.estimatedDurationSeconds,
            title: output.title,
            trainingPlanId: activePlan.id,
            userId: userResult.data.id,
            warmup: output.warmup,
            workoutType: output.workoutType
          }
        });

        for (const plannedExercise of output.exercises) {
          const exercise = await findOrCreateExercise(
            plannedExercise.exerciseName,
            aiResult.data.interaction,
            tx
          );

          const savedExercise = await tx.plannedWorkoutExercise.create({
            data: {
              exerciseId: exercise.id,
              nameSnapshot: exercise.name,
              notes: plannedExercise.notes,
              orderIndex: plannedExercise.orderIndex,
              plannedWorkoutId: plannedWorkout.id,
              restSeconds: plannedExercise.restSeconds,
              targetRir: plannedExercise.targetRir,
              targetRpe: plannedExercise.targetRpe
            }
          });

          for (const plannedSet of plannedExercise.sets) {
            const constrainedLoad = constrainSetLoad(
              plannedSet,
              exercise,
              equipment
            );

            await tx.plannedWorkoutSet.create({
              data: {
                notes: constrainedLoad.note,
                orderIndex: plannedSet.orderIndex,
                plannedWorkoutExerciseId: savedExercise.id,
                targetDistanceMeters: plannedSet.targetDistanceMeters,
                targetDurationSeconds: plannedSet.targetDurationSeconds,
                targetReps: plannedSet.targetReps,
                targetRir: plannedSet.targetRir,
                targetRpe: plannedSet.targetRpe,
                targetWeightKg: constrainedLoad.targetWeightKg
              }
            });
          }
        }

        return tx.plannedWorkout.findUniqueOrThrow({
          include: {
            exercises: {
              include: {
                exercise: true,
                sets: {
                  orderBy: { orderIndex: "asc" }
                }
              },
              orderBy: { orderIndex: "asc" }
            },
            rationale: true,
            trainingPlan: true
          },
          where: { id: plannedWorkout.id }
        });
      });

      return success(workout);
    } catch (error) {
      return failure(
        "INTERNAL",
        error instanceof Error
          ? error.message
          : "Failed to persist planned workout."
      );
    }
  },

  async ensureTodayWorkout(
    options: GenerateOptions = {}
  ): Promise<ServiceResult<PlannedWorkoutWithDetails>> {
    const db = options.db ?? prisma;
    const now = options.now ?? new Date();
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const activePlan = await db.trainingPlan.findFirst({
      where: {
        status: PlanStatus.ACTIVE,
        userId: userResult.data.id
      }
    });

    if (!activePlan) {
      const planResult = await this.generateActiveTrainingPlan(options);

      if (!planResult.ok) {
        return failure(
          planResult.error.code,
          planResult.error.message,
          planResult.error.details
        );
      }
    }

    return this.generateTodayWorkout({ ...options, now });
  }
};
