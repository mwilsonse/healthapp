import {
  JobStatus,
  type Job,
  type JobRun,
  type Prisma,
  type PrismaClient
} from "@prisma/client";

import { getSingleUser } from "@/server/auth/single-user";
import { prisma } from "@/server/db";
import { logger } from "@/server/logging";
import {
  failure,
  success,
  validationFailure,
  type ServiceResult
} from "@/server/services/service-result";
import {
  enqueueJobInputSchema,
  type EnqueueJobInput
} from "@/server/services/schemas";

const BASE_RETRY_BACKOFF_MS = 60_000;
const MAX_RETRY_BACKOFF_MS = 15 * 60_000;

export type ClaimedJob = Job;

export interface JobHandlerResult {
  logs?: Prisma.InputJsonValue;
  outputRef?: Prisma.InputJsonValue;
}

export type JobHandler = (job: Job) => Promise<JobHandlerResult>;

export type JobHandlers = Partial<Record<Job["type"], JobHandler>>;

interface ClaimNextJobInput {
  now?: Date;
  workerId: string;
}

interface RunNextJobInput {
  now?: Date;
  workerId: string;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function calculateRetryAvailableAt(
  retryCount: number,
  now = new Date()
) {
  const delayMs = Math.min(
    BASE_RETRY_BACKOFF_MS * 2 ** Math.max(retryCount - 1, 0),
    MAX_RETRY_BACKOFF_MS
  );

  return new Date(now.getTime() + delayMs);
}

export const jobService = {
  async enqueueJob(
    input: EnqueueJobInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Job>> {
    const parsed = enqueueJobInputSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(parsed.error.flatten());
    }

    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return failure(userResult.error.code, userResult.error.message);
    }

    const job = await db.job.create({
      data: {
        ...parsed.data,
        inputSnapshot: parsed.data.inputSnapshot as
          Prisma.InputJsonValue | undefined,
        userId: userResult.data.id
      }
    });

    return success(job);
  },

  async getJob(
    id: string,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Job & { runs: JobRun[] }>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const job = await db.job.findFirst({
      include: {
        runs: {
          orderBy: { startedAt: "desc" }
        }
      },
      where: {
        id,
        userId: userResult.data.id
      }
    });

    if (!job) {
      return failure("NOT_FOUND", "Job was not found.");
    }

    return success(job);
  },

  async listRecentJobs(
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Job[]>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const jobs = await db.job.findMany({
      where: { userId: userResult.data.id },
      orderBy: { createdAt: "desc" },
      take: 25
    });

    return success(jobs);
  },

