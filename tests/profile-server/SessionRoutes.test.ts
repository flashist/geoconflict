// The session funnel across every PUBLIC route: the Bearer token, and NOTHING else
// (tasks 0271 S2 + 0273 S4) — plus the shared CORS preflight and the "no ids in any
// log line" guarantee (0271 brief checks 2, 3, 5, 6).
//
// ⚠️ Task 0273 (S4), owner ruling D1, removed the legacy client-asserted Yandex-id
// fallback. The cases that used to prove it worked now prove it is GONE: a legacy id
// with no Authorization header is 401 `session_invalid`, and a malformed one is 401
// too (it used to be 400). Nothing about a public route reads `yandexPlayerId`.

import { Writable } from "stream";
import request from "supertest";
import winston from "winston";
import { logger } from "../../src/profile-server/Logger";
import {
  createApp,
  type InboxRepo,
  type NameChangeRepo,
  type PaymentsRepo,
  type ProfileRepo,
} from "../../src/profile-server/Routes";
import { signSessionToken } from "../../src/profile-server/SessionToken";

const SECRET = "0271-session-routes-secret-0123456789ab";
const OTHER_SECRET = "0271-session-routes-other-fedcba987654";
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
// A Yandex id the identity mock DOES know — so a case that still 401s proves the
// fallback is gone, not merely that the id was unrecognized.
const KNOWN = "zz0271-known-legacy";
const PAYMENTS_SECRET = "0271-payments-secret";

const PROFILE = {
  schema_version: 1 as const,
  xp: 10,
  is_citizen: true,
  is_paid_citizen: false,
  citizenship_earned_at: null,
  citizenship_purchased_at: null,
  display_name: null,
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
};

interface Mocks {
  repo: ProfileRepo;
  inbox: InboxRepo;
  nameChange: NameChangeRepo;
  payments: PaymentsRepo;
}

function mocks(): Mocks {
  return {
    repo: {
      ping: jest.fn().mockResolvedValue(undefined),
      getProfile: jest.fn().mockResolvedValue(PROFILE),
      creditMatchXp: jest.fn(),
      findPlayerByIdentity: jest
        .fn()
        .mockImplementation(async (_platform: string, id: string) =>
          id === KNOWN ? PLAYER_ID : null,
        ),
      resolveExistingPlayer: jest.fn().mockResolvedValue(null),
      resolveOrCreatePlayer: jest.fn(),
      hasXpGrant: jest.fn().mockResolvedValue(false),
    },
    inbox: {
      listMessages: jest.fn().mockResolvedValue({ status: "ok", messages: [] }),
      markRead: jest.fn().mockResolvedValue({ status: "ok", updated: 0 }),
      sendMessage: jest.fn(),
    },
    nameChange: {
      requestNameChange: jest.fn().mockResolvedValue({ status: "ok", id: 1 }),
      cancelNameChange: jest.fn().mockResolvedValue({ status: "ok" }),
      decideNameChange: jest.fn(),
      getLatestState: jest.fn().mockResolvedValue(null),
    },
    payments: {
      createIntent: jest
        .fn()
        .mockResolvedValue("22222222-3333-4444-8555-666666666666"),
      findIntent: jest.fn(),
      getProcessedPurchase: jest.fn(),
      grantPaidPurchase: jest.fn(),
    },
  };
}

function appWith(m: Mocks, secret: string | null = SECRET) {
  return createApp(
    m.repo,
    { paymentsRepo: m.payments, yandexPaymentsSecret: PAYMENTS_SECRET },
    m.inbox,
    m.nameChange,
    secret === null ? undefined : { secret },
  );
}

function tokenFor(secret = SECRET, nowMs = Date.now()): string {
  return signSessionToken(
    secret,
    { playerId: PLAYER_ID, platform: "yandex_games" },
    nowMs,
  ).token;
}

