import {
  equipmentService,
  exerciseService,
  exportService,
  goalService,
  profileService
} from "@/server/services";

export const dynamic = "force-dynamic";

function Section({
  children,
  title
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-muted-foreground">{children}</p>;
}

export default async function ProfilePage() {
  const [profile, measurements, goals, equipment, preferences, summary] =
    await Promise.all([
      profileService.getProfile(),
      profileService.listMeasurements(),
      goalService.listGoals(),
      equipmentService.listEquipment(),
      exerciseService.listExercisePreferences(),
      exportService.getExportSummary()
    ]);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Profile</p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Health setup
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Review the data currently available for planning.
        </p>
      </section>

      <Section title="Profile">
        {profile.ok && profile.data ? (
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Height</dt>
              <dd>{profile.data.heightCm?.toString() ?? "Not set"} cm</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Current weight</dt>
              <dd>{profile.data.currentWeightKg?.toString() ?? "Not set"} kg</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Resting HR</dt>
              <dd>{profile.data.restingHeartRateBpm ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Constraints</dt>
              <dd>{profile.data.generalConstraints ?? "None recorded"}</dd>
            </div>
          </dl>
        ) : (
          <Empty>No profile data saved yet.</Empty>
        )}
        <a className="text-sm font-medium text-primary" href="/onboarding">
          Edit onboarding data
        </a>
      </Section>

      <Section title="Goals">
        {goals.ok && goals.data.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {goals.data.map((goal) => (
              <li key={goal.id} className="rounded-md border border-border p-3">
                <div className="font-medium">{goal.title}</div>
                <div className="text-muted-foreground">
                  {goal.priority.toLowerCase()} priority
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No goals saved yet.</Empty>
        )}
      </Section>

      <Section title="Equipment">
        {equipment.ok && equipment.data.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {equipment.data.map((item) => (
              <li key={item.id} className="rounded-md border border-border p-3">
                <div className="font-medium">{item.name}</div>
                <div className="text-muted-foreground">
                  {item.type.toLowerCase().replaceAll("_", " ")} ·{" "}
                  {item.availableLoads.length} loads
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No equipment saved yet.</Empty>
        )}
      </Section>

      <Section title="Measurements and preferences">
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Measurements</span>
            <span>{measurements.ok ? measurements.data.length : 0}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Exercise preferences</span>
            <span>{preferences.ok ? preferences.data.length : 0}</span>
          </div>
        </div>
      </Section>

      <Section title="Data summary">
        {summary.ok ? (
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(summary.data.counts, null, 2)}
          </pre>
        ) : (
          <Empty>Summary unavailable.</Empty>
        )}
      </Section>
    </div>
  );
}