  async claimNextJob(
    input: ClaimNextJobInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<ClaimedJob | null>> {
    const now = input.now ?? new Date();
    const nextJob = await db.job.findFirst({
      orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
      where: {
        availableAt: { lte: now },
        status: JobStatus.PENDING
      }
    });

    if (!nextJob) {
      return success(null);
    }

    const claimed = await db.job.updateMany({
      data: {
        lockedAt: now,
        lockedBy: input.workerId,
        startedAt: now,
        status: JobStatus.RUNNING
      },
      where: {
        availableAt: { lte: now },
        id: nextJob.id,
        status: JobStatus.PENDING
      }
    });

    if (claimed.count === 0) {
      return this.claimNextJob(input, db);
    }

    const job = await db.job.findUnique({ where: { id: nextJob.id } });

    if (!job) {
      return failure("NOT_FOUND", "Claimed job was not found.");
    }

    logger.info("Job claimed", {
      jobId: job.id,
      jobType: job.type,
      workerId: input.workerId
    });

    return success(job);
  },

  async markJobSucceeded(
    jobId: string,
    outputRef?: Prisma.InputJsonValue,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Job>> {
    const job = await db.job.update({
      data: {
        finishedAt: new Date(),
        lastError: null,
        lockedAt: null,
        lockedBy: null,
        outputRef,
        status: JobStatus.SUCCEEDED
      },
      where: { id: jobId }
    });

    logger.info("Job succeeded", {
      jobId: job.id,
      jobType: job.type
    });

    return success(job);
  },

  async markJobFailed(
    jobId: string,
    error: unknown,
    db: PrismaClient = prisma,
    now = new Date()
  ): Promise<ServiceResult<Job>> {
    const job = await db.job.findUnique({ where: { id: jobId } });

    if (!job) {
      return failure("NOT_FOUND", "Job was not found.");
    }

    const nextRetryCount = job.retryCount + 1;
    const message = errorMessage(error);
    const shouldRetry = nextRetryCount <= job.maxRetries;

    if (shouldRetry) {
      const availableAt = calculateRetryAvailableAt(nextRetryCount, now);
      const retriedJob = await db.job.update({
        data: {
          availableAt,
          lastError: message,
          lockedAt: null,
          lockedBy: null,
          retryCount: nextRetryCount,
          startedAt: null,
          status: JobStatus.PENDING
        },
        where: { id: jobId }
      });

      logger.warn("Job failed and was scheduled for retry", {
        availableAt: availableAt.toISOString(),
        error: message,
        jobId,
        retryCount: nextRetryCount
      });

      return success(retriedJob);
    }

    const failedJob = await db.job.update({
      data: {
        finishedAt: now,
        lastError: message,
        lockedAt: null,
        lockedBy: null,
        retryCount: nextRetryCount,
        status: JobStatus.FAILED
      },
      where: { id: jobId }
    });

    logger.error("Job failed terminally", {
      error: message,
      jobId,
      retryCount: nextRetryCount
    });

    return success(failedJob);
  },

  async runJob(
    job: Job,
    handlers: JobHandlers,
    input: RunNextJobInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Job>> {
    const run = await db.jobRun.create({
      data: {
        jobId: job.id,
        status: JobStatus.RUNNING,
        workerId: input.workerId
      }
    });

    const handler = handlers[job.type];

    if (!handler) {
      const failed = await this.markJobFailed(
        job.id,
        new Error(`No handler registered for job type ${job.type}.`),
        db,
        input.now
      );

      await db.jobRun.update({
        data: {
          error: `No handler registered for job type ${job.type}.`,
          finishedAt: new Date(),
          status: JobStatus.FAILED
        },
        where: { id: run.id }
      });

      return failed;
    }

    try {
      const result = await handler(job);
      const succeeded = await this.markJobSucceeded(
        job.id,
        result.outputRef,
        db
      );

      await db.jobRun.update({
        data: {
          finishedAt: new Date(),
          logs: result.logs,
          status: JobStatus.SUCCEEDED
        },
        where: { id: run.id }
      });

      return succeeded;
    } catch (error) {
      const failed = await this.markJobFailed(job.id, error, db, input.now);

      await db.jobRun.update({
        data: {
          error: errorMessage(error),
          finishedAt: new Date(),
          status: JobStatus.FAILED
        },
        where: { id: run.id }
      });

      return failed;
    }
  },

  async runNextJob(
    handlers: JobHandlers,
    input: RunNextJobInput,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Job | null>> {
    const claim = await this.claimNextJob(input, db);

    if (!claim.ok || !claim.data) {
      return claim;
    }

    return this.runJob(claim.data, handlers, input, db);
  },

  async replayJob(
    id: string,
    db: PrismaClient = prisma
  ): Promise<ServiceResult<Job>> {
    const userResult = await getSingleUser(db);

    if (!userResult.ok) {
      return userResult;
    }

    const existing = await db.job.findFirst({
      where: {
        id,
        userId: userResult.data.id
      }
    });

    if (!existing) {
      return failure("NOT_FOUND", "Job was not found.");
    }

    const replayed = await db.job.create({
      data: {
        availableAt: new Date(),
        inputSnapshot: existing.inputSnapshot as
          Prisma.InputJsonValue | undefined,
        maxRetries: existing.maxRetries,
        scheduledAt: existing.scheduledAt,
        type: existing.type,
        userId: existing.userId
      }
    });

    logger.info("Job replayed", {
      originalJobId: existing.id,
      replayedJobId: replayed.id,
      type: replayed.type
    });

    return success(replayed);
  }
};
