// OTEL metrics for the profile backend (task 0274, S5).
//
// The profile box had NO telemetry at all: nothing counted a login, a creation or
// a 5xx, so the accepted risk S2 shipped with (login creates a player for any
// asserted id) had no way to be noticed. This module is the "see it" half; the
// switch in LoginCreationSwitch.ts is the "stop it" half.
//
// Deliberately self-contained, exactly like Logger.ts: it must NEVER import
// src/core/configuration/** or src/server/** — the profile image ships src/ but
// not resources/, and a drift test enforces the boundary. The endpoint is read
// LITERALLY from process.env here so the config-parity checker can see it.
//
// ⛔ Hard rules, and the tests that hold them:
//   * No id, token or raw request value may become an attribute. `platform` is
//     normalised through metricPlatform(); `route` is the Express ROUTE PATTERN,
//     never req.path or req.originalUrl.
//   * Every label set is BOUNDED. Unbounded cardinality would take Uptrace down
//     as effectively as an outage.
//   * Export failures never reach a request path, and the warning names the error
//     TYPE only — never a URL, never a message (the endpoint is a host).
//
// Out of scope by plan: log and trace export, and any Shutdown.ts change. Up to
// one export interval (15 s) of metrics is lost on a restart — accepted.

import { type Meter, ValueType } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import * as os from "os";
import type { ResolveSource } from "./PlayerIdentityRepository";

/** Env var name, in one place. Server.ts still reads it literally (parity checker). */
export const OTLP_ENDPOINT_VAR = "OTEL_EXPORTER_OTLP_ENDPOINT";

const METER_NAME = "profile-metrics";
const SERVICE_NAME = "geoconflict-profile";
const EXPORT_INTERVAL_MS = 15_000;
const PLAYERS_ESTIMATE_INTERVAL_MS = 300_000;
/** At most one export-failure warning per this window (a broken path is continuous). */
const EXPORT_WARN_INTERVAL_MS = 600_000;
/** `reltuples` is -1 on a table that was never ANALYZEd — not a count, so not reported. */
const RELTUPLES_NEVER_ANALYZED = -1;

/**
 * Bucket boundaries in milliseconds. 750 is load-bearing: alert A4 pages on the
 * p95 of POST /v1/login crossing 750 ms, and a percentile can only be read off a
 * boundary the histogram actually has.
 */
export const HTTP_DURATION_BUCKETS_MS = [
  5, 10, 25, 50, 75, 100, 250, 500, 750, 1000, 2500, 5000, 10_000,
] as const;

/** The ONLY two platform label values. Never the raw request body value. */
export type MetricPlatform = "yandex_games" | "unknown";

/**
 * How a login ended. `session_unavailable` is not in the design's table: it is a
 * real 503 (no usable session secret) the design did not list, and alert A3 counts
 * it as an error. `creation_paused` deliberately is NOT an error — A3 would page
 * continuously for as long as the switch is off, which is the one time an operator
 * is already looking.
 */
export type LoginOutcome =
  | "existing"
  | "created"
  | "bad_request"
  | "creation_paused"
  | "session_unavailable"
  | "error";

/**
 * Why a Bearer request was refused. Three bounded values (owner ruling, review R9):
 *  - `absent`  — no `Authorization` header at all. This is what a client that has
 *                not logged in yet looks like: high volume and benign.
 *  - `invalid` — a header was sent and it did not verify. THIS is the one an attack
 *                shows up in — a forged-token spike would otherwise be buried inside
 *                the benign `absent` baseline.
 *  - `expired` — a token that verified but is past its 24 h TTL.
 *
 * ⛔ There is NO `legacy_fallback_used`: task 0273 (S4) deleted the legacy caller
 * path, so the branch it would count does not exist. Do not reinstate it.
 */
export type SessionRejectedReason = "expired" | "invalid" | "absent";

/** 2xx…5xx. Bounded on purpose — the raw status code would be a wider label. */
export type StatusClass = "1xx" | "2xx" | "3xx" | "4xx" | "5xx";

