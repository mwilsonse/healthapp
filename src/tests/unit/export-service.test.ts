import { describe, expect, it } from "vitest";

import {
  exportService,
  RESET_USER_DATA_CONFIRMATION
} from "@/server/services/export-service";

describe("exportService boundaries", () => {
  it("rejects reset requests without the exact confirmation phrase", async () => {
    const result = await exportService.resetUserData({
      confirmation: "delete",
      preserveUser: true
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.error.code).toBe("VALIDATION");
    expect(result.ok ? null : result.error.message).toContain(
      RESET_USER_DATA_CONFIRMATION
    );
  });
});
