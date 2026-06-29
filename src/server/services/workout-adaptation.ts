import { SetStatus, WorkoutStatus } from "@prisma/client";

export interface WorkoutAdaptationSet {
  actualReps?: number | null;
  actualRpe?: unknown;
  painFlag: boolean;
  plannedWorkoutSet?: {
    targetReps?: number | null;
    targetRpe?: unknown;
  } | null;
  status: SetStatus;
}

export interface WorkoutAdaptationExercise {
  sets: WorkoutAdaptationSet[];
}

export interface WorkoutAdaptationInput {
  exercises: WorkoutAdaptationExercise[];
  overallRpe?: unknown;
  painNotes?: string | null;
  status: WorkoutStatus;
}

export interface WorkoutAdaptationAssessment {
  completionQuality: "high" | "medium" | "low";
  hasMissedWork: boolean;
  hasPain: boolean;
  hasUnderperformance: boolean;
  intensityMultiplier: number;
  rationale: string[];
  volumeMultiplier: number;
}

function numberValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

export function assessWorkoutAdaptation(
  workout: WorkoutAdaptationInput
): WorkoutAdaptationAssessment {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  const skippedSets = sets.filter((set) => set.status === SetStatus.SKIPPED);
  const completedSets = sets.filter((set) => set.status !== SetStatus.SKIPPED);
  const hasPain =
    Boolean(workout.painNotes?.trim()) || sets.some((set) => set.painFlag);
  const hasMissedWork =
    workout.status === WorkoutStatus.SKIPPED ||
    workout.status === WorkoutStatus.PARTIAL ||
    skippedSets.length > 0;
  const overallRpe = numberValue(workout.overallRpe);
  const hasUnderperformance =
    overallRpe !== null && overallRpe >= 9
      ? true
      : completedSets.some((set) => {
          const actualReps = numberValue(set.actualReps);
          const targetReps = numberValue(set.plannedWorkoutSet?.targetReps);
          const actualRpe = numberValue(set.actualRpe);
          const targetRpe = numberValue(set.plannedWorkoutSet?.targetRpe);

          return (
            (actualReps !== null &&
              targetReps !== null &&
              actualReps < targetReps) ||
            (actualRpe !== null &&
              targetRpe !== null &&
              actualRpe > targetRpe + 1)
          );
        });

  const missedRatio = sets.length > 0 ? skippedSets.length / sets.length : 0;
  const completionQuality =
    hasPain ||
    workout.status === WorkoutStatus.SKIPPED ||
    missedRatio > 0.34 ||
    (hasUnderperformance && missedRatio > 0)
      ? "low"
      : hasMissedWork || hasUnderperformance
        ? "medium"
        : "high";
  const intensityMultiplier =
    hasPain || completionQuality === "low"
      ? 0.85
      : hasUnderperformance || hasMissedWork
        ? 0.9
        : 1;
  const volumeMultiplier =
    hasPain || workout.status === WorkoutStatus.SKIPPED
      ? 0.85
      : hasMissedWork || hasUnderperformance
        ? 0.9
        : 1;
  const rationale = [];

  if (hasPain) {
    rationale.push(
      "Pain was reported, so the next workout should avoid load increases and reduce intensity."
    );
  }

  if (hasMissedWork) {
    rationale.push(
      "Some planned work was missed, so the next workout should repeat or slightly reduce the dose before progressing."
    );
  }

  if (hasUnderperformance) {
    rationale.push(
      "Actual performance trailed the plan or effort was very high, so progression should stay conservative."
    );
  }

  if (rationale.length === 0) {
    rationale.push(
      "The workout was completed with adequate quality, so modest progression can be considered."
    );
  }

  return {
    completionQuality,
    hasMissedWork,
    hasPain,
    hasUnderperformance,
    intensityMultiplier,
    rationale,
    volumeMultiplier
  };
}
