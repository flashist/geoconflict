// Route tests for task 0325, S2 — SHADOW MODE: POST /v1/login checks an optional
// Yandex signed-player-data `signature`, COUNTS the outcome, and changes nothing
// else. A sibling of LoginRoutes.test.ts (same harness), split out because this file
// mocks the Logger (to prove the signature never reaches a log line) and wraps the
// classifier (to force a throw) — neither should reach the older suite.
// supertest-based, so part of the known supertest flake family (CLAUDE.md).
// Synthetic key, ids and names only.

// Every log line the routes write, so the suite can prove the signature never
// reaches the container log.
const logLines: string[] = [];
jest.mock("../../src/profile-server/Logger", () => {
  const record =
    () =>
    (...args: unknown[]): void => {
      logLines.push(args.map((arg) => String(arg)).join(" "));
    };
  const child = () => ({
    info: record(),
    warn: record(),
    error: record(),
    child,
  });
  return {
    logger: { child },
    formatError: (error: unknown) => String(error),
  };
});

// The real classifier, wrapped in a jest.fn so one test can force it to throw.
jest.mock("../../src/profile-server/LoginVerification", () => {
  const actual = jest.requireActual(
    "../../src/profile-server/LoginVerification",
  );
  return {
    ...actual,
    classifyLoginSignature: jest.fn(actual.classifyLoginSignature),
  };
});

import { createHmac } from "crypto";
import request from "supertest";
import { LoginResponseSchema } from "../../src/core/profile/LoginContract";
import type { PlayerProfile } from "../../src/core/profile/PlayerProfile";
import { classifyLoginSignature } from "../../src/profile-server/LoginVerification";
import { createApp, type ProfileRepo } from "../../src/profile-server/Routes";
import { verifySessionToken } from "../../src/profile-server/SessionToken";
import {
  noopProfileMetrics,
  type LoginVerificationOutcome,
  type ProfileMetrics,
  type StaleSignatureAgeBracket,
} from "../../src/profile-server/Telemetry";

const SESSION_SECRET = "0325-login-session-secret-0123456789abcdef";
const SIGNATURE_SECRET = "0325-synthetic-yandex-player-signature-key";
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const PLATFORM_USER_ID = "zz0325-login-synthetic";
const OTHER_PLATFORM_USER_ID = "zz0325-someone-else";

/** Task 0366: the only values the stale-age label may ever take. */
const STALE_AGE_BRACKETS: readonly StaleSignatureAgeBracket[] = [
  "future_5m_15m",
  "future_over_15m",
  "past_15m_20m",
  "past_20m_30m",
  "past_30m_1h",
  "past_1h_6h",
  "past_6h_24h",
  "past_over_24h",
];

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
    getProfile: jest.fn().mockResolvedValue(null),
    creditMatchXp: jest.fn(),
    findPlayerByIdentity: jest.fn().mockResolvedValue(null),
    resolveExistingPlayer: jest.fn().mockResolvedValue(null),
    resolveOrCreatePlayer: jest.fn().mockResolvedValue({
      playerId: PLAYER_ID,
      created: false,
      profile: fullProfile(),
    }),
    hasXpGrant: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function recordingMetrics(): {
  metrics: ProfileMetrics;
  verifications: LoginVerificationOutcome[];
  staleAges: StaleSignatureAgeBracket[];
} {
  const verifications: LoginVerificationOutcome[] = [];
  const staleAges: StaleSignatureAgeBracket[] = [];
  return {
    metrics: {
      ...noopProfileMetrics,
      loginVerification: (outcome) => verifications.push(outcome),
      loginStaleSignatureAge: (bracket) => staleAges.push(bracket),
    },
    verifications,
    staleAges,
  };
}

/** `null` secret = build the app with NO `playerSignatureSecret` option at all. */
function appWith(
  repo: ProfileRepo,
  metrics: ProfileMetrics,
  playerSignatureSecret: string | null = SIGNATURE_SECRET,
) {
  return createApp(
    repo,
    undefined,
    undefined,
    undefined,
    { secret: SESSION_SECRET },
    playerSignatureSecret === null
      ? { metrics }
      : { metrics, playerSignatureSecret },
  );
}

/** A Yandex-style signed player payload (S0's shape and construction). */
function signFor(
  uniqueID: string,
  issuedAtSec: number = Math.floor(Date.now() / 1000),
  secret: string = SIGNATURE_SECRET,
): string {
  const text = JSON.stringify({
    algorithm: "HMAC-SHA256",
    issuedAt: issuedAtSec,
    requestPayload: "",
    data: {
      id: uniqueID,
      uniqueID,
      publicName: "zz0325 Synthetic Name",
      avatarIdHash: "zz0325-avatar",
    },
  });
  const mac = createHmac("sha256", secret).update(text).digest("base64");
  return `${mac}.${Buffer.from(text).toString("base64")}`;
}

const BASE = { platform: "yandex_games", platformUserId: PLATFORM_USER_ID };

