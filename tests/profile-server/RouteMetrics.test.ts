// What the HTTP layer actually records (task 0274, S5).
//
// Telemetry.test.ts proves the instruments. This file proves the WIRING — that each
// answer is counted exactly once, under the right outcome, and that no request-
// controlled string can become a label. Two failures this file exists to catch:
//
//   * an unbounded `route` label (req.path / originalUrl) — a scanner would mint a
//     new time series per URL and take the metrics backend down, and a Yandex id in
//     a query string would land in Uptrace (ADR-113).
//   * alert A3 counting `creation_paused` as an error, which would page continuously
//     for as long as an operator has the switch off.

import request from "supertest";
import type { PlayerProfile } from "../../src/core/profile/PlayerProfile";
import {
  createApp,
  type AppOptions,
  type ProfileRepo,
} from "../../src/profile-server/Routes";
import { signSessionToken } from "../../src/profile-server/SessionToken";
import type {
  LoginOutcome,
  ProfileMetrics,
  SessionRejectedReason,
} from "../../src/profile-server/Telemetry";

const SECRET = "0274-metrics-test-secret-0123456789abcdef";
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const CANARY = "zz0274-canary-yandex-id";
const BODY = { platform: "yandex_games", platformUserId: CANARY };

type HttpCall = {
  route: string;
  method: string;
  statusClass: string;
  durationMs: number;
};

function recorder() {
  const logins: Array<{ platform: string; outcome: LoginOutcome }> = [];
  const created: Array<{ platform: string; source: string }> = [];
  const http: HttpCall[] = [];
  const sessions: SessionRejectedReason[] = [];
  const tenure: string[] = [];
  const metrics: ProfileMetrics = {
    loginRequest: (platform, outcome) => logins.push({ platform, outcome }),
    playerCreated: (platform, source) => created.push({ platform, source }),
    httpRequest: (route, method, statusClass, durationMs) =>
      http.push({ route, method, statusClass, durationMs }),
    sessionRejected: (reason) => sessions.push(reason),
    tenureClaim: (outcome) => tenure.push(outcome),
    alertRelay: () => {},
  };
  return { metrics, logins, created, http, sessions, tenure };
}

function fullProfile(): PlayerProfile {
  return {
    schema_version: 1,
    xp: 40,
    is_citizen: false,
    is_paid_citizen: false,
    citizenship_earned_at: null,
    citizenship_purchased_at: null,
    display_name: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };
}

