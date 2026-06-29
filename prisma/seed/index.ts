import { PrismaClient, UnitPreference } from "@prisma/client";

import { exerciseSeeds } from "./exercises";

const prisma = new PrismaClient();

const DEFAULT_USER_ID = "default-user";

function resolveDefaultUserId() {
  const configured = process.env.DEFAULT_USER_ID;

  if (!configured || configured.startsWith("replace-with")) {
    return DEFAULT_USER_ID;
  }

  return configured;
}

async function seedDefaultUser() {
  const userId = resolveDefaultUserId();

  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      displayName: "PHIP User",
      timezone: "America/Chicago",
      unitPreference: UnitPreference.US
    }
  });

  return userId;
}

async function seedExercises() {
  for (const exercise of exerciseSeeds) {
    await prisma.exercise.upsert({
      where: { normalizedName: exercise.normalizedName },
      update: {
        contraindicationTags: exercise.contraindicationTags,
        equipmentTypes: exercise.equipmentTypes,
        instructions: exercise.instructions,
        modality: exercise.modality,
        movementPattern: exercise.movementPattern,
        primaryMuscles: exercise.primaryMuscles,
        secondaryMuscles: exercise.secondaryMuscles,
        status: exercise.status,
        substitutionTags: exercise.substitutionTags
      },
      create: exercise
    });
  }
}

async function main() {
  const userId = await seedDefaultUser();
  await seedExercises();

  const exerciseCount = await prisma.exercise.count();

  console.log(
    `Seed complete: default user ${userId}; ${exerciseCount} exercises available.`
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
