import { Button } from "@/components/ui/button";

export default function TodayPage() {
  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Today</p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Workout pending
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Phase 1 establishes the app shell. Workout generation begins in a
          later phase.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-base font-semibold">Next setup step</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Complete onboarding before the first two-week plan is generated.
          </p>
        </div>
        <Button className="mt-4" asChild>
          <a href="/onboarding">Start onboarding</a>
        </Button>
      </div>
    </section>
  );
}
