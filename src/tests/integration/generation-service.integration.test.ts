import {
  EquipmentType,
  ExerciseModality,
  ExerciseStatus,
  GoalPriority,
  GoalStatus,
  MovementPattern,
  PlanStatus,
  UnitPreference,
  WorkoutStatus,
  type Prisma
} from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  fakeAiProvider,
  plannedWorkoutOutputV1Schema,
  type AiProvider
} from "@/server/ai";
import { prisma } from "@/server/db";
import { generationService } from "@/server/services";

const TEST_USER_ID = "default-user";

const invalidWorkoutProvider: AiProvider = {
  async generateJson() {
    return {
      model: "invalid-workout-test-model",
      output: { title: "" },
      provider: "invalid-workout-test",
      tokenUsage: {
        inputTokens: 1,
        outputTokens: 1
      } satisfies Prisma.InputJsonObject
    };
  }
};

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

async function ensureExercise(
  name: string,
  normalizedName: string,
  equipmentTypes: string[],
  movementPattern: MovementPattern
) {
  await prisma.exercise.upsert({
    create: {
      equipmentTypes,
      modality: ExerciseModality.STRENGTH,
      movementPattern,
      name,
      normalizedName,
      primaryMuscles: [],
      secondaryMuscles: [],
      status: ExerciseStatus.ACTIVE,
      substitutionTags: []
    },
    update: {
      equipmentTypes,
      status: ExerciseStatus.ACTIVE
    },
    where: { normalizedName }
  });
}

async function seedPlanningData() {
  await prisma.userProfile.upsert({
    create: {
      currentWeightKg: 90,
      heightCm: 180,
      userId: TEST_USER_ID
    },
    update: {
      currentWeightKg: 90,
      heightCm: 180
    },
    where: { userId: TEST_USER_ID }
  });

  await prisma.goal.create({
    data: {
      priority: GoalPriority.PRIMARY,
      status: GoalStatus.ACTIVE,
      title: "Build consistency",
      userId: TEST_USER_ID
    }
  });

  const dumbbells = await prisma.equipment.create({
    data: {
      isAvailable: true,
      name: "Adjustable dumbbells",
      type: EquipmentType.DUMBBELL,
      userId: TEST_USER_ID
    }
  });

  await prisma.availableLoad.create({
    data: {
      equipmentId: dumbbells.id,
      label: "15 kg",
      loadKg: 15,
      quantity: 2,
      userId: TEST_USER_ID
    }
  });

  await ensureExercise(
    "Goblet Squat",
    "goblet-squat",
    ["dumbbell", "kettlebell"],
    MovementPattern.SQUAT
  );
  await ensureExercise(
    "Push-Up",
    "push-up",
    ["bodyweight"],
    MovementPattern.PUSH
  );
}

async function clearGeneratedData() {
  await prisma.job.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.plannedWorkout.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.trainingPlan.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.recommendationRationale.deleteMany({
    where: { userId: TEST_USER_ID }
  });
  await prisma.aiInteraction.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.availableLoad.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.equipment.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.goal.deleteMany({ where: { userId: TEST_USER_ID } });
}

describe("generationService integration", () => {
  beforeAll(async () => {
    await ensureUser();
  });

  beforeEach(async () => {
    await clearGeneratedData();
    await seedPlanningData();
  });

  it("creates an active plan and today's planned workout with achievable loads", async () => {
    const now = new Date("2026-06-29T15:00:00.000Z");
    const planResult = await generationService.generateActiveTrainingPlan({
      now,
      provider: fakeAiProvider
    });

    expect(planResult.ok).toBe(true);
    if (!planResult.ok) {
      return;
    }

    expect(planResult.data.status).toBe(PlanStatus.ACTIVE);

    const workoutResult = await generationService.generateTodayWorkout({
      now,
      provider: fakeAiProvider
    });

    expect(workoutResult.ok).toBe(true);
    if (!workoutResult.ok) {
      return;
    }

    expect(workoutResult.data.status).toBe(WorkoutStatus.PLANNED);
    expect(workoutResult.data.scheduledFor.toISOString()).toBe(
      now.toISOString()
    );
    expect(workoutResult.data.exercises.length).toBeGreaterThan(0);

    const targetWeights = workoutResult.data.exercises.flatMap((exercise) =>
      exercise.sets
        .map((set) => (set.targetWeightKg ? Number(set.targetWeightKg) : null))
        .filter((weight): weight is number => weight !== null)
    );

    expect(targetWeights).toContain(15);
    expect(targetWeights.every((weight) => weight === 15)).toBe(true);
  });

  it("does not mutate the existing plan or workout when workout output is invalid", async () => {
    const now = new Date("2026-06-29T15:00:00.000Z");

    await generationService.generateActiveTrainingPlan({
      now,
      provider: fakeAiProvider
    });
    await generationService.generateTodayWorkout({
      now,
      provider: fakeAiProvider
    });

    const planCountBefore = await prisma.trainingPlan.count({
      where: { userId: TEST_USER_ID }
    });
    const workoutCountBefore = await prisma.plannedWorkout.count({
      where: { userId: TEST_USER_ID }
    });

    const invalidResult = await generationService.generateTodayWorkout({
      now,
      provider: invalidWorkoutProvider
    });

    const planCountAfter = await prisma.trainingPlan.count({
      where: { userId: TEST_USER_ID }
    });
    const workoutCountAfter = await prisma.plannedWorkout.count({
      where: { userId: TEST_USER_ID }
    });

    expect(invalidResult.ok).toBe(false);
    expect(plannedWorkoutOutputV1Schema.safeParse({ title: "" }).success).toBe(
      false
    );
    expect(planCountAfter).toBe(planCountBefore);
    expect(workoutCountAfter).toBe(workoutCountBefore);
  });
});
