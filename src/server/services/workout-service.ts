import {
  ExerciseModality,
  ExerciseStatus,
  JobType,
  MovementPattern,
  SetStatus,
  WorkoutStatus,
  type Exercise,
  type PlannedWorkout,
  type PlannedWorkoutExercise,
  type PlannedWorkoutSet,
  type Prisma,
  type PrismaClient
} from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import type { PlannedWorkoutWithDetails } from "@/server/services/generation-service";
import {
  completeWorkoutInputSchema,
  type CompleteWorkoutInput
} from "@/server/services/schemas";
import {
  failure,
  success,
  type ServiceResult,
  validationFailure
} from "@/server/services/service-result";

type PlannedExerciseWithSets = PlannedWorkoutExercise & {
  exercise: Exercise;
  sets: PlannedWorkoutSet[];
};

function normalizeExerciseName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function notesWithAdjustments(input: CompleteWorkoutInput) {
  const adjustments = [];

  if (input.intensityAdjustment === "REDUCED") {
    adjustments.push("Intensity reduced during workout.");
  }

  if (input.intensityAdjustment === "INCREASED") {
    adjustments.push("Intensity increased during workout.");
  }

  if (
    input.durationAdjustmentMinutes !== undefined &&
    input.durationAdjustmentMinutes !== 0
  ) {
    const direction =
      input.durationAdjustmentMinutes > 0 ? "extended" : "shortened";
    adjustments.push(
      `Duration ${direction} by ${Math.abs(input.durationAdjustmentMinutes)} minutes.`
    );
  }

  return [input.userNotes, ...adjustments].filter(Boolean).join(" ");
}

async function findOrCreateLoggedExercise(
  name: string,
  db: Prisma.TransactionClient,
  createdByUserId?: string
) {
  const normalizedName = normalizeExerciseName(name);
  const existing = await db.exercise.findUnique({ where: { normalizedName } });

  if (existing) {
    return existing;
  }

  return db.exercise.create({
    data: {
      createdByUserId,
      equipmentTypes: ["bodyweight"],
      modality: ExerciseModality.STRENGTH,
      movementPattern: MovementPattern.OTHER,
      name,
      normalizedName,
      primaryMuscles: [],
      secondaryMuscles: [],
      status: ExerciseStatus.PENDING_REVIEW,
      substitutionTags: []
    }
  });
}

function hasSkippedOrMissingSets(
  plannedExercises: PlannedExerciseWithSets[],
  input: CompleteWorkoutInput
) {
  const exerciseLogs = new Map(
    input.exercises.map((exercise) => [
      exercise.plannedWorkoutExerciseId,
      exercise
    ])
  );

  return plannedExercises.some((plannedExercise) => {
    const exerciseLog = exerciseLogs.get(plannedExercise.id);

    if (!exerciseLog) {
      return plannedExercise.sets.length > 0;
    }

    const setLogs = new Map(
      exerciseLog.sets
        .filter((set) => set.plannedWorkoutSetId)
        .map((set) => [set.plannedWorkoutSetId as string, set])
    );

    return plannedExercise.sets.some((plannedSet) => {
      const setLog = setLogs.get(plannedSet.id);

      return !setLog || setLog.status === SetStatus.SKIPPED;
    });
  });
}

