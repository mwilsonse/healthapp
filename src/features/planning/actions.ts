"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generationService, planningService } from "@/server/services";

export async function generatePlanAction() {
  const result = await generationService.generateActiveTrainingPlan();

  if (!result.ok) {
    redirect(`/plan?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/plan");
  revalidatePath("/today");
  redirect("/plan");
}

export async function generateTodayWorkoutAction() {
  const result = await generationService.ensureTodayWorkout();

  if (!result.ok) {
    redirect(`/today?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/today");
  revalidatePath("/plan");
  redirect("/today");
}

export async function decidePlanEditCommitmentAction(formData: FormData) {
  const completedWorkoutId = formData.get("completedWorkoutId");
  const decision = formData.get("decision");

  if (
    typeof completedWorkoutId !== "string" ||
    completedWorkoutId.length === 0
  ) {
    redirect("/plan?error=Workout%20log%20is%20required.");
  }

  const result = await planningService.decidePlanEditCommitment({
    commit: decision === "commit",
    completedWorkoutId
  });

  if (!result.ok) {
    redirect(`/plan?error=${encodeURIComponent(result.error.message)}`);
  }

  revalidatePath("/plan");
  revalidatePath("/logs");
  redirect("/plan");
}
