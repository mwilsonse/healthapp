import { describe, expect, it } from "vitest";

import {
  centimetersToInches,
  formatInchesFromCentimeters,
  formatMilesFromMeters,
  formatPoundsFromKilograms,
  inchesToCentimeters,
  kilogramsToPounds,
  milesToMeters,
  poundsToKilograms
} from "@/lib/units";

describe("unit conversion utilities", () => {
  it("stores pounds as canonical kilograms and formats back to US display", () => {
    const kilograms = poundsToKilograms(200);

    expect(kilograms).toBeCloseTo(90.718, 3);
    expect(kilogramsToPounds(kilograms)).toBeCloseTo(200, 5);
    expect(formatPoundsFromKilograms(kilograms)).toBe("200 lb");
  });

  it("stores inches as canonical centimeters and formats back to US display", () => {
    const centimeters = inchesToCentimeters(70);

    expect(centimeters).toBeCloseTo(177.8, 2);
    expect(centimetersToInches(centimeters)).toBeCloseTo(70, 5);
    expect(formatInchesFromCentimeters(centimeters)).toBe("70 in");
  });

  it("stores miles as canonical meters and formats back to US display", () => {
    const meters = milesToMeters(3.1);

    expect(meters).toBeCloseTo(4988.966, 3);
    expect(formatMilesFromMeters(meters)).toBe("3.1 mi");
  });
});
