import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-4 py-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Onboarding</p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Exercise setup
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Phase 1 provides the route shell. Profile, goals, equipment, and
          available loads are implemented in the onboarding phase.
        </p>
      </div>
      <Button variant="outline" asChild>
        <a href="/today">Back to Today</a>
      </Button>
    </main>
  );
}
