import {
  ExerciseModality,
  ExerciseStatus,
  JobType,
  MovementPattern,
  PlanStatus,
  SetStatus,
  UnitPreference,
  WorkoutStatus
} from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";
import { jobHandlers } from "@/server/jobs";
import { jobService, workoutService } from "@/server/services";

const TEST_USER_ID = "default-user";

async function ensureUser() {
  await prisma.user.upsert({
    create: {
      displayName: "PHIP Test User",
      id: TEST_USER_ID,
      timezone: "America/Chicago",
      unitPreference: UnitPreference.US
    },
    update: {},
    where: { id: TEST_USER_ID }
  });
}

async function clearWorkoutData() {
  await prisma.job.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.completedWorkout.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.plannedWorkout.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.trainingPlan.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.coachNote.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.recommendationRationale.deleteMany({
    where: { userId: TEST_USER_ID }
  });
  await prisma.aiInteraction.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.exercise.deleteMany({ where: { normalizedName: "test-squat" } });
}

async function createPlannedWorkout() {
  const exercise = await prisma.exercise.create({
    data: {
      equipmentTypes: ["dumbbell"],
      modality: ExerciseModality.STRENGTH,
      movementPattern: MovementPattern.SQUAT,
      name: "Test Squat",
      normalizedName: "test-squat",
      primaryMuscles: [],
      secondaryMuscles: [],
      status: ExerciseStatus.ACTIVE,
      substitutionTags: []
    }
  });

  const plan = await prisma.trainingPlan.create({
    data: {
      endDate: new Date("2026-07-12T05:00:00.000Z"),
      startDate: new Date("2026-06-29T05:00:00.000Z"),
      status: PlanStatus.ACTIVE,
      title: "Test plan",
      userId: TEST_USER_ID
    }
  });

  const workout = await prisma.plannedWorkout.create({
    data: {
      scheduledFor: new Date("2026-06-29T15:00:00.000Z"),
      status: WorkoutStatus.PLANNED,
      title: "Test workout",
      trainingPlanId: plan.id,
      userId: TEST_USER_ID,
      workoutType: "strength"
    }
  });

  const plannedExercise = await prisma.plannedWorkoutExercise.create({
    data: {
      exerciseId: exercise.id,
      nameSnapshot: exercise.name,
      orderIndex: 0,
      plannedWorkoutId: workout.id,
      restSeconds: 90,
      targetRpe: 7
    }
  });

  const plannedSet = await prisma.plannedWorkoutSet.create({
    data: {
      orderIndex: 0,
      plannedWorkoutExerciseId: plannedExercise.id,
      targetReps: 10,
      targetRpe: 7,
      targetWeightKg: 15
    }
  });

  return { plannedExercise, plannedSet, workout };
}

