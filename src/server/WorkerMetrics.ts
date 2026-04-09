import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import * as dotenv from "dotenv";
import * as os from "os";
import { monitorEventLoopDelay } from "perf_hooks";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { GameManager } from "./GameManager";
import { getOtelResource, getPromLabels } from "./OtelResource";

dotenv.config();

function getCpuTimes(): { idle: number; total: number } {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    const times = cpu.times as Record<string, number>;
    idle += times.idle;
    // Include steal/guest if present (Linux VMs report hypervisor overhead here)
    total += Object.values(times).reduce((sum, t) => sum + t, 0);
  }
  return { idle, total };
}

export function initWorkerMetrics(gameManager: GameManager): void {
  const config = getServerConfigFromServer();
  const resource = getOtelResource();

  const headers: Record<string, string> = {};
  if (config.otelEnabled() && config.otelAuthHeader()) {
    headers["Authorization"] = "Basic " + config.otelAuthHeader();
  }

  const metricExporter = new OTLPMetricExporter({
    url: `${config.otelEndpoint()}/v1/metrics`,
    headers,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15000,
  });

  const meterProvider = new MeterProvider({
    resource,
    readers: [metricReader],
  });

  const meter = meterProvider.getMeter("worker-metrics");

  // --- Existing metrics ---

  const activeGamesGauge = meter.createObservableGauge(
    "geoconflict.server.games.active",
    { description: "Number of active games on this worker" },
  );

  const connectedClientsGauge = meter.createObservableGauge(
    "geoconflict.server.clients.connected",
    { description: "Number of connected clients on this worker" },
  );

  activeGamesGauge.addCallback((result) => {
    result.observe(gameManager.activeGames(), getPromLabels());
  });

  connectedClientsGauge.addCallback((result) => {
    result.observe(gameManager.activeClients(), getPromLabels());
  });

  // --- New system metrics ---

  // CPU usage (percent)
  let prevCpu = getCpuTimes();

  const cpuGauge = meter.createObservableGauge(
    "geoconflict.server.cpu.usage",
    { description: "CPU usage percentage", unit: "percent" },
  );

  cpuGauge.addCallback((result) => {
    const curr = getCpuTimes();
    const idleDelta = curr.idle - prevCpu.idle;
    const totalDelta = curr.total - prevCpu.total;
    const usage = totalDelta > 0 ? ((totalDelta - idleDelta) / totalDelta) * 100 : 0;
    prevCpu = curr;
    result.observe(usage, getPromLabels());
  });

  // Memory: heap used, heap total, RSS — single snapshot per export cycle via batch callback
  const heapUsedGauge = meter.createObservableGauge(
    "geoconflict.server.memory.heap.used",
    { description: "Heap memory used", unit: "bytes" },
  );

  const heapTotalGauge = meter.createObservableGauge(
    "geoconflict.server.memory.heap.total",
    { description: "Total heap memory allocated", unit: "bytes" },
  );

  const rssGauge = meter.createObservableGauge(
    "geoconflict.server.memory.rss",
    { description: "Resident set size", unit: "bytes" },
  );

  meter.addBatchObservableCallback((result) => {
    const mem = process.memoryUsage();
    result.observe(heapUsedGauge, mem.heapUsed, getPromLabels());
    result.observe(heapTotalGauge, mem.heapTotal, getPromLabels());
    result.observe(rssGauge, mem.rss, getPromLabels());
  }, [heapUsedGauge, heapTotalGauge, rssGauge]);

  // Event loop lag
  const eventLoopHistogram = monitorEventLoopDelay({ resolution: 20 });
  eventLoopHistogram.enable();

  const eventLoopLagGauge = meter.createObservableGauge(
    "geoconflict.server.eventloop.lag",
    { description: "Event loop lag", unit: "ms" },
  );

  eventLoopLagGauge.addCallback((result) => {
    const lagMs = eventLoopHistogram.mean / 1e6; // nanoseconds → milliseconds
    eventLoopHistogram.reset();
    result.observe(lagMs, getPromLabels());
  });

  // Network I/O (cumulative counters)
  const bytesSentCounter = meter.createObservableCounter(
    "geoconflict.server.network.bytes_sent",
    { description: "Total bytes sent via WebSocket", unit: "bytes" },
  );

  const bytesRecvCounter = meter.createObservableCounter(
    "geoconflict.server.network.bytes_recv",
    { description: "Total bytes received via WebSocket", unit: "bytes" },
  );

  bytesSentCounter.addCallback((result) => {
    result.observe(gameManager.totalBytesSent(), getPromLabels());
  });

  bytesRecvCounter.addCallback((result) => {
    result.observe(gameManager.totalBytesReceived(), getPromLabels());
  });

  // Active matches (games currently processing turns)
  const turnsActiveGauge = meter.createObservableGauge(
    "geoconflict.server.matches.active",
    { description: "Number of matches currently started on this worker" },
  );

  turnsActiveGauge.addCallback((result) => {
    result.observe(gameManager.activeMatches(), getPromLabels());
  });

  console.log("Metrics initialized with GameManager");
}
