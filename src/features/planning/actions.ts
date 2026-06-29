"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generationService } from "@/server/services";

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
