export type LoadRoundingMode = "nearest" | "down" | "up";

export interface RoundLoadOptions {
  mode?: LoadRoundingMode;
  preferLowerOnTieOrUncertainty?: boolean;
}

export interface RoundLoadResult {
  requestedKg: number;
  roundedKg: number;
  deltaKg: number;
  exact: boolean;
}

function uniqueSortedLoads(loadsKg: number[]) {
  return [...new Set(loadsKg)]
    .filter((load) => Number.isFinite(load))
    .sort((a, b) => a - b);
}

export function roundToAvailableLoad(
  requestedKg: number,
  availableLoadsKg: number[],
  options: RoundLoadOptions = {}
): RoundLoadResult | null {
  const loads = uniqueSortedLoads(availableLoadsKg);

  if (!Number.isFinite(requestedKg) || loads.length === 0) {
    return null;
  }

  const mode = options.mode ?? "nearest";
  const preferLower = options.preferLowerOnTieOrUncertainty ?? true;

  let roundedKg: number;

  if (mode === "down") {
    roundedKg = [...loads].reverse().find((load) => load <= requestedKg) ?? loads[0];
  } else if (mode === "up") {
    roundedKg = loads.find((load) => load >= requestedKg) ?? loads[loads.length - 1];
  } else {
    roundedKg = loads.reduce((best, candidate) => {
      const bestDelta = Math.abs(best - requestedKg);
      const candidateDelta = Math.abs(candidate - requestedKg);

      if (candidateDelta < bestDelta) {
        return candidate;
      }

      if (candidateDelta === bestDelta) {
        return preferLower ? Math.min(best, candidate) : Math.max(best, candidate);
      }

      return best;
    }, loads[0]);
  }

  return {
    requestedKg,
    roundedKg,
    deltaKg: roundedKg - requestedKg,
    exact: roundedKg === requestedKg
  };
}
