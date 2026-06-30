import {
  AiInteractionType,
  CoachActionStatus,
  GoalStatus,
  WorkoutStatus,
  type CoachChatAction,
  type CoachNote,
  type Prisma,
  type PrismaClient
} from "@prisma/client";

import {
  coachChatOutputV1Schema,
  coachNoteRefreshOutputV1Schema,
  postWorkoutFeedbackOutputV1Schema
} from "@/server/ai";
import type { AiProvider } from "@/server/ai/provider";
import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import { aiRecommendationService } from "@/server/services/ai-recommendation-service";
import { generationService } from "@/server/services/generation-service";
import { planningService } from "@/server/services/planning-service";
import {
  coachChatActionDecisionInputSchema,
  coachChatInputSchema
} from "@/server/services/schemas";
import {
  failure,
  success,
  type ServiceResult
} from "@/server/services/service-result";
import { workoutService } from "@/server/services/workout-service";
import { assessWorkoutAdaptation } from "@/server/services/workout-adaptation";

interface CoachJobOptions {
  db?: PrismaClient;
  now?: Date;
  provider?: AiProvider;
  sourceJobId?: string;
}

interface CoachChatOptions {
  db?: PrismaClient;
  now?: Date;
  provider?: AiProvider;
}

const supportedCoachActionTypes = [
  "generate_today_workout",
  "start_workout",
  "commit_plan_edit",
  "keep_plan_edit_one_off"
] as const;

type SupportedCoachActionType = (typeof supportedCoachActionTypes)[number];

type CoachChatActionSummary = Pick<
  CoachChatAction,
  | "appliedAt"
  | "confirmedAt"
  | "createdAt"
  | "description"
  | "dismissedAt"
  | "id"
  | "input"
  | "status"
  | "statusMessage"
  | "type"
>;

function isSupportedCoachActionType(
  value: string
): value is SupportedCoachActionType {
  return supportedCoachActionTypes.includes(value as SupportedCoachActionType);
}

function parseOptionalDate(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function feedbackBody(output: {
  adaptationInstructions?: string[];
  nextWorkoutFocus: string;
  recoveryRecommendation: string;
  summary: string;
}) {
  const adaptationInstructions = output.adaptationInstructions ?? [];

  return [
    output.summary,
    `Next workout focus: ${output.nextWorkoutFocus}`,
    `Recovery: ${output.recoveryRecommendation}`,
    adaptationInstructions.length > 0
      ? `Adaptation: ${adaptationInstructions.join(" ")}`
      : undefined
  ]
    .filter(Boolean)
    .join("\n\n");
}

function dayBounds(now: Date) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { end, start };
}

function decimalNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function safeJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function objectInput(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function actionStatusMessage(action: CoachChatActionSummary) {
  if (action.statusMessage) {
    return action.statusMessage;
  }

  if (action.status === CoachActionStatus.APPLIED) {
    return "Applied";
  }

  if (action.status === CoachActionStatus.DISMISSED) {
    return "Dismissed";
  }

  if (action.status === CoachActionStatus.FAILED) {
    return "Failed";
  }

  if (action.status === CoachActionStatus.CONFIRMED) {
    return "Confirmed";
  }

  return "Suggested";
}

function serializeCoachAction(
  action: CoachChatActionSummary
): CoachChatActionSummary & { statusLabel: string } {
  return {
    ...action,
    statusLabel: actionStatusMessage(action)
  };
}

async function buildCoachChatContext(
  userId: string,
  input: { message: string; plannedWorkoutId?: string },
  db: PrismaClient,
  now: Date
): Promise<Prisma.InputJsonObject> {
  const { end, start } = dayBounds(now);
  const [
    profile,
    goals,
    equipment,
    currentWorkout,
    recentLogs,
    coachNotes,
    pendingPlanEdits
  ] = await Promise.all([
    db.userProfile.findUnique({
      where: { userId }
    }),
    db.goal.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 5,
      where: {
        status: GoalStatus.ACTIVE,
        userId
      }
    }),
    db.equipment.findMany({
      include: {
        availableLoads: {
          orderBy: { loadKg: "asc" }
        }
      },
      orderBy: { name: "asc" },
      where: {
        isAvailable: true,
        userId
      }
    }),
    db.plannedWorkout.findFirst({
      include: {
        exercises: {
          include: {
            sets: {
              orderBy: { orderIndex: "asc" }
            }
          },
          orderBy: { orderIndex: "asc" }
        },
        rationale: true,
        trainingPlan: true
      },
      orderBy: { scheduledFor: "asc" },
      where: input.plannedWorkoutId
        ? {
            id: input.plannedWorkoutId,
            userId
          }
        : {
            scheduledFor: {
              gte: start,
              lte: end
            },
            userId
          }
    }),
    db.completedWorkout.findMany({
      include: {
        exercises: {
          include: {
            sets: {
              orderBy: { orderIndex: "asc" }
            }
          },
          orderBy: { orderIndex: "asc" }
        },
        plannedWorkout: true
      },
      orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
      take: 5,
      where: {
        status: {
          in: [
            WorkoutStatus.COMPLETED,
            WorkoutStatus.PARTIAL,
            WorkoutStatus.SKIPPED
          ]
        },
        userId
      }
    }),
    db.coachNote.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      where: {
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        userId
      }
    }),
    planningService.listPendingPlanEditDecisions(db)
  ]);

  return {
    askedAt: now.toISOString(),
    coachNotes: coachNotes.map((note) => ({
      body: note.body,
      scope: note.scope,
      title: note.title
    })),
    currentWorkout: currentWorkout
      ? {
          exercises: currentWorkout.exercises.map((exercise) => ({
            name: exercise.nameSnapshot,
            notes: exercise.notes,
            restSeconds: exercise.restSeconds,
            sets: exercise.sets.map((set) => ({
              orderIndex: set.orderIndex,
              targetDurationSeconds: set.targetDurationSeconds,
              targetReps: set.targetReps,
              targetRir: decimalNumber(set.targetRir),
              targetRpe: decimalNumber(set.targetRpe),
              targetWeightKg: decimalNumber(set.targetWeightKg)
            }))
          })),
          id: currentWorkout.id,
          rationale: currentWorkout.rationale?.summary,
          scheduledFor: currentWorkout.scheduledFor.toISOString(),
          status: currentWorkout.status,
          summary: currentWorkout.summary,
          title: currentWorkout.title,
          trainingPlanTitle: currentWorkout.trainingPlan.title,
          workoutType: currentWorkout.workoutType
        }
      : null,
    equipment: equipment.map((item) => ({
      availableLoadsKg: item.availableLoads.map((load) =>
        decimalNumber(load.loadKg)
      ),
      name: item.name,
      notes: item.notes,
      type: item.type
    })),
    goals: goals.map((goal) => ({
      description: goal.description,
      priority: goal.priority,
      title: goal.title
    })),
    pendingPlanEdits: pendingPlanEdits.ok
      ? pendingPlanEdits.data.map((edit) => ({
          changeSummary: edit.changeSummary,
          completedWorkoutId: edit.completedWorkoutId,
          title: edit.title
        }))
      : [],
    profile: profile
      ? {
          generalConstraints: profile.generalConstraints,
          preferredTrainingTimes: profile.preferredTrainingTimes,
          sleepBaselineNotes: profile.sleepBaselineNotes
        }
      : null,
    recentLogs: recentLogs.map((log) => ({
      completedAt: log.completedAt?.toISOString(),
      exercises: log.exercises.map((exercise) => ({
        name: exercise.nameSnapshot,
        sets: exercise.sets.map((set) => ({
          actualReps: set.actualReps,
          actualRpe: decimalNumber(set.actualRpe),
          actualWeightKg: decimalNumber(set.actualWeightKg),
          painFlag: set.painFlag,
          status: set.status
        }))
      })),
      painNotes: log.painNotes,
      plannedWorkoutTitle: log.plannedWorkout?.title,
      status: log.status,
      userNotes: log.userNotes
    })),
    userMessage: input.message
  };
}

