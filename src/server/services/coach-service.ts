import {
  AiInteractionType,
  type CoachNote,
  type PrismaClient
} from "@prisma/client";

import {
  coachNoteRefreshOutputV1Schema,
  postWorkoutFeedbackOutputV1Schema
} from "@/server/ai";
import type { AiProvider } from "@/server/ai/provider";
import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import { aiRecommendationService } from "@/server/services/ai-recommendation-service";
import {
  failure,
  success,
  type ServiceResult
} from "@/server/services/service-result";
import { assessWorkoutAdaptation } from "@/server/services/workout-adaptation";

interface CoachJobOptions {
  db?: PrismaClient;
  now?: Date;
  provider?: AiProvider;
  sourceJobId?: string;
}

function parseOptionalDate(value?: string) {
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
