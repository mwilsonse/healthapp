import { describe, expect, it } from "vitest";

import { formatLoggedDuration } from "@/lib/duration";

describe("duration formatting", () => {
  it("keeps short logged durations in seconds", () => {
    expect(formatLoggedDuration(26)).toBe("26 sec");
  });

  it("formats exact minute durations as minutes", () => {
    expect(formatLoggedDuration(120)).toBe("2 min");
  });

  it("formats longer mixed durations as minute-second values", () => {
    expect(formatLoggedDuration(95)).toBe("1:35");
  });
});
