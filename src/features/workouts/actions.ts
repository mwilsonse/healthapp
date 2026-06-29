"use server";

import { SetStatus, WorkoutStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { workoutService } from "@/server/services";
import type { CompleteWorkoutInput } from "@/server/services/schemas";

function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const stringValue = optionalString(value);

  if (!stringValue) {
    return undefined;
  }

  const parsed = Number(stringValue);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function workoutRedirect(error?: string): never {
  const suffix = error ? `?error=${encodeURIComponent(error)}` : "";

  redirect(`/today${suffix}`);
}

export async function startWorkoutAction(formData: FormData) {
  const plannedWorkoutId = optionalString(formData.get("plannedWorkoutId"));

  if (!plannedWorkoutId) {
    workoutRedirect("Workout id is required.");
  }

  const result = await workoutService.startWorkout(plannedWorkoutId);

  if (!result.ok) {
    workoutRedirect(result.error.message);
  }

  revalidatePath("/today");
  workoutRedirect();
}

export async function skipWorkoutAction(formData: FormData) {
  const plannedWorkoutId = optionalString(formData.get("plannedWorkoutId"));

  if (!plannedWorkoutId) {
    workoutRedirect("Workout id is required.");
  }

  const result = await workoutService.completeWorkout({
    intensityAdjustment: "AS_PLANNED",
    plannedWorkoutId,
    skipReason: optionalString(formData.get("skipReason")),
    status: WorkoutStatus.SKIPPED,
    userNotes: optionalString(formData.get("userNotes"))
  });

  if (!result.ok) {
    workoutRedirect(result.error.message);
  }

  revalidatePath("/today");
  workoutRedirect();
}

export async function completeWorkoutAction(formData: FormData) {
  const plannedWorkoutId = optionalString(formData.get("plannedWorkoutId"));
  const status =
    optionalString(formData.get("completionStatus")) === WorkoutStatus.PARTIAL
      ? WorkoutStatus.PARTIAL
      : WorkoutStatus.COMPLETED;

  if (!plannedWorkoutId) {
    workoutRedirect("Workout id is required.");
  }

  const exerciseIds = formData
    .getAll("plannedWorkoutExerciseId")
    .filter((value): value is string => typeof value === "string");

  const input: CompleteWorkoutInput = {
    durationAdjustmentMinutes: optionalNumber(
      formData.get("durationAdjustmentMinutes")
    ),
    exercises: exerciseIds.map((exerciseId) => {
      const setIds = formData
        .getAll(`plannedWorkoutSetId:${exerciseId}`)
        .filter((value): value is string => typeof value === "string");

      return {
        notes: optionalString(formData.get(`exerciseNotes:${exerciseId}`)),
        plannedWorkoutExerciseId: exerciseId,
        sets: setIds.map((setId) => ({
          actualDistanceMeters: optionalNumber(
            formData.get(`actualDistanceMeters:${setId}`)
          ),
          actualDurationSeconds: optionalNumber(
            formData.get(`actualDurationSeconds:${setId}`)
          ),
          actualReps: optionalNumber(formData.get(`actualReps:${setId}`)),
          actualRir: optionalNumber(formData.get(`actualRir:${setId}`)),
          actualRpe: optionalNumber(formData.get(`actualRpe:${setId}`)),
          actualWeightKg: optionalNumber(formData.get(`actualWeightKg:${setId}`)),
          notes: optionalString(formData.get(`setNotes:${setId}`)),
          painFlag: formData.get(`painFlag:${setId}`) === "on",
          plannedWorkoutSetId: setId,
          status:
            optionalString(formData.get(`setStatus:${setId}`)) ===
            SetStatus.SKIPPED
              ? SetStatus.SKIPPED
              : SetStatus.COMPLETED
        })),
        substitutionExerciseName: optionalString(
          formData.get(`substitutionExerciseName:${exerciseId}`)
        ),
        substitutionReason: optionalString(
          formData.get(`substitutionReason:${exerciseId}`)
        )
      };
    }),
    intensityAdjustment:
      optionalString(formData.get("intensityAdjustment")) === "REDUCED"
        ? "REDUCED"
        : optionalString(formData.get("intensityAdjustment")) === "INCREASED"
          ? "INCREASED"
          : "AS_PLANNED",
    overallRpe: optionalNumber(formData.get("overallRpe")),
    painNotes: optionalString(formData.get("painNotes")),
    plannedWorkoutId,
    status,
    userNotes: optionalString(formData.get("userNotes"))
  };

  const result = await workoutService.completeWorkout(input);

  if (!result.ok) {
    workoutRedirect(result.error.message);
  }

  revalidatePath("/today");
  workoutRedirect();
}
