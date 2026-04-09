import * as logsAPI from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";
import * as dotenv from "dotenv";
import winston from "winston";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { getOtelResource } from "./OtelResource";
dotenv.config();

const config = getServerConfigFromServer();

const resource = getOtelResource();

let loggerProvider: LoggerProvider;

if (config.otelEnabled()) {
  console.log("OTEL enabled");
  const headers: Record<string, string> = {};
  if (config.otelAuthHeader()) {
    headers["Authorization"] = "Basic " + config.otelAuthHeader();
  }
  const logExporter = new OTLPLogExporter({
    url: `${config.otelEndpoint()}/v1/logs`,
    headers,
    timeoutMillis: 5000,
  });
  loggerProvider = new LoggerProvider({
    resource,
    processors: [new BatchLogRecordProcessor(logExporter)],
  });
  logsAPI.logs.setGlobalLoggerProvider(loggerProvider);
} else {
  loggerProvider = new LoggerProvider({ resource });
  console.log(
    "No OTLP endpoint and credentials provided, remote logging disabled",
  );
}

// Custom format to add severity tag based on log level
const addSeverityFormat = winston.format((info) => {
  return {
    ...info,
    severity: info.level,
  };
});

// Define your base/parent logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    addSeverityFormat(),
    winston.format.json(),
  ),
  defaultMeta: {
    service: "openfront",
    environment: process.env.GAME_ENV ?? "prod",
  },
  transports: [
    new winston.transports.Console(),
    new OpenTelemetryTransportV3(),
  ],
});

// Intentional global interception: forwards ALL console.warn calls in this
// Node.js process to Winston so warns from src/core/ (e.g. SpawnExecution)
// reach Uptrace without coupling core code to the server logger.
const originalConsoleWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  originalConsoleWarn(...args);
  logger.warn(args.map((a) => String(a)).join(" "));
};

// Formats an unknown thrown value into a log-ready string with stack trace.
// Use inside template literals: log.error(`Something failed: ${fmtError(error)}`);
export function formatError(error: unknown): string {
  const err = error instanceof Error ? error : new Error(String(error));
  return `${err.message}${err.stack ? "\n" + err.stack : ""}`;
}

// Export both the main logger and the child logger factory
export { logger };
