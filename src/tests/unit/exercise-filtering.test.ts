import {
  ExerciseModality,
  ExercisePreferenceValue,
  ExerciseStatus
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import { filterExercises, type FilterableExercise } from "@/lib/exercise-filtering";

const exercises: FilterableExercise[] = [
  {
    id: "push-up",
    status: ExerciseStatus.ACTIVE,
    modality: ExerciseModality.STRENGTH,
    equipmentTypes: ["bodyweight"],
    contraindicationTags: ["wrist-pain"]
  },
  {
    id: "bench",
    status: ExerciseStatus.ACTIVE,
    modality: ExerciseModality.STRENGTH,
    equipmentTypes: ["dumbbell"],
    contraindicationTags: ["shoulder-pain"]
  },
  {
    id: "bike",
    status: ExerciseStatus.ACTIVE,
    modality: ExerciseModality.CARDIO,
    equipmentTypes: ["cardio_machine"],
    contraindicationTags: []
  },
  {
    id: "archived",
    status: ExerciseStatus.ARCHIVED,
    modality: ExerciseModality.STRENGTH,
    equipmentTypes: ["bodyweight"],
    contraindicationTags: []
  }
];

describe("exercise filtering", () => {
  it("filters by active status, available equipment, and modality", () => {
    const filtered = filterExercises(exercises, {
      availableEquipmentTypes: ["dumbbell"],
      modalities: [ExerciseModality.STRENGTH]
    });

    expect(filtered.map((exercise) => exercise.id)).toEqual(["push-up", "bench"]);
  });

  it("excludes contraindicated and avoided exercises", () => {
    const filtered = filterExercises(exercises, {
      availableEquipmentTypes: ["dumbbell", "cardio_machine"],
      avoidContraindicationTags: ["shoulder-pain"],
      preferences: [
        {
          exerciseId: "bike",
          preference: ExercisePreferenceValue.AVOID
        }
      ]
    });

    expect(filtered.map((exercise) => exercise.id)).toEqual(["push-up"]);
  });
});