describe("workoutService integration", () => {
  beforeAll(async () => {
    await ensureUser();
  });

  beforeEach(async () => {
    await clearWorkoutData();
  });

  it("logs actual set values without mutating planned targets", async () => {
    const { plannedExercise, plannedSet, workout } = await createPlannedWorkout();
    const started = await workoutService.startWorkout(
      workout.id,
      new Date("2026-06-29T15:05:00.000Z")
    );

    expect(started.ok).toBe(true);
    expect(started.ok && started.data.status).toBe(WorkoutStatus.IN_PROGRESS);

    const completed = await workoutService.completeWorkout(
      {
        exercises: [
          {
            plannedWorkoutExerciseId: plannedExercise.id,
            sets: [
              {
                actualReps: 8,
                actualRpe: 8,
                actualWeightKg: 12.5,
                painFlag: true,
                plannedWorkoutSetId: plannedSet.id,
                status: SetStatus.COMPLETED
              }
            ]
          }
        ],
        intensityAdjustment: "REDUCED",
        overallRpe: 8,
        plannedWorkoutId: workout.id,
        status: WorkoutStatus.COMPLETED,
        userNotes: "Felt harder than planned."
      },
      new Date("2026-06-29T15:45:00.000Z")
    );

    expect(completed.ok).toBe(true);
    expect(completed.ok && completed.data.status).toBe(WorkoutStatus.COMPLETED);

    const savedPlannedSet = await prisma.plannedWorkoutSet.findUniqueOrThrow({
      where: { id: plannedSet.id }
    });
    const savedCompletedSet = await prisma.completedExerciseSet.findFirstOrThrow(
      {
        include: {
          plannedWorkoutSet: true
        },
        where: { plannedWorkoutSetId: plannedSet.id }
      }
    );
    const savedWorkout = await prisma.plannedWorkout.findUniqueOrThrow({
      where: { id: workout.id }
    });

    expect(Number(savedPlannedSet.targetWeightKg)).toBe(15);
    expect(savedPlannedSet.targetReps).toBe(10);
    expect(Number(savedCompletedSet.actualWeightKg)).toBe(12.5);
    expect(savedCompletedSet.actualReps).toBe(8);
    expect(savedCompletedSet.painFlag).toBe(true);
    expect(savedCompletedSet.plannedWorkoutSet?.id).toBe(plannedSet.id);
    expect(savedWorkout.status).toBe(WorkoutStatus.COMPLETED);

    const jobs = await prisma.job.findMany({
      where: { userId: TEST_USER_ID }
    });
    const relatedJobs = jobs.filter((job) => {
      const snapshot = job.inputSnapshot as {
        plannedWorkoutId?: string;
      };

      return snapshot.plannedWorkoutId === workout.id;
    });

    expect(relatedJobs.map((job) => job.type).sort()).toEqual(
      [
        JobType.COACH_NOTE_REFRESH,
        JobType.NEXT_WORKOUT_GENERATION,
        JobType.POST_WORKOUT_FEEDBACK
      ].sort()
    );
    expect(
      relatedJobs.every((job) => {
        const snapshot = job.inputSnapshot as {
          completedWorkoutId?: string;
          plannedWorkoutId?: string;
        };

        return (
          snapshot.completedWorkoutId === (completed.ok && completed.data.id) &&
          snapshot.plannedWorkoutId === workout.id
        );
      })
    ).toBe(true);
  });

  it("worker creates feedback and a conservatively adapted next workout", async () => {
    const { plannedExercise, plannedSet, workout } = await createPlannedWorkout();

    const completed = await workoutService.completeWorkout(
      {
        exercises: [
          {
            plannedWorkoutExerciseId: plannedExercise.id,
            sets: [
              {
                actualReps: 6,
                actualRpe: 9,
                actualWeightKg: 12.5,
                painFlag: true,
                plannedWorkoutSetId: plannedSet.id,
                status: SetStatus.COMPLETED
              }
            ]
          }
        ],
        intensityAdjustment: "REDUCED",
        overallRpe: 9,
        painNotes: "Left knee discomfort.",
        plannedWorkoutId: workout.id,
        status: WorkoutStatus.COMPLETED
      },
      new Date("2026-06-29T15:45:00.000Z")
    );

    expect(completed.ok).toBe(true);
    if (!completed.ok) {
      return;
    }

    const jobs = await prisma.job.findMany({
      where: {
        type: {
          in: [JobType.POST_WORKOUT_FEEDBACK, JobType.NEXT_WORKOUT_GENERATION]
        },
        userId: TEST_USER_ID
      }
    });

    for (const job of jobs) {
      const result = await jobService.runJob(job, jobHandlers, {
        workerId: "phase-11-test-worker"
      });

      expect(result.ok).toBe(true);
    }

    const savedCompleted = await prisma.completedWorkout.findUniqueOrThrow({
      include: { coachFeedback: true },
      where: { id: completed.data.id }
    });
    const plannedWorkouts = await prisma.plannedWorkout.findMany({
      include: {
        exercises: {
          include: { sets: true }
        }
      },
      orderBy: { scheduledFor: "asc" },
      where: { userId: TEST_USER_ID }
    });
    const nextWorkout = plannedWorkouts.find((item) => item.id !== workout.id);

    expect(savedCompleted.coachFeedback).not.toBeNull();
    expect(savedCompleted.coachFeedback?.body).toContain("Next workout focus");
    expect(nextWorkout).toBeDefined();
    expect(nextWorkout?.scheduledFor.getTime()).toBeGreaterThan(
      workout.scheduledFor.getTime()
    );
    expect(nextWorkout?.summary).toContain("Adapted conservatively");
    expect(
      nextWorkout?.exercises.some((exercise) =>
        exercise.sets.some((set) =>
          set.notes?.includes("Conservative adaptation")
        )
      )
    ).toBe(true);
  });
});
