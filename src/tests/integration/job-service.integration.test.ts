import { JobStatus, JobType, UnitPreference } from "@prisma/client";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/server/db";
import { jobHandlers } from "@/server/jobs";
import { jobService } from "@/server/services";

const TEST_USER_ID = "default-user";

async function ensureUser() {
  await prisma.user.upsert({
    create: {
      displayName: "PHIP Test User",
      id: TEST_USER_ID,
      timezone: "America/Chicago",
      unitPreference: UnitPreference.US
    },
    update: {},
    where: { id: TEST_USER_ID }
  });
}

async function clearJobs() {
  await prisma.job.deleteMany({ where: { userId: TEST_USER_ID } });
}

describe("jobService integration", () => {
  beforeAll(async () => {
    await ensureUser();
  });

  beforeEach(async () => {
    await clearJobs();
  });

  it("enqueues, claims, runs, and records a successful job", async () => {
    const enqueued = await jobService.enqueueJob({
      type: JobType.NEXT_WORKOUT_GENERATION
    });

    expect(enqueued.ok).toBe(true);
    if (!enqueued.ok) {
      return;
    }

    const claimed = await jobService.claimNextJob({
      workerId: "test-worker"
    });

    expect(claimed.ok).toBe(true);
    expect(claimed.ok && claimed.data?.status).toBe(JobStatus.RUNNING);

    const completed = await jobService.runJob(
      claimed.ok && claimed.data ? claimed.data : enqueued.data,
      jobHandlers,
      { workerId: "test-worker" }
    );

    expect(completed.ok).toBe(true);
    expect(completed.ok && completed.data.status).toBe(JobStatus.SUCCEEDED);

    const status = await jobService.getJob(enqueued.data.id);

    expect(status.ok).toBe(true);
    expect(status.ok && status.data.runs).toHaveLength(1);
    expect(status.ok && status.data.runs[0]?.status).toBe(JobStatus.SUCCEEDED);
  });

  it("retries failed jobs and terminally fails after retries are exhausted", async () => {
    const enqueued = await jobService.enqueueJob({
      inputSnapshot: { forceFailure: true },
      maxRetries: 1,
      type: JobType.POST_WORKOUT_FEEDBACK
    });

    expect(enqueued.ok).toBe(true);
    if (!enqueued.ok) {
      return;
    }

    const firstAttempt = await jobService.runNextJob(jobHandlers, {
      workerId: "test-worker"
    });

    expect(firstAttempt.ok).toBe(true);
    expect(firstAttempt.ok && firstAttempt.data?.status).toBe(
      JobStatus.PENDING
    );
    expect(firstAttempt.ok && firstAttempt.data?.retryCount).toBe(1);

    await prisma.job.update({
      data: { availableAt: new Date() },
      where: { id: enqueued.data.id }
    });

    const secondAttempt = await jobService.runNextJob(jobHandlers, {
      workerId: "test-worker"
    });

    expect(secondAttempt.ok).toBe(true);
    expect(secondAttempt.ok && secondAttempt.data?.status).toBe(
      JobStatus.FAILED
    );
    expect(secondAttempt.ok && secondAttempt.data?.retryCount).toBe(2);

    const runs = await prisma.jobRun.findMany({
      orderBy: { startedAt: "asc" },
      where: { jobId: enqueued.data.id }
    });

    expect(runs).toHaveLength(2);
    expect(runs.every((run) => run.status === JobStatus.FAILED)).toBe(true);
  });

  it("replays a job from stored input", async () => {
    const enqueued = await jobService.enqueueJob({
      inputSnapshot: { plannedWorkoutId: "planned-workout-1" },
      type: JobType.COACH_NOTE_REFRESH
    });

    expect(enqueued.ok).toBe(true);
    if (!enqueued.ok) {
      return;
    }

    const replayed = await jobService.replayJob(enqueued.data.id);

    expect(replayed.ok).toBe(true);
    expect(replayed.ok && replayed.data.id).not.toBe(enqueued.data.id);
    expect(replayed.ok && replayed.data.status).toBe(JobStatus.PENDING);
    expect(replayed.ok && replayed.data.type).toBe(enqueued.data.type);
    expect(replayed.ok && replayed.data.inputSnapshot).toEqual(
      enqueued.data.inputSnapshot
    );
  });
});
