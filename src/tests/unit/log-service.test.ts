import { SetStatus, WorkoutStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildExerciseTrends,
  type WorkoutLogWithDetails
} from "@/server/services/log-service";

function workout(weights: number[]): WorkoutLogWithDetails {
  return {
    completedAt: new Date("2026-06-29T12:00:00.000Z"),
    exercises: [
      {
        exerciseId: "exercise-1",
        nameSnapshot: "Deadlift",
        sets: weights.map((weightKg, index) => ({
          actualReps: 8,
          actualWeightKg: weightKg,
          orderIndex: index,
          status: SetStatus.COMPLETED
        }))
      }
    ],
    id: "workout-1",
    status: WorkoutStatus.COMPLETED
  } as unknown as WorkoutLogWithDetails;
}

describe("log service trends", () => {
  it("does not report load change from set-to-set drift inside one session", () => {
    const trends = buildExerciseTrends([workout([47.627, 46.493])]);

    expect(trends[0]).toMatchObject({
      latestWeightKg: 46.493,
      loadChangeKg: null,
      sessions: 1
    });
  });
});