function mockRepo(overrides: Partial<ProfileRepo> = {}): ProfileRepo {
  return {
    ping: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(fullProfile()),
    creditMatchXp: jest.fn(),
    findPlayerByIdentity: jest.fn().mockResolvedValue(null),
    resolveExistingPlayer: jest.fn().mockResolvedValue(null),
    resolveOrCreatePlayer: jest.fn().mockResolvedValue({
      playerId: PLAYER_ID,
      created: true,
      profile: fullProfile(),
    }),
    hasXpGrant: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function app(
  metrics: ProfileMetrics,
  repo: ProfileRepo = mockRepo(),
  options: Omit<AppOptions, "metrics"> = {},
  secret: string = SECRET,
) {
  return createApp(
    repo,
    undefined,
    undefined,
    undefined,
    { secret },
    {
      ...options,
      metrics,
    },
  );
}

describe("POST /v1/login outcomes are counted exactly once each", () => {
  test("a created player", async () => {
    const rec = recorder();
    await request(app(rec.metrics)).post("/v1/login").send(BODY);
    expect(rec.logins).toEqual([
      { platform: "yandex_games", outcome: "created" },
    ]);
  });

  test("an existing player", async () => {
    const rec = recorder();
    const repo = mockRepo({
      resolveOrCreatePlayer: jest.fn().mockResolvedValue({
        playerId: PLAYER_ID,
        created: false,
        profile: fullProfile(),
      }),
    });
    await request(app(rec.metrics, repo)).post("/v1/login").send(BODY);
    expect(rec.logins).toEqual([
      { platform: "yandex_games", outcome: "existing" },
    ]);
  });

  test("a malformed body — and the platform label is 'unknown', never the body value", async () => {
    const rec = recorder();
    await request(app(rec.metrics))
      .post("/v1/login")
      .send({ platform: "steam", platformUserId: CANARY });
    expect(rec.logins).toEqual([
      { platform: "unknown", outcome: "bad_request" },
    ]);
  });

  test("no usable session secret", async () => {
    const rec = recorder();
    await request(app(rec.metrics, mockRepo(), {}, ""))
      .post("/v1/login")
      .send(BODY);
    expect(rec.logins).toEqual([
      { platform: "unknown", outcome: "session_unavailable" },
    ]);
  });

  test("the switch is off and the id is new — creation_paused, which A3 must NOT count as an error", async () => {
    const rec = recorder();
    await request(app(rec.metrics, mockRepo(), { loginCreateEnabled: false }))
      .post("/v1/login")
      .send(BODY);
    expect(rec.logins).toEqual([
      { platform: "yandex_games", outcome: "creation_paused" },
    ]);
  });

  test("the repository threw", async () => {
    const rec = recorder();
    const repo = mockRepo({
      resolveOrCreatePlayer: jest.fn().mockRejectedValue(new Error("db down")),
    });
    await request(app(rec.metrics, repo)).post("/v1/login").send(BODY);
    expect(rec.logins).toEqual([
      { platform: "yandex_games", outcome: "error" },
    ]);
  });

  test("a preflight is not a login — OPTIONS counts nothing", async () => {
    const rec = recorder();
    await request(app(rec.metrics)).options("/v1/login");
    expect(rec.logins).toEqual([]);
  });

  test("no platform id or player id reaches any recorded login metric", async () => {
    const rec = recorder();
    await request(app(rec.metrics)).post("/v1/login").send(BODY);
    const serialized = JSON.stringify([rec.logins, rec.created, rec.http]);
    expect(serialized).not.toContain(CANARY);
    expect(serialized).not.toContain(PLAYER_ID);
  });
});

describe("session.rejected", () => {
  const withToken = (rec: ReturnType<typeof recorder>, header: string) =>
    request(app(rec.metrics)).get("/v1/profile").set("Authorization", header);

  test("an invalid token counts 'invalid' — the value a forged-token spike shows up in", async () => {
    const rec = recorder();
    const res = await withToken(rec, "Bearer not-a-real-token");
    expect(res.status).toBe(401);
    expect(rec.sessions).toEqual(["invalid"]);
  });

  test("a non-Bearer Authorization header is 'invalid' — a header WAS sent", async () => {
    const rec = recorder();
    const res = await withToken(rec, "Basic Zm9vOmJhcg==");
    expect(res.status).toBe(401);
    expect(rec.sessions).toEqual(["invalid"]);
  });

  // Owner ruling (review R9): 'absent' is its own bounded value. Folding it into
  // 'invalid' buried the one attack this counter exists to surface — a forged-token
  // spike — under the benign baseline of clients that have not logged in yet.
  test("a MISSING Authorization header counts 'absent', NOT 'invalid'", async () => {
    const rec = recorder();
    const res = await request(app(rec.metrics)).get("/v1/profile");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "session_invalid" });
    expect(rec.sessions).toEqual(["absent"]);
  });

  test("the wire answer is unchanged by the split — both are still 401 session_invalid", async () => {
    const rec = recorder();
    const absent = await request(app(rec.metrics)).get("/v1/profile");
    const invalid = await withToken(rec, "Bearer not-a-real-token");
    expect([absent.status, invalid.status]).toEqual([401, 401]);
    expect(absent.body).toEqual(invalid.body);
    expect(rec.sessions).toEqual(["absent", "invalid"]);
  });

  test("an expired token counts 'expired'", async () => {
    const rec = recorder();
    const token = signSessionToken(
      SECRET,
      { playerId: PLAYER_ID, platform: "yandex_games" },
      Date.now() - 2 * 86_400_000,
    );
    const res = await withToken(rec, `Bearer ${token.token}`);
    expect(res.status).toBe(401);
    expect(rec.sessions).toEqual(["expired"]);
  });

  test("a valid token counts nothing", async () => {
    const rec = recorder();
    const token = signSessionToken(SECRET, {
      playerId: PLAYER_ID,
      platform: "yandex_games",
    });
    const res = await withToken(rec, `Bearer ${token.token}`);
    expect(res.status).toBe(200);
    expect(rec.sessions).toEqual([]);
  });

  test("⛔ there is no legacy reason — task 0273 deleted the branch it would count", async () => {
    const rec = recorder();
    // A legacy-shaped request carries an id in the query and NO Authorization header,
    // so it is 'absent' now. What matters is unchanged: no reason mentions legacy.
    await request(app(rec.metrics)).get(
      `/v1/profile?yandexPlayerId=${encodeURIComponent(CANARY)}`,
    );
    expect(rec.sessions).toEqual(["absent"]);
    expect(JSON.stringify(rec.sessions)).not.toContain("legacy");
  });

  test("the reason label set is exactly three values — bounded, and no id ever reaches it", async () => {
    const rec = recorder();
    const token = signSessionToken(
      SECRET,
      { playerId: PLAYER_ID, platform: "yandex_games" },
      Date.now() - 2 * 86_400_000,
    );
    await request(app(rec.metrics)).get("/v1/profile");
    await withToken(rec, `Bearer ${CANARY}`);
    await withToken(rec, `Bearer ${token.token}`);
    expect([...new Set(rec.sessions)].sort()).toEqual([
      "absent",
      "expired",
      "invalid",
    ]);
    expect(JSON.stringify(rec.sessions)).not.toContain(CANARY);
  });
});