export const workoutService = {
  async getTodayWorkout(
    now: Date = new Date(),
    db: PrismaClient = prisma
  ): Promise<ServiceResult<PlannedWorkout | null>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const workout = await db.plannedWorkout.findFirst({
      where: {
        userId: userResult.data.id,
        scheduledFor: {
          gte: start,
          lte: end
        }
      },
      orderBy: { scheduledFor: "asc" }
    });

    return success(workout);
  },

  async getTodayWorkoutWithDetails(
    now: Date = new Date(),
    db: PrismaClient = prisma
  ): Promise<ServiceResult<PlannedWorkoutWithDetails | null>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const workout = await db.plannedWorkout.findFirst({
      include: {
        completedWorkouts: {
          include: {
            coachFeedback: true
          },
          orderBy: { createdAt: "desc" }
        },
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
      where: {
        userId: userResult.data.id,
        scheduledFor: {
          gte: start,
          lte: end
        },
        status: {
          in: [
            WorkoutStatus.PLANNED,
            WorkoutStatus.IN_PROGRESS,
            WorkoutStatus.COMPLETED,
            WorkoutStatus.PARTIAL,
            WorkoutStatus.SKIPPED
          ]
        }
      },
      orderBy: { scheduledFor: "asc" }
    });

    return success(workout);
  },

  async startWorkout(
    plannedWorkoutId: string,
    now: Date = new Date(),
    db: PrismaClient = prisma
  ): Promise<ServiceResult<PlannedWorkout>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const workout = await db.plannedWorkout.findFirst({
      where: {
        id: plannedWorkoutId,
        userId: userResult.data.id
      }
    });

    if (!workout) {
      return failure("NOT_FOUND", "Planned workout was not found.");
    }

    if (workout.status === WorkoutStatus.IN_PROGRESS) {
      return success(workout);
    }

    if (workout.status !== WorkoutStatus.PLANNED) {
      return failure("CONFLICT", "Only planned workouts can be started.");
    }

    const started = await db.$transaction(async (tx) => {
      const updated = await tx.plannedWorkout.update({
        data: { status: WorkoutStatus.IN_PROGRESS },
        where: { id: plannedWorkoutId }
      });

      const existingLog = await tx.completedWorkout.findFirst({
        where: {
          plannedWorkoutId,
          status: WorkoutStatus.IN_PROGRESS,
          userId: userResult.data.id
        }
      });

      if (!existingLog) {
        await tx.completedWorkout.create({
          data: {
            plannedWorkoutId,
            startedAt: now,
            status: WorkoutStatus.IN_PROGRESS,
            userId: userResult.data.id
          }
        });
      }

      return updated;
    });

    return success(started);
  },

  async completeWorkout(
    input: unknown,
    now: Date = new Date(),
    db: PrismaClient = prisma
  ): Promise<ServiceResult<{ id: string; status: WorkoutStatus }>> {
    const parsed = completeWorkoutInputSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten());
    }

    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const plannedWorkout = await db.plannedWorkout.findFirst({
      include: {
        exercises: {
          include: {
            exercise: true,
            sets: {
              orderBy: { orderIndex: "asc" }
            }
          },
          orderBy: { orderIndex: "asc" }
        }
      },
      where: {
        id: parsed.data.plannedWorkoutId,
        userId: userResult.data.id
      }
    });

    if (!plannedWorkout) {
      return failure("NOT_FOUND", "Planned workout was not found.");
    }

    const finishableStatuses: WorkoutStatus[] = [
      WorkoutStatus.PLANNED,
      WorkoutStatus.IN_PROGRESS
    ];

    if (!finishableStatuses.includes(plannedWorkout.status)) {
      return failure("CONFLICT", "Workout has already been finished.");
    }

    const finalStatus =
      parsed.data.status === WorkoutStatus.COMPLETED &&
      hasSkippedOrMissingSets(plannedWorkout.exercises, parsed.data)
        ? WorkoutStatus.PARTIAL
        : parsed.data.status;

    const result = await db.$transaction(async (tx) => {
      const existingFinalLog = await tx.completedWorkout.findFirst({
        where: {
          plannedWorkoutId: plannedWorkout.id,
          status: {
            in: [
              WorkoutStatus.COMPLETED,
              WorkoutStatus.PARTIAL,
              WorkoutStatus.SKIPPED
            ]
          },
          userId: userResult.data.id
        }
      });

      if (existingFinalLog) {
        throw new Error("Workout has already been finished.");
      }

      const existingInProgressLog = await tx.completedWorkout.findFirst({
        where: {
          plannedWorkoutId: plannedWorkout.id,
          status: WorkoutStatus.IN_PROGRESS,
          userId: userResult.data.id
        }
      });

      const completedWorkout = existingInProgressLog
        ? await tx.completedWorkout.update({
            data: {
              completedAt: now,
              overallRpe: parsed.data.overallRpe,
              painNotes: parsed.data.painNotes,
              skipReason: parsed.data.skipReason,
              status: finalStatus,
              userNotes: notesWithAdjustments(parsed.data)
            },
            where: { id: existingInProgressLog.id }
          })
        : await tx.completedWorkout.create({
            data: {
              completedAt:
                finalStatus === WorkoutStatus.SKIPPED ? undefined : now,
              overallRpe: parsed.data.overallRpe,
              painNotes: parsed.data.painNotes,
              plannedWorkoutId: plannedWorkout.id,
              skipReason: parsed.data.skipReason,
              startedAt: now,
              status: finalStatus,
              userId: userResult.data.id,
              userNotes: notesWithAdjustments(parsed.data)
            }
          });

      await tx.completedWorkoutExercise.deleteMany({
        where: { completedWorkoutId: completedWorkout.id }
      });

      if (finalStatus !== WorkoutStatus.SKIPPED) {
        const exerciseLogs = new Map(
          parsed.data.exercises.map((exercise) => [
            exercise.plannedWorkoutExerciseId,
            exercise
          ])
        );

        for (const plannedExercise of plannedWorkout.exercises) {
          const exerciseLog = exerciseLogs.get(plannedExercise.id);
          const substitutionName =
            exerciseLog?.substitutionExerciseName?.trim();
          const completedExerciseSource = substitutionName
            ? await findOrCreateLoggedExercise(substitutionName, tx)
            : plannedExercise.exercise;

          const completedExercise = await tx.completedWorkoutExercise.create({
            data: {
              completedWorkoutId: completedWorkout.id,
              exerciseId: completedExerciseSource.id,
              nameSnapshot: completedExerciseSource.name,
              notes: exerciseLog?.notes,
              orderIndex: plannedExercise.orderIndex,
              plannedWorkoutExerciseId: plannedExercise.id,
              substitutionReason: substitutionName
                ? exerciseLog?.substitutionReason
                : undefined
            }
          });

          const setLogs = new Map(
            (exerciseLog?.sets ?? [])
              .filter((set) => set.plannedWorkoutSetId)
              .map((set) => [set.plannedWorkoutSetId as string, set])
          );
          const extraSetLogs = (exerciseLog?.sets ?? []).filter(
            (set) => !set.plannedWorkoutSetId
          );

          for (const plannedSet of plannedExercise.sets) {
            const setLog = setLogs.get(plannedSet.id);

            await tx.completedExerciseSet.create({
              data: {
                actualDistanceMeters: setLog?.actualDistanceMeters,
                actualDurationSeconds: setLog?.actualDurationSeconds,
                actualReps: setLog?.actualReps,
                actualRir: setLog?.actualRir,
                actualRpe: setLog?.actualRpe,
                actualWeightKg: setLog?.actualWeightKg,
                completedWorkoutExerciseId: completedExercise.id,
                notes: setLog?.notes,
                orderIndex: plannedSet.orderIndex,
                painFlag: setLog?.painFlag ?? false,
                plannedWorkoutSetId: plannedSet.id,
                status: setLog?.status ?? SetStatus.SKIPPED
              }
            });
          }

          for (const [index, setLog] of extraSetLogs.entries()) {
            await tx.completedExerciseSet.create({
              data: {
                actualDistanceMeters: setLog.actualDistanceMeters,
                actualDurationSeconds: setLog.actualDurationSeconds,
                actualReps: setLog.actualReps,
                actualRir: setLog.actualRir,
                actualRpe: setLog.actualRpe,
                actualWeightKg: setLog.actualWeightKg,
                completedWorkoutExerciseId: completedExercise.id,
                notes: setLog.notes,
                orderIndex:
                  setLog.orderIndex ?? plannedExercise.sets.length + index,
                painFlag: setLog.painFlag,
                status: setLog.status
              }
            });
          }
        }

        for (const [exerciseIndex, exerciseLog] of parsed.data.extraExercises.entries()) {
          const exercise = await findOrCreateLoggedExercise(
            exerciseLog.exerciseName,
            tx,
            userResult.data.id
          );
          const completedExercise = await tx.completedWorkoutExercise.create({
            data: {
              completedWorkoutId: completedWorkout.id,
              exerciseId: exercise.id,
              nameSnapshot: exercise.name,
              notes: exerciseLog.notes,
              orderIndex: plannedWorkout.exercises.length + exerciseIndex
            }
          });

          for (const [setIndex, setLog] of exerciseLog.sets.entries()) {
            await tx.completedExerciseSet.create({
              data: {
                actualDistanceMeters: setLog.actualDistanceMeters,
                actualDurationSeconds: setLog.actualDurationSeconds,
                actualReps: setLog.actualReps,
                actualRir: setLog.actualRir,
                actualRpe: setLog.actualRpe,
                actualWeightKg: setLog.actualWeightKg,
                completedWorkoutExerciseId: completedExercise.id,
                notes: setLog.notes,
                orderIndex: setLog.orderIndex ?? setIndex,
                painFlag: setLog.painFlag,
                status: setLog.status
              }
            });
          }
        }
      }

      await tx.plannedWorkout.update({
        data: { status: finalStatus },
        where: { id: plannedWorkout.id }
      });

      const jobSnapshot = {
        completedWorkoutId: completedWorkout.id,
        plannedWorkoutId: plannedWorkout.id,
        status: finalStatus
      };

      await tx.job.createMany({
        data: [
          JobType.POST_WORKOUT_FEEDBACK,
          JobType.NEXT_WORKOUT_GENERATION,
          JobType.COACH_NOTE_REFRESH
        ].map((type) => ({
          inputSnapshot: jobSnapshot,
          type,
          userId: userResult.data.id
        }))
      });

      return {
        id: completedWorkout.id,
        status: finalStatus
      };
    });

    return success(result);
  }
};
