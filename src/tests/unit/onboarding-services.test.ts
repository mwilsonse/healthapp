import { describe, expect, it } from "vitest";

import { equipmentService, goalService, profileService } from "@/server/services";

describe("onboarding service validation", () => {
  it("rejects invalid profile input before database work", async () => {
    const result = await profileService.upsertProfile({
      heightCm: -1
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.error.code).toBe("VALIDATION");
  });

  it("rejects empty goal titles before database work", async () => {
    const result = await goalService.createGoal({
      priority: "MEDIUM",
      status: "ACTIVE",
      title: ""
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.error.code).toBe("VALIDATION");
  });

  it("rejects invalid equipment input before database work", async () => {
    const result = await equipmentService.createEquipment({
      isAvailable: true,
      name: "",
      type: "DUMBBELL"
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.error.code).toBe("VALIDATION");
  });
});
