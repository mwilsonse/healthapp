import {
  SetStatus,
  WorkoutStatus,
  type CompletedExerciseSet,
  type CompletedWorkout,
  type CompletedWorkoutExercise,
  type PlanEditCommitment,
  type PlannedWorkout,
  type PlannedWorkoutExercise,
  type PlannedWorkoutSet,
  type Prisma,
  type PrismaClient,
  type RecommendationRationale,
  type TrainingPlan
} from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import {
  decidePlanEditCommitmentInputSchema,
  type DecidePlanEditCommitmentInput
} from "@/server/services/schemas";
import {
  failure,
  success,
  type ServiceResult,
  validationFailure
} from "@/server/services/service-result";

type CompletedSetWithPlan = CompletedExerciseSet & {
  plannedWorkoutSet: PlannedWorkoutSet | null;
};

type CompletedExerciseWithPlan = CompletedWorkoutExercise & {
  plannedWorkoutExercise: PlannedWorkoutExercise | null;
  sets: CompletedSetWithPlan[];
};

type CompletedWorkoutForEdit = CompletedWorkout & {
  exercises: CompletedExerciseWithPlan[];
  planEditCommitment?: PlanEditCommitment | null;
  plannedWorkout: PlannedWorkout | null;
};

export type TrainingPlanWithWorkouts = TrainingPlan & {
  editCommitments: PlanEditCommitment[];
  plannedWorkouts: Array<
    PlannedWorkout & {
      rationale: RecommendationRationale | null;
    }
  >;
  rationale: RecommendationRationale | null;
};

export interface PlanEditCandidate {
  changeSummary: string;
  completedWorkoutId: string;
  details: Prisma.InputJsonObject;
  plannedWorkoutTitle: string;
  title: string;
}

function numberValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function valuesDiffer(left: unknown, right: unknown) {
  const leftNumber = numberValue(left);
  const rightNumber = numberValue(right);

  if (leftNumber === null && rightNumber === null) {
    return false;
  }

  return leftNumber !== rightNumber;
}

function setChangeSummary(set: CompletedSetWithPlan) {
  const plannedSet = set.plannedWorkoutSet;
  const changes = [];

  if (set.status === SetStatus.SKIPPED) {
    changes.push(`set ${set.orderIndex + 1} skipped`);
  }

  if (valuesDiffer(set.actualReps, plannedSet?.targetReps)) {
    changes.push(
      `set ${set.orderIndex + 1} reps ${plannedSet?.targetReps ?? "unset"} -> ${
        set.actualReps ?? "unset"
      }`
    );
  }

  if (valuesDiffer(set.actualWeightKg, plannedSet?.targetWeightKg)) {
    changes.push(
      `set ${set.orderIndex + 1} load ${
        plannedSet?.targetWeightKg ? Number(plannedSet.targetWeightKg) : "unset"
      } kg -> ${set.actualWeightKg ? Number(set.actualWeightKg) : "unset"} kg`
    );
  }

  if (
    valuesDiffer(set.actualDurationSeconds, plannedSet?.targetDurationSeconds)
  ) {
    changes.push(
      `set ${set.orderIndex + 1} duration ${
        plannedSet?.targetDurationSeconds ?? "unset"
      } sec -> ${set.actualDurationSeconds ?? "unset"} sec`
    );
  }

  if (set.painFlag) {
    changes.push(`set ${set.orderIndex + 1} had pain`);
  }

  return changes;
}

export function summarizePlanEditCandidate(
  workout: CompletedWorkoutForEdit
): PlanEditCandidate | null {
  const plannedWorkoutTitle = workout.plannedWorkout?.title ?? "Workout";
  const changeLines = [];

  if (workout.status === WorkoutStatus.SKIPPED) {
    changeLines.push(
      `Skipped session${workout.skipReason ? `: ${workout.skipReason}` : "."}`
    );
  }

  if (workout.status === WorkoutStatus.PARTIAL) {
    changeLines.push("Saved as a partial session.");
  }

  if (workout.painNotes) {
    changeLines.push(`Pain note: ${workout.painNotes}`);
  }

  for (const exercise of workout.exercises) {
    const plannedName =
      exercise.plannedWorkoutExercise?.nameSnapshot ?? exercise.nameSnapshot;

    if (exercise.nameSnapshot !== plannedName) {
      changeLines.push(
        `${plannedName} was replaced with ${exercise.nameSnapshot}${
          exercise.substitutionReason ? `: ${exercise.substitutionReason}` : "."
        }`
      );
    } else if (exercise.substitutionReason) {
      changeLines.push(`${plannedName}: ${exercise.substitutionReason}`);
    }

    for (const set of exercise.sets) {
      const setChanges = setChangeSummary(set);

      if (setChanges.length > 0) {
        changeLines.push(`${plannedName}: ${setChanges.join(", ")}.`);
      }
    }
  }

  if (changeLines.length === 0) {
    return null;
  }

  return {
    changeSummary: changeLines.join(" "),
    completedWorkoutId: workout.id,
    details: {
      completedWorkoutId: workout.id,
      plannedWorkoutId: workout.plannedWorkoutId,
      status: workout.status
    },
    plannedWorkoutTitle,
    title: `Plan edit from ${plannedWorkoutTitle}`
  };
}

