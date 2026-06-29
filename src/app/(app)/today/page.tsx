import { CalendarPlus, Clock3, Dumbbell, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generateTodayWorkoutAction } from "@/features/planning/actions";
import { formatPoundsFromKilograms } from "@/lib/units";
import { workoutService } from "@/server/services";

interface TodayPageProps {
  searchParams?: Promise<{ error?: string }>;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatDuration(seconds?: number | null) {
  if (!seconds) {
    return null;
  }

  const minutes = Math.round(seconds / 60);

  return `${minutes} min`;
}

function formatWeight(weightKg?: unknown) {
  if (weightKg === null || weightKg === undefined) {
    return null;
  }

  const numeric = Number(weightKg);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }

  return formatPoundsFromKilograms(numeric);
}

function targetLine(set: {
  targetDistanceMeters?: number | null;
  targetDurationSeconds?: number | null;
  targetReps?: number | null;
  targetRir?: unknown;
  targetRpe?: unknown;
  targetWeightKg?: unknown;
}) {
  const parts = [];
  const weight = formatWeight(set.targetWeightKg);

  if (set.targetReps) {
    parts.push(`${set.targetReps} reps`);
  }

  if (weight) {
    parts.push(weight);
  }

  if (set.targetDurationSeconds) {
    parts.push(formatDuration(set.targetDurationSeconds));
  }

  if (set.targetRpe !== null && set.targetRpe !== undefined) {
    parts.push(`RPE ${Number(set.targetRpe).toFixed(1)}`);
  }

  if (set.targetRir !== null && set.targetRir !== undefined) {
    parts.push(`${Number(set.targetRir).toFixed(1)} RIR`);
  }

  return parts.join(" · ");
}

function PageError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const workoutResult = await workoutService.getTodayWorkoutWithDetails();
  const workout = workoutResult.ok ? workoutResult.data : null;

  if (!workout) {
    return (
      <section className="flex flex-1 flex-col gap-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Today</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Workout pending
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Generate today&apos;s workout from your active plan, saved
            equipment, constraints, preferences, and available loads.
          </p>
        </div>

        <PageError message={resolvedSearchParams.error} />

        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Planning status</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              If no active two-week plan exists, this will create one first and
              then generate today&apos;s planned session.
            </p>
          </div>
          <form action={generateTodayWorkoutAction}>
            <Button className="mt-4" type="submit">
              <Sparkles aria-hidden="true" className="mr-2 h-4 w-4" />
              Generate today
            </Button>
          </form>
        </div>
      </section>
    );
  }

  const duration = formatDuration(workout.targetDurationSeconds);

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Today</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            {workout.title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {workout.summary}
          </p>
        </div>

        <form action={generateTodayWorkoutAction}>
          <Button type="submit" variant="outline">
            <CalendarPlus aria-hidden="true" className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        </form>
      </div>

      <PageError message={resolvedSearchParams.error} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <Clock3
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
          <p className="mt-2 text-sm text-muted-foreground">Scheduled</p>
          <p className="font-medium">{formatDateTime(workout.scheduledFor)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <Dumbbell
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
          <p className="mt-2 text-sm text-muted-foreground">Type</p>
          <p className="font-medium">{workout.workoutType}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <Clock3
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
          <p className="mt-2 text-sm text-muted-foreground">Duration</p>
          <p className="font-medium">{duration ?? "Not set"}</p>
        </div>
      </div>

      {workout.warmup ? (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Warmup</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {workout.warmup}
          </p>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Exercises</h2>
        <div className="space-y-3">
          {workout.exercises.map((exercise) => (
            <article
              className="rounded-lg border border-border bg-card p-4 shadow-sm"
              key={exercise.id}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-medium">{exercise.nameSnapshot}</h3>
                {exercise.restSeconds ? (
                  <p className="text-sm text-muted-foreground">
                    Rest {Math.round(exercise.restSeconds / 60)} min
                  </p>
                ) : null}
              </div>
              {exercise.notes ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {exercise.notes}
                </p>
              ) : null}

              <div className="mt-3 divide-y divide-border rounded-md border border-border">
                {exercise.sets.map((set) => (
                  <div
                    className="grid grid-cols-[4rem_1fr] gap-3 px-3 py-2 text-sm"
                    key={set.id}
                  >
                    <span className="font-medium">
                      Set {set.orderIndex + 1}
                    </span>
                    <span className="text-muted-foreground">
                      {targetLine(set) || "Target not set"}
                    </span>
                    {set.notes ? (
                      <span className="col-span-2 text-xs leading-5 text-muted-foreground">
                        {set.notes}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold">Coach rationale</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {workout.rationale?.summary ??
            "No rationale was stored for this workout."}
        </p>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold">Coach notes</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Coach notes will refresh after completed workouts and plan updates.
        </p>
      </section>
    </section>
  );
}
