import { SetStatus, WorkoutStatus } from "@prisma/client";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Target
} from "lucide-react";

import {
  formatPoundsFromKilograms,
  kilogramsToPounds,
  roundTo
} from "@/lib/units";
import { logService } from "@/server/services";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short"
  }).format(date);
}

function formatDuration(seconds?: number | null) {
  if (!seconds) {
    return null;
  }

  return `${Math.round(seconds / 60)} min`;
}

function formatWeight(value?: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return formatPoundsFromKilograms(numeric);
}

function statusLabel(status: WorkoutStatus | SetStatus) {
  return status.toLowerCase().replaceAll("_", " ");
}

function workoutStatusTone(status: WorkoutStatus) {
  if (status === WorkoutStatus.COMPLETED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === WorkoutStatus.PARTIAL) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-border bg-muted text-muted-foreground";
}

function setLine(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" · ");
}

function formatWeightChange(changeKg: number) {
  const changeLb = roundTo(kilogramsToPounds(changeKg), 1);

  return `${changeLb >= 0 ? "+" : ""}${changeLb} lb`;
}

function plannedLine(set: {
  plannedWorkoutSet?: {
    targetDurationSeconds?: number | null;
    targetReps?: number | null;
    targetRpe?: unknown;
    targetWeightKg?: unknown;
  } | null;
}) {
  const plannedSet = set.plannedWorkoutSet;

  if (!plannedSet) {
    return "No planned target";
  }

  return (
    setLine([
      plannedSet.targetReps ? `${plannedSet.targetReps} reps` : null,
      formatWeight(plannedSet.targetWeightKg),
      plannedSet.targetDurationSeconds
        ? formatDuration(plannedSet.targetDurationSeconds)
        : null,
      plannedSet.targetRpe
        ? `RPE ${Number(plannedSet.targetRpe).toFixed(1)}`
        : null
    ]) || "Target not set"
  );
}

function actualLine(set: {
  actualDurationSeconds?: number | null;
  actualReps?: number | null;
  actualRpe?: unknown;
  actualWeightKg?: unknown;
  painFlag: boolean;
  status: SetStatus;
}) {
  if (set.status === SetStatus.SKIPPED) {
    return "Skipped";
  }

  return (
    setLine([
      set.actualReps ? `${set.actualReps} reps` : null,
      formatWeight(set.actualWeightKg),
      set.actualDurationSeconds
        ? formatDuration(set.actualDurationSeconds)
        : null,
      set.actualRpe ? `RPE ${Number(set.actualRpe).toFixed(1)}` : null,
      set.painFlag ? "Pain noted" : null
    ]) || "Logged without set details"
  );
}

export default async function LogsPage() {
  const result = await logService.getWorkoutHistoryWithInsights();
  const data = result.ok
    ? result.data
    : { exerciseTrends: [], insights: [], workouts: [] };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Logs</p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Workout history
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Review completed sessions, planned versus actual work, skipped or
          partial sessions, and exercise trends from saved logs.
        </p>
      </div>

      {!result.ok ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {result.error.message}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2">
        {data.insights.map((insight) => (
          <article
            className="rounded-lg border border-border bg-card p-4 shadow-sm"
            key={insight.category}
          >
            <div className="flex items-center gap-2">
              {insight.category === "missed_or_modified" ? (
                <AlertTriangle
                  aria-hidden="true"
                  className="h-4 w-4 text-muted-foreground"
                />
              ) : insight.category === "goal_alignment" ? (
                <Target
                  aria-hidden="true"
                  className="h-4 w-4 text-muted-foreground"
                />
              ) : insight.category === "load_progression" ? (
                <BarChart3
                  aria-hidden="true"
                  className="h-4 w-4 text-muted-foreground"
                />
              ) : (
                <CheckCircle2
                  aria-hidden="true"
                  className="h-4 w-4 text-muted-foreground"
                />
              )}
              <h2 className="text-base font-semibold">{insight.title}</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {insight.body}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <BarChart3
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
          <h2 className="text-base font-semibold">Exercise trends</h2>
        </div>
        {data.exerciseTrends.length > 0 ? (
          <div className="mt-3 divide-y divide-border rounded-md border border-border">
            {data.exerciseTrends.slice(0, 6).map((trend) => (
              <div className="grid gap-1 p-3 text-sm" key={trend.exerciseId}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium">{trend.exerciseName}</span>
                  <span className="text-muted-foreground">
                    {trend.sessions} session{trend.sessions === 1 ? "" : "s"} ·{" "}
                    {trend.completedSets} set
                    {trend.completedSets === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="text-muted-foreground">
                  Latest load{" "}
                  {trend.latestWeightKg
                    ? formatPoundsFromKilograms(trend.latestWeightKg)
                    : "not logged"}
                  {trend.loadChangeKg !== null
                    ? ` · change ${formatWeightChange(trend.loadChangeKg)}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Exercise trends will appear after completed sets are logged.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
          <h2 className="text-base font-semibold">Completed workouts</h2>
        </div>

        {data.workouts.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            No completed workouts have been logged yet.
          </p>
        ) : (
          <div className="space-y-4">
            {data.workouts.map((workout) => (
              <article
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
                key={workout.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-medium">
                      {workout.plannedWorkout?.title ?? "Workout log"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(workout.completedAt ?? workout.startedAt)}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-md border px-2 py-1 text-xs font-medium ${workoutStatusTone(
                      workout.status
                    )}`}
                  >
                    {statusLabel(workout.status)}
                  </span>
                </div>

                {workout.skipReason ||
                workout.painNotes ||
                workout.userNotes ? (
                  <div className="mt-3 space-y-1 text-sm leading-6 text-muted-foreground">
                    {workout.skipReason ? (
                      <p>Skip: {workout.skipReason}</p>
                    ) : null}
                    {workout.painNotes ? (
                      <p>Pain: {workout.painNotes}</p>
                    ) : null}
                    {workout.userNotes ? (
                      <p>Notes: {workout.userNotes}</p>
                    ) : null}
                  </div>
                ) : null}

                {workout.exercises.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {workout.exercises.map((exercise) => (
                      <section
                        className="rounded-md border border-border p-3"
                        key={exercise.id}
                      >
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                          <h4 className="text-sm font-medium">
                            {exercise.nameSnapshot}
                          </h4>
                          {exercise.substitutionReason ? (
                            <span className="text-xs text-muted-foreground">
                              Modified
                            </span>
                          ) : null}
                        </div>
                        {exercise.substitutionReason ? (
                          <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {exercise.substitutionReason}
                          </p>
                        ) : null}

                        <div className="mt-3 divide-y divide-border rounded-md border border-border">
                          {exercise.sets.map((set) => (
                            <div
                              className="grid gap-2 p-3 text-sm"
                              key={set.id}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium">
                                  Set {set.orderIndex + 1}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {statusLabel(set.status)}
                                </span>
                              </div>
                              <div className="grid gap-1 text-muted-foreground md:grid-cols-2">
                                <p>Planned: {plannedLine(set)}</p>
                                <p>Actual: {actualLine(set)}</p>
                              </div>
                              {set.notes ? (
                                <p className="text-xs leading-5 text-muted-foreground">
                                  {set.notes}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    No set details were stored for this workout.
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
