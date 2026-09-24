// Unit tests for the profile server's OTEL metrics (task 0274, S5).
//
// They collect through a real MeterProvider + InMemoryMetricExporter, so what is
// asserted is what an exporter would actually send — names, attribute KEYS, the
// 750 ms bucket boundary alert A4 needs, and the gauges' skip rules.
//
// ⛔ The hard rule these tests exist for: NO id, token or raw platform value may
// ever become a metric attribute. Cardinality is the other half of the same rule —
// an unbounded label set would take Uptrace down as surely as a leak would breach
// ADR-113.

import type { Meter } from "@opentelemetry/api";
import {
  AggregationTemporality,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  createProfileMetrics,
  metricPlatform,
  metricsExportUrl,
  noopProfileMetrics,
  startProfileTelemetry,
  type ProfileMetricsHandle,
} from "../../src/profile-server/Telemetry";

const CANARY_ID = "zz0274-canary-platform-user-id";
const CANARY_UUID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";

/** Attribute keys each instrument may carry — nothing else is allowed through. */
const ALLOWED_ATTRIBUTE_KEYS: Record<string, readonly string[]> = {
  "geoconflict.profile.login.requests": ["platform", "outcome"],
  "geoconflict.profile.players.created": ["platform", "source"],
  "geoconflict.profile.http.duration": ["route", "method", "status_class"],
  "geoconflict.profile.session.rejected": ["reason"],
  "geoconflict.profile.tenure.claims": ["outcome"],
  "geoconflict.profile.alert.relay": ["result", "keyed"],
  "geoconflict.profile.db.pool.waiting": [],
  "geoconflict.profile.players.total": [],
  "geoconflict.profile.process.cpu.usage": [],
  "geoconflict.profile.process.memory.rss": [],
  "geoconflict.profile.process.memory.heap.used": [],
  "geoconflict.profile.login.create_enabled": [],
};

type Collected = {
  name: string;
  unit: string;
  dataPoints: Array<{ attributes: Record<string, unknown>; value: unknown }>;
};

class Harness {
  readonly meter: Meter;
  private readonly provider: MeterProvider;
  private readonly reader: PeriodicExportingMetricReader;
  private readonly exporter: InMemoryMetricExporter;

  constructor() {
    this.exporter = new InMemoryMetricExporter(AggregationTemporality.DELTA);
    this.reader = new PeriodicExportingMetricReader({
      exporter: this.exporter,
      // Long enough that only the explicit forceFlush() below ever exports.
      exportIntervalMillis: 600_000,
    });
    this.provider = new MeterProvider({ readers: [this.reader] });
    this.meter = this.provider.getMeter("profile-metrics-test");
  }

  async collect(): Promise<Collected[]> {
    await this.reader.forceFlush();
    const out: Collected[] = [];
    for (const resourceMetrics of this.exporter.getMetrics()) {
      for (const scope of resourceMetrics.scopeMetrics) {
        for (const metric of scope.metrics) {
          out.push({
            name: metric.descriptor.name,
            unit: metric.descriptor.unit,
            dataPoints: metric.dataPoints.map((point) => ({
              attributes: point.attributes as Record<string, unknown>,
              value: point.value,
            })),
          });
        }
      }
    }
    return out;
  }

  async shutdown(): Promise<void> {
    await this.provider.shutdown();
  }
}

function find(collected: Collected[], name: string): Collected {
  const metric = collected.find((entry) => entry.name === name);
  if (metric === undefined) {
    throw new Error(
      `metric ${name} was not collected (got: ${collected.map((c) => c.name).join(", ")})`,
    );
  }
  return metric;
}

function makeHandle(
  harness: Harness,
  overrides: {
    waitingCount?: number;
    estimate?: () => Promise<number>;
    loginCreateEnabled?: boolean;
  } = {},
): ProfileMetricsHandle {
  return createProfileMetrics(harness.meter, {
    pool: { waitingCount: overrides.waitingCount ?? 0 },
    countPlayersEstimate: overrides.estimate ?? (() => Promise.resolve(1234)),
    loginCreateEnabled: overrides.loginCreateEnabled ?? true,
  });
}