/** The response minus the parts that legitimately differ per request. */
function stableShape(body: unknown): unknown {
  const parsed = LoginResponseSchema.parse(body);
  return {
    ...parsed,
    session: { token: "<token>", expiresAt: "<expiresAt>" },
  };
}

beforeEach(() => {
  logLines.length = 0;
  (classifyLoginSignature as jest.Mock).mockClear();
});

describe("POST /v1/login — signed player data, S2 shadow mode (task 0325)", () => {
  const cases: Array<[string, () => Record<string, unknown>, string]> = [
    [
      "a valid signature",
      () => ({ signature: signFor(PLATFORM_USER_ID) }),
      "ok",
    ],
    [
      "a forged signature",
      () => ({ signature: signFor(PLATFORM_USER_ID, undefined, "wrong-key") }),
      "bad_signature",
    ],
    [
      "a stale signature",
      () => ({
        signature: signFor(
          PLATFORM_USER_ID,
          Math.floor(Date.now() / 1000) - 3600,
        ),
      }),
      "stale",
    ],
    [
      "a valid signature for someone else",
      () => ({ signature: signFor(OTHER_PLATFORM_USER_ID) }),
      "id_mismatch",
    ],
    ["no signature", () => ({}), "absent"],
  ];

  test.each(cases)(
    "%s → 200, the same body shape, a vfy:false token, one outcome recorded",
    async (_label, extra, expectedOutcome) => {
      const { metrics, verifications, staleAges } = recordingMetrics();
      const repo = mockRepo();
      const res = await request(appWith(repo, metrics))
        .post("/v1/login")
        .send({ ...BASE, ...extra() });

      expect(res.status).toBe(200);
      expect(res.headers["cache-control"]).toBe("no-store");
      const baseline = await request(appWith(mockRepo(), noopProfileMetrics))
        .post("/v1/login")
        .send(BASE);
      expect(stableShape(res.body)).toEqual(stableShape(baseline.body));

      const verified = verifySessionToken(
        SESSION_SECRET,
        LoginResponseSchema.parse(res.body).session.token,
      );
      expect(verified.status).toBe("ok");
      expect(verified.status === "ok" && verified.claims.vfy).toBe(false);
      expect(verified.status === "ok" && verified.claims.pid).toBe(PLAYER_ID);

      expect(verifications).toEqual([expectedOutcome]);
      // Task 0366: a bracket exactly once on the stale row, never on any other.
      // (This row sits on the 1 h edge, so which side of it is not asserted here.)
      if (expectedOutcome === "stale") {
        expect(staleAges).toHaveLength(1);
        expect(STALE_AGE_BRACKETS).toContain(staleAges[0]);
      } else {
        expect(staleAges).toEqual([]);
      }
      // The resolve is by the ASSERTED id, exactly as before — in every case.
      expect(repo.resolveOrCreatePlayer).toHaveBeenCalledWith(
        "yandex_games",
        PLATFORM_USER_ID,
        "login",
      );
    },
  );

  test.each<[string, string | null]>([
    ["option absent", null],
    ["empty string (YANDEX_PAYMENTS_SECRET unset)", ""],
  ])(
    "no secret configured (%s) → 200 and `no_secret`",
    async (_label, secret) => {
      const { metrics, verifications } = recordingMetrics();
      const res = await request(appWith(mockRepo(), metrics, secret))
        .post("/v1/login")
        .send({ ...BASE, signature: signFor(PLATFORM_USER_ID) });
      expect(res.status).toBe(200);
      expect(verifications).toEqual(["no_secret"]);
    },
  );

  test("the classifier throwing → 200 and `bad_signature` — the login goes on", async () => {
    (classifyLoginSignature as jest.Mock).mockImplementationOnce(() => {
      throw new Error("synthetic classifier failure");
    });
    const { metrics, verifications } = recordingMetrics();
    const res = await request(appWith(mockRepo(), metrics))
      .post("/v1/login")
      .send({ ...BASE, signature: signFor(PLATFORM_USER_ID) });
    expect(res.status).toBe(200);
    expect(classifyLoginSignature).toHaveBeenCalledTimes(1);
    expect(verifications).toEqual(["bad_signature"]);
  });

  // Task 0366. Ages well away from any edge, so the gap between the test reading
  // the clock and the server reading it cannot move the bracket.
  test.each<[string, number, StaleSignatureAgeBracket]>([
    ["45 min old", -45 * 60, "past_30m_1h"],
    ["10 min ahead", 10 * 60, "future_5m_15m"],
  ])(
    "a stale signature %s → its bracket recorded once",
    async (_label, offsetSec, bracket) => {
      const { metrics, verifications, staleAges } = recordingMetrics();
      const res = await request(appWith(mockRepo(), metrics))
        .post("/v1/login")
        .send({
          ...BASE,
          signature: signFor(
            PLATFORM_USER_ID,
            Math.floor(Date.now() / 1000) + offsetSec,
          ),
        });
      expect(res.status).toBe(200);
      expect(verifications).toEqual(["stale"]);
      expect(staleAges).toEqual([bracket]);
    },
  );

  test("the stale-age recording throwing → the login is unchanged (task 0366)", async () => {
    const verifications: LoginVerificationOutcome[] = [];
    let staleAgeCalls = 0;
    const metrics: ProfileMetrics = {
      ...noopProfileMetrics,
      loginVerification: (outcome) => verifications.push(outcome),
      loginStaleSignatureAge: () => {
        staleAgeCalls += 1;
        throw new Error("synthetic stale-age metric failure");
      },
    };
    const repo = mockRepo();
    const res = await request(appWith(repo, metrics))
      .post("/v1/login")
      .send({
        ...BASE,
        signature: signFor(
          PLATFORM_USER_ID,
          Math.floor(Date.now() / 1000) - 45 * 60,
        ),
      });

    expect(res.status).toBe(200);
    expect(res.headers["cache-control"]).toBe("no-store");
    const baseline = await request(appWith(mockRepo(), noopProfileMetrics))
      .post("/v1/login")
      .send(BASE);
    expect(stableShape(res.body)).toEqual(stableShape(baseline.body));
    const verified = verifySessionToken(
      SESSION_SECRET,
      LoginResponseSchema.parse(res.body).session.token,
    );
    expect(verified.status).toBe("ok");
    expect(verified.status === "ok" && verified.claims.vfy).toBe(false);
    expect(verified.status === "ok" && verified.claims.pid).toBe(PLAYER_ID);
    expect(staleAgeCalls).toBe(1);
    expect(verifications).toEqual(["stale"]);
    expect(repo.resolveOrCreatePlayer).toHaveBeenCalledWith(
      "yandex_games",
      PLATFORM_USER_ID,
      "login",
    );
  });

  test('an empty-string signature is a 400 (the client omits the key, never sends "")', async () => {
    const { metrics, verifications } = recordingMetrics();
    const res = await request(appWith(mockRepo(), metrics))
      .post("/v1/login")
      .send({ ...BASE, signature: "" });
    expect(res.status).toBe(400);
    // Nothing parsed, so nothing is classified or counted.
    expect(verifications).toEqual([]);
  });

  test("the check is counted before the resolve: a paused-creation 503 still records one outcome", async () => {
    const { metrics, verifications } = recordingMetrics();
    const res = await request(
      createApp(
        mockRepo(),
        undefined,
        undefined,
        undefined,
        { secret: SESSION_SECRET },
        {
          metrics,
          playerSignatureSecret: SIGNATURE_SECRET,
          loginCreateEnabled: false,
        },
      ),
    )
      .post("/v1/login")
      .send({ ...BASE, signature: signFor(PLATFORM_USER_ID) });
    expect(res.status).toBe(503);
    expect(verifications).toEqual(["ok"]);
  });

  test("no leak: the signature never reaches a log line or any repository call", async () => {
    const signature = signFor(PLATFORM_USER_ID);
    const [macPart, payloadPart] = signature.split(".");
    // Task 0366: a stale one too, so the stale-age path is covered.
    const staleSignature = signFor(
      PLATFORM_USER_ID,
      Math.floor(Date.now() / 1000) - 45 * 60,
    );
    const [staleMacPart, stalePayloadPart] = staleSignature.split(".");
    // A repository failure forces the one log line this path writes.
    const failing = mockRepo({
      resolveOrCreatePlayer: jest
        .fn()
        .mockRejectedValue(new Error("synthetic db failure")),
    });
    const ok = mockRepo();
    const failingStale = mockRepo({
      resolveOrCreatePlayer: jest
        .fn()
        .mockRejectedValue(new Error("synthetic db failure")),
    });
    const okStale = mockRepo();
    const { metrics, staleAges } = recordingMetrics();
    const failed = await request(appWith(failing, metrics))
      .post("/v1/login")
      .send({ ...BASE, signature });
    expect(failed.status).toBe(500);
    await request(appWith(ok, metrics))
      .post("/v1/login")
      .send({ ...BASE, signature });
    const failedStale = await request(appWith(failingStale, metrics))
      .post("/v1/login")
      .send({ ...BASE, signature: staleSignature });
    expect(failedStale.status).toBe(500);
    await request(appWith(okStale, metrics))
      .post("/v1/login")
      .send({ ...BASE, signature: staleSignature });

    // Every recorded bracket is one of the fixed values — nothing from the request.
    expect(staleAges).toHaveLength(2);
    for (const bracket of staleAges) {
      expect(STALE_AGE_BRACKETS).toContain(bracket);
    }

    expect(logLines.length).toBeGreaterThan(0); // the capture really works
    const logged = logLines.join("\n");
    const repoCalls = JSON.stringify(
      [failing, ok, failingStale, okStale].flatMap((repo) =>
        Object.values(repo).map((fn) => (fn as jest.Mock).mock?.calls ?? []),
      ),
    );
    for (const text of [logged, repoCalls]) {
      expect(text).not.toContain(signature);
      expect(text).not.toContain(macPart);
      expect(text).not.toContain(payloadPart);
      expect(text).not.toContain(staleSignature);
      expect(text).not.toContain(staleMacPart);
      expect(text).not.toContain(stalePayloadPart);
    }
  });
});
