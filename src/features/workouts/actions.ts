"use server";

import { JobType, WorkoutStatus, type Job } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  parseWorkoutCompletionForm,
  validationMessage
} from "@/features/workouts/form-parsing";
import { jobHandlers } from "@/server/jobs";
import { jobService, workoutService } from "@/server/services";

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

function jobInput(job: Job) {
  return job.inputSnapshot && typeof job.inputSnapshot === "object"
    ? (job.inputSnapshot as Record<string, unknown>)
    : {};
}

async function runCompletedWorkoutFollowUps(completedWorkoutId: string) {
  const jobsResult = await jobService.listRecentJobs();

  if (!jobsResult.ok) {
    return;
  }

  const jobOrder = [
    JobType.POST_WORKOUT_FEEDBACK,
    JobType.NEXT_WORKOUT_GENERATION,
    JobType.COACH_NOTE_REFRESH
  ];
  const workerId = `server-action-${completedWorkoutId}`;

  for (const type of jobOrder) {
    const job = jobsResult.data.find((item) => {
      const input = jobInput(item);

      return (
        item.type === type && input.completedWorkoutId === completedWorkoutId
      );
    });

    if (job) {
      await jobService.runJob(job, jobHandlers, { workerId });
    }
  }
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

  await runCompletedWorkoutFollowUps(result.data.id);
  revalidatePath("/today");
  workoutRedirect();
}