describe("createProfileMetrics", () => {
  let harness: Harness;
  let handle: ProfileMetricsHandle | undefined;

  beforeEach(() => {
    harness = new Harness();
  });

  afterEach(async () => {
    handle?.stop();
    handle = undefined;
    await harness.shutdown();
  });

  test("records every counter under its geoconflict.profile.* name, with the attributes the dashboard groups by", async () => {
    handle = makeHandle(harness);
    handle.metrics.loginRequest("yandex_games", "created");
    handle.metrics.loginRequest("yandex_games", "existing");
    handle.metrics.loginRequest("yandex_games", "creation_paused");
    handle.metrics.playerCreated("yandex_games", "login");
    handle.metrics.playerCreated("yandex_games", "game_server");
    handle.metrics.sessionRejected("expired");
    handle.metrics.sessionRejected("invalid");
    handle.metrics.sessionRejected("absent");
    handle.metrics.tenureClaim("granted");
    handle.metrics.alertRelay("sent", "keyed");
    handle.metrics.alertRelay("deduped", "keyed");
    handle.metrics.alertRelay("rejected", "unkeyed");
    handle.metrics.httpRequest("/v1/login", "POST", "2xx", 12);

    const collected = await harness.collect();
    const logins = find(collected, "geoconflict.profile.login.requests");
    expect(
      logins.dataPoints.map((point) => point.attributes.outcome).sort(),
    ).toEqual(["created", "creation_paused", "existing"]);
    const created = find(collected, "geoconflict.profile.players.created");
    expect(
      created.dataPoints.map((point) => point.attributes.source).sort(),
    ).toEqual(["game_server", "login"]);
    const rejected = find(collected, "geoconflict.profile.session.rejected");
    // Three bounded reasons (owner ruling, review R9) — and 'legacy' is not one.
    expect(
      rejected.dataPoints.map((point) => point.attributes.reason).sort(),
    ).toEqual(["absent", "expired", "invalid"]);
    expect(JSON.stringify(rejected)).not.toContain("legacy");
    find(collected, "geoconflict.profile.tenure.claims");
    // Task 0277. The label set is bounded by the AlertRelayResult/AlertRelayKeyed
    // types, never by anything in the request body — the body is written by whoever
    // can reach the route, so a free-text label would let a caller mint time series.
    const relay = find(collected, "geoconflict.profile.alert.relay");
    expect(
      relay.dataPoints.map((point) => point.attributes.result).sort(),
    ).toEqual(["deduped", "rejected", "sent"]);
    expect(
      [
        ...new Set(relay.dataPoints.map((point) => point.attributes.keyed)),
      ].sort(),
    ).toEqual(["keyed", "unkeyed"]);
    find(collected, "geoconflict.profile.http.duration");
  });

  test("no instrument carries an attribute key outside its allowlist", async () => {
    handle = makeHandle(harness);
    handle.metrics.loginRequest("unknown", "bad_request");
    handle.metrics.playerCreated("unknown", "login");
    handle.metrics.sessionRejected("invalid");
    handle.metrics.tenureClaim("below_minimum");
    handle.metrics.alertRelay("malformed", "unkeyed");
    handle.metrics.httpRequest("/v1/profile", "GET", "4xx", 3);
    await handle.refreshPlayersTotal();

    for (const metric of await harness.collect()) {
      const allowed = ALLOWED_ATTRIBUTE_KEYS[metric.name];
      expect(allowed).toBeDefined();
      for (const point of metric.dataPoints) {
        expect(Object.keys(point.attributes).sort()).toEqual(
          [...allowed].sort(),
        );
      }
    }
  });

  test("the login-duration histogram has a 750 ms boundary — alert A4 measures p95 against it", async () => {
    handle = makeHandle(harness);
    handle.metrics.httpRequest("/v1/login", "POST", "2xx", 10);
    const histogram = find(
      await harness.collect(),
      "geoconflict.profile.http.duration",
    );
    expect(histogram.unit).toBe("ms");
    const point = histogram.dataPoints[0].value as {
      buckets: { boundaries: number[] };
    };
    expect(point.buckets.boundaries).toContain(750);
  });

  test("the pool gauge reports pg's waiting count", async () => {
    handle = makeHandle(harness, { waitingCount: 4 });
    const gauge = find(
      await harness.collect(),
      "geoconflict.profile.db.pool.waiting",
    );
    expect(gauge.dataPoints[0].value).toBe(4);
  });

  test("players.total reports the cached estimate", async () => {
    handle = makeHandle(harness, { estimate: () => Promise.resolve(4321) });
    await handle.refreshPlayersTotal();
    const gauge = find(
      await harness.collect(),
      "geoconflict.profile.players.total",
    );
    expect(gauge.dataPoints[0].value).toBe(4321);
  });

  test("a reltuples of -1 (never analyzed) is NOT reported — an invented -1 on the dashboard is worse than a gap", async () => {
    handle = makeHandle(harness, { estimate: () => Promise.resolve(-1) });
    await handle.refreshPlayersTotal();
    const collected = await harness.collect();
    expect(
      collected.find(
        (metric) => metric.name === "geoconflict.profile.players.total",
      ),
    ).toBeUndefined();
  });

  test("the estimate query is SKIPPED while the pool has waiters — monitoring must never deepen a pool exhaustion", async () => {
    const estimate = jest.fn().mockResolvedValue(99);
    handle = makeHandle(harness, { waitingCount: 2, estimate });
    await handle.refreshPlayersTotal();
    expect(estimate).not.toHaveBeenCalled();
  });

  test("a failing estimate query is swallowed, and the last good value stays reported", async () => {
    const estimate = jest
      .fn()
      .mockResolvedValueOnce(7)
      .mockRejectedValueOnce(new Error("db down"));
    handle = makeHandle(harness, { estimate });
    await handle.refreshPlayersTotal();
    await expect(handle.refreshPlayersTotal()).resolves.toBeUndefined();
    const gauge = find(
      await harness.collect(),
      "geoconflict.profile.players.total",
    );
    expect(gauge.dataPoints[0].value).toBe(7);
  });

  test("create_enabled is 1 when login creation is on and 0 when it is paused", async () => {
    handle = makeHandle(harness, { loginCreateEnabled: true });
    expect(
      find(await harness.collect(), "geoconflict.profile.login.create_enabled")
        .dataPoints[0].value,
    ).toBe(1);
    handle.stop();

    const paused = new Harness();
    const pausedHandle = createProfileMetrics(paused.meter, {
      pool: { waitingCount: 0 },
      countPlayersEstimate: () => Promise.resolve(0),
      loginCreateEnabled: false,
    });
    expect(
      find(await paused.collect(), "geoconflict.profile.login.create_enabled")
        .dataPoints[0].value,
    ).toBe(0);
    pausedHandle.stop();
    await paused.shutdown();
  });

  test("process gauges mirror the game server's shape (cpu is a 0–1 ratio, memory is bytes)", async () => {
    handle = makeHandle(harness);
    const collected = await harness.collect();
    const cpu = find(collected, "geoconflict.profile.process.cpu.usage");
    expect(cpu.unit).toBe("1");
    expect(cpu.dataPoints[0].value as number).toBeGreaterThanOrEqual(0);
    expect(cpu.dataPoints[0].value as number).toBeLessThanOrEqual(1);
    expect(find(collected, "geoconflict.profile.process.memory.rss").unit).toBe(
      "bytes",
    );
    expect(
      find(collected, "geoconflict.profile.process.memory.heap.used").unit,
    ).toBe("bytes");
  });

  test("no canary id reaches any collected metric (ADR-113)", async () => {
    handle = makeHandle(harness);
    handle.metrics.loginRequest(metricPlatform(CANARY_ID), "created");
    handle.metrics.playerCreated(metricPlatform("yandex_games"), "login");
    handle.metrics.httpRequest("/v1/profile", "GET", "2xx", 5);
    handle.metrics.sessionRejected("invalid");
    await handle.refreshPlayersTotal();
    const serialized = JSON.stringify(await harness.collect());
    expect(serialized).not.toContain(CANARY_ID);
    expect(serialized).not.toContain(CANARY_UUID);
  });
});