/**
 * What became of one alert webhook call (task 0277). Bounded on purpose: the request
 * body is written by whoever can reach the route, so nothing from it may ever reach a
 * label — the discipline `metricPlatform` exists for, one route along.
 */
export type AlertRelayResult =
  | "sent"
  | "sent_after_retry"
  | "deduped"
  | "rejected"
  | "failed"
  | "malformed"
  // Task 0284's liveness probe: reached the route with the right secret, wrote the
  // freshness marker, sent nothing. ⚠️ Not a delivered alert — do not add it to any
  // "alerts sent" sum.
  | "probe";

/**
 * Whether the call could be dedupe-keyed on its alert-event id. A second dimension
 * rather than one more `result` value, so ONE call records both facts and the
 * counter's total still equals the number of webhook calls. 7 × 2 = 14 series.
 */
export type AlertRelayKeyed = "keyed" | "unkeyed";

/** What the routes and repositories record. Nothing here ever throws or awaits. */
export interface ProfileMetrics {
  loginRequest(platform: MetricPlatform, outcome: LoginOutcome): void;
  playerCreated(platform: MetricPlatform, source: ResolveSource): void;
  httpRequest(
    route: string,
    method: string,
    statusClass: StatusClass,
    durationMs: number,
  ): void;
  sessionRejected(reason: SessionRejectedReason): void;
  /** Defined only — task 0253 adds the caller (its route is not in Routes.ts yet). */
  tenureClaim(outcome: string): void;
  /**
   * One webhook call through the alert relay (task 0277).
   *
   * ⚠️ A rule on `result="failed"` is CIRCULAR — the alert about the failed alert
   * path travels the alert path. It catches an INTERMITTENT failure (the next alert
   * gets through carrying the news) and a SUSTAINED one NOT AT ALL. The only
   * non-circular proof is a message that sends unconditionally on a schedule, which
   * is task 0283's daily digest. Do not read this counter as proving delivery.
   */
  alertRelay(result: AlertRelayResult, keyed: AlertRelayKeyed): void;
}

/** The pg Pool surface the gauges need — structural, so tests need no real pool. */
export interface PoolWaiting {
  readonly waitingCount: number;
}

export interface ProfileMetricsDeps {
  pool: PoolWaiting;
  /** `players.reltuples` from pg_class: cheap, approximate, -1 when never analyzed. */
  countPlayersEstimate: () => Promise<number>;
  loginCreateEnabled: boolean;
  /** Test seam only; production uses the 5-minute default. */
  playersEstimateIntervalMs?: number;
}

export interface ProfileMetricsHandle {
  metrics: ProfileMetrics;
  /** Refresh the cached players estimate now. The background timer calls this. */
  refreshPlayersTotal(): Promise<void>;
  /** Stop the refresh timer (tests; the production timer is unref'd anyway). */
  stop(): void;
}

/** Used by tests, and whenever metrics are off. Every call is a no-op. */
export const noopProfileMetrics: ProfileMetrics = {
  loginRequest: () => {},
  playerCreated: () => {},
  httpRequest: () => {},
  sessionRejected: () => {},
  tenureClaim: () => {},
  alertRelay: () => {},
};

/** The one logging call this module makes. */
export interface TelemetryLogger {
  warn(message: string): void;
}

/**
 * Collapse anything a caller hands us into one of two label values. The request
 * body is attacker-controlled, so this is the boundary that keeps a Yandex id out
 * of a metric attribute AND keeps the label set bounded.
 */
export function metricPlatform(raw: unknown): MetricPlatform {
  return raw === "yandex_games" ? "yandex_games" : "unknown";
}

/** The OTLP metrics URL for a base endpoint, trailing slashes trimmed. */
export function metricsExportUrl(endpoint: string): string {
  return `${endpoint.trim().replace(/\/+$/, "")}/v1/metrics`;
}

/** HTTP status → its bounded class label. */
export function statusClassOf(status: number): StatusClass {
  const bucket = Math.floor(status / 100);
  return bucket >= 1 && bucket <= 5
    ? (`${bucket}xx` as StatusClass)
    : // Nothing legitimate lands here; "5xx" keeps the label set closed.
      "5xx";
}

