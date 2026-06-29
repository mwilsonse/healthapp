import type {
  ExerciseModality,
  ExercisePreferenceValue,
  ExerciseStatus
} from "@prisma/client";

export interface FilterableExercise {
  id: string;
  status: ExerciseStatus;
  modality: ExerciseModality;
  equipmentTypes: string[] | null;
  contraindicationTags: string[] | null;
}

export interface ExercisePreferenceFilter {
  exerciseId: string;
  preference: ExercisePreferenceValue;
}

export interface ExerciseFilterOptions {
  availableEquipmentTypes?: string[];
  avoidContraindicationTags?: string[];
  modalities?: ExerciseModality[];
  preferences?: ExercisePreferenceFilter[];
}

function normalizedSet(values: string[] = []) {
  return new Set(values.map((value) => value.toLowerCase()));
}

export function filterExercises<TExercise extends FilterableExercise>(
  exercises: TExercise[],
  options: ExerciseFilterOptions = {}
) {
  const equipment = normalizedSet(options.availableEquipmentTypes);
  const contraindications = normalizedSet(options.avoidContraindicationTags);
  const modalities = new Set(options.modalities);
  const avoidedExerciseIds = new Set(
    (options.preferences ?? [])
      .filter((preference) => preference.preference === "AVOID")
      .map((preference) => preference.exerciseId)
  );

  return exercises.filter((exercise) => {
    if (exercise.status !== "ACTIVE") {
      return false;
    }

    if (modalities.size > 0 && !modalities.has(exercise.modality)) {
      return false;
    }

    if (avoidedExerciseIds.has(exercise.id)) {
      return false;
    }

    const requiredEquipment = exercise.equipmentTypes ?? [];
    const equipmentAllowed =
      requiredEquipment.length === 0 ||
      requiredEquipment.some((item) => item.toLowerCase() === "bodyweight") ||
      requiredEquipment.every((item) => equipment.has(item.toLowerCase()));

    if (!equipmentAllowed) {
      return false;
    }

    const tags = exercise.contraindicationTags ?? [];
    return !tags.some((tag) => contraindications.has(tag.toLowerCase()));
  });
}
