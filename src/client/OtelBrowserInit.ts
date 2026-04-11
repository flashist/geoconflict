import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import * as logsAPI from "@opentelemetry/api-logs";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { flashist_logErrorToAnalytics } from "./flashist/FlashistFacade";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";

let currentUsername: string | null = null;
let _otelLogger: logsAPI.Logger | null = null;

export function logOtelWarn(body: string): void {
  if (!_otelLogger) return;
  _otelLogger.emit({
    severityNumber: SeverityNumber.WARN,
    severityText: "WARN",
    body,
    attributes: currentUsername ? { "enduser.id": currentUsername } : {},
  });
}

// setOtelUser is always safe to call — it's a no-op when OTEL is disabled
// (endpoint not set), since currentUsername is only read inside the error
// listeners that are never registered in that case.
export function setOtelUser(username: string): void {
  currentUsername = username;
}

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  try {
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "geoconflict-client",
      [ATTR_SERVICE_VERSION]: process.env.GIT_COMMIT ?? "unknown",
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.DEPLOY_ENV ?? "prod",
    });

    const exporter = new OTLPTraceExporter({
      url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
      timeoutMillis: 5000,
    });

    const provider = new WebTracerProvider({
      resource,
      spanProcessors: [new BatchSpanProcessor(exporter)],
    });
    provider.register();

    const logExporter = new OTLPLogExporter({
      url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/logs`,
      timeoutMillis: 5000,
    });
    const loggerProvider = new LoggerProvider({
      resource,
      processors: [new BatchLogRecordProcessor(logExporter)],
    });
    logsAPI.logs.setGlobalLoggerProvider(loggerProvider);
    const otelLogger = logsAPI.logs.getLogger("geoconflict-client");
    _otelLogger = otelLogger;

    const tracer = trace.getTracer("geoconflict-client");

    // Intercept console.error so caught errors that are logged (not rethrown)
    // also appear in telemetry — e.g. try/catch blocks that call console.error().
    const originalConsoleError = console.error.bind(console);
    let emitting = false;
    console.error = (...args: unknown[]) => {
      originalConsoleError(...args);
      if (emitting) return;
      emitting = true;
      const error = args.find((a): a is Error => a instanceof Error);
      const body = args
        .map((a) => (a instanceof Error ? a.message : String(a)))
        .join(" ");
      try {
        otelLogger.emit({
          severityNumber: SeverityNumber.ERROR,
          severityText: "ERROR",
          body,
          attributes: {
            ...(error
              ? {
                  "exception.type": error.name,
                  "exception.message": error.message,
                  "exception.stacktrace": error.stack ?? "",
                }
              : {}),
            ...(currentUsername ? { "enduser.id": currentUsername } : {}),
          },
        });
      } finally {
        emitting = false;
      }
    };

    window.addEventListener("error", (event) => {
      const error = event.error ?? new Error(event.message);
      const span = tracer.startSpan("unhandled_error");
      span.recordException(error);
      // Mirror exception data as span attributes (recordException only creates span events,
      // which are not visible in Uptrace's ATTRS tab)
      span.setAttribute("exception.type", error.name);
      span.setAttribute("exception.message", error.message);
      span.setAttribute("exception.stacktrace", error.stack ?? "");
      // Location metadata — populated for same-origin errors, empty for cross-origin "Script error."
      if (event.filename) span.setAttribute("error.filename", event.filename);
      if (event.lineno) span.setAttribute("error.lineno", event.lineno);
      if (event.colno) span.setAttribute("error.colno", event.colno);
      // Flag sanitized cross-origin/worker errors so they can be filtered in Uptrace
      if (!event.error) span.setAttribute("error.cross_origin_or_worker", true);
      span.setStatus({ code: SpanStatusCode.ERROR, message: event.message });
      if (currentUsername) span.setAttribute("enduser.id", currentUsername);
      span.end();
      otelLogger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: "ERROR",
        body: error.message,
        attributes: {
          "exception.type": error.name,
          "exception.message": error.message,
          "exception.stacktrace": error.stack ?? "",
          ...(currentUsername ? { "enduser.id": currentUsername } : {}),
        },
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      const span = tracer.startSpan("unhandled_rejection");
      span.recordException(error);
      // Mirror exception data as span attributes (recordException only creates span events)
      span.setAttribute("exception.type", error.name);
      span.setAttribute("exception.message", error.message);
      span.setAttribute("exception.stacktrace", error.stack ?? "");
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      if (currentUsername) span.setAttribute("enduser.id", currentUsername);
      span.end();
      otelLogger.emit({
        severityNumber: SeverityNumber.ERROR,
        severityText: "ERROR",
        body: error.message,
        attributes: {
          "exception.type": error.name,
          "exception.message": error.message,
          "exception.stacktrace": error.stack ?? "",
          ...(currentUsername ? { "enduser.id": currentUsername } : {}),
        },
      });
    });
  } catch (e) {
    flashist_logErrorToAnalytics(
      `OTEL init failed: ${e instanceof Error ? e.message : String(e)}`,
      "Warning",
    );
  }
}
