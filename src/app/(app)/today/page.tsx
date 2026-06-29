import { JobStatus, JobType, WorkoutStatus, type Job } from "@prisma/client";
import {
  AlertCircle,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock3,
  Dumbbell,
  LoaderCircle,
  Minus,
  Play,
  Sparkles
} from "lucide-react";

import { SubmitButton } from "@/components/ui/submit-button";
import { CoachChat, type CoachChatActionUi } from "@/features/coach/coach-chat";
import { generateTodayWorkoutAction } from "@/features/planning/actions";
import {
  completeWorkoutAction,
  skipWorkoutAction,
  startWorkoutAction
} from "@/features/workouts/actions";
import { formatPoundsFromKilograms } from "@/lib/units";
import { coachService, jobService, workoutService } from "@/server/services";

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

function fieldClassName() {
  return "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
}

function smallFieldClassName() {
  return "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
}

function statusLabel(status: WorkoutStatus) {
  switch (status) {
    case WorkoutStatus.IN_PROGRESS:
      return "In progress";
    case WorkoutStatus.COMPLETED:
      return "Completed";
    case WorkoutStatus.PARTIAL:
      return "Partially completed";
    case WorkoutStatus.SKIPPED:
      return "Skipped";
    default:
      return "Planned";
  }
}

function jobStatusLabel(status?: JobStatus) {
  switch (status) {
    case JobStatus.PENDING:
      return "Pending";
    case JobStatus.RUNNING:
      return "Running";
    case JobStatus.SUCCEEDED:
      return "Complete";
    case JobStatus.FAILED:
      return "Failed";
    case JobStatus.CANCELLED:
      return "Cancelled";
    default:
      return "Not started";
  }
}

function jobStatusTone(status?: JobStatus) {
  if (status === JobStatus.SUCCEEDED) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === JobStatus.FAILED || status === JobStatus.CANCELLED) {
    return "border-destructive/40 bg-destructive/10 text-destructive";
  }

  return "border-border bg-muted text-muted-foreground";
}

function JobStatusIcon({ status }: { status?: JobStatus }) {
  if (status === JobStatus.SUCCEEDED) {
    return <CheckCircle2 aria-hidden="true" className="h-4 w-4" />;
  }

  if (status === JobStatus.FAILED || status === JobStatus.CANCELLED) {
    return <AlertCircle aria-hidden="true" className="h-4 w-4" />;
  }

  return <LoaderCircle aria-hidden="true" className="h-4 w-4" />;
}

function jobInput(job: Job) {
  return job.inputSnapshot && typeof job.inputSnapshot === "object"
    ? (job.inputSnapshot as Record<string, unknown>)
    : {};
}

function latestRelatedJob(
  jobs: Job[],
  type: JobType,
  plannedWorkoutId: string
) {
  return jobs.find((job) => {
    const input = jobInput(job);

    return job.type === type && input.plannedWorkoutId === plannedWorkoutId;
  });
}