function cpuTimes(): { idle: number; total: number } {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    const times = cpu.times as unknown as Record<string, number>;
    idle += times.idle;
    total += Object.values(times).reduce((sum, t) => sum + t, 0);
  }
  return { idle, total };
}

/**
 * Build every instrument on a meter. Split out from startProfileTelemetry so the
 * tests can collect through an in-memory exporter rather than the network.
 */
export function createProfileMetrics(
  meter: Meter,
  deps: ProfileMetricsDeps,
): ProfileMetricsHandle {
  const loginRequests = meter.createCounter(
    "geoconflict.profile.login.requests",
    { description: "POST /v1/login requests by platform and outcome" },
  );
  const playersCreated = meter.createCounter(
    "geoconflict.profile.players.created",
    { description: "Players created, by platform and which path created them" },
  );
  const httpDuration = meter.createHistogram(
    "geoconflict.profile.http.duration",
    {
      description:
        "HTTP request duration by route pattern, method and status class",
      unit: "ms",
      advice: { explicitBucketBoundaries: [...HTTP_DURATION_BUCKETS_MS] },
    },
  );
  const sessionRejected = meter.createCounter(
    "geoconflict.profile.session.rejected",
    { description: "Bearer session tokens refused, by reason" },
  );
  const tenureClaims = meter.createCounter(
    "geoconflict.profile.tenure.claims",
    {
      description:
        "Tenure XP grant claims by outcome (task 0253 adds the caller)",
    },
  );
  const alertRelayCalls = meter.createCounter(
    "geoconflict.profile.alert.relay",
    {
      description:
        "Alert webhook calls relayed to the operator topic, by result and keying",
    },
  );

  const poolWaiting = meter.createObservableGauge(
    "geoconflict.profile.db.pool.waiting",
    { description: "Requests queued for a free Postgres connection" },
  );
  poolWaiting.addCallback((result) => {
    result.observe(deps.pool.waitingCount);
  });

  // Cached, not queried per export: a count(*) every 15 s on the box's only
  // database would be a monitoring-induced load problem of its own.
  let playersTotal: number | null = null;
  const refreshPlayersTotal = async (): Promise<void> => {
    // Never add a query while requests are already queueing for a connection.
    if (deps.pool.waitingCount > 0) {
      return;
    }
    try {
      const estimate = await deps.countPlayersEstimate();
      if (
        Number.isFinite(estimate) &&
        estimate > RELTUPLES_NEVER_ANALYZED &&
        estimate >= 0
      ) {
        playersTotal = estimate;
      }
    } catch {
      // Swallowed on purpose: a gauge must never turn a DB hiccup into an error
      // path. The last good value keeps being reported; a real outage shows up on
      // /ready and in the error-rate alert instead.
    }
  };
  const playersGauge = meter.createObservableGauge(
    "geoconflict.profile.players.total",
    { description: "Approximate player row count (pg_class.reltuples)" },
  );
  playersGauge.addCallback((result) => {
    // Nothing observed until a real estimate exists — a gap is honest, a 0 or a
    // -1 on the growth dashboard is not.
    if (playersTotal !== null) {
      result.observe(playersTotal);
    }
  });

  const createEnabled = meter.createObservableGauge(
    "geoconflict.profile.login.create_enabled",
    {
      description: "1 when POST /v1/login may create players, 0 when paused",
      valueType: ValueType.INT,
    },
  );
  createEnabled.addCallback((result) => {
    result.observe(deps.loginCreateEnabled ? 1 : 0);
  });

  // Process gauges mirror src/server/WorkerMetrics.ts so the two services read the
  // same way on one dashboard: CPU is a 0–1 ratio with unit "1", memory is bytes.
  let previousCpu = cpuTimes();
  const cpuGauge = meter.createObservableGauge(
    "geoconflict.profile.process.cpu.usage",
    { description: "CPU utilization ratio (0.0–1.0)", unit: "1" },
  );
  cpuGauge.addCallback((result) => {
    const current = cpuTimes();
    const idleDelta = current.idle - previousCpu.idle;
    const totalDelta = current.total - previousCpu.total;
    previousCpu = current;
    result.observe(totalDelta > 0 ? (totalDelta - idleDelta) / totalDelta : 0);
  });

  const rssGauge = meter.createObservableGauge(
    "geoconflict.profile.process.memory.rss",
    { description: "Resident set size", unit: "bytes" },
  );
  const heapUsedGauge = meter.createObservableGauge(
    "geoconflict.profile.process.memory.heap.used",
    { description: "Heap memory used", unit: "bytes" },
  );
  meter.addBatchObservableCallback(
    (result) => {
      const memory = process.memoryUsage();
      result.observe(rssGauge, memory.rss);
      result.observe(heapUsedGauge, memory.heapUsed);
    },
    [rssGauge, heapUsedGauge],
  );

  const timer = setInterval(() => {
    void refreshPlayersTotal();
  }, deps.playersEstimateIntervalMs ?? PLAYERS_ESTIMATE_INTERVAL_MS);
  // Never a reason for the process to stay alive.
  timer.unref?.();

  const metrics: ProfileMetrics = {
    loginRequest: (platform, outcome) => {
      loginRequests.add(1, { platform, outcome });
    },
    playerCreated: (platform, source) => {
      playersCreated.add(1, { platform, source });
    },
    httpRequest: (route, method, statusClass, durationMs) => {
      httpDuration.record(durationMs, {
        route,
        method,
        status_class: statusClass,
      });
    },
    sessionRejected: (reason) => {
      sessionRejected.add(1, { reason });
    },
    tenureClaim: (outcome) => {
      tenureClaims.add(1, { outcome });
    },
    alertRelay: (result, keyed) => {
      alertRelayCalls.add(1, { result, keyed });
    },
  };

  return {
    metrics,
    refreshPlayersTotal,
    stop: () => clearInterval(timer),
  };
}

