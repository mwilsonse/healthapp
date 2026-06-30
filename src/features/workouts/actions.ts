"use server";

import { WorkoutStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  parseWorkoutCompletionForm,
  validationMessage
} from "@/features/workouts/form-parsing";
import { workoutService } from "@/server/services";

function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
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
  let input;

  try {
    input = parseWorkoutCompletionForm(formData);
  } catch (error) {
    workoutRedirect(error instanceof Error ? error.message : "Invalid input.");
  }

  const result = await workoutService.completeWorkout(input);

  if (!result.ok) {
    workoutRedirect(validationMessage(result.error.details, result.error.message));
  }

  revalidatePath("/today");
  workoutRedirect();
}
