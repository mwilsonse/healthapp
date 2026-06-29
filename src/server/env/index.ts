import { z } from "zod";

const envSchema = z.object({
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  APP_SECRET: z.string().min(1, "APP_SECRET is required"),
  APP_ACCESS_PASSCODE: z.string().min(1).optional(),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  AI_PROVIDER: z.string().default("fake"),
  BACKUP_DIR: z.string().default("./backups/postgres"),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DEFAULT_USER_ID: z.string().optional(),
  JOB_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  JOB_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  JOB_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