function chatActionUi(actions: CoachChatActionUi[]): CoachChatActionUi[] {
  return actions.map((action) => ({
    description: action.description,
    id: action.id,
    status: action.status,
    statusLabel: action.statusLabel,
    type: action.type
  }));
}

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [workoutResult, chatActionsResult] = await Promise.all([
    workoutService.getTodayWorkoutWithDetails(),
    coachService.listRecentChatActions()
  ]);
  const workout = workoutResult.ok ? workoutResult.data : null;
  const initialChatActions = chatActionsResult.ok
    ? chatActionUi(chatActionsResult.data)
    : [];

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
            <SubmitButton className="mt-4" pendingLabel="Generating">
              <Sparkles aria-hidden="true" className="mr-2 h-4 w-4" />
              Generate today
            </SubmitButton>
          </form>
        </div>

        <CoachChat initialActions={initialChatActions} />
      </section>
    );
  }

  const duration = formatDuration(workout.targetDurationSeconds);
  const canStart = workout.status === WorkoutStatus.PLANNED;
  const canLog = workout.status === WorkoutStatus.IN_PROGRESS;
  const finishedStatuses: WorkoutStatus[] = [
    WorkoutStatus.COMPLETED,
    WorkoutStatus.PARTIAL,
    WorkoutStatus.SKIPPED
  ];
  const activeLoggingStatuses: WorkoutStatus[] = [
    WorkoutStatus.PLANNED,
    WorkoutStatus.IN_PROGRESS
  ];
  const isFinished = finishedStatuses.includes(workout.status);
  const jobsResult = isFinished ? await jobService.listRecentJobs() : null;
  const relatedJobs = jobsResult?.ok ? jobsResult.data : [];
  const feedbackJob = latestRelatedJob(
    relatedJobs,
    JobType.POST_WORKOUT_FEEDBACK,
    workout.id
  );
  const nextWorkoutJob = latestRelatedJob(
    relatedJobs,
    JobType.NEXT_WORKOUT_GENERATION,
    workout.id
  );
  const coachNoteJob = latestRelatedJob(
    relatedJobs,
    JobType.COACH_NOTE_REFRESH,
    workout.id
  );
  const completedLog = workout.completedWorkouts.find((log) =>
    finishedStatuses.includes(log.status)
  );
  const coachFeedback = completedLog?.coachFeedback;
  const followUpStatusItems = [
    { job: feedbackJob, label: "Feedback" },
    { job: nextWorkoutJob, label: "Next workout" },
    { job: coachNoteJob, label: "Coach notes" }
  ];

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
          <span className="inline-flex rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {statusLabel(workout.status)}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {canStart ? (
            <form action={startWorkoutAction}>
              <input name="plannedWorkoutId" type="hidden" value={workout.id} />
              <SubmitButton pendingLabel="Starting">
                <Play aria-hidden="true" className="h-4 w-4" />
                Start
              </SubmitButton>
            </form>
          ) : null}

          {canStart ? (
            <form action={generateTodayWorkoutAction}>
              <SubmitButton pendingLabel="Regenerating" variant="outline">
                <CalendarPlus aria-hidden="true" className="h-4 w-4" />
                Regenerate
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      <PageError message={resolvedSearchParams.error} />

      <CoachChat
        initialActions={initialChatActions}
        plannedWorkoutId={workout.id}
      />

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

      {canLog ? (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Quick controls</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_12rem]">
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["AS_PLANNED", "As planned"],
                ["REDUCED", "Reduce"],
                ["INCREASED", "Increase"]
              ].map(([value, label]) => (
                <label
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
                  key={value}
                >
                  <input
                    defaultChecked={value === "AS_PLANNED"}
                    form="workout-log-form"
                    name="intensityAdjustment"
                    type="radio"
                    value={value}
                  />
                  {label}
                </label>
              ))}
            </div>
            <label className="text-sm">
              <span className="text-muted-foreground">Minutes adjusted</span>
              <input
                className={`${fieldClassName()} mt-1`}
                form="workout-log-form"
                name="durationAdjustmentMinutes"
                placeholder="0"
                type="number"
              />
            </label>
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-base font-semibold">
          {canLog ? "Log exercises" : "Exercises"}
        </h2>
        <form
          action={completeWorkoutAction}
          className="space-y-3"
          id="workout-log-form"
        >
          <input name="plannedWorkoutId" type="hidden" value={workout.id} />
          <div className="space-y-3">
            {workout.exercises.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-4 text-sm leading-6 text-muted-foreground shadow-sm">
                No exercises were stored for this workout. Regenerate the
                workout before training.
              </div>
            ) : null}
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

                {canLog ? (
                  <input
                    name="plannedWorkoutExerciseId"
                    type="hidden"
                    value={exercise.id}
                  />
                ) : null}

                {canLog ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <label className="text-sm">
                      <span className="text-muted-foreground">
                        Substitute exercise
                      </span>
                      <input
                        className={`${fieldClassName()} mt-1`}
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
                        className={`${fieldClassName()} mt-1`}
                        name={`substitutionReason:${exercise.id}`}
                        placeholder="Reason"
                        type="text"
                      />
                    </label>
                  </div>
                ) : null}

                <div className="mt-3 divide-y divide-border rounded-md border border-border">
                  {exercise.sets.map((set) => (
                    <div className="grid gap-3 px-3 py-3 text-sm" key={set.id}>
                      <div className="grid gap-2 md:grid-cols-[4rem_1fr] md:items-center">
                        <span className="font-medium">
                          Set {set.orderIndex + 1}
                        </span>
                        <span className="text-muted-foreground">
                          {targetLine(set) || "Target not set"}
                        </span>
                      </div>
                      {set.notes ? (
                        <span className="text-xs leading-5 text-muted-foreground">
                          {set.notes}
                        </span>
                      ) : null}
                      {canLog ? (
                        <div className="grid gap-2 md:grid-cols-[7rem_repeat(4,minmax(0,1fr))_6rem]">
                          <input
                            name={`plannedWorkoutSetId:${exercise.id}`}
                            type="hidden"
                            value={set.id}
                          />
                          <select
                            className={smallFieldClassName()}
                            name={`setStatus:${set.id}`}
                          >
                            <option value="COMPLETED">Logged</option>
                            <option value="SKIPPED">Skipped</option>
                          </select>
                          <input
                            className={smallFieldClassName()}
                            defaultValue={set.targetReps ?? ""}
                            min="0"
                            name={`actualReps:${set.id}`}
                            placeholder="Reps"
                            type="number"
                          />
                          <input
                            className={smallFieldClassName()}
                            defaultValue={
                              set.targetWeightKg
                                ? Number(set.targetWeightKg).toFixed(1)
                                : ""
                            }
                            min="0"
                            name={`actualWeightKg:${set.id}`}
                            placeholder="Kg"
                            step="0.1"
                            type="number"
                          />
                          <input
                            className={smallFieldClassName()}
                            defaultValue={
                              set.targetDurationSeconds
                                ? Math.round(set.targetDurationSeconds)
                                : ""
                            }
                            min="0"
                            name={`actualDurationSeconds:${set.id}`}
                            placeholder="Sec"
                            type="number"
                          />
                          <input
                            className={smallFieldClassName()}
                            defaultValue={
                              set.targetRpe
                                ? Number(set.targetRpe).toFixed(1)
                                : ""
                            }
                            min="0"
                            name={`actualRpe:${set.id}`}
                            placeholder="RPE"
                            step="0.5"
                            type="number"
                          />
                          <label className="flex h-11 items-center gap-2 rounded-md border border-border px-3 text-xs">
                            <input
                              name={`painFlag:${set.id}`}
                              type="checkbox"
                            />
                            Pain
                          </label>
                          <input
                            className={`${smallFieldClassName()} md:col-span-6`}
                            name={`setNotes:${set.id}`}
                            placeholder="Set notes"
                            type="text"
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {canLog ? (
                  <label className="mt-3 block text-sm">
                    <span className="text-muted-foreground">
                      Exercise notes
                    </span>
                    <input
                      className={`${fieldClassName()} mt-1`}
                      name={`exerciseNotes:${exercise.id}`}
                      type="text"
                    />
                  </label>
                ) : null}
              </article>
            ))}
          </div>
          {canLog ? (
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="text-base font-semibold">Finish workout</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="text-sm">
                  <span className="text-muted-foreground">Overall RPE</span>
                  <input
                    className={`${fieldClassName()} mt-1`}
                    min="0"
                    name="overallRpe"
                    step="0.5"
                    type="number"
                  />
                </label>
                <label className="text-sm md:col-span-2">
                  <span className="text-muted-foreground">Pain notes</span>
                  <input
                    className={`${fieldClassName()} mt-1`}
                    name="painNotes"
                    type="text"
                  />
                </label>
                <label className="text-sm md:col-span-3">
                  <span className="text-muted-foreground">Workout notes</span>
                  <input
                    className={`${fieldClassName()} mt-1`}
                    name="userNotes"
                    type="text"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <SubmitButton
                  name="completionStatus"
                  pendingLabel="Saving"
                  value="COMPLETED"
                >
                  <Check aria-hidden="true" className="h-4 w-4" />
                  Complete
                </SubmitButton>
                <SubmitButton
                  name="completionStatus"
                  pendingLabel="Saving"
                  value="PARTIAL"
                  variant="outline"
                >
                  <Minus aria-hidden="true" className="h-4 w-4" />
                  Save partial
                </SubmitButton>
              </div>
            </section>
          ) : null}
        </form>
      </section>

      {activeLoggingStatuses.includes(workout.status) ? (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Skip workout</h2>
          <form action={skipWorkoutAction} className="mt-3 grid gap-3">
            <input name="plannedWorkoutId" type="hidden" value={workout.id} />
            <input
              className={fieldClassName()}
              name="skipReason"
              placeholder="Reason"
              type="text"
            />
            <input
              className={fieldClassName()}
              name="userNotes"
              placeholder="Notes"
              type="text"
            />
            <SubmitButton
              className="w-fit"
              pendingLabel="Skipping"
              variant="outline"
            >
              Skip
            </SubmitButton>
          </form>
        </section>
      ) : null}

      {isFinished ? (
        <>
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="text-base font-semibold">Workout logged</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This session is stored as{" "}
              {statusLabel(workout.status).toLowerCase()}. Planned targets
              remain linked to the actual log for review.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <h2 className="text-base font-semibold">Adaptation status</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {followUpStatusItems.map(({ job, label }) => (
                <div
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${jobStatusTone(
                    job?.status
                  )}`}
                  key={label}
                >
                  <JobStatusIcon status={job?.status} />
                  <span className="font-medium">{label}</span>
                  <span className="ml-auto">{jobStatusLabel(job?.status)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h2 className="text-base font-semibold">Coach rationale</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {workout.rationale?.summary ??
            "No rationale was stored for this workout."}
        </p>
      </section>

      {isFinished ? (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Coach feedback</h2>
          {coachFeedback ? (
            <div className="mt-2 space-y-3 text-sm leading-6 text-muted-foreground">
              {coachFeedback.body.split("\n\n").map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Feedback will appear here after the worker finishes.
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <h2 className="text-base font-semibold">Coach notes</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Coach notes refresh after completed workouts and plan updates.
          </p>
        </section>
      )}
    </section>
  );
}
