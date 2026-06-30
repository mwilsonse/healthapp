import { SetStatus, WorkoutStatus } from "@prisma/client";

import { poundsToKilograms } from "@/lib/units";
import type { CompleteWorkoutInput } from "@/server/services/schemas";

function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalNumber(value: FormDataEntryValue | null, label: string) {
  const stringValue = optionalString(value);

  if (!stringValue) {
    return undefined;
  }

  const parsed = Number(stringValue);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a number.`);
  }

  return parsed;
}

function optionalWeightKg(formData: FormData, key: string) {
  const pounds = optionalNumber(formData.get(`actualWeightLb:${key}`), "Weight");

  if (pounds !== undefined) {
    return poundsToKilograms(pounds);
  }

  return optionalNumber(formData.get(`actualWeightKg:${key}`), "Weight");
}

function parseSet(formData: FormData, key: string, plannedWorkoutSetId?: string) {
  return {
    actualDistanceMeters: optionalNumber(
      formData.get(`actualDistanceMeters:${key}`),
      "Distance"
    ),
    actualDurationSeconds: optionalNumber(
      formData.get(`actualDurationSeconds:${key}`),
      "Duration"
    ),
    actualReps: optionalNumber(formData.get(`actualReps:${key}`), "Reps"),
    actualRir: optionalNumber(formData.get(`actualRir:${key}`), "RIR"),
    actualRpe: optionalNumber(formData.get(`actualRpe:${key}`), "RPE"),
    actualWeightKg: optionalWeightKg(formData, key),
    notes: optionalString(formData.get(`setNotes:${key}`)),
    orderIndex: optionalNumber(formData.get(`setOrderIndex:${key}`), "Set order"),
    painFlag: formData.get(`painFlag:${key}`) === "on",
    plannedWorkoutSetId,
    status:
      optionalString(formData.get(`setStatus:${key}`)) === SetStatus.SKIPPED
        ? SetStatus.SKIPPED
        : SetStatus.COMPLETED
  };
}

function fieldMessages(details: unknown) {
  if (!details || typeof details !== "object") {
    return [];
  }

  const flattened = details as {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };

  return [
    ...(flattened.formErrors ?? []),
    ...Object.values(flattened.fieldErrors ?? {}).flatMap((messages) =>
      messages ?? []
    )
  ];
}

export function validationMessage(details: unknown, fallback = "Invalid input.") {
  return fieldMessages(details)[0] ?? fallback;
}

export function parseWorkoutCompletionForm(
  formData: FormData
): CompleteWorkoutInput {
  const plannedWorkoutId = optionalString(formData.get("plannedWorkoutId"));
  const status =
    optionalString(formData.get("completionStatus")) === WorkoutStatus.PARTIAL
      ? WorkoutStatus.PARTIAL
      : WorkoutStatus.COMPLETED;

  if (!plannedWorkoutId) {
    throw new Error("Workout id is required.");
  }

  const exerciseIds = formData
    .getAll("plannedWorkoutExerciseId")
    .filter((value): value is string => typeof value === "string");
  const extraExerciseKeys = formData
    .getAll("extraExerciseKey")
    .filter((value): value is string => typeof value === "string");

  return {
    durationAdjustmentMinutes: optionalNumber(
      formData.get("durationAdjustmentMinutes"),
      "Minutes adjusted"
    ),
    exercises: exerciseIds.map((exerciseId) => {
      const plannedSetIds = formData
        .getAll(`plannedWorkoutSetId:${exerciseId}`)
        .filter((value): value is string => typeof value === "string");
      const extraSetKeys = formData
        .getAll(`extraSetKey:${exerciseId}`)
        .filter((value): value is string => typeof value === "string");

      return {
        notes: optionalString(formData.get(`exerciseNotes:${exerciseId}`)),
        plannedWorkoutExerciseId: exerciseId,
        sets: [
          ...plannedSetIds.map((setId) => parseSet(formData, setId, setId)),
          ...extraSetKeys.map((setKey) => parseSet(formData, setKey))
        ],
        substitutionExerciseName: optionalString(
          formData.get(`substitutionExerciseName:${exerciseId}`)
        ),
        substitutionReason: optionalString(
          formData.get(`substitutionReason:${exerciseId}`)
        )
      };
    }),
    extraExercises: extraExerciseKeys.map((exerciseKey) => {
      const setKeys = formData
        .getAll(`extraExerciseSetKey:${exerciseKey}`)
        .filter((value): value is string => typeof value === "string");

      return {
        exerciseName:
          optionalString(formData.get(`extraExerciseName:${exerciseKey}`)) ?? "",
        notes: optionalString(formData.get(`extraExerciseNotes:${exerciseKey}`)),
        sets: setKeys.map((setKey) => parseSet(formData, setKey))
      };
    }),
    intensityAdjustment:
      optionalString(formData.get("intensityAdjustment")) === "REDUCED"
        ? "REDUCED"
        : optionalString(formData.get("intensityAdjustment")) === "INCREASED"
          ? "INCREASED"
          : "AS_PLANNED",
    overallRpe: optionalNumber(formData.get("overallRpe"), "Overall RPE"),
    painNotes: optionalString(formData.get("painNotes")),
    plannedWorkoutId,
    status,
    userNotes: optionalString(formData.get("userNotes"))
  };
}