describe("http.duration labels are bounded route PATTERNS", () => {
  test("a matched route is labelled by its pattern", async () => {
    const rec = recorder();
    await request(app(rec.metrics)).post("/v1/login").send(BODY);
    expect(rec.http).toHaveLength(1);
    expect(rec.http[0]).toMatchObject({
      route: "/v1/login",
      method: "POST",
      statusClass: "2xx",
    });
    expect(rec.http[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  test("an unmatched path is 'unmatched' — a scanner cannot mint time series", async () => {
    const rec = recorder();
    await request(app(rec.metrics)).get(`/nope/${CANARY}`);
    expect(rec.http).toHaveLength(1);
    expect(rec.http[0]).toMatchObject({
      route: "unmatched",
      statusClass: "4xx",
    });
    expect(JSON.stringify(rec.http)).not.toContain(CANARY);
  });

  test("a query string never reaches the label", async () => {
    const rec = recorder();
    await request(app(rec.metrics)).get(
      `/v1/profile?yandexPlayerId=${encodeURIComponent(CANARY)}`,
    );
    expect(rec.http[0].route).toBe("/v1/profile");
    expect(JSON.stringify(rec.http)).not.toContain(CANARY);
  });

  test("a body-parser rejection is timed too — the middleware is mounted BEFORE express.json()", async () => {
    const rec = recorder();
    const res = await request(app(rec.metrics))
      .post("/v1/login")
      .set("Content-Type", "application/json")
      .send('{"platform": broken');
    expect(res.status).toBe(400);
    expect(rec.http).toHaveLength(1);
    expect(rec.http[0].statusClass).toBe("4xx");
  });

  test("status classes are classes, not codes", async () => {
    const rec = recorder();
    const repo = mockRepo({
      resolveOrCreatePlayer: jest.fn().mockRejectedValue(new Error("db down")),
    });
    await request(app(rec.metrics, repo)).post("/v1/login").send(BODY);
    expect(rec.http[0].statusClass).toBe("5xx");
  });

  test("every request is timed exactly once", async () => {
    const rec = recorder();
    const server = app(rec.metrics).listen(0);
    try {
      for (let i = 0; i < 3; i++) {
        await request(server).get("/health");
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
    expect(rec.http).toHaveLength(3);
    expect(rec.http.every((call) => call.route === "/health")).toBe(true);
  });
});

describe("players.created", () => {
  test("createApp does NOT count creations — the repository's post-commit hook does", async () => {
    // The route cannot tell a committed creation from a lost race; only the
    // repository can, which is why the callback lives there (and is tested there).
    const rec = recorder();
    await request(app(rec.metrics)).post("/v1/login").send(BODY);
    expect(rec.created).toEqual([]);
  });
});
