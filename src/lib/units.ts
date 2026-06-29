const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const METERS_PER_MILE = 1609.344;

export function poundsToKilograms(pounds: number) {
  return pounds * KG_PER_LB;
}

export function kilogramsToPounds(kilograms: number) {
  return kilograms / KG_PER_LB;
}

export function inchesToCentimeters(inches: number) {
  return inches * CM_PER_IN;
}

export function centimetersToInches(centimeters: number) {
  return centimeters / CM_PER_IN;
}

export function milesToMeters(miles: number) {
  return miles * METERS_PER_MILE;
}

export function metersToMiles(meters: number) {
  return meters / METERS_PER_MILE;
}

export function roundTo(value: number, precision = 2) {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function formatPoundsFromKilograms(kilograms: number) {
  return `${roundTo(kilogramsToPounds(kilograms), 1)} lb`;
}

export function formatInchesFromCentimeters(centimeters: number) {
  return `${roundTo(centimetersToInches(centimeters), 1)} in`;
}

export function formatMilesFromMeters(meters: number) {
  return `${roundTo(metersToMiles(meters), 2)} mi`;
}
