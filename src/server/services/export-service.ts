import type { Prisma, PrismaClient } from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import { logger } from "@/server/logging";
import {
  failure,
  success,
  type ServiceResult,
  validationFailure
} from "@/server/services/service-result";
import {
  resetUserDataInputSchema,
  type ResetUserDataInput
} from "@/server/services/schemas";

export const RESET_USER_DATA_CONFIRMATION = "DELETE MY HEALTH DATA";

type ExportTable =
  | "aiInteractions"
  | "biomarkerResults"
  | "cardioActivities"
  | "coachChatActions"
  | "coachNotes"
  | "completedWorkouts"
  | "deviceIntegrations"
  | "equipment"
  | "exerciseLibrary"
  | "exercisePreferences"
  | "goals"
  | "healthMetrics"
  | "insightEvents"
  | "jobs"
  | "measurements"
  | "nutritionEntries"
  | "planEditCommitments"
  | "plannedWorkouts"
  | "profile"
  | "rationales"
  | "trainingPlans"
  | "userCreatedExercises";

type ExportCounts = Record<ExportTable, number>;

export interface UserExportV1 {
  schemaVersion: "phip.user-export.v1";
  generatedAt: string;
  user: Prisma.UserGetPayload<Record<string, never>>;
  data: {
    aiInteractions: Prisma.AiInteractionGetPayload<Record<string, never>>[];
    biomarkerResults: Prisma.BiomarkerResultGetPayload<Record<string, never>>[];
    cardioActivities: Prisma.CardioActivityGetPayload<Record<string, never>>[];
    coachChatActions: Prisma.CoachChatActionGetPayload<Record<string, never>>[];
    coachNotes: Prisma.CoachNoteGetPayload<Record<string, never>>[];
    completedWorkouts: Prisma.CompletedWorkoutGetPayload<{
      include: {
        exercises: { include: { sets: true } };
      };
    }>[];
    deviceIntegrations: Prisma.DeviceIntegrationGetPayload<{
      include: { syncJobs: true };
    }>[];
    equipment: Prisma.EquipmentGetPayload<{
      include: { availableLoads: true };
    }>[];
    exerciseLibrary: Prisma.ExerciseGetPayload<Record<string, never>>[];
    exercisePreferences: Prisma.ExercisePreferenceGetPayload<
      Record<string, never>
    >[];
    goals: Prisma.GoalGetPayload<Record<string, never>>[];
    healthMetrics: Prisma.HealthMetricGetPayload<Record<string, never>>[];
    insightEvents: Prisma.InsightEventGetPayload<Record<string, never>>[];
    jobs: Prisma.JobGetPayload<{ include: { runs: true } }>[];
    measurements: Prisma.UserMeasurementGetPayload<Record<string, never>>[];
    nutritionEntries: Prisma.NutritionEntryGetPayload<Record<string, never>>[];
    planEditCommitments: Prisma.PlanEditCommitmentGetPayload<
      Record<string, never>
    >[];
    plannedWorkouts: Prisma.PlannedWorkoutGetPayload<{
      include: {
        exercises: { include: { sets: true } };
      };
    }>[];
    profile: Prisma.UserProfileGetPayload<Record<string, never>> | null;
    rationales: Prisma.RecommendationRationaleGetPayload<
      Record<string, never>
    >[];
    trainingPlans: Prisma.TrainingPlanGetPayload<Record<string, never>>[];
    userCreatedExercises: Prisma.ExerciseGetPayload<Record<string, never>>[];
  };
  counts: ExportCounts;
}

export interface UserExportSummary {
  userId: string;
  generatedAt: string;
  counts: Pick<
    ExportCounts,
    | "aiInteractions"
    | "coachNotes"
    | "completedWorkouts"
    | "equipment"
    | "exerciseLibrary"
    | "goals"
    | "jobs"
    | "measurements"
    | "plannedWorkouts"
    | "trainingPlans"
  >;
}

export interface ResetUserDataSummary {
  userId: string;
  deletedAt: string;
  preserveUser: boolean;
  deleted: Partial<
    Record<
      | ExportTable
      | "availableLoads"
      | "integrationSyncJobs"
      | "jobRuns"
      | "users",
      number
    >
  >;
}

function count<T>(value: T[] | null | undefined) {
  return value?.length ?? 0;
}

function buildCounts(data: UserExportV1["data"]): ExportCounts {
  return {
    aiInteractions: count(data.aiInteractions),
    biomarkerResults: count(data.biomarkerResults),
    cardioActivities: count(data.cardioActivities),
    coachChatActions: count(data.coachChatActions),
    coachNotes: count(data.coachNotes),
    completedWorkouts: count(data.completedWorkouts),
    deviceIntegrations: count(data.deviceIntegrations),
    equipment: count(data.equipment),
    exerciseLibrary: count(data.exerciseLibrary),
    exercisePreferences: count(data.exercisePreferences),
    goals: count(data.goals),
    healthMetrics: count(data.healthMetrics),
    insightEvents: count(data.insightEvents),
    jobs: count(data.jobs),
    measurements: count(data.measurements),
    nutritionEntries: count(data.nutritionEntries),
    planEditCommitments: count(data.planEditCommitments),
    plannedWorkouts: count(data.plannedWorkouts),
    profile: data.profile ? 1 : 0,
    rationales: count(data.rationales),
    trainingPlans: count(data.trainingPlans),
    userCreatedExercises: count(data.userCreatedExercises)
  };
}

