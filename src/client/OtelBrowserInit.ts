import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from "@opentelemetry/semantic-conventions";

let currentUsername: string | null = null;

// setOtelUser is always safe to call — it's a no-op when OTEL is disabled
// (endpoint not set or DEPLOY_ENV === "dev"), since currentUsername is only
// read inside the error listeners that are never registered in that case.
export function setOtelUser(username: string): void {
  currentUsername = username;
}

if (process.env.DEPLOY_ENV !== "dev" && process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: "geoconflict-client",
    [ATTR_SERVICE_VERSION]: process.env.GIT_COMMIT ?? "unknown",
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.DEPLOY_ENV ?? "prod",
  });

  const exporter = new OTLPTraceExporter({
    url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
  });

  const provider = new WebTracerProvider({ resource });
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register();

  const tracer = trace.getTracer("geoconflict-client");

  window.addEventListener("error", (event) => {
    const span = tracer.startSpan("unhandled_error");
    span.recordException(event.error ?? new Error(event.message));
    span.setStatus({ code: SpanStatusCode.ERROR, message: event.message });
    if (currentUsername) span.setAttribute("enduser.id", currentUsername);
    span.end();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const span = tracer.startSpan("unhandled_rejection");
    const error =
      event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    if (currentUsername) span.setAttribute("enduser.id", currentUsername);
    span.end();
  });
}
