import { AiInteractionType, UnitPreference, type Prisma } from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  fakeAiProvider,
  trainingPlanOutputV1Schema,
  type AiProvider
} from "@/server/ai";
import { prisma } from "@/server/db";
import { aiRecommendationService } from "@/server/services";

const TEST_USER_ID = "default-user";

const invalidProvider: AiProvider = {
  async generateJson() {
    return {
      model: "invalid-test-model",
      output: { title: "" },
      provider: "invalid-test",
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

describe("aiRecommendationService integration", () => {
  beforeAll(async () => {
    await ensureUser();
  });

  beforeEach(async () => {
    await prisma.aiInteraction.deleteMany({ where: { userId: TEST_USER_ID } });
  });

  it("persists validated fake provider output", async () => {
    const result = await aiRecommendationService.generateStructured(
      {
        input: { goals: ["build consistency"] },
        schema: trainingPlanOutputV1Schema,
        schemaName: "TrainingPlanOutputV1",
        schemaVersion: "1",
        type: AiInteractionType.PLAN_GENERATION,
        userPrompt: "Create a starter block."
      },
      { provider: fakeAiProvider }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.data.output.title).toBe("Starter Strength Block");
    expect(result.data.interaction.validatedOutput).toBeTruthy();
    expect(result.data.interaction.error).toBeNull();

    const count = await prisma.aiInteraction.count({
      where: { userId: TEST_USER_ID, type: AiInteractionType.PLAN_GENERATION }
    });

    expect(count).toBe(1);
  });

  it("rejects invalid provider output without mutating plans", async () => {
    const planCountBefore = await prisma.trainingPlan.count({
      where: { userId: TEST_USER_ID }
    });

    const result = await aiRecommendationService.generateStructured(
      {
        input: { goals: ["build consistency"] },
        schema: trainingPlanOutputV1Schema,
        schemaName: "TrainingPlanOutputV1",
        schemaVersion: "1",
        type: AiInteractionType.PLAN_GENERATION
      },
      { provider: invalidProvider }
    );

    expect(result.ok).toBe(false);

    const failedInteraction = await prisma.aiInteraction.findFirstOrThrow({
      where: { provider: "invalid-test", userId: TEST_USER_ID }
    });
    const planCountAfter = await prisma.trainingPlan.count({
      where: { userId: TEST_USER_ID }
    });

    expect(failedInteraction.error).toBe("AI output failed schema validation.");
    expect(failedInteraction.validatedOutput).toBeNull();
    expect(planCountAfter).toBe(planCountBefore);
  });
});
