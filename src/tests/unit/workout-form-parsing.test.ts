import { SetStatus, WorkoutStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  parseWorkoutCompletionForm,
  validationMessage
} from "@/features/workouts/form-parsing";

function formData(entries: Array<[string, string]>) {
  const data = new FormData();

  for (const [key, value] of entries) {
    data.append(key, value);
  }

  return data;
}

describe("workout completion form parsing", () => {
  it("converts logged pounds to stored kilograms", () => {
    const parsed = parseWorkoutCompletionForm(
      formData([
        ["plannedWorkoutId", "workout-1"],
        ["plannedWorkoutExerciseId", "exercise-1"],
        ["plannedWorkoutSetId:exercise-1", "set-1"],
        ["actualWeightLb:set-1", "100"],
        ["actualReps:set-1", "8"]
      ])
    );

    expect(parsed.exercises[0].sets[0].actualWeightKg).toBeCloseTo(
      45.359,
      3
    );
    expect(parsed.exercises[0].sets[0].actualReps).toBe(8);
  });

  it("parses removed planned sets as skipped", () => {
    const parsed = parseWorkoutCompletionForm(
      formData([
        ["plannedWorkoutId", "workout-1"],
        ["plannedWorkoutExerciseId", "exercise-1"],
        ["plannedWorkoutSetId:exercise-1", "set-1"],
        ["setStatus:set-1", SetStatus.SKIPPED]
      ])
    );

    expect(parsed.exercises[0].sets[0]).toMatchObject({
      plannedWorkoutSetId: "set-1",
      status: SetStatus.SKIPPED
    });
  });

  it("parses extra exercises without planned ids", () => {
    const parsed = parseWorkoutCompletionForm(
      formData([
        ["plannedWorkoutId", "workout-1"],
        ["extraExerciseKey", "extra-exercise-1"],
        ["extraExerciseName:extra-exercise-1", "Incline Walk"],
        ["extraExerciseSetKey:extra-exercise-1", "extra-set-1"],
        ["actualDurationSeconds:extra-set-1", "600"]
      ])
    );

    expect(parsed.status).toBe(WorkoutStatus.COMPLETED);
    expect(parsed.extraExercises[0].exerciseName).toBe("Incline Walk");
    expect(parsed.extraExercises[0].sets[0]).toMatchObject({
      actualDurationSeconds: 600,
      plannedWorkoutSetId: undefined
    });
  });

  it("extracts specific validation messages", () => {
    expect(
      validationMessage({
        fieldErrors: {
          exercises: ["Log at least one exercise before completing the workout."]
        },
        formErrors: []
      })
    ).toBe("Log at least one exercise before completing the workout.");
  });
});
