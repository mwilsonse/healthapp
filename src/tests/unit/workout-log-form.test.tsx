import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import {
  WorkoutLogForm,
  type WorkoutLogUi
} from "@/features/workouts/workout-log-form";

const workout: WorkoutLogUi = {
  exercises: [
    {
      formTip: null,
      id: "exercise-1",
      nameSnapshot: "Deadlift",
      notes: null,
      restSeconds: 120,
      sets: [
        {
          id: "set-1",
          notes: null,
          orderIndex: 0,
          targetDistanceMeters: null,
          targetDurationSeconds: null,
          targetReps: 8,
          targetRpe: 7,
          targetWeightKg: null
        }
      ]
    }
  ],
  id: "workout-1"
};

describe("workout log form", () => {
  it("preserves typed set values while rows are added and removed", () => {
    render(<WorkoutLogForm action={() => undefined} workout={workout} />);

    const weightInput = screen.getByPlaceholderText("lb") as HTMLInputElement;

    expect(weightInput.type).toBe("text");

    fireEvent.change(weightInput, { target: { value: "105" } });
    fireEvent.click(screen.getByRole("button", { name: "Add set" }));

    expect(weightInput.value).toBe("105");

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    fireEvent.click(removeButtons[1]);

    expect(weightInput.value).toBe("105");
  });
});
