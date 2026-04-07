import {
  BatchSpanProcessor,
  BasicTracerProvider,
} from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { trace } from "@opentelemetry/api";
import * as dotenv from "dotenv";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { getOtelResource } from "./OtelResource";

dotenv.config();

export function initOtelTracing(): void {
  const config = getServerConfigFromServer();

  const headers: Record<string, string> = {};
  if (config.otelAuthHeader()) {
    headers["Authorization"] = "Basic " + config.otelAuthHeader();
  }

  const traceExporter = new OTLPTraceExporter({
    url: `${config.otelEndpoint()}/v1/traces`,
    headers,
  });

  const provider = new BasicTracerProvider({
    resource: getOtelResource(),
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
  });

  trace.setGlobalTracerProvider(provider);
}
