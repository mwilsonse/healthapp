import { JobType, type Job, type Prisma } from "@prisma/client";

import type { JobHandler, JobHandlers } from "@/server/services/job-service";

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
  [JobType.BIWEEKLY_PLAN_REVIEW]: createNoopHandler(
    JobType.BIWEEKLY_PLAN_REVIEW
  ),
  [JobType.COACH_NOTE_REFRESH]: createNoopHandler(JobType.COACH_NOTE_REFRESH),
  [JobType.NEXT_WORKOUT_GENERATION]: createNoopHandler(
    JobType.NEXT_WORKOUT_GENERATION
  ),
  [JobType.POST_WORKOUT_FEEDBACK]: createNoopHandler(
    JobType.POST_WORKOUT_FEEDBACK
  )
};
