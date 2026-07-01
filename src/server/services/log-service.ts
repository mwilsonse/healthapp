import {
  SetStatus,
  WorkoutStatus,
  type CompletedExerciseSet,
  type CompletedWorkout,
  type CompletedWorkoutExercise,
  type Exercise,
  type Goal,
  type PlannedWorkout,
  type PlannedWorkoutSet,
  type PrismaClient,
  type TrainingPlan
} from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import { success, type ServiceResult } from "@/server/services/service-result";

export type WorkoutLogWithDetails = CompletedWorkout & {
  exercises: Array<
    CompletedWorkoutExercise & {
      exercise: Exercise;
      sets: Array<
        CompletedExerciseSet & {
          plannedWorkoutSet: PlannedWorkoutSet | null;
        }
      >;
    }
  >;
  plannedWorkout:
    | (PlannedWorkout & {
        trainingPlan: TrainingPlan;
      })
    | null;
};

export interface ExerciseTrend {
  completedSets: number;
  exerciseId: string;
  exerciseName: string;
  latestReps: number | null;
  latestWeightKg: number | null;
  loadChangeKg: number | null;
  previousWeightKg: number | null;
  sessions: number;
}

export interface LogInsight {
  body: string;
  category:
    | "consistency"
    | "goal_alignment"
    | "load_progression"
    | "missed_or_modified";
  title: string;
}

function numberValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function workoutFinishedAt(workout: WorkoutLogWithDetails) {
  return workout.completedAt ?? workout.startedAt;
}

function activeGoalTitles(goals: Goal[]) {
  return goals.map((goal) => goal.title).join(", ");
}

export function buildExerciseTrends(workouts: WorkoutLogWithDetails[]) {
  const exerciseMap = new Map<
    string,
    {
      completedSets: number;
      exerciseName: string;
      observations: Array<{
        date: Date;
        reps: number | null;
        weightKg: number | null;
        workoutId: string;
      }>;
    }
  >();

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const current = exerciseMap.get(exercise.exerciseId) ?? {
        completedSets: 0,
        exerciseName: exercise.nameSnapshot,
        observations: []
      };

      for (const set of exercise.sets) {
        if (set.status !== SetStatus.COMPLETED) {
          continue;
        }

        current.completedSets += 1;
        current.observations.push({
          date: workoutFinishedAt(workout),
          reps: set.actualReps,
          weightKg: numberValue(set.actualWeightKg),
          workoutId: workout.id
        });
      }

      exerciseMap.set(exercise.exerciseId, current);
    }
  }

  return [...exerciseMap.entries()]
    .map(([exerciseId, trend]) => {
      const observations = trend.observations.sort(
        (left, right) => left.date.getTime() - right.date.getTime()
      );
      const weighted = observations.filter(
        (observation) => observation.weightKg !== null
      );
      const firstWeighted = weighted[0];
      const latestWeighted = weighted[weighted.length - 1];
      const sessionIds = new Set(observations.map((item) => item.workoutId));
      const hasMultipleWeightedSessions =
        new Set(weighted.map((item) => item.workoutId)).size > 1;

      return {
        completedSets: trend.completedSets,
        exerciseId,
        exerciseName: trend.exerciseName,
        latestReps: observations[observations.length - 1]?.reps ?? null,
        latestWeightKg: latestWeighted?.weightKg ?? null,
        loadChangeKg:
          hasMultipleWeightedSessions && firstWeighted && latestWeighted
            ? Number(
                (latestWeighted.weightKg! - firstWeighted.weightKg!).toFixed(3)
              )
            : null,
        previousWeightKg: firstWeighted?.weightKg ?? null,
        sessions: sessionIds.size
      } satisfies ExerciseTrend;
    })
    .sort((left, right) => {
      if (right.sessions !== left.sessions) {
        return right.sessions - left.sessions;
      }

      return right.completedSets - left.completedSets;
    });
}

