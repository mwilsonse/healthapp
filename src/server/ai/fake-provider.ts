import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse
} from "@/server/ai/provider";

const scheduledFor = new Date("2026-01-05T12:00:00.000Z").toISOString();

const plannedWorkoutFixture = {
  estimatedDurationSeconds: 2700,
  exercises: [
    {
      exerciseName: "Goblet Squat",
      notes: "Use a controlled tempo.",
      orderIndex: 0,
      restSeconds: 90,
      sets: [
        {
          orderIndex: 0,
          targetReps: 10,
          targetRir: 2,
          targetWeightKg: 16
        },
        {
          orderIndex: 1,
          targetReps: 10,
          targetRir: 2,
          targetWeightKg: 16
        }
      ],
      targetRir: 2
    },
    {
      exerciseName: "Push-Up",
      orderIndex: 1,
      restSeconds: 75,
      sets: [
        {
          orderIndex: 0,
          targetReps: 8,
          targetRir: 2
        },
        {
          orderIndex: 1,
          targetReps: 8,
          targetRir: 2
        }
      ],
      targetRir: 2
    }
  ],
  rationale:
    "A conservative full-body session establishes baseline strength without excessive fatigue.",
  scheduledFor,
  summary: "Baseline full-body strength session.",
  title: "Full-Body Baseline",
  warmup: "Five minutes of easy movement followed by two light ramp-up sets.",
  workoutType: "strength"
};

function fixtureForSchema(schemaName: string) {
  if (schemaName === "TrainingPlanOutputV1") {
    return {
      endDate: new Date("2026-01-18T12:00:00.000Z").toISOString(),
      measurementReminders: ["Record waist and weight at the end of week two."],
      progressionGuidance:
        "Add one repetition per set before increasing load, keeping two reps in reserve.",
      rationale:
        "The plan prioritizes adherence and repeatable strength practice.",
      recoveryGuidance:
        "Keep at least one recovery day between strength sessions.",
      startDate: new Date("2026-01-05T12:00:00.000Z").toISOString(),
      summary: "Two-week starter block with repeatable full-body sessions.",
      title: "Starter Strength Block",
      weeklyStructure: [
        "Three full-body strength sessions",
        "Two optional easy cardio sessions"
      ],
      workouts: [plannedWorkoutFixture]
    };
  }

  if (schemaName === "PlannedWorkoutOutputV1") {
    return plannedWorkoutFixture;
  }

  if (schemaName === "PostWorkoutFeedbackOutputV1") {
    return {
      adaptationInstructions: [
        "Keep the next session at the same load if RPE exceeded target."
      ],
      nextWorkoutFocus: "Repeat quality reps and preserve recovery.",
      recoveryRecommendation:
        "Prioritize sleep and keep the next cardio session easy.",
      summary:
        "Workout completed with enough signal to keep progression conservative."
    };
  }

  if (schemaName === "CoachNoteRefreshOutputV1") {
    return {
      notes: [
        {
          message:
            "Keep two reps in reserve on primary strength work this week.",
          priority: "medium",
          title: "Intensity Guardrail"
        }
      ]
    };
  }

  if (schemaName === "CoachChatOutputV1") {
    return {
      actions: [],
      message:
        "I can help adjust the plan, but I will ask before changing saved data."
    };
  }

  return {};
}

export const fakeAiProvider: AiProvider = {
  async generateJson<TInput>(
    request: AiProviderRequest<TInput>
  ): Promise<AiProviderResponse> {
    return {
      model: "fake-deterministic-v1",
      output: fixtureForSchema(request.schemaName),
      provider: "fake",
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0
      }
    };
  }
};
