// Minimal, self-contained logger for the profile backend.
//
// Deliberately does NOT reuse src/server/Logger.ts: that module pulls in the whole
// game config chain (ConfigLoader -> Schemas -> resources/QuickChat.json) plus the
// OTEL stack, which both bloats this standalone service's image and breaks it at
// runtime (the profile image ships src/ but not resources/). A dedicated service
// gets a dedicated logger. OTEL export for the profile service can be added here in
// a later task if needed, reading OTEL_* directly (not via game config).

import winston from "winston";

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: "profile" },
  transports: [new winston.transports.Console()],
});

// Formats an unknown thrown value into a log-ready string with stack trace.
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}
