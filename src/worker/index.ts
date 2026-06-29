import { getEnv } from "@/server/env";
import { logger } from "@/server/logging";

async function main() {
  const env = getEnv();

  logger.info("Worker started", {
    concurrency: env.JOB_WORKER_CONCURRENCY,
    pollIntervalMs: env.JOB_POLL_INTERVAL_MS
  });

  logger.info("Worker idle: job queue implementation starts in Phase 7");
}

main().catch((error: unknown) => {
  logger.error("Worker failed to start", {
    error: error instanceof Error ? error.message : String(error)
  });
  process.exitCode = 1;
});