export const exportService = {
  async exportUserData(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<UserExportV1>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const userId = userResult.data.id;
    const [
      aiInteractions,
      biomarkerResults,
      cardioActivities,
      coachChatActions,
      coachNotes,
      completedWorkouts,
      deviceIntegrations,
      equipment,
      exerciseLibrary,
      exercisePreferences,
      goals,
      healthMetrics,
      insightEvents,
      jobs,
      measurements,
      nutritionEntries,
      planEditCommitments,
      plannedWorkouts,
      profile,
      rationales,
      trainingPlans,
      userCreatedExercises
    ] = await Promise.all([
      db.aiInteraction.findMany({
        orderBy: { createdAt: "asc" },
        where: { userId }
      }),
      db.biomarkerResult.findMany({
        orderBy: { collectedAt: "asc" },
        where: { userId }
      }),
      db.cardioActivity.findMany({
        orderBy: { startedAt: "asc" },
        where: { userId }
      }),
      db.coachChatAction.findMany({
        orderBy: { createdAt: "asc" },
        where: { userId }
      }),
      db.coachNote.findMany({
        orderBy: { createdAt: "asc" },
        where: { userId }
      }),
      db.completedWorkout.findMany({
        include: {
          exercises: {
            include: { sets: true },
            orderBy: { orderIndex: "asc" }
          }
        },
        orderBy: { startedAt: "asc" },
        where: { userId }
      }),
      db.deviceIntegration.findMany({
        include: { syncJobs: true },
        orderBy: { provider: "asc" },
        where: { userId }
      }),
      db.equipment.findMany({
        include: {
          availableLoads: {
            orderBy: { loadKg: "asc" }
          }
        },
        orderBy: { name: "asc" },
        where: { userId }
      }),
      db.exercise.findMany({
        orderBy: { name: "asc" }
      }),
      db.exercisePreference.findMany({
        orderBy: { createdAt: "asc" },
        where: { userId }
      }),
      db.goal.findMany({
        orderBy: [
          { status: "asc" },
          { priority: "desc" },
          { createdAt: "asc" }
        ],
        where: { userId }
      }),
      db.healthMetric.findMany({
        orderBy: { recordedAt: "asc" },
        where: { userId }
      }),
      db.insightEvent.findMany({
        orderBy: { createdAt: "asc" },
        where: { userId }
      }),
      db.job.findMany({
        include: {
          runs: {
            orderBy: { startedAt: "asc" }
          }
        },
        orderBy: { createdAt: "asc" },
        where: { userId }
      }),
      db.userMeasurement.findMany({
        orderBy: { measuredAt: "asc" },
        where: { userId }
      }),
      db.nutritionEntry.findMany({
        orderBy: { occurredAt: "asc" },
        where: { userId }
      }),
      db.planEditCommitment.findMany({
        orderBy: { createdAt: "asc" },
        where: { userId }
      }),
      db.plannedWorkout.findMany({
        include: {
          exercises: {
            include: { sets: true },
            orderBy: { orderIndex: "asc" }
          }
        },
        orderBy: { scheduledFor: "asc" },
        where: { userId }
      }),
      db.userProfile.findUnique({
        where: { userId }
      }),
      db.recommendationRationale.findMany({
        orderBy: { createdAt: "asc" },
        where: { userId }
      }),
      db.trainingPlan.findMany({
        orderBy: { startDate: "asc" },
        where: { userId }
      }),
      db.exercise.findMany({
        orderBy: { name: "asc" },
        where: { createdByUserId: userId }
      })
    ]);

    const data = {
      aiInteractions,
      biomarkerResults,
      cardioActivities,
      coachChatActions,
      coachNotes,
      completedWorkouts,
      deviceIntegrations,
      equipment,
      exerciseLibrary,
      exercisePreferences,
      goals,
      healthMetrics,
      insightEvents,
      jobs,
      measurements,
      nutritionEntries,
      planEditCommitments,
      plannedWorkouts,
      profile,
      rationales,
      trainingPlans,
      userCreatedExercises
    };

    const exported = {
      counts: buildCounts(data),
      data,
      generatedAt: new Date().toISOString(),
      schemaVersion: "phip.user-export.v1" as const,
      user: userResult.data
    };

    logger.info("User data export generated", {
      counts: exported.counts,
      userId
    });

    return success(exported);
  },

  async getExportSummary(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<UserExportSummary>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const userId = userResult.data.id;
    const [
      aiInteractions,
      coachNotes,
      trainingPlans,
      equipment,
      exerciseLibrary,
      goals,
      jobs,
      measurements,
      plannedWorkouts,
      completedWorkouts
    ] = await Promise.all([
      db.aiInteraction.count({ where: { userId } }),
      db.coachNote.count({ where: { userId } }),
      db.trainingPlan.count({ where: { userId } }),
      db.equipment.count({ where: { userId } }),
      db.exercise.count(),
      db.goal.count({ where: { userId } }),
      db.job.count({ where: { userId } }),
      db.userMeasurement.count({ where: { userId } }),
      db.plannedWorkout.count({ where: { userId } }),
      db.completedWorkout.count({ where: { userId } })
    ]);

    return success({
      userId,
      generatedAt: new Date().toISOString(),
      counts: {
        aiInteractions,
        coachNotes,
        completedWorkouts,
        equipment,
        exerciseLibrary,
        goals,
        jobs,
        measurements,
        plannedWorkouts,
        trainingPlans
      }
    });
  },

  async resetUserData(
    input: ResetUserDataInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<ResetUserDataSummary>> {
    const parsed = resetUserDataInputSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten());
    }

    if (parsed.data.confirmation !== RESET_USER_DATA_CONFIRMATION) {
      return failure(
        "VALIDATION",
        `Type "${RESET_USER_DATA_CONFIRMATION}" to reset health data.`
      );
    }

    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const userId = userResult.data.id;
    const deleted = await db.$transaction(async (tx) => {
      const userCreatedExercises = await tx.exercise.findMany({
        select: { id: true },
        where: { createdByUserId: userId }
      });
      const userCreatedExerciseIds = userCreatedExercises.map(
        (exercise) => exercise.id
      );

      const cardioActivities = await tx.cardioActivity.deleteMany({
        where: { userId }
      });
      const planEditCommitments = await tx.planEditCommitment.deleteMany({
        where: { userId }
      });
      const completedWorkouts = await tx.completedWorkout.deleteMany({
        where: { userId }
      });
      const plannedWorkouts = await tx.plannedWorkout.deleteMany({
        where: { userId }
      });
      const trainingPlans = await tx.trainingPlan.deleteMany({
        where: { userId }
      });
      const coachChatActions = await tx.coachChatAction.deleteMany({
        where: { userId }
      });
      const coachNotes = await tx.coachNote.deleteMany({ where: { userId } });
      const rationales = await tx.recommendationRationale.deleteMany({
        where: { userId }
      });
      const jobs = await tx.job.deleteMany({ where: { userId } });
      const aiInteractions = await tx.aiInteraction.deleteMany({
        where: { userId }
      });
      const exercisePreferences = await tx.exercisePreference.deleteMany({
        where: { userId }
      });
      const availableLoads = await tx.availableLoad.deleteMany({
        where: { userId }
      });
      const equipment = await tx.equipment.deleteMany({ where: { userId } });
      const goals = await tx.goal.deleteMany({ where: { userId } });
      const measurements = await tx.userMeasurement.deleteMany({
        where: { userId }
      });
      const profile = await tx.userProfile.deleteMany({ where: { userId } });
      const healthMetrics = await tx.healthMetric.deleteMany({
        where: { userId }
      });
      const nutritionEntries = await tx.nutritionEntry.deleteMany({
        where: { userId }
      });
      const biomarkerResults = await tx.biomarkerResult.deleteMany({
        where: { userId }
      });
      const integrationSyncJobs = await tx.integrationSyncJob.deleteMany({
        where: { userId }
      });
      const deviceIntegrations = await tx.deviceIntegration.deleteMany({
        where: { userId }
      });
      const insightEvents = await tx.insightEvent.deleteMany({
        where: { userId }
      });

      const exercises =
        userCreatedExerciseIds.length > 0
          ? await tx.exercise.deleteMany({
              where: { id: { in: userCreatedExerciseIds } }
            })
          : { count: 0 };

      const user = parsed.data.preserveUser
        ? { count: 0 }
        : await tx.user.deleteMany({ where: { id: userId } });

      return {
        aiInteractions: aiInteractions.count,
        availableLoads: availableLoads.count,
        biomarkerResults: biomarkerResults.count,
        cardioActivities: cardioActivities.count,
        coachChatActions: coachChatActions.count,
        coachNotes: coachNotes.count,
        completedWorkouts: completedWorkouts.count,
        deviceIntegrations: deviceIntegrations.count,
        equipment: equipment.count,
        goals: goals.count,
        healthMetrics: healthMetrics.count,
        insightEvents: insightEvents.count,
        integrationSyncJobs: integrationSyncJobs.count,
        jobs: jobs.count,
        measurements: measurements.count,
        nutritionEntries: nutritionEntries.count,
        planEditCommitments: planEditCommitments.count,
        plannedWorkouts: plannedWorkouts.count,
        profile: profile.count,
        rationales: rationales.count,
        trainingPlans: trainingPlans.count,
        userCreatedExercises: exercises.count,
        users: user.count
      };
    });

    logger.warn("User health data reset completed", {
      deleted,
      preserveUser: parsed.data.preserveUser,
      userId
    });

    return success({
      deleted,
      deletedAt: new Date().toISOString(),
      preserveUser: parsed.data.preserveUser,
      userId
    });
  }
};