function flipMiddleMacChar(token: string): string {
  const [version, payload, mac] = token.split(".");
  const flipped = mac[20] === "A" ? "B" : "A";
  return `${version}.${payload}.${mac.slice(0, 20)}${flipped}${mac.slice(21)}`;
}

interface PublicRoute {
  name: string;
  method: "get" | "patch" | "post";
  path: string;
  /** Body for a non-GET, without any caller id. */
  body?: Record<string, unknown>;
  okStatus: number;
  /**
   * The answer when the TOKEN is valid but the player behind it is not usable —
   * the profile row is gone (404 on profile and intent) or the SQL citizen gate
   * refuses (403 on inbox and name change). This is the behaviour task 0273
   * deliberately KEEPS after removing the legacy fallback.
   */
  missingPlayerStatus: number;
  /** Rig the mocks so the route hits that "player not usable" answer. */
  rigMissingPlayer: (m: Mocks) => void;
  /** The repository call that proves the route acted for PLAYER_ID. */
  acted: (m: Mocks) => jest.Mock;
  actedWith: unknown[];
}

const ROUTES: PublicRoute[] = [
  {
    name: "GET /v1/profile",
    method: "get",
    path: "/v1/profile",
    okStatus: 200,
    missingPlayerStatus: 404,
    rigMissingPlayer: (m) => {
      (m.repo.getProfile as jest.Mock).mockResolvedValue(null);
    },
    acted: (m) => m.repo.getProfile as jest.Mock,
    actedWith: [PLAYER_ID],
  },
  {
    name: "GET /v1/messages",
    method: "get",
    path: "/v1/messages",
    okStatus: 200,
    missingPlayerStatus: 403,
    rigMissingPlayer: (m) => {
      (m.inbox.listMessages as jest.Mock).mockResolvedValue({
        status: "not_citizen",
      });
    },
    acted: (m) => m.inbox.listMessages as jest.Mock,
    actedWith: [PLAYER_ID],
  },
  {
    name: "PATCH /v1/messages/read",
    method: "patch",
    path: "/v1/messages/read",
    body: {},
    okStatus: 200,
    missingPlayerStatus: 403,
    rigMissingPlayer: (m) => {
      (m.inbox.markRead as jest.Mock).mockResolvedValue({
        status: "not_citizen",
      });
    },
    acted: (m) => m.inbox.markRead as jest.Mock,
    actedWith: [PLAYER_ID, undefined],
  },
  {
    name: "POST /v1/profile/name-change-request",
    method: "post",
    path: "/v1/profile/name-change-request",
    body: { requestedName: "NewName" },
    okStatus: 200,
    missingPlayerStatus: 403,
    rigMissingPlayer: (m) => {
      (m.nameChange.requestNameChange as jest.Mock).mockResolvedValue({
        status: "not_citizen",
      });
    },
    acted: (m) => m.nameChange.requestNameChange as jest.Mock,
    actedWith: [PLAYER_ID, "NewName"],
  },
  {
    name: "POST /v1/profile/name-change-cancel",
    method: "post",
    path: "/v1/profile/name-change-cancel",
    body: {},
    okStatus: 200,
    missingPlayerStatus: 403,
    rigMissingPlayer: (m) => {
      (m.nameChange.cancelNameChange as jest.Mock).mockResolvedValue({
        status: "not_citizen",
      });
    },
    acted: (m) => m.nameChange.cancelNameChange as jest.Mock,
    actedWith: [PLAYER_ID],
  },
  {
    name: "POST /v1/payments/yandex/intent",
    method: "post",
    path: "/v1/payments/yandex/intent",
    body: { productId: "citizenship" },
    okStatus: 200,
    missingPlayerStatus: 404,
    // The FK is what notices: token routes do no identity lookup, so the insert
    // is the first thing to see the player is gone.
    rigMissingPlayer: (m) => {
      (m.payments.createIntent as jest.Mock).mockRejectedValue(
        Object.assign(new Error("violates foreign key constraint"), {
          code: "23503",
        }),
      );
    },
    acted: (m) => m.payments.createIntent as jest.Mock,
    actedWith: [PLAYER_ID, "citizenship"],
  },
];

