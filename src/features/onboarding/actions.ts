"use server";

import {
  EquipmentType,
  ExercisePreferenceValue,
  GoalStatus,
  GoalPriority
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  equipmentService,
  exerciseService,
  goalService,
  profileService
} from "@/server/services";
import type { ServiceResult } from "@/server/services";

function numberFromForm(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function stringFromForm(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function actionResponse<T>(
  result: ServiceResult<T>,
  successMessage: string
): void {
  if (!result.ok) {
    console.warn(result.error.message);
    return;
  }

  revalidatePath("/onboarding");
  revalidatePath("/profile");

  console.info(successMessage);
}

export async function upsertProfileAction(formData: FormData) {
  const preferredTrainingNotes = stringFromForm(
    formData.get("preferredTrainingNotes")
  );

  const result = await profileService.upsertProfile({
    birthDate: stringFromForm(formData.get("birthDate"))
      ? new Date(String(formData.get("birthDate")))
      : undefined,
    currentWeightKg: numberFromForm(formData.get("currentWeightKg")),
    generalConstraints: stringFromForm(formData.get("generalConstraints")),
    heightCm: numberFromForm(formData.get("heightCm")),
    nutritionNotes: stringFromForm(formData.get("nutritionNotes")),
    preferredTrainingTimes: preferredTrainingNotes
      ? { notes: preferredTrainingNotes }
      : undefined,
    restingHeartRateBpm: numberFromForm(formData.get("restingHeartRateBpm")),
    sex: stringFromForm(formData.get("sex")),
    sleepBaselineNotes: stringFromForm(formData.get("sleepBaselineNotes"))
  });

  return actionResponse(result, "Profile saved.");
}

export async function createMeasurementAction(formData: FormData) {
  const result = await profileService.createMeasurement({
    armCm: numberFromForm(formData.get("armCm")),
    bodyFatPercent: numberFromForm(formData.get("bodyFatPercent")),
    chestCm: numberFromForm(formData.get("chestCm")),
    hipsCm: numberFromForm(formData.get("hipsCm")),
    measuredAt: stringFromForm(formData.get("measuredAt"))
      ? new Date(String(formData.get("measuredAt")))
      : new Date(),
    neckCm: numberFromForm(formData.get("neckCm")),
    notes: stringFromForm(formData.get("notes")),
    pantlineCm: numberFromForm(formData.get("pantlineCm")),
    restingHeartRateBpm: numberFromForm(formData.get("restingHeartRateBpm")),
    source: "manual",
    stomachCm: numberFromForm(formData.get("stomachCm")),
    thighCm: numberFromForm(formData.get("thighCm")),
    waistCm: numberFromForm(formData.get("waistCm")),
    weightKg: numberFromForm(formData.get("weightKg"))
  });

  return actionResponse(result, "Measurement saved.");
}

export async function createGoalAction(formData: FormData) {
  const priorityValue = String(formData.get("priority") ?? GoalPriority.MEDIUM);

  const result = await goalService.createGoal({
    description: stringFromForm(formData.get("description")),
    notes: stringFromForm(formData.get("notes")),
    priority: priorityValue as GoalPriority,
    status: GoalStatus.ACTIVE,
    targetDate: stringFromForm(formData.get("targetDate"))
      ? new Date(String(formData.get("targetDate")))
      : undefined,
    title: String(formData.get("title") ?? "")
  });

  return actionResponse(result, "Goal saved.");
}

export async function createEquipmentAction(formData: FormData) {
  const result = await equipmentService.createEquipment({
    description: stringFromForm(formData.get("description")),
    isAvailable: true,
    name: String(formData.get("name") ?? ""),
    notes: stringFromForm(formData.get("notes")),
    type: String(formData.get("type") ?? EquipmentType.OTHER) as EquipmentType
  });

  return actionResponse(result, "Equipment saved.");
}

export async function createAvailableLoadAction(formData: FormData) {
  const result = await equipmentService.createAvailableLoad({
    equipmentId: String(formData.get("equipmentId") ?? ""),
    isPair: formData.get("isPair") === "on",
    label: stringFromForm(formData.get("label")),
    loadKg: numberFromForm(formData.get("loadKg")) ?? 0,
    notes: stringFromForm(formData.get("notes")),
    quantity: numberFromForm(formData.get("quantity")) ?? 1
  });

  return actionResponse(result, "Available load saved.");
}

export async function setExercisePreferenceAction(formData: FormData) {
  const result = await exerciseService.setExercisePreference({
    exerciseId: String(formData.get("exerciseId") ?? ""),
    preference: String(
      formData.get("preference") ?? ExercisePreferenceValue.NEUTRAL
    ) as ExercisePreferenceValue,
    reason: stringFromForm(formData.get("reason"))
  });

  return actionResponse(result, "Exercise preference saved.");
}
