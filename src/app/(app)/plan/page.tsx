import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { generatePlanAction } from "@/features/planning/actions";
import { planningService } from "@/server/services";

interface PlanPageProps {
  searchParams?: Promise<{ error?: string }>;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
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
  const planResult = await planningService.getActivePlanWithWorkouts();
  const plan = planResult.ok ? planResult.data : null;

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
          <Button type="submit">
            <CalendarPlus aria-hidden="true" className="mr-2 h-4 w-4" />
            Generate plan
          </Button>
        </form>
      </section>
    );
  }

  const weeklyStructure = asStringArray(plan.weeklyStructure);
  const measurementReminders = asStringArray(plan.measurementReminders);

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
          <Button type="submit" variant="outline">
            <CalendarPlus aria-hidden="true" className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        </form>
      </div>

      <PlanError message={resolvedSearchParams.error} />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Weekly structure</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            {weeklyStructure.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Guidance</h2>
          <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <p>{plan.progressionGuidance}</p>
            <p>{plan.recoveryGuidance}</p>
          </div>
        </section>
      </div>

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
          <div className="grid gap-3">
            {plan.plannedWorkouts.map((workout) => (
              <article
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
                key={workout.id}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-medium">{workout.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(workout.scheduledFor)}
                  </p>
                </div>
                {workout.summary ? (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {workout.summary}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
