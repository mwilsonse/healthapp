import { describe, expect, it } from "vitest";

import { roundToAvailableLoad } from "@/lib/load-rounding";

describe("available-load rounding", () => {
  const availableLoadsKg = [2.5, 5, 7.5, 10, 12.5, 15];

  it("rounds to the nearest achievable load", () => {
    expect(roundToAvailableLoad(11, availableLoadsKg)?.roundedKg).toBe(10);
    expect(roundToAvailableLoad(11.6, availableLoadsKg)?.roundedKg).toBe(12.5);
  });

  it("favors the safer lower load on ties", () => {
    expect(roundToAvailableLoad(11.25, availableLoadsKg)?.roundedKg).toBe(10);
  });

  it("can force down or up rounding", () => {
    expect(
      roundToAvailableLoad(11.6, availableLoadsKg, { mode: "down" })?.roundedKg
    ).toBe(10);
    expect(
      roundToAvailableLoad(11.6, availableLoadsKg, { mode: "up" })?.roundedKg
    ).toBe(12.5);
  });

  it("returns null when there are no usable loads", () => {
    expect(roundToAvailableLoad(10, [])).toBeNull();
  });
});
