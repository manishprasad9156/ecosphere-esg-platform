import "server-only"

type LogLevel = "info" | "warn" | "error"

/**
 * Minimal structured logger. Emits single-line JSON so logs are
 * machine-parseable in Vercel's log drain.
 */
function log(
  level: LogLevel,
  event: string,
  data: Record<string, unknown> = {},
) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  }
  const line = JSON.stringify(entry)
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) =>
    log("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) =>
    log("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) =>
    log("error", event, data),
}
