"use client";

import { SetStatus, WorkoutStatus } from "@prisma/client";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { kilogramsToPounds, roundTo } from "@/lib/units";

type WorkoutLogAction = (formData: FormData) => void | Promise<void>;

interface PlannedSetUi {
  id: string;
  notes: string | null;
  orderIndex: number;
  targetDistanceMeters: number | null;
  targetDurationSeconds: number | null;
  targetReps: number | null;
  targetRpe: number | null;
  targetWeightKg: number | null;
}

interface PlannedExerciseUi {
  id: string;
  formTip: string | null;
  nameSnapshot: string;
  notes: string | null;
  restSeconds: number | null;
  sets: PlannedSetUi[];
}

export interface WorkoutLogUi {
  exercises: PlannedExerciseUi[];
  id: string;
}

interface SetRowState {
  id: string;
  isAdded: boolean;
  isVisible: boolean;
  orderIndex: number;
  plannedSet?: PlannedSetUi;
  timed: boolean;
}

interface ExerciseState {
  extraSets: SetRowState[];
  setRows: SetRowState[];
}

interface ExtraExerciseState {
  id: string;
  sets: SetRowState[];
}

interface WorkoutLogFormProps {
  action: WorkoutLogAction;
  workout: WorkoutLogUi;
}

const fieldClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
const smallFieldClassName =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function fieldKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function poundsValue(weightKg: number | null) {
  return weightKg ? roundTo(kilogramsToPounds(weightKg), 1).toString() : "";
}

function setTarget(set: PlannedSetUi) {
  return [
    set.targetReps ? `${set.targetReps} reps` : null,
    set.targetWeightKg ? `${poundsValue(set.targetWeightKg)} lb` : null,
    set.targetDurationSeconds
      ? `${Math.round(set.targetDurationSeconds / 60)} min`
      : null,
    set.targetRpe ? `RPE ${Number(set.targetRpe).toFixed(1)}` : null
  ]
    .filter(Boolean)
    .join(" · ");
}

function createAddedSet(orderIndex: number): SetRowState {
  return {
    id: fieldKey("set"),
    isAdded: true,
    isVisible: true,
    orderIndex,
    timed: false
  };
}

function initialExerciseState(exercise: PlannedExerciseUi): ExerciseState {
  return {
    extraSets: [],
    setRows: exercise.sets.map((set) => ({
      id: set.id,
      isAdded: false,
      isVisible: true,
      orderIndex: set.orderIndex,
      plannedSet: set,
      timed: Boolean(set.targetDurationSeconds || set.targetDistanceMeters)
    }))
  };
}

function HiddenSkippedSet({
  exerciseId,
  row
}: {
  exerciseId: string;
  row: SetRowState;
}) {
  if (!row.plannedSet || row.isVisible) {
    return null;
  }

  return (
    <>
      <input
        name={`plannedWorkoutSetId:${exerciseId}`}
        type="hidden"
        value={row.plannedSet.id}
      />
      <input
        name={`setStatus:${row.plannedSet.id}`}
        type="hidden"
        value={SetStatus.SKIPPED}
      />
    </>
  );
}

