import { SetStatus, WorkoutStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { summarizePlanEditCandidate } from "@/server/services/planning-service";

describe("planningService plan edit summaries", () => {
  it("summarizes skipped, painful, and target-mismatched work", () => {
    const candidate = summarizePlanEditCandidate({
      completedAt: new Date("2026-06-29T16:00:00.000Z"),
      createdAt: new Date("2026-06-29T16:00:00.000Z"),
      exercises: [
        {
          completedWorkoutId: "completed-1",
          exerciseId: "exercise-1",
          id: "completed-exercise-1",
          nameSnapshot: "Goblet Squat",
          notes: null,
          orderIndex: 0,
          plannedWorkoutExercise: {
            exerciseId: "exercise-1",
            id: "planned-exercise-1",
            nameSnapshot: "Goblet Squat",
            notes: null,
            orderIndex: 0,
            plannedWorkoutId: "planned-1",
            restSeconds: 90,
            targetRir: null,
            targetRpe: null
          },
          plannedWorkoutExerciseId: "planned-exercise-1",
          sets: [
            {
              actualDistanceMeters: null,
              actualDurationSeconds: null,
              actualReps: 8,
              actualRir: null,
              actualRpe: null,
              actualWeightKg: 12.5,
              completedWorkoutExerciseId: "completed-exercise-1",
              id: "completed-set-1",
              notes: null,
              orderIndex: 0,
              painFlag: true,
              plannedWorkoutSet: {
                id: "planned-set-1",
                notes: null,
                orderIndex: 0,
                plannedWorkoutExerciseId: "planned-exercise-1",
                targetDistanceMeters: null,
                targetDurationSeconds: null,
                targetReps: 10,
                targetRir: null,
                targetRpe: null,
                targetWeightKg: 15
              },
              plannedWorkoutSetId: "planned-set-1",
              status: SetStatus.COMPLETED
            }
          ],
          substitutionReason: null
        }
      ],
      id: "completed-1",
      overallRpe: null,
      painNotes: "Knee felt off.",
      planEditCommitment: null,
      plannedWorkout: {
        createdAt: new Date("2026-06-29T12:00:00.000Z"),
        createdByJobId: null,
        id: "planned-1",
        rationaleId: null,
        scheduledFor: new Date("2026-06-29T15:00:00.000Z"),
        status: WorkoutStatus.COMPLETED,
        summary: null,
        supersededByWorkoutId: null,
        targetDurationSeconds: null,
        title: "Full Body",
        trainingPlanId: "plan-1",
        updatedAt: new Date("2026-06-29T12:00:00.000Z"),
        userId: "default-user",
        warmup: null,
        workoutType: "strength"
      },
      plannedWorkoutId: "planned-1",
      skipReason: null,
      startedAt: new Date("2026-06-29T15:00:00.000Z"),
      status: WorkoutStatus.COMPLETED,
      updatedAt: new Date("2026-06-29T16:00:00.000Z"),
      userId: "default-user",
      userNotes: null
    } as unknown as Parameters<typeof summarizePlanEditCandidate>[0]);

    expect(candidate?.title).toBe("Plan edit from Full Body");
    expect(candidate?.changeSummary).toContain("Pain note");
    expect(candidate?.changeSummary).toContain("reps 10 -> 8");
    expect(candidate?.changeSummary).toContain("load 15 kg -> 12.5 kg");
    expect(candidate?.changeSummary).toContain("had pain");
  });

  it("does not create a candidate when actual work matches the plan", () => {
    const candidate = summarizePlanEditCandidate({
      completedAt: new Date("2026-06-29T16:00:00.000Z"),
      createdAt: new Date("2026-06-29T16:00:00.000Z"),
      exercises: [],
      id: "completed-1",
      overallRpe: null,
      painNotes: null,
      planEditCommitment: null,
      plannedWorkout: {
        createdAt: new Date("2026-06-29T12:00:00.000Z"),
        createdByJobId: null,
        id: "planned-1",
        rationaleId: null,
        scheduledFor: new Date("2026-06-29T15:00:00.000Z"),
        status: WorkoutStatus.COMPLETED,
        summary: null,
        supersededByWorkoutId: null,
        targetDurationSeconds: null,
        title: "Full Body",
        trainingPlanId: "plan-1",
        updatedAt: new Date("2026-06-29T12:00:00.000Z"),
        userId: "default-user",
        warmup: null,
        workoutType: "strength"
      },
      plannedWorkoutId: "planned-1",
      skipReason: null,
      startedAt: new Date("2026-06-29T15:00:00.000Z"),
      status: WorkoutStatus.COMPLETED,
      updatedAt: new Date("2026-06-29T16:00:00.000Z"),
      userId: "default-user",
      userNotes: null
    } as unknown as Parameters<typeof summarizePlanEditCandidate>[0]);

    expect(candidate).toBeNull();
  });
});
