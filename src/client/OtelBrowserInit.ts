import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";
import { flashist_logErrorToAnalytics } from "./flashist/FlashistFacade";

let currentUsername: string | null = null;

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
  } catch (e) {
    flashist_logErrorToAnalytics(
      `OTEL init failed: ${e instanceof Error ? e.message : String(e)}`,
      "Warning",
    );
  }
}
