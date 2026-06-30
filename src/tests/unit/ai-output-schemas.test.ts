import { AiInteractionType } from "@prisma/client";
import type { z } from "zod";
import { describe, expect, it } from "vitest";

import {
  coachChatActionOutputSchema,
  coachChatOutputV1Schema,
  coachNoteRefreshOutputV1Schema,
  fakeAiProvider,
  plannedWorkoutOutputV1Schema,
  postWorkoutFeedbackOutputV1Schema,
  trainingPlanOutputV1Schema
} from "@/server/ai";
import { aiRecommendationService } from "@/server/services";

const schemaCases: Array<{
  interactionType: AiInteractionType;
  name: string;
  schema: z.ZodTypeAny;
}> = [
  {
    interactionType: AiInteractionType.PLAN_GENERATION,
    name: "TrainingPlanOutputV1",
    schema: trainingPlanOutputV1Schema
  },
  {
    interactionType: AiInteractionType.WORKOUT_GENERATION,
    name: "PlannedWorkoutOutputV1",
    schema: plannedWorkoutOutputV1Schema
  },
  {
    interactionType: AiInteractionType.POST_WORKOUT_FEEDBACK,
    name: "PostWorkoutFeedbackOutputV1",
    schema: postWorkoutFeedbackOutputV1Schema
  },
  {
    interactionType: AiInteractionType.COACH_NOTE_REFRESH,
    name: "CoachNoteRefreshOutputV1",
    schema: coachNoteRefreshOutputV1Schema
  },
  {
    interactionType: AiInteractionType.COACH_CHAT,
    name: "CoachChatOutputV1",
    schema: coachChatOutputV1Schema
  }
];

describe("AI output schemas", () => {
  it.each(schemaCases)(
    "validates fake provider output for $name",
    async (testCase) => {
      const response = await fakeAiProvider.generateJson({
        input: { userId: "default-user" },
        schema: testCase.schema,
        schemaName: testCase.name,
        schemaVersion: "1"
      });

      const validated = aiRecommendationService.validateStructuredOutput(
        response.output,
        testCase.schema
      );

      expect(validated.ok).toBe(true);
    }
  );

  it("rejects invalid structured output", () => {
    const validated = aiRecommendationService.validateStructuredOutput(
      { title: "" },
      trainingPlanOutputV1Schema
    );

    expect(validated.ok).toBe(false);
  });

  it("rejects unsupported coach chat action types", () => {
    const validated = coachChatActionOutputSchema.safeParse({
      confirmationRequired: true,
      description: "Do something unsupported.",
      input: {},
      type: "delete_all_data"
    });

    expect(validated.success).toBe(false);
  });

  it("rejects arbitrary coach chat action input keys", () => {
    const validated = coachChatActionOutputSchema.safeParse({
      confirmationRequired: true,
      description: "Generate today's workout.",
      input: { extra: true },
      type: "generate_today_workout"
    });

    expect(validated.success).toBe(false);
  });
});
