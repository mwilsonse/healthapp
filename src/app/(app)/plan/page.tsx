import {
  CalendarCheck2,
  CalendarPlus,
  Check,
  History,
  Undo2
} from "lucide-react";

import { SubmitButton } from "@/components/ui/submit-button";
import {
  decidePlanEditCommitmentAction,
  generatePlanAction
} from "@/features/planning/actions";
import { planningService } from "@/server/services";

export const dynamic = "force-dynamic";

interface PlanPageProps {
  searchParams?: Promise<{ error?: string }>;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short"
  }).format(date);
}

function statusLabel(status: string) {
  return status.toLowerCase().replaceAll("_", " ");
}

function weekNumber(planStart: Date, scheduledFor: Date) {
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = scheduledFor.getTime() - planStart.getTime();

  return Math.max(1, Math.floor(diff / (7 * dayMs)) + 1);
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function PlanError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

export default async function PlanPage({ searchParams }: PlanPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [planResult, pendingEditsResult] = await Promise.all([
    planningService.getActivePlanWithWorkouts(),
    planningService.listPendingPlanEditDecisions()
  ]);
  const plan = planResult.ok ? planResult.data : null;
  const pendingEdits = pendingEditsResult.ok ? pendingEditsResult.data : [];

  if (!plan) {
    return (
      <section className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Plan</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            No active plan yet
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Generate the first two-week training block from your profile, goals,
            equipment, constraints, and exercise library.
          </p>
        </div>

        <PlanError message={resolvedSearchParams.error} />

        <form action={generatePlanAction}>
          <SubmitButton pendingLabel="Generating">
            <CalendarPlus aria-hidden="true" className="mr-2 h-4 w-4" />
            Generate plan
          </SubmitButton>
        </form>
      </section>
    );
  }

  const weeklyStructure = asStringArray(plan.weeklyStructure);
  const measurementReminders = asStringArray(plan.measurementReminders);
  const workoutsByWeek = new Map<number, typeof plan.plannedWorkouts>();

  for (const workout of plan.plannedWorkouts) {
    const week = weekNumber(plan.startDate, workout.scheduledFor);
    workoutsByWeek.set(week, [...(workoutsByWeek.get(week) ?? []), workout]);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Plan</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            {plan.title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {formatDate(plan.startDate)} to {formatDate(plan.endDate)}
            {plan.summary ? ` · ${plan.summary}` : ""}
          </p>
        </div>

        <form action={generatePlanAction}>
          <SubmitButton pendingLabel="Regenerating" variant="outline">
            <CalendarPlus aria-hidden="true" className="mr-2 h-4 w-4" />
            Regenerate
          </SubmitButton>
        </form>
      </div>

      <PlanError message={resolvedSearchParams.error} />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Weekly structure</h2>
          {weeklyStructure.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {weeklyStructure.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              No weekly structure was stored with this plan.
            </p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Guidance and rationale</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            {plan.rationale?.summary ? <p>{plan.rationale.summary}</p> : null}
            {plan.progressionGuidance ? (
              <p>{plan.progressionGuidance}</p>
            ) : null}
            {plan.recoveryGuidance ? <p>{plan.recoveryGuidance}</p> : null}
            {!plan.rationale?.summary &&
            !plan.progressionGuidance &&
            !plan.recoveryGuidance ? (
              <p>No guidance was stored with this plan.</p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarCheck2
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
          />
          <h2 className="text-base font-semibold">Committed changes</h2>
        </div>
        {plan.editCommitments.length > 0 ? (
          <ul className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            {plan.editCommitments.map((edit) => (
              <li className="rounded-md border border-border p-3" key={edit.id}>
                <div className="font-medium text-foreground">{edit.title}</div>
                <div>{edit.changeSummary}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            No workout edits have been committed to future planning yet.
          </p>
        )}
      </section>

      {pendingEdits.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <History
              aria-hidden="true"
              className="h-4 w-4 text-muted-foreground"
            />
            <h2 className="text-base font-semibold">Plan edit decisions</h2>
          </div>
          <div className="mt-3 space-y-3">
            {pendingEdits.map((edit) => (
              <article
                className="rounded-md border border-border p-3"
                key={edit.completedWorkoutId}
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">{edit.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {edit.changeSummary}
                  </p>
                </div>
                <form
                  action={decidePlanEditCommitmentAction}
                  className="mt-3 flex flex-wrap gap-2"
                >
                  <input
                    name="completedWorkoutId"
                    type="hidden"
                    value={edit.completedWorkoutId}
                  />
                  <SubmitButton
                    name="decision"
                    pendingLabel="Saving"
                    value="commit"
                  >
                    <Check aria-hidden="true" className="h-4 w-4" />
                    Commit to plan
                  </SubmitButton>
                  <SubmitButton
                    name="decision"
                    pendingLabel="Saving"
                    value="one-off"
                    variant="outline"
                  >
                    <Undo2 aria-hidden="true" className="h-4 w-4" />
                    Keep one-off
                  </SubmitButton>
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {measurementReminders.length > 0 ? (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Measurement reminders</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            {measurementReminders.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Planned workouts</h2>
        {plan.plannedWorkouts.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Today&apos;s workout has not been generated yet.
          </p>
        ) : (
          <div className="space-y-5">
            {[...workoutsByWeek.entries()].map(([week, workouts]) => (
              <div className="space-y-3" key={week}>
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Week {week}
                </h3>
                <div className="grid gap-3">
                  {workouts.map((workout) => (
                    <article
                      className="rounded-lg border border-border bg-card p-4 shadow-sm"
                      key={workout.id}
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h4 className="font-medium">{workout.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatWeekday(workout.scheduledFor)},{" "}
                          {formatDate(workout.scheduledFor)}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-md border border-border bg-muted px-2 py-1 font-medium text-muted-foreground">
                          {statusLabel(workout.status)}
                        </span>
                        <span className="rounded-md border border-border bg-muted px-2 py-1 font-medium text-muted-foreground">
                          {workout.workoutType}
                        </span>
                      </div>
                      {workout.summary ? (
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {workout.summary}
                        </p>
                      ) : null}
                      {workout.rationale?.summary ? (
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {workout.rationale.summary}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