describe("metricPlatform", () => {
  test("the only spelling that survives is the one the schema allows", () => {
    expect(metricPlatform("yandex_games")).toBe("yandex_games");
  });

  test.each([CANARY_ID, "", "web", "YANDEX_GAMES", 42, null, undefined])(
    "%p collapses to 'unknown' — the raw body value is never a label",
    (raw) => {
      expect(metricPlatform(raw)).toBe("unknown");
    },
  );
});

describe("metricsExportUrl", () => {
  test.each([
    ["https://otel.example.invalid", "https://otel.example.invalid/v1/metrics"],
    [
      "https://otel.example.invalid/",
      "https://otel.example.invalid/v1/metrics",
    ],
    [
      "https://otel.example.invalid///",
      "https://otel.example.invalid/v1/metrics",
    ],
    [
      "https://otel.example.invalid/base",
      "https://otel.example.invalid/base/v1/metrics",
    ],
  ])("%s → %s", (endpoint, expected) => {
    expect(metricsExportUrl(endpoint)).toBe(expected);
  });
});

describe("startProfileTelemetry", () => {
  const ENDPOINT_VAR = "OTEL_EXPORTER_OTLP_ENDPOINT";
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env[ENDPOINT_VAR];
    delete process.env[ENDPOINT_VAR];
  });

  afterEach(() => {
    if (saved === undefined) {
      delete process.env[ENDPOINT_VAR];
    } else {
      process.env[ENDPOINT_VAR] = saved;
    }
  });

  test("an unset endpoint yields the no-op metrics and ONE warning naming only the variable", () => {
    const warnings: string[] = [];
    const metrics = startProfileTelemetry(
      { warn: (message: string) => warnings.push(message) },
      {
        pool: { waitingCount: 0 },
        countPlayersEstimate: () => Promise.resolve(0),
        loginCreateEnabled: true,
      },
    );
    expect(metrics).toBe(noopProfileMetrics);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain(ENDPOINT_VAR);
  });

  test("the no-op metrics accept every call without throwing", () => {
    expect(() => {
      noopProfileMetrics.loginRequest("yandex_games", "error");
      noopProfileMetrics.playerCreated("unknown", "game_server");
      noopProfileMetrics.httpRequest("/x", "GET", "5xx", 1);
      noopProfileMetrics.sessionRejected("expired");
      noopProfileMetrics.tenureClaim("granted");
      noopProfileMetrics.alertRelay("failed", "unkeyed");
    }).not.toThrow();
  });
});
