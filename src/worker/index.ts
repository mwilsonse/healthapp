import { getEnv } from "@/server/env";
import { jobHandlers } from "@/server/jobs";
import { logger } from "@/server/logging";
import { jobService } from "@/server/services";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createWorkerId() {
  return `worker-${process.pid}-${Date.now()}`;
}

async function main() {
  const env = getEnv();
  const workerId = createWorkerId();
  const runOnce = process.env.WORKER_RUN_ONCE === "true";

  logger.info("Worker started", {
    concurrency: env.JOB_WORKER_CONCURRENCY,
    pollIntervalMs: env.JOB_POLL_INTERVAL_MS,
    runOnce,
    workerId
  });

  do {
    const result = await jobService.runNextJob(jobHandlers, { workerId });

    if (!result.ok) {
      logger.error("Worker job cycle failed", {
        error: result.error,
        workerId
      });
    } else if (result.data) {
      logger.info("Worker job cycle completed", {
        jobId: result.data.id,
        status: result.data.status,
        workerId
      });
    } else {
      logger.debug("Worker found no available jobs", { workerId });
    }

    if (!runOnce) {
      await sleep(env.JOB_POLL_INTERVAL_MS);
    }
  } while (!runOnce);
}

main().catch((error: unknown) => {
  logger.error("Worker failed to start", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
});
