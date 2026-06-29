import { JobType, type Job } from "@prisma/client";

import type { JobHandlers } from "@/server/services/job-service";
import { coachService } from "@/server/services/coach-service";
import { generationService } from "@/server/services/generation-service";

function inputSnapshot(job: Job) {
  return job.inputSnapshot as Record<string, unknown> | null;
}

function shouldForceFailure(job: Job) {
  return inputSnapshot(job)?.forceFailure === true;
}

function stringInput(job: Job, key: string) {
  const value = inputSnapshot(job)?.[key];

  return typeof value === "string" ? value : undefined;
}

export const jobHandlers: JobHandlers = {
  [JobType.BIWEEKLY_PLAN_REVIEW]: async (job) => {
    if (shouldForceFailure(job)) {
      throw new Error(`Forced failure for ${JobType.BIWEEKLY_PLAN_REVIEW}.`);
    }

    const result = await generationService.generateActiveTrainingPlan({
      sourceJobId: job.id
    });

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    return {
      logs: {
        message: "Generated active training plan.",
        planId: result.data.id
      },
      outputRef: {
        planId: result.data.id
      }
    };
  },
  [JobType.COACH_NOTE_REFRESH]: async (job) => {
    if (shouldForceFailure(job)) {
      throw new Error(`Forced failure for ${JobType.COACH_NOTE_REFRESH}.`);
    }

    const result = await coachService.refreshCoachNotes({
      sourceJobId: job.id
    });

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    return {
      logs: {
        message: "Refreshed coach notes.",
        noteCount: result.data.length
      },
      outputRef: {
        noteIds: result.data.map((note) => note.id)
      }
    };
  },
  [JobType.NEXT_WORKOUT_GENERATION]: async (job) => {
    if (shouldForceFailure(job)) {
      throw new Error(`Forced failure for ${JobType.NEXT_WORKOUT_GENERATION}.`);
    }

    const result = await generationService.generateNextWorkoutAfterCompleted({
      completedWorkoutId: stringInput(job, "completedWorkoutId"),
      sourceJobId: job.id
    });

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    return {
      logs: {
        message: "Generated today's workout.",
        workoutId: result.data.id
      },
      outputRef: {
        workoutId: result.data.id
      }
    };
  },
  [JobType.POST_WORKOUT_FEEDBACK]: async (job) => {
    if (shouldForceFailure(job)) {
      throw new Error(`Forced failure for ${JobType.POST_WORKOUT_FEEDBACK}.`);
    }

    const completedWorkoutId = stringInput(job, "completedWorkoutId");

    if (!completedWorkoutId) {
      throw new Error("completedWorkoutId is required for feedback.");
    }

    const result = await coachService.createPostWorkoutFeedback(
      completedWorkoutId,
      {
        sourceJobId: job.id
      }
    );

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    return {
      logs: {
        message: "Created post-workout feedback.",
        noteId: result.data.id
      },
      outputRef: {
        noteId: result.data.id
      }
    };
  }
};
