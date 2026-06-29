import {
  EquipmentType,
  ExercisePreferenceValue,
  GoalPriority
} from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  createAvailableLoadAction,
  createEquipmentAction,
  createGoalAction,
  createMeasurementAction,
  setExercisePreferenceAction,
  upsertProfileAction
} from "@/features/onboarding/actions";
import {
  equipmentService,
  exerciseService,
  goalService,
  profileService
} from "@/server/services";

export const dynamic = "force-dynamic";

function Field({
  label,
  name,
  placeholder,
  type = "text"
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      <input
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        name={name}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  placeholder
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      <textarea
        className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        name={name}
        placeholder={placeholder}
      />
    </label>
  );
}

function Panel({
  children,
  title
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function OnboardingPage() {
  const [profile, measurements, goals, equipment, exercises, preferences] =
    await Promise.all([
      profileService.getProfile(),
      profileService.listMeasurements(),
      goalService.listGoals(),
      equipmentService.listEquipment(),
      exerciseService.listExercises(),
      exerciseService.listExercisePreferences()
    ]);

  const equipmentItems = equipment.ok ? equipment.data : [];
  const exerciseItems = exercises.ok ? exercises.data.slice(0, 12) : [];
  const preferenceItems = preferences.ok ? preferences.data : [];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 px-4 py-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Onboarding</p>
        <h1 className="text-3xl font-semibold tracking-normal">
          Exercise setup
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Enter the minimum data needed for the first generated training block.
        </p>
      </div>

      <Panel title="Profile and constraints">
        <form action={upsertProfileAction} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Birth date" name="birthDate" type="date" />
            <Field label="Sex" name="sex" placeholder="Optional" />
            <Field label="Height (cm)" name="heightCm" type="number" />
            <Field label="Weight (kg)" name="currentWeightKg" type="number" />
            <Field
              label="Resting heart rate"
              name="restingHeartRateBpm"
              type="number"
            />
          </div>
          <TextArea
            label="Constraints or injuries"
            name="generalConstraints"
            placeholder="Movements to avoid, pain signals, limitations"
          />
          <TextArea
            label="Preferred training times"
            name="preferredTrainingNotes"
            placeholder="Example: mornings on weekdays, flexible weekends"
          />
          <TextArea
            label="Sleep baseline"
            name="sleepBaselineNotes"
            placeholder="Optional"
          />
          <TextArea
            label="Nutrition notes"
            name="nutritionNotes"
            placeholder="Optional"
          />
          <Button type="submit">Save profile</Button>
        </form>
        {profile.ok && profile.data ? (
          <p className="text-sm text-muted-foreground">Profile is saved.</p>
        ) : null}
      </Panel>

      <Panel title="Baseline measurement">
        <form action={createMeasurementAction} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Measured at" name="measuredAt" type="date" />
            <Field label="Weight (kg)" name="weightKg" type="number" />
            <Field label="Body fat %" name="bodyFatPercent" type="number" />
            <Field label="Chest (cm)" name="chestCm" type="number" />
            <Field label="Waist (cm)" name="waistCm" type="number" />
            <Field label="Stomach (cm)" name="stomachCm" type="number" />
            <Field label="Hips (cm)" name="hipsCm" type="number" />
            <Field label="Pantline (cm)" name="pantlineCm" type="number" />
            <Field label="Neck (cm)" name="neckCm" type="number" />
            <Field label="Arm (cm)" name="armCm" type="number" />
            <Field label="Thigh (cm)" name="thighCm" type="number" />
          </div>
          <TextArea label="Measurement notes" name="notes" />
          <Button type="submit">Save measurement</Button>
        </form>
        {measurements.ok && measurements.data.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {measurements.data.length} measurement record saved.
          </p>
        ) : null}
      </Panel>

      <Panel title="Goals">
        <form action={createGoalAction} className="grid gap-3">
          <Field label="Goal title" name="title" placeholder="Build strength" />
          <TextArea label="Description" name="description" />
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm font-medium">
              <span>Priority</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                name="priority"
              >
                {Object.values(GoalPriority).map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Target date" name="targetDate" type="date" />
          </div>
          <TextArea label="Goal notes" name="notes" />
          <Button type="submit">Save goal</Button>
        </form>
        {goals.ok && goals.data.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {goals.data.length} goal saved.
          </p>
        ) : null}
      </Panel>

      <Panel title="Equipment">
        <form action={createEquipmentAction} className="grid gap-3">
          <Field label="Equipment name" name="name" placeholder="Adjustable dumbbells" />
          <label className="grid gap-1 text-sm font-medium">
            <span>Type</span>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              name="type"
            >
              {Object.values(EquipmentType).map((type) => (
                <option key={type} value={type}>
                  {type.toLowerCase().replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <TextArea label="Description" name="description" />
          <TextArea label="Notes" name="notes" />
          <Button type="submit">Save equipment</Button>
        </form>

        <form action={createAvailableLoadAction} className="grid gap-3 border-t border-border pt-4">
          <label className="grid gap-1 text-sm font-medium">
            <span>Equipment</span>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              name="equipmentId"
            >
              {equipmentItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Load (kg)" name="loadKg" type="number" />
            <Field label="Quantity" name="quantity" type="number" />
            <Field label="Label" name="label" placeholder="50 lb pair" />
            <label className="flex items-center gap-2 pt-7 text-sm font-medium">
              <input name="isPair" type="checkbox" />
              Pair
            </label>
          </div>
          <Button disabled={equipmentItems.length === 0} type="submit">
            Save available load
          </Button>
        </form>
      </Panel>

      <Panel title="Exercise preferences">
        <form action={setExercisePreferenceAction} className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium">
            <span>Exercise</span>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              name="exerciseId"
            >
              {exerciseItems.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            <span>Preference</span>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              name="preference"
            >
              {Object.values(ExercisePreferenceValue).map((preference) => (
                <option key={preference} value={preference}>
                  {preference.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <TextArea label="Reason" name="reason" />
          <Button disabled={exerciseItems.length === 0} type="submit">
            Save preference
          </Button>
        </form>
        {preferenceItems.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            {preferenceItems.length} exercise preference saved.
          </p>
        ) : null}
      </Panel>

      <Button variant="outline" asChild>
        <a href="/profile">Review profile</a>
      </Button>
    </main>
  );
}
