import { EquipmentType, JobType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  createEquipmentInputSchema,
  enqueueJobInputSchema
} from "@/server/services/schemas";

describe("service input schemas", () => {
  it("validates first equipment mutations", () => {
    const parsed = createEquipmentInputSchema.parse({
      name: "Adjustable dumbbells",
      type: EquipmentType.DUMBBELL
    });

    expect(parsed).toMatchObject({
      isAvailable: true,
      name: "Adjustable dumbbells",
      type: EquipmentType.DUMBBELL
    });
  });

  it("validates first job mutations", () => {
    const parsed = enqueueJobInputSchema.parse({
      type: JobType.NEXT_WORKOUT_GENERATION
    });

    expect(parsed).toMatchObject({
      maxRetries: 3,
      type: JobType.NEXT_WORKOUT_GENERATION
    });
  });
});
