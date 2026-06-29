"use server";

import { revalidatePath } from "next/cache";

import { exportService } from "@/server/services";

export async function resetHealthDataAction(formData: FormData) {
  const confirmation = String(formData.get("confirmation") ?? "");
  const result = await exportService.resetUserData({
    confirmation,
    preserveUser: true
  });

  if (!result.ok) {
    console.warn(result.error.message);
    return;
  }

  revalidatePath("/profile");
  revalidatePath("/plan");
  revalidatePath("/today");
  revalidatePath("/logs");
}