/** Send `route` with an optional Authorization header and optional legacy id. */
function send(
  app: ReturnType<typeof appWith>,
  route: PublicRoute,
  options: { authorization?: string; legacyId?: string } = {},
) {
  const { authorization, legacyId } = options;
  const path =
    route.method === "get" && legacyId !== undefined
      ? `${route.path}?yandexPlayerId=${encodeURIComponent(legacyId)}`
      : route.path;
  let req = request(app)[route.method](path);
  if (authorization !== undefined) {
    req = req.set("Authorization", authorization);
  }
  if (route.method === "get") {
    return req;
  }
  return req.send(
    legacyId === undefined
      ? (route.body ?? {})
      : { ...route.body, yandexPlayerId: legacyId },
  );
}

describe.each(ROUTES)("resolveCaller — $name", (route) => {
  test("Bearer only → ok for the token's player, with no identity lookup", async () => {
    const m = mocks();
    const res = await send(appWith(m), route, {
      authorization: `Bearer ${tokenFor()}`,
    });
    expect(res.status).toBe(route.okStatus);
    expect(route.acted(m)).toHaveBeenCalledWith(...route.actedWith);
    expect(m.repo.findPlayerByIdentity).not.toHaveBeenCalled();
    expect(m.repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
  });

  test.each<[string, () => string]>([
    ["a tampered token", () => `Bearer ${flipMiddleMacChar(tokenFor())}`],
    [
      "a token signed with the wrong key",
      () => `Bearer ${tokenFor(OTHER_SECRET)}`,
    ],
    [
      "a wrong version prefix",
      () => `Bearer ${tokenFor().replace(/^v1\./, "v2.")}`,
    ],
    ["a non-Bearer scheme", () => `Basic ${tokenFor()}`],
    ["an empty Bearer", () => "Bearer "],
  ])(
    "%s → 401 session_invalid, readable cross-origin",
    async (_label, header) => {
      const m = mocks();
      const res = await send(appWith(m), route, { authorization: header() });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "session_invalid" });
      expect(res.headers["access-control-allow-origin"]).toBe("*");
      expect(route.acted(m)).not.toHaveBeenCalled();
    },
  );

  test("an expired token → 401 session_expired", async () => {
    const m = mocks();
    const res = await send(appWith(m), route, {
      authorization: `Bearer ${tokenFor(SECRET, Date.now() - 2 * 86_400_000)}`,
    });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "session_expired" });
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  test("an invalid Bearer NEVER falls back to a valid legacy id sent alongside it", async () => {
    const m = mocks();
    const res = await send(appWith(m), route, {
      authorization: `Bearer ${flipMiddleMacChar(tokenFor())}`,
      legacyId: KNOWN,
    });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "session_invalid" });
    expect(m.repo.findPlayerByIdentity).not.toHaveBeenCalled();
    expect(route.acted(m)).not.toHaveBeenCalled();
  });

  test("a Bearer with no usable session secret → 503 session_unavailable", async () => {
    const m = mocks();
    const res = await send(appWith(m, null), route, {
      authorization: `Bearer ${tokenFor()}`,
    });
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ error: "session_unavailable" });
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(route.acted(m)).not.toHaveBeenCalled();
  });

  // ── Task 0273 (S4): the legacy fallback is GONE ──────────────────────────
  // This is the removal's regression guard. Restoring the fallback in
  // resolveCaller turns every one of these red.
  test("a KNOWN legacy id and no header → 401 session_invalid, no identity lookup, no work", async () => {
    const m = mocks();
    const res = await send(appWith(m), route, { legacyId: KNOWN });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "session_invalid" });
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(m.repo.findPlayerByIdentity).not.toHaveBeenCalled();
    expect(m.repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
    expect(route.acted(m)).not.toHaveBeenCalled();
  });

  test("an unknown legacy id → the same 401, indistinguishable from a known one", async () => {
    const m = mocks();
    const res = await send(appWith(m), route, { legacyId: "zz0271-ghost" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "session_invalid" });
    expect(route.acted(m)).not.toHaveBeenCalled();
  });

  // It used to be 400 bad_request, because a legacy id was parsed as input.
  test("a MALFORMED legacy id → 401, no longer 400", async () => {
    const m = mocks();
    const res = await send(appWith(m), route, { legacyId: "" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "session_invalid" });
    expect(m.repo.findPlayerByIdentity).not.toHaveBeenCalled();
  });

  test("a legacy id with no session secret configured → 401 as well", async () => {
    const m = mocks();
    const res = await send(appWith(m, null), route, { legacyId: KNOWN });
    expect(res.status).toBe(401);
    expect(route.acted(m)).not.toHaveBeenCalled();
  });

  test("no token at all → 401 session_invalid (owner ruling D4)", async () => {
    const m = mocks();
    const res = await send(appWith(m), route);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "session_invalid" });
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(m.repo.findPlayerByIdentity).not.toHaveBeenCalled();
  });

  // KEPT by 0273: a valid token whose player is gone / not a citizen still gets
  // each route's own answer (404 profile & intent, 403 inbox & name change).
  test("a valid token whose player is not usable → the route's own 404/403", async () => {
    const m = mocks();
    route.rigMissingPlayer(m);
    const res = await send(appWith(m), route, {
      authorization: `Bearer ${tokenFor()}`,
    });
    expect(res.status).toBe(route.missingPlayerStatus);
    expect(m.repo.findPlayerByIdentity).not.toHaveBeenCalled();
    expect(m.repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
  });
});

