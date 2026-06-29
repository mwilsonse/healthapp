import { JobType, type Job, type Prisma } from "@prisma/client";

import type { JobHandler, JobHandlers } from "@/server/services/job-service";
import { generationService } from "@/server/services/generation-service";

function inputSnapshot(job: Job) {
  return job.inputSnapshot as Record<string, unknown> | null;
}

function shouldForceFailure(job: Job) {
  return inputSnapshot(job)?.forceFailure === true;
}

function createNoopHandler(jobType: JobType): JobHandler {
  return async (job) => {
    if (shouldForceFailure(job)) {
      throw new Error(`Forced failure for ${jobType}.`);
    }

    const handledAt = new Date().toISOString();
    const outputRef = {
      handledAt,
      jobId: job.id,
      jobType,
      mode: "noop"
    } satisfies Prisma.InputJsonObject;

    return {
      logs: {
        message: `No-op handler completed ${jobType}.`,
        ...outputRef
      },
      outputRef
    };
  };
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
  [JobType.COACH_NOTE_REFRESH]: createNoopHandler(JobType.COACH_NOTE_REFRESH),
  [JobType.NEXT_WORKOUT_GENERATION]: async (job) => {
    if (shouldForceFailure(job)) {
      throw new Error(`Forced failure for ${JobType.NEXT_WORKOUT_GENERATION}.`);
    }

    const result = await generationService.ensureTodayWorkout({
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
  [JobType.POST_WORKOUT_FEEDBACK]: createNoopHandler(
    JobType.POST_WORKOUT_FEEDBACK
  )
};