function SetFields({
  exerciseId,
  onRemove,
  onTimedChange,
  row
}: {
  exerciseId?: string;
  onRemove: () => void;
  onTimedChange: (timed: boolean) => void;
  row: SetRowState;
}) {
  const key = row.id;
  const plannedSet = row.plannedSet;

  return (
    <div className="grid gap-3 px-3 py-3 text-sm">
      {exerciseId && plannedSet ? (
        <input
          name={`plannedWorkoutSetId:${exerciseId}`}
          type="hidden"
          value={plannedSet.id}
        />
      ) : exerciseId ? (
        <input name={`extraSetKey:${exerciseId}`} type="hidden" value={key} />
      ) : null}
      <input name={`setOrderIndex:${key}`} type="hidden" value={row.orderIndex} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-medium">Set {row.orderIndex + 1}</span>
          {plannedSet ? (
            <span className="ml-2 text-muted-foreground">
              {setTarget(plannedSet) || "Target not set"}
            </span>
          ) : null}
        </div>
        <Button onClick={onRemove} size="sm" type="button" variant="ghost">
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Remove
        </Button>
      </div>

      {plannedSet?.notes ? (
        <span className="text-xs leading-5 text-muted-foreground">
          {plannedSet.notes}
        </span>
      ) : null}

      <div className="grid gap-2 md:grid-cols-[7rem_repeat(3,minmax(0,1fr))_6rem]">
        <select
          className={smallFieldClassName}
          name={`setStatus:${key}`}
          defaultValue={SetStatus.COMPLETED}
        >
          <option value={SetStatus.COMPLETED}>Logged</option>
          <option value={SetStatus.SKIPPED}>Skipped</option>
        </select>
        <input
          className={smallFieldClassName}
          defaultValue={plannedSet?.targetReps ?? ""}
          min="0"
          name={`actualReps:${key}`}
          placeholder="Reps"
          type="number"
        />
        <input
          className={smallFieldClassName}
          defaultValue={poundsValue(plannedSet?.targetWeightKg ?? null)}
          min="0"
          name={`actualWeightLb:${key}`}
          placeholder="lb"
          step="0.5"
          type="number"
        />
        <input
          className={smallFieldClassName}
          defaultValue={
            plannedSet?.targetRpe ? Number(plannedSet.targetRpe).toFixed(1) : ""
          }
          min="0"
          name={`actualRpe:${key}`}
          placeholder="RPE"
          step="0.5"
          type="number"
        />
        <label className="flex h-11 items-center gap-2 rounded-md border border-border px-3 text-xs">
          <input name={`painFlag:${key}`} type="checkbox" />
          Pain
        </label>
      </div>

      {row.isAdded ? (
        <label className="flex w-fit items-center gap-2 rounded-md border border-border px-3 py-2 text-xs">
          <input
            checked={row.timed}
            onChange={(event) => onTimedChange(event.target.checked)}
            type="checkbox"
          />
          Timed
        </label>
      ) : null}

      {row.timed ? (
        <input
          className={smallFieldClassName}
          defaultValue={
            plannedSet?.targetDurationSeconds
              ? Math.round(plannedSet.targetDurationSeconds)
              : ""
          }
          min="0"
          name={`actualDurationSeconds:${key}`}
          placeholder="Seconds"
          type="number"
        />
      ) : null}

      <input
        className={smallFieldClassName}
        name={`setNotes:${key}`}
        placeholder="Set notes"
        type="text"
      />
    </div>
  );
}