describe("payments intent for a token whose player no longer exists", () => {
  test("pg 23503 on createIntent → 404 not_found, not 500", async () => {
    const m = mocks();
    (m.payments.createIntent as jest.Mock).mockRejectedValue(
      Object.assign(new Error("insert violates foreign key constraint"), {
        code: "23503",
      }),
    );
    const res = await request(appWith(m))
      .post("/v1/payments/yandex/intent")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ productId: "citizenship" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });

  test("any other createIntent failure is still 500", async () => {
    const m = mocks();
    (m.payments.createIntent as jest.Mock).mockRejectedValue(
      new Error("db down"),
    );
    const res = await request(appWith(m))
      .post("/v1/payments/yandex/intent")
      .set("Authorization", `Bearer ${tokenFor()}`)
      .send({ productId: "citizenship" });
    expect(res.status).toBe(500);
  });
});

describe("CORS preflight on every public route", () => {
  test.each([
    ["/v1/login", "POST"],
    ["/v1/profile", "GET"],
    ["/v1/messages", "GET"],
    ["/v1/messages/read", "PATCH"],
    ["/v1/profile/name-change-request", "POST"],
    ["/v1/profile/name-change-cancel", "POST"],
    ["/v1/payments/yandex/intent", "POST"],
  ])(
    "OPTIONS %s → 204 with Authorization allowed and Max-Age",
    async (path, method) => {
      const m = mocks();
      const res = await request(appWith(m))
        .options(path)
        .set("Origin", "https://geoconflict.ru")
        .set("Access-Control-Request-Method", method)
        .set("Access-Control-Request-Headers", "authorization");
      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe("*");
      expect(res.headers["access-control-allow-methods"]).toContain(method);
      expect(res.headers["access-control-allow-headers"]).toBe(
        "Content-Type, Authorization",
      );
      expect(res.headers["access-control-max-age"]).toBe("7200");
      expect(m.repo.findPlayerByIdentity).not.toHaveBeenCalled();
    },
  );

  test("70 preflights on /v1/profile never reach the 60/min limiter", async () => {
    // One listening server for the loop — see LoginRoutes.test.ts's limiter test.
    const server = appWith(mocks()).listen(0);
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 70; i++) {
        statuses.push((await request(server).options("/v1/profile")).status);
      }
      expect(statuses.filter((status) => status !== 204)).toEqual([]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test("/internal/* gets no CORS header — preflight or request", async () => {
    const app = appWith(mocks());
    const preflight = await request(app)
      .options("/internal/v1/credit")
      .set("Origin", "https://geoconflict.ru")
      .set("Access-Control-Request-Method", "POST");
    expect(preflight.headers["access-control-allow-origin"]).toBeUndefined();
    const malformed = await request(app)
      .post("/internal/v1/credit")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(malformed.status).toBe(400);
    expect(malformed.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("no token, platform id, player id or secret in any log line (brief check 5)", () => {
  const SYNTHETIC_ID = "zz0271leakprobe42";

  /** Every window of `size` characters of `value` — catches a truncated echo too. */
  function windows(value: string, size: number): string[] {
    const out: string[] = [];
    for (let i = 0; i + size <= value.length; i++) {
      out.push(value.slice(i, i + size));
    }
    return out;
  }

  test("login, a failing login, malformed JSON carrying the id, a tampered Bearer and legacy calls", async () => {
    const chunks: string[] = [];
    const capture = new winston.transports.Stream({
      stream: new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(String(chunk));
          callback();
        },
      }),
    });
    logger.add(capture);
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const consoleWarn = jest
      .spyOn(console, "warn")
      .mockImplementation(() => {});
    try {
      const m = mocks();
      (m.repo.resolveOrCreatePlayer as jest.Mock).mockResolvedValue({
        playerId: PLAYER_ID,
        created: true,
        profile: PROFILE,
      });
      const app = appWith(m);
      // Production shape: Express skips its default error logging only when env is
      // "test" (jest's NODE_ENV). The profile image sets no NODE_ENV, so reproduce that.
      app.set("env", "development");

      const login = await request(app)
        .post("/v1/login")
        .send({ platform: "yandex_games", platformUserId: SYNTHETIC_ID });
      expect(login.status).toBe(200);
      const token: string = login.body.session.token;

      const failing = mocks();
      (failing.repo.resolveOrCreatePlayer as jest.Mock).mockRejectedValue(
        new Error("connection terminated"),
      );
      const failingApp = appWith(failing);
      failingApp.set("env", "development");
      expect(
        (
          await request(failingApp)
            .post("/v1/login")
            .send({ platform: "yandex_games", platformUserId: SYNTHETIC_ID })
        ).status,
      ).toBe(500);

      const malformed = await request(app)
        .post("/v1/login")
        .set("Content-Type", "application/json")
        .send(`{"platform":"yandex_games","platformUserId": ${SYNTHETIC_ID}}`);
      expect(malformed.status).toBe(400);

      expect(
        (
          await request(app)
            .get("/v1/profile")
            .set("Authorization", `Bearer ${flipMiddleMacChar(token)}`)
        ).status,
      ).toBe(401);
      expect(
        (
          await request(app)
            .get("/v1/profile")
            .set("Authorization", `Bearer ${token}`)
        ).status,
      ).toBe(200);
      await request(app).get(`/v1/profile?yandexPlayerId=${SYNTHETIC_ID}`);
      await request(app)
        .post("/v1/profile/name-change-request")
        .send({ yandexPlayerId: SYNTHETIC_ID, requestedName: "NewName" });

      const captured = [
        ...chunks,
        ...consoleError.mock.calls.map((call) => call.map(String).join(" ")),
        ...consoleWarn.mock.calls.map((call) => call.map(String).join(" ")),
      ].join("\n");
      // Not vacuous: the failing login DID log through the captured transport.
      expect(captured).toContain("POST /v1/login failed");

      const leaks = [
        ...windows(SYNTHETIC_ID, 8),
        ...windows(PLAYER_ID, 8),
        ...windows(token, 12),
        ...windows(SECRET, 8),
      ].filter((fragment) => captured.includes(fragment));
      expect(leaks).toEqual([]);
    } finally {
      logger.remove(capture);
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    }
  });
});
