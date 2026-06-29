import { describe, expect, it } from "vitest";

import { failure, success } from "@/server/services";

describe("service result helpers", () => {
  it("creates typed success results", () => {
    const result = success({ value: 1 });

    expect(result).toEqual({ ok: true, data: { value: 1 } });
  });

  it("creates typed failure results", () => {
    const result = failure("VALIDATION", "Invalid input.", { field: "title" });

    expect(result).toEqual({
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Invalid input.",
        details: { field: "title" }
      }
    });
  });
});