function buildInsights(
  workouts: WorkoutLogWithDetails[],
  trends: ExerciseTrend[],
  goals: Goal[]
) {
  const insights: LogInsight[] = [];
  const finishedStatuses: WorkoutStatus[] = [
    WorkoutStatus.COMPLETED,
    WorkoutStatus.PARTIAL,
    WorkoutStatus.SKIPPED
  ];
  const completedOrPartialStatuses: WorkoutStatus[] = [
    WorkoutStatus.COMPLETED,
    WorkoutStatus.PARTIAL
  ];
  const finishedWorkouts = workouts.filter((workout) =>
    finishedStatuses.includes(workout.status)
  );
  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);
  const recentWorkouts = finishedWorkouts.filter(
    (workout) =>
      workoutFinishedAt(workout).getTime() >= fourteenDaysAgo.getTime()
  );
  const completedOrPartial = recentWorkouts.filter((workout) =>
    completedOrPartialStatuses.includes(workout.status)
  );
  const missedOrModified = finishedWorkouts.filter(
    (workout) =>
      workout.status === WorkoutStatus.SKIPPED ||
      workout.status === WorkoutStatus.PARTIAL ||
      Boolean(workout.painNotes) ||
      workout.exercises.some(
        (exercise) =>
          Boolean(exercise.substitutionReason) ||
          exercise.sets.some(
            (set) => set.status === SetStatus.SKIPPED || set.painFlag
          )
      )
  );
  const progressingTrend = trends.find(
    (trend) => trend.loadChangeKg !== null && trend.loadChangeKg > 0
  );

  insights.push({
    body:
      completedOrPartial.length > 0
        ? `${completedOrPartial.length} logged workout${
            completedOrPartial.length === 1 ? "" : "s"
          } in the last 14 days.`
        : "No completed workouts in the last 14 days yet.",
    category: "consistency",
    title: "Consistency"
  });

  insights.push({
    body: progressingTrend
      ? `${progressingTrend.exerciseName} is up ${progressingTrend.loadChangeKg} kg from its first logged load.`
      : "No load progression is visible yet; more weighted set logs are needed.",
    category: "load_progression",
    title: "Load progression"
  });

  insights.push({
    body:
      missedOrModified.length > 0
        ? `${missedOrModified.length} recent session${
            missedOrModified.length === 1 ? "" : "s"
          } were skipped, partial, painful, or modified.`
        : "No skipped, partial, painful, or modified sessions are currently in the log window.",
    category: "missed_or_modified",
    title: "Missed or modified"
  });

  insights.push({
    body:
      goals.length > 0
        ? `Current training logs are being compared against active goals: ${activeGoalTitles(
            goals
          )}.`
        : "Add active goals to make plan and log alignment more specific.",
    category: "goal_alignment",
    title: "Goal alignment"
  });

  return insights;
}

export const logService = {
  async getWorkoutHistoryWithInsights(db: PrismaClient = prisma): Promise<
    ServiceResult<{
      exerciseTrends: ExerciseTrend[];
      insights: LogInsight[];
      workouts: WorkoutLogWithDetails[];
    }>
  > {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const [workouts, goals] = await Promise.all([
      db.completedWorkout.findMany({
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: {
                include: {
                  plannedWorkoutSet: true
                },
                orderBy: { orderIndex: "asc" }
              }
            },
            orderBy: { orderIndex: "asc" }
          },
          plannedWorkout: {
            include: {
              trainingPlan: true
            }
          }
        },
        orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
        take: 30,
        where: {
          status: {
            in: [
              WorkoutStatus.COMPLETED,
              WorkoutStatus.PARTIAL,
              WorkoutStatus.SKIPPED
            ]
          },
          userId: userResult.data.id
        }
      }),
      db.goal.findMany({
        orderBy: { createdAt: "asc" },
        where: {
          status: "ACTIVE",
          userId: userResult.data.id
        }
      })
    ]);
    const exerciseTrends = buildExerciseTrends(workouts);

    return success({
      exerciseTrends,
      insights: buildInsights(workouts, exerciseTrends, goals),
      workouts
    });
  }
};