/**
 * Wire metrics to the telemetry box, or return the no-op set.
 *
 * The endpoint is the ONLY telemetry value this box holds (owner ruling D4): the
 * ingest path is anonymous — the telemetry collector adds the project DSN itself —
 * so there is no DSN, project token or auth header here, and there must never be.
 */
export function startProfileTelemetry(
  log: TelemetryLogger,
  deps: ProfileMetricsDeps,
): ProfileMetrics {
  // LITERAL process.env read: the config-parity checker matches on this text.
  const endpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "").trim();
  if (endpoint.length === 0) {
    // Names the variable only — the value is a host.
    log.warn(
      `${OTLP_ENDPOINT_VAR} is not set — profile metrics are DISABLED, so no alert can fire`,
    );
    return noopProfileMetrics;
  }

  let lastExportWarnAt = 0;
  const exporter = new OTLPMetricExporter({ url: metricsExportUrl(endpoint) });
  const originalExport = exporter.export.bind(exporter);
  // A broken box → Uptrace path is otherwise completely silent. One line per ten
  // minutes, carrying the error's TYPE and nothing else: no URL, no message.
  exporter.export = ((metrics, resultCallback) => {
    originalExport(metrics, (result) => {
      if (result.error !== undefined) {
        const now = Date.now();
        if (now - lastExportWarnAt >= EXPORT_WARN_INTERVAL_MS) {
          lastExportWarnAt = now;
          const name =
            result.error instanceof Error
              ? result.error.name
              : typeof result.error;
          log.warn(`profile metrics export is failing (${name})`);
        }
      }
      resultCallback(result);
    });
  }) as typeof exporter.export;

  const provider = new MeterProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: "1.0.0",
      // os.hostname(), NOT process.env.HOSTNAME: reading HOSTNAME here would add a
      // new variable the config-parity checker has to account for, for nothing.
      "service.instance.id": os.hostname(),
    }),
    readers: [
      new PeriodicExportingMetricReader({
        exporter,
        exportIntervalMillis: EXPORT_INTERVAL_MS,
      }),
    ],
  });

  return createProfileMetrics(provider.getMeter(METER_NAME), deps).metrics;
}