export function WorkoutLogForm({ action, workout }: WorkoutLogFormProps) {
  const initialState = useMemo(
    () =>
      Object.fromEntries(
        workout.exercises.map((exercise) => [
          exercise.id,
          initialExerciseState(exercise)
        ])
      ) as Record<string, ExerciseState>,
    [workout.exercises]
  );
  const [exerciseStates, setExerciseStates] = useState(initialState);
  const [extraExercises, setExtraExercises] = useState<ExtraExerciseState[]>([]);

  function updateExercise(
    exerciseId: string,
    updater: (state: ExerciseState) => ExerciseState
  ) {
    setExerciseStates((current) => ({
      ...current,
      [exerciseId]: updater(current[exerciseId])
    }));
  }

  function addExerciseSet(exerciseId: string) {
    updateExercise(exerciseId, (state) => ({
      ...state,
      extraSets: [
        ...state.extraSets,
        createAddedSet(state.setRows.length + state.extraSets.length)
      ]
    }));
  }

  function removeSet(exerciseId: string, rowId: string) {
    updateExercise(exerciseId, (state) => ({
      extraSets: state.extraSets.filter((row) => row.id !== rowId),
      setRows: state.setRows.map((row) =>
        row.id === rowId ? { ...row, isVisible: false } : row
      )
    }));
  }

  function updateSetTimed(exerciseId: string, rowId: string, timed: boolean) {
    updateExercise(exerciseId, (state) => ({
      ...state,
      extraSets: state.extraSets.map((row) =>
        row.id === rowId ? { ...row, timed } : row
      )
    }));
  }

  function addExtraExercise() {
    setExtraExercises((current) => [
      ...current,
      { id: fieldKey("exercise"), sets: [createAddedSet(0)] }
    ]);
  }

  function addExtraExerciseSet(exerciseId: string) {
    setExtraExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: [...exercise.sets, createAddedSet(exercise.sets.length)]
            }
          : exercise
      )
    );
  }

  function removeExtraExerciseSet(exerciseId: string, rowId: string) {
    setExtraExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.filter((row) => row.id !== rowId)
            }
          : exercise
      )
    );
  }

  function updateExtraSetTimed(
    exerciseId: string,
    rowId: string,
    timed: boolean
  ) {
    setExtraExercises((current) =>
      current.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((row) =>
                row.id === rowId ? { ...row, timed } : row
              )
            }
          : exercise
      )
    );
  }

  return (
    <form action={action} className="space-y-3" id="workout-log-form">
      <input name="plannedWorkoutId" type="hidden" value={workout.id} />
      <div className="space-y-3">
        {workout.exercises.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-4 text-sm leading-6 text-muted-foreground shadow-sm">
            No exercises were stored for this workout. Regenerate the workout
            before training.
          </div>
        ) : null}
        {workout.exercises.map((exercise) => {
          const state = exerciseStates[exercise.id];
          const visibleRows = [...state.setRows, ...state.extraSets].filter(
            (row) => row.isVisible
          );

          return (
            <article
              className="rounded-lg border border-border bg-card p-4 shadow-sm"
              key={exercise.id}
            >
              <input
                name="plannedWorkoutExerciseId"
                type="hidden"
                value={exercise.id}
              />
              {state.setRows.map((row) => (
                <HiddenSkippedSet
                  exerciseId={exercise.id}
                  key={row.id}
                  row={row}
                />
              ))}
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
              {exercise.formTip ? (
                <details className="mt-3 rounded-md border border-border px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-medium">
                    Form tips
                  </summary>
                  <p className="mt-2 leading-6 text-muted-foreground">
                    {exercise.formTip}
                  </p>
                </details>
              ) : null}

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="text-sm">
                  <span className="text-muted-foreground">
                    Substitute exercise
                  </span>
                  <input
                    className={`${fieldClassName} mt-1`}
                    name={`substitutionExerciseName:${exercise.id}`}
                    placeholder={exercise.nameSnapshot}
                    type="text"
                  />
                </label>
                <label className="text-sm md:col-span-2">
                  <span className="text-muted-foreground">
                    Substitution reason
                  </span>
                  <input
                    className={`${fieldClassName} mt-1`}
                    name={`substitutionReason:${exercise.id}`}
                    placeholder="Reason"
                    type="text"
                  />
                </label>
              </div>

              <div className="mt-3 divide-y divide-border rounded-md border border-border">
                {visibleRows.map((row) => (
                  <SetFields
                    exerciseId={exercise.id}
                    key={row.id}
                    onRemove={() => removeSet(exercise.id, row.id)}
                    onTimedChange={(timed) =>
                      updateSetTimed(exercise.id, row.id, timed)
                    }
                    row={row}
                  />
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => addExerciseSet(exercise.id)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add set
                </Button>
              </div>

              <label className="mt-3 block text-sm">
                <span className="text-muted-foreground">Exercise notes</span>
                <input
                  className={`${fieldClassName} mt-1`}
                  name={`exerciseNotes:${exercise.id}`}
                  type="text"
                />
              </label>
            </article>
          );
        })}
      </div>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Add exercise</h2>
          <Button onClick={addExtraExercise} size="sm" type="button" variant="outline">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add
          </Button>
        </div>
        {extraExercises.length > 0 ? (
          <div className="mt-3 space-y-3">
            {extraExercises.map((exercise) => (
              <article
                className="rounded-md border border-border p-3"
                key={exercise.id}
              >
                <input name="extraExerciseKey" type="hidden" value={exercise.id} />
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    className={fieldClassName}
                    name={`extraExerciseName:${exercise.id}`}
                    placeholder="Exercise name"
                    type="text"
                  />
                  <Button
                    onClick={() =>
                      setExtraExercises((current) =>
                        current.filter((item) => item.id !== exercise.id)
                      )
                    }
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
                <input
                  className={`${fieldClassName} mt-3`}
                  name={`extraExerciseNotes:${exercise.id}`}
                  placeholder="Exercise notes"
                  type="text"
                />
                <div className="mt-3 divide-y divide-border rounded-md border border-border">
                  {exercise.sets.map((row) => (
                    <div key={row.id}>
                      <input
                        name={`extraExerciseSetKey:${exercise.id}`}
                        type="hidden"
                        value={row.id}
                      />
                      <SetFields
                        onRemove={() =>
                          removeExtraExerciseSet(exercise.id, row.id)
                        }
                        onTimedChange={(timed) =>
                          updateExtraSetTimed(exercise.id, row.id, timed)
                        }
                        row={row}
                      />
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-3"
                  onClick={() => addExtraExerciseSet(exercise.id)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Add set
                </Button>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold">Finish workout</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="text-muted-foreground">Overall RPE</span>
            <input
              className={`${fieldClassName} mt-1`}
              min="0"
              name="overallRpe"
              step="0.5"
              type="number"
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="text-muted-foreground">Pain notes</span>
            <input
              className={`${fieldClassName} mt-1`}
              name="painNotes"
              type="text"
            />
          </label>
          <label className="text-sm md:col-span-3">
            <span className="text-muted-foreground">Workout notes</span>
            <input
              className={`${fieldClassName} mt-1`}
              name="userNotes"
              type="text"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <SubmitButton
            name="completionStatus"
            pendingLabel="Saving"
            value={WorkoutStatus.COMPLETED}
          >
            <Check aria-hidden="true" className="h-4 w-4" />
            Complete
          </SubmitButton>
          <SubmitButton
            name="completionStatus"
            pendingLabel="Saving"
            value={WorkoutStatus.PARTIAL}
            variant="outline"
          >
            <Minus aria-hidden="true" className="h-4 w-4" />
            Save partial
          </SubmitButton>
        </div>
      </section>
    </form>
  );
}
