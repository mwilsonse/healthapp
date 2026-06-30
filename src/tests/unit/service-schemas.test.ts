import { EquipmentType, JobType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  coachChatActionDecisionInputSchema,
  coachChatInputSchema,
  completeWorkoutInputSchema,
  createEquipmentInputSchema,
  enqueueJobInputSchema,
  resetUserDataInputSchema
} from "@/server/services/schemas";

describe("service input schemas", () => {
  it("validates first equipment mutations", () => {
    const parsed = createEquipmentInputSchema.parse({
      name: "Adjustable dumbbells",
      type: EquipmentType.DUMBBELL
    });

    expect(parsed).toMatchObject({
      isAvailable: true,
      name: "Adjustable dumbbells",
      type: EquipmentType.DUMBBELL
    });
  });

  it("validates first job mutations", () => {
    const parsed = enqueueJobInputSchema.parse({
      type: JobType.NEXT_WORKOUT_GENERATION
    });

    expect(parsed).toMatchObject({
      maxRetries: 3,
      type: JobType.NEXT_WORKOUT_GENERATION
    });
  });

  it("validates coach chat boundaries", () => {
    expect(
      coachChatInputSchema.parse({
        message: "Should I reduce load today?",
        plannedWorkoutId: "planned-1"
      })
    ).toMatchObject({
      message: "Should I reduce load today?",
      plannedWorkoutId: "planned-1"
    });

    expect(
      coachChatActionDecisionInputSchema.parse({
        actionId: "action-1",
        decision: "confirm"
      })
    ).toMatchObject({
      actionId: "action-1",
      decision: "confirm"
    });

    expect(() => coachChatInputSchema.parse({ message: "" })).toThrow();
    expect(() =>
      coachChatActionDecisionInputSchema.parse({
        actionId: "action-1",
        decision: "apply"
      })
    ).toThrow();
  });

  it("validates reset data boundaries", () => {
    expect(
      resetUserDataInputSchema.parse({
        confirmation: "DELETE MY HEALTH DATA"
      })
    ).toMatchObject({
      confirmation: "DELETE MY HEALTH DATA",
      preserveUser: true
    });

    expect(
      resetUserDataInputSchema.parse({
        confirmation: "DELETE MY HEALTH DATA",
        preserveUser: false
      })
    ).toMatchObject({
      preserveUser: false
    });
  });

  it("requires logged work before completing a workout", () => {
    const parsed = completeWorkoutInputSchema.safeParse({
      intensityAdjustment: "AS_PLANNED",
      plannedWorkoutId: "workout-1",
      status: "COMPLETED"
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.exercises).toContain(
        "Log at least one exercise before completing the workout."
      );
    }
  });
  it("allows substitutions without a reason", () => {
    const parsed = completeWorkoutInputSchema.safeParse({
      exercises: [
        {
          plannedWorkoutExerciseId: "planned-exercise-1",
          sets: [{ actualReps: 8, plannedWorkoutSetId: "planned-set-1" }],
          substitutionExerciseName: "Goblet squat"
        }
      ],
      intensityAdjustment: "AS_PLANNED",
      plannedWorkoutId: "workout-1",
      status: "COMPLETED"
    });

    expect(parsed.success).toBe(true);
  });

});