export const planningService = {
  async getActivePlan(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<TrainingPlan | null>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const plan = await db.trainingPlan.findFirst({
      where: {
        userId: userResult.data.id,
        status: "ACTIVE"
      },
      orderBy: { startDate: "desc" }
    });

    return success(plan);
  },

  async getActivePlanWithWorkouts(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<TrainingPlanWithWorkouts | null>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const plan = await db.trainingPlan.findFirst({
      include: {
        editCommitments: {
          orderBy: { createdAt: "desc" },
          where: { committed: true }
        },
        plannedWorkouts: {
          include: {
            rationale: true
          },
          orderBy: { scheduledFor: "asc" }
        },
        rationale: true
      },
      where: {
        userId: userResult.data.id,
        status: "ACTIVE"
      },
      orderBy: { startDate: "desc" }
    });

    return success(plan);
  },

  async listPendingPlanEditDecisions(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<PlanEditCandidate[]>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const activePlan = await db.trainingPlan.findFirst({
      where: {
        status: "ACTIVE",
        userId: userResult.data.id
      },
      orderBy: { startDate: "desc" }
    });

    if (!activePlan) {
      return success([]);
    }

    const workouts = await db.completedWorkout.findMany({
      include: {
        exercises: {
          include: {
            plannedWorkoutExercise: true,
            sets: {
              include: {
                plannedWorkoutSet: true
              },
              orderBy: { orderIndex: "asc" }
            }
          },
          orderBy: { orderIndex: "asc" }
        },
        planEditCommitment: true,
        plannedWorkout: true
      },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      where: {
        planEditCommitment: null,
        plannedWorkout: {
          is: {
            trainingPlanId: activePlan.id
          }
        },
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

    return success(
      workouts
        .map((workout) => summarizePlanEditCandidate(workout))
        .filter((candidate): candidate is PlanEditCandidate =>
          Boolean(candidate)
        )
    );
  },

  async listCommittedPlanEdits(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<PlanEditCommitment[]>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const activePlan = await db.trainingPlan.findFirst({
      where: {
        status: "ACTIVE",
        userId: userResult.data.id
      },
      orderBy: { startDate: "desc" }
    });

    if (!activePlan) {
      return success([]);
    }

    const edits = await db.planEditCommitment.findMany({
      orderBy: { createdAt: "desc" },
      where: {
        committed: true,
        trainingPlanId: activePlan.id,
        userId: userResult.data.id
      }
    });

    return success(edits);
  },

  async decidePlanEditCommitment(
    input: unknown,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<PlanEditCommitment>> {
    const parsed = decidePlanEditCommitmentInputSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten());
    }

    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const completedWorkout = await db.completedWorkout.findFirst({
      include: {
        exercises: {
          include: {
            plannedWorkoutExercise: true,
            sets: {
              include: {
                plannedWorkoutSet: true
              },
              orderBy: { orderIndex: "asc" }
            }
          },
          orderBy: { orderIndex: "asc" }
        },
        plannedWorkout: true
      },
      where: {
        id: parsed.data.completedWorkoutId,
        userId: userResult.data.id
      }
    });

    if (!completedWorkout) {
      return failure("NOT_FOUND", "Completed workout was not found.");
    }

    if (!completedWorkout.plannedWorkout) {
      return failure(
        "CONFLICT",
        "Only workouts linked to the active plan can be committed."
      );
    }

    const candidate = summarizePlanEditCandidate(completedWorkout) ?? {
      changeSummary: "No workout-level changes were detected.",
      completedWorkoutId: completedWorkout.id,
      details: {
        completedWorkoutId: completedWorkout.id,
        plannedWorkoutId: completedWorkout.plannedWorkoutId,
        status: completedWorkout.status
      },
      plannedWorkoutTitle: completedWorkout.plannedWorkout.title,
      title: `Plan edit from ${completedWorkout.plannedWorkout.title}`
    };

    const data: Omit<
      DecidePlanEditCommitmentInput,
      "commit" | "completedWorkoutId"
    > & {
      changeSummary: string;
      committed: boolean;
      details: Prisma.InputJsonValue;
      plannedWorkoutId: string;
      title: string;
      trainingPlanId: string;
      userId: string;
    } = {
      changeSummary: candidate.changeSummary,
      committed: parsed.data.commit,
      details: candidate.details,
      plannedWorkoutId: completedWorkout.plannedWorkout.id,
      title: candidate.title,
      trainingPlanId: completedWorkout.plannedWorkout.trainingPlanId,
      userId: userResult.data.id
    };

    const existing = await db.planEditCommitment.findUnique({
      where: { completedWorkoutId: completedWorkout.id }
    });

    const saved = existing
      ? await db.planEditCommitment.update({
          data,
          where: { id: existing.id }
        })
      : await db.planEditCommitment.create({
          data: {
            ...data,
            completedWorkoutId: completedWorkout.id
          }
        });

    return success(saved);
  }
};
