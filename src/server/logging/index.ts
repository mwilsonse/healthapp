import { getEnv } from "@/server/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

type LogContext = Record<string, unknown>;

const sensitiveKeyPattern =
  /(api.?key|birth|body|calorie|constraint|description|detail|distance|duration|error|feedback|heart|height|input|measurement|metric|note|nutrition|output|pain|passcode|password|prompt|rationale|secret|sleep|snapshot|token|weight)/i;

function shouldLog(level: LogLevel) {
  const configuredLevel = getEnv().LOG_LEVEL;
  return levelRank[level] >= levelRank[configuredLevel];
}

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[redacted-depth]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveKeyPattern.test(key)
        ? "[redacted]"
        : sanitizeForLog(entry, depth + 1)
    ])
  );
}

function writeLog(level: LogLevel, message: string, context?: LogContext) {
  if (!shouldLog(level)) {
    return;
  }

  const entry = {
    context: context ? sanitizeForLog(context) : undefined,
    level,
    message,
    timestamp: new Date().toISOString()
  };

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    writeLog("debug", message, context),
  info: (message: string, context?: LogContext) =>
    writeLog("info", message, context),
  warn: (message: string, context?: LogContext) =>
    writeLog("warn", message, context),
  error: (message: string, context?: LogContext) =>
    writeLog("error", message, context)
};