export const coachService = {
  async listActiveNotes(
    now: Date = new Date(),
    db: PrismaClient = prisma
  ): Promise<ServiceResult<CoachNote[]>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const notes = await db.coachNote.findMany({
      where: {
        userId: userResult.data.id,
        OR: [{ validUntil: null }, { validUntil: { gte: now } }]
      },
      orderBy: { createdAt: "desc" }
    });

    return success(notes);
  },

  async listRecentChatActions(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Array<CoachChatActionSummary & { statusLabel: string }>>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const actions = await db.coachChatAction.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      where: { userId: userResult.data.id }
    });

    return success(actions.map(serializeCoachAction));
  },

  async askCoach(
    input: unknown,
    options: CoachChatOptions = {}
  ): Promise<
    ServiceResult<{
      actions: Array<CoachChatActionSummary & { statusLabel: string }>;
      message: string;
    }>
  > {
    const parsed = coachChatInputSchema.safeParse(input);

    if (!parsed.success) {
      return failure("VALIDATION", "Invalid coach chat message.", parsed.error.flatten());
    }

    const db = options.db ?? prisma;
    const now = options.now ?? new Date();
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const context = await buildCoachChatContext(
      userResult.data.id,
      parsed.data,
      db,
      now
    );

    const aiResult = await aiRecommendationService.generateStructured(
      {
        input: context,
        schema: coachChatOutputV1Schema,
        schemaName: "CoachChatOutputV1",
        schemaVersion: "1",
        systemPrompt:
          "You are a conservative exercise coach for PHIP. Answer with practical workout context. Return only valid JSON. Never claim you changed saved data. Only suggest actions from the allowed action list.",
        type: AiInteractionType.COACH_CHAT,
        userPrompt: `Answer the user's coaching question. You may suggest these explicit actions only when useful: ${supportedCoachActionTypes.join(
          ", "
        )}. Every action requires confirmation.`
      },
      {
        db,
        provider: options.provider
      }
    );

    if (!aiResult.ok) {
      return failure(
        aiResult.error.code,
        aiResult.error.message,
        aiResult.error.details
      );
    }

    const suggestedActions = (aiResult.data.output.actions ?? []).filter((action) =>
      isSupportedCoachActionType(action.type)
    );
    const actions = await db.$transaction(
      suggestedActions.map((action) =>
        db.coachChatAction.create({
          data: {
            aiInteractionId: aiResult.data.interaction.id,
            description: action.description,
            input: safeJson(action.input),
            status: CoachActionStatus.SUGGESTED,
            type: action.type,
            userId: userResult.data.id
          }
        })
      )
    );

    return success({
      actions: actions.map(serializeCoachAction),
      message: aiResult.data.output.message
    });
  },

  async decideCoachChatAction(
    input: unknown,
    options: CoachChatOptions = {}
  ): Promise<ServiceResult<CoachChatActionSummary & { statusLabel: string }>> {
    const parsed = coachChatActionDecisionInputSchema.safeParse(input);

    if (!parsed.success) {
      return failure("VALIDATION", "Invalid coach action decision.", parsed.error.flatten());
    }

    const db = options.db ?? prisma;
    const now = options.now ?? new Date();
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const action = await db.coachChatAction.findFirst({
      where: {
        id: parsed.data.actionId,
        userId: userResult.data.id
      }
    });

    if (!action) {
      return failure("NOT_FOUND", "Coach action was not found.");
    }

    if (action.status !== CoachActionStatus.SUGGESTED) {
      return failure("CONFLICT", "This coach action has already been decided.");
    }

    if (parsed.data.decision === "dismiss") {
      const dismissed = await db.coachChatAction.update({
        data: {
          dismissedAt: now,
          status: CoachActionStatus.DISMISSED,
          statusMessage: "Dismissed"
        },
        where: { id: action.id }
      });

      return success(serializeCoachAction(dismissed));
    }

    await db.coachChatAction.update({
      data: {
        confirmedAt: now,
        status: CoachActionStatus.CONFIRMED,
        statusMessage: "Confirmed"
      },
      where: { id: action.id }
    });

    const applyResult = await this.applyCoachChatAction(action, db, now);

    if (!applyResult.ok) {
      const failed = await db.coachChatAction.update({
        data: {
          status: CoachActionStatus.FAILED,
          statusMessage: applyResult.error.message
        },
        where: { id: action.id }
      });

      return success(serializeCoachAction(failed));
    }

    const applied = await db.coachChatAction.update({
      data: {
        appliedAt: now,
        status: CoachActionStatus.APPLIED,
        statusMessage: applyResult.data
      },
      where: { id: action.id }
    });

    return success(serializeCoachAction(applied));
  },

  async applyCoachChatAction(
    action: CoachChatAction,
    db: PrismaClient = prisma,
    now: Date = new Date()
  ): Promise<ServiceResult<string>> {
    if (!isSupportedCoachActionType(action.type)) {
      return failure("VALIDATION", "Coach action type is not supported.");
    }

    const input = objectInput(action.input);

    if (action.type === "generate_today_workout") {
      const result = await generationService.ensureTodayWorkout({ db, now });

      if (!result.ok) {
        return failure(result.error.code, result.error.message, result.error.details);
      }

      return success("Today workout generated");
    }

    if (action.type === "start_workout") {
      const plannedWorkoutId =
        typeof input.plannedWorkoutId === "string"
          ? input.plannedWorkoutId
          : undefined;
      const workoutResult = plannedWorkoutId
        ? success({ id: plannedWorkoutId })
        : await workoutService.getTodayWorkout(now, db);

      if (!workoutResult.ok) {
        return failure(
          workoutResult.error.code,
          workoutResult.error.message,
          workoutResult.error.details
        );
      }

      const workout = workoutResult.data;

      if (!workout) {
        return failure("NOT_FOUND", "No workout is available to start.");
      }

      const result = await workoutService.startWorkout(workout.id, now, db);

      if (!result.ok) {
        return failure(result.error.code, result.error.message, result.error.details);
      }

      return success("Workout started");
    }

    const completedWorkoutId =
      typeof input.completedWorkoutId === "string"
        ? input.completedWorkoutId
        : undefined;

    if (!completedWorkoutId) {
      return failure("VALIDATION", "Completed workout id is required.");
    }

    const result = await planningService.decidePlanEditCommitment(
      {
        commit: action.type === "commit_plan_edit",
        completedWorkoutId
      },
      db
    );

    if (!result.ok) {
      return failure(result.error.code, result.error.message, result.error.details);
    }

    return success(
      action.type === "commit_plan_edit"
        ? "Plan edit committed"
        : "Plan edit kept as one-off"
    );
  },

  async createPostWorkoutFeedback(
    completedWorkoutId: string,
    options: CoachJobOptions = {}
  ): Promise<ServiceResult<CoachNote>> {
    const db = options.db ?? prisma;
    const now = options.now ?? new Date();
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const completedWorkout = await db.completedWorkout.findFirst({
      include: {
        exercises: {
          include: {
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
      where: {
        id: completedWorkoutId,
        userId: userResult.data.id
      }
    });

    if (!completedWorkout) {
      return failure("NOT_FOUND", "Completed workout was not found.");
    }

    if (completedWorkout.coachFeedbackId) {
      const existing = await db.coachNote.findUnique({
        where: { id: completedWorkout.coachFeedbackId }
      });

      if (existing) {
        return success(existing);
      }
    }

    const assessment = assessWorkoutAdaptation(completedWorkout);
    const aiResult = await aiRecommendationService.generateStructured(
      {
        input: {
          assessment,
          completedAt: completedWorkout.completedAt?.toISOString(),
          painNotes: completedWorkout.painNotes,
          plannedWorkout: completedWorkout.plannedWorkout
            ? {
                title: completedWorkout.plannedWorkout.title,
                trainingPlanTitle:
                  completedWorkout.plannedWorkout.trainingPlan.title,
                workoutType: completedWorkout.plannedWorkout.workoutType
              }
            : null,
          status: completedWorkout.status,
          userNotes: completedWorkout.userNotes
        },
        schema: postWorkoutFeedbackOutputV1Schema,
        schemaName: "PostWorkoutFeedbackOutputV1",
        schemaVersion: "1",
        type: AiInteractionType.POST_WORKOUT_FEEDBACK,
        userPrompt:
          "Write concise post-workout feedback. Keep the tone practical and conservative, especially when pain, missed work, or high effort is present."
      },
      {
        db,
        provider: options.provider
      }
    );

    if (!aiResult.ok) {
      return failure(
        aiResult.error.code,
        aiResult.error.message,
        aiResult.error.details
      );
    }

    const adaptationInstructions =
      aiResult.data.output.adaptationInstructions ?? [];
    const assessmentDetails = {
      completionQuality: assessment.completionQuality,
      hasMissedWork: assessment.hasMissedWork,
      hasPain: assessment.hasPain,
      hasUnderperformance: assessment.hasUnderperformance,
      intensityMultiplier: assessment.intensityMultiplier,
      rationale: assessment.rationale,
      volumeMultiplier: assessment.volumeMultiplier
    };

    const note = await db.$transaction(async (tx) => {
      await tx.recommendationRationale.create({
        data: {
          createdByAiInteractionId: aiResult.data.interaction.id,
          details: {
            adaptationInstructions,
            assessment: assessmentDetails,
            source: "post_workout_feedback"
          },
          summary: aiResult.data.output.summary,
          userId: userResult.data.id
        }
      });

      const coachNote = await tx.coachNote.create({
        data: {
          body: feedbackBody(aiResult.data.output),
          scope: "post_workout_feedback",
          sourceJobId: options.sourceJobId,
          title: "Post-workout feedback",
          userId: userResult.data.id,
          validFrom: now
        }
      });

      await tx.completedWorkout.update({
        data: { coachFeedbackId: coachNote.id },
        where: { id: completedWorkout.id }
      });

      return coachNote;
    });

    return success(note);
  },

  async refreshCoachNotes(
    options: CoachJobOptions = {}
  ): Promise<ServiceResult<CoachNote[]>> {
    const db = options.db ?? prisma;
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const recentFeedback = await db.coachNote.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      where: {
        scope: "post_workout_feedback",
        userId: userResult.data.id
      }
    });

    const aiResult = await aiRecommendationService.generateStructured(
      {
        input: {
          recentFeedback: recentFeedback.map((note) => ({
            body: note.body,
            createdAt: note.createdAt.toISOString(),
            title: note.title
          }))
        },
        schema: coachNoteRefreshOutputV1Schema,
        schemaName: "CoachNoteRefreshOutputV1",
        schemaVersion: "1",
        type: AiInteractionType.COACH_NOTE_REFRESH,
        userPrompt:
          "Refresh short coach notes from recent workout feedback. Keep only current, actionable guidance."
      },
      {
        db,
        provider: options.provider
      }
    );

    if (!aiResult.ok) {
      return failure(
        aiResult.error.code,
        aiResult.error.message,
        aiResult.error.details
      );
    }

    const refreshedNotes = aiResult.data.output.notes ?? [];
    const notes = await db.$transaction(
      refreshedNotes.map((note) =>
        db.coachNote.create({
          data: {
            body: note.message,
            scope: "coach_note_refresh",
            sourceJobId: options.sourceJobId,
            title: note.title,
            userId: userResult.data.id,
            validUntil: parseOptionalDate(note.expiresAt)
          }
        })
      )
    );

    return success(notes);
  }
};
