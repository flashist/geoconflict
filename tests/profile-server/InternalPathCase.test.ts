// Task 0276 — case variants of an internal path must NOT reach an internal handler.
//
// nginx's `location /internal/` is a PREFIX location, and nginx prefix matching is
// case-SENSITIVE. Express 4 routes case-INSENSITIVELY by default. So before this
// task, `POST /INTERNAL/v1/credit` missed the nginx allowlist block entirely, fell
// through to `location /`, was proxied, and Express routed it to the internal
// handler — where only PROFILE_INTERNAL_TOKEN stood between the whole internet and
// a write. The token holds (internalAuth fails closed), but there is no rate limiter
// on any internal route, so what was lost is the NETWORK layer of the pair that
// InternalAuth.ts:3-7 explicitly argues for.
//
// The app half of the fix is one line in createApp:
//   app.set("case sensitive routing", true)
// ⚠️ It must sit ABOVE the first app.use — Express 4 builds its router lazily on the
// first route registration and reads app settings AT THAT MOMENT. Set it later and
// it silently does nothing, and every assertion below would pass for the wrong
// reason. The nginx half (`location ~* ^/internal/`) lives in setup-profile.sh and is
// gated by tests/scripts/profile-deploy-hardening.test.sh, not here.
//
// A NEW file rather than more cases in Routes.test.ts: this is one property of the
// app, asserted across every internal route at once, and it kept clear of task 0274's
// parallel edits to Routes.test.ts.

import request from "supertest";
import { ALERT_WEBHOOK_PATH } from "../../src/profile-server/AlertRelay";
import {
  createApp,
  type InboxRepo,
  type NameChangeRepo,
  type ProfileRepo,
} from "../../src/profile-server/Routes";
import type { ProfileMetrics } from "../../src/profile-server/Telemetry";
import { TEST_SESSION_CONFIG } from "./support/sessionToken";

const RELAY_SECRET = "test-relay-secret";

const TOKEN = "test-internal-token";
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";

/** The three plain case variants an attacker gets for free. */
const CASE_PREFIXES = ["/INTERNAL", "/Internal", "/iNtErNaL"] as const;

function mockRepo(): ProfileRepo {
  return {
    ping: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(null),
    creditMatchXp: jest.fn().mockResolvedValue({
      status: "credited",
      citizenshipNewlyGranted: false,
    }),
    findPlayerByIdentity: jest.fn().mockResolvedValue(null),
    resolveExistingPlayer: jest.fn().mockResolvedValue(null),
    resolveOrCreatePlayer: jest.fn().mockResolvedValue({
      playerId: PLAYER_ID,
      created: false,
      profile: {
        schema_version: 1,
        xp: 0,
        is_citizen: false,
        is_paid_citizen: false,
        citizenship_earned_at: null,
        citizenship_purchased_at: null,
        display_name: null,
        created_at: "2026-09-01T00:00:00.000Z",
        updated_at: "2026-09-01T00:00:00.000Z",
      },
    }),
    hasXpGrant: jest.fn().mockResolvedValue(false),
  };
}

function mockInbox(): InboxRepo {
  return {
    listMessages: jest.fn().mockResolvedValue({ status: "ok", messages: [] }),
    markRead: jest.fn().mockResolvedValue({ status: "ok", updated: 0 }),
    sendMessage: jest.fn().mockResolvedValue({ status: "sent", id: 1 }),
  };
}

function mockNameChange(): NameChangeRepo {
  return {
    requestNameChange: jest.fn().mockResolvedValue({ status: "ok", id: 1 }),
    cancelNameChange: jest.fn().mockResolvedValue({ status: "ok" }),
    decideNameChange: jest.fn().mockResolvedValue({ status: "ok" }),
    getLatestState: jest.fn().mockResolvedValue(null),
  };
}

/** The four internal routes as they exist today, with a body each one ACCEPTS. */
type InternalRoute = {
  /** Everything after the `/internal` prefix. */
  readonly suffix: string;
  /** A body the route's zod schema parses, so a reached handler calls its repo. */
  readonly body: unknown;
  /** The repo method that proves the handler actually ran. */
  readonly spy: (deps: Deps) => jest.Mock;
  readonly spyName: string;
};

type Deps = {
  repo: ProfileRepo;
  inbox: InboxRepo;
  nameChange: NameChangeRepo;
  /**
   * The alert relay's proof-of-reach (task 0277). ⚠️ Deliberately the METRICS seam,
   * not the Telegram send: the relay responds BEFORE it delivers, so a send spy is
   * still in flight when supertest resolves and the control below would be a race.
   * `metrics.alertRelay` is synchronous and runs before the response.
   */
  alertRelayMetric: jest.Mock;
};

const INTERNAL_ROUTES: readonly InternalRoute[] = [
  {
    suffix: "/v1/players/resolve",
    body: { platform: "yandex_games", platformUserId: "y-0276" },
    spy: (d) => d.repo.resolveOrCreatePlayer as jest.Mock,
    spyName: "repo.resolveOrCreatePlayer",
  },
  {
    suffix: "/v1/credit",
    body: {
      credits: [{ gameId: "g-0276", playerId: PLAYER_ID, xpAwarded: 10 }],
    },
    spy: (d) => d.repo.creditMatchXp as jest.Mock,
    spyName: "repo.creditMatchXp",
  },
  {
    suffix: "/v1/messages/send",
    body: { playerId: PLAYER_ID, title: "Hello", body: "Welcome aboard." },
    spy: (d) => d.inbox.sendMessage as jest.Mock,
    spyName: "inbox.sendMessage",
  },
  {
    suffix: "/v1/name-change/decide",
    body: { playerId: PLAYER_ID, decision: "approve" },
    spy: (d) => d.nameChange.decideNameChange as jest.Mock,
    spyName: "nameChange.decideNameChange",
  },
  // Task 0277. ⚠️ This route NEVER answers 401/403/404 itself — a 401/403/404 makes
  // Uptrace permanently disable the notification channel. That rule binds the
  // HANDLER. The 404 asserted below comes from EXPRESS'S ROUTER, before any handler
  // runs, which is precisely the property being pinned: nginx's `location ~* ` is
  // case-INSENSITIVE, so a capitalised URL clears the allowlist and would otherwise
  // reach a handler the allowlist never meant to expose.
  // ⛔ Do not "fix" this test to match the never-404 rule. They are not in conflict.
  {
    suffix: ALERT_WEBHOOK_PATH.replace("/internal", ""),
    body: {
      id: "case-1",
      payload: { secret: RELAY_SECRET },
      alert: { name: "x" },
    },
    spy: (d) => d.alertRelayMetric,
    spyName: "metrics.alertRelay",
  },
];

function build(): { app: ReturnType<typeof createApp>; deps: Deps } {
  const alertRelayMetric = jest.fn();
  const deps: Deps = {
    repo: mockRepo(),
    inbox: mockInbox(),
    nameChange: mockNameChange(),
    alertRelayMetric,
  };
  const metrics: ProfileMetrics = {
    loginRequest: () => {},
    playerCreated: () => {},
    httpRequest: () => {},
    sessionRejected: () => {},
    tenureClaim: () => {},
    alertRelay: (result, keyed) => alertRelayMetric(result, keyed),
  };
  const app = createApp(
    deps.repo,
    undefined,
    deps.inbox,
    deps.nameChange,
    TEST_SESSION_CONFIG,
    {
      metrics,
      alertRelay: {
        secret: RELAY_SECRET,
        telegram: { token: "t", chatId: "c", proxyUrl: "", threadId: "" },
        send: () => Promise.resolve({ result: "sent" as const }),
      },
    },
  );
  return { app, deps };
}

describe("internal path case variants (task 0276)", () => {
  const ORIGINAL = process.env.PROFILE_INTERNAL_TOKEN;
  beforeEach(() => {
    process.env.PROFILE_INTERNAL_TOKEN = TOKEN;
  });
  afterEach(() => {
    process.env.PROFILE_INTERNAL_TOKEN = ORIGINAL;
  });

  // ⚠️ The CORRECT token is sent on purpose. With a wrong one a regression shows as
  // 401 — indistinguishable to a careless reader from "the route was never reached".
  // With a valid one, a regression shows as the handler genuinely running.
  describe.each(INTERNAL_ROUTES)("POST /internal$suffix", (route) => {
    test.each(CASE_PREFIXES)(
      "%s is 404 and never runs the handler",
      async (prefix) => {
        const { app, deps } = build();
        const res = await request(app)
          .post(`${prefix}${route.suffix}`)
          .set("Authorization", `Bearer ${TOKEN}`)
          .send(route.body as object);
        expect(res.status).toBe(404);
        expect(route.spy(deps)).not.toHaveBeenCalled();
      },
    );

    // The control. Without it the whole block above would pass green on an app that
    // is simply broken and 404s everything.
    test(`exact lowercase still reaches the handler (${route.spyName} is called)`, async () => {
      const { app, deps } = build();
      const res = await request(app)
        .post(`/internal${route.suffix}`)
        .set("Authorization", `Bearer ${TOKEN}`)
        .send(route.body as object);
      expect(res.status).not.toBe(404);
      expect(route.spy(deps)).toHaveBeenCalled();
    });
  });
});

// Task 0276, owner-approved 2026-09-16: `case sensitive routing` is set app-WIDE, so
// PUBLIC routes become case-sensitive too. That is a deliberate behaviour change, not
// a side effect to be quietly absorbed — these cases pin it so a later reader sees it
// was chosen. The owner was asked whether any caller outside this repo uses a
// non-lowercase path and answered no; every in-repo caller uses lowercase literals.
describe("public route casing is now exact (task 0276, owner-approved)", () => {
  test("GET /health is still 200", async () => {
    const { app } = build();
    expect((await request(app).get("/health")).status).toBe(200);
  });

  test("GET /ready is still 200", async () => {
    const { app } = build();
    expect((await request(app).get("/ready")).status).toBe(200);
  });

  test("POST /v1/login is unchanged (a malformed body is still its own 400)", async () => {
    const { app } = build();
    const res = await request(app).post("/v1/login").send({});
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "bad_request" });
  });

  test.each([
    ["GET", "/HEALTH"],
    ["GET", "/READY"],
    ["POST", "/V1/Login"],
    ["GET", "/V1/Profile"],
  ])("%s %s is 404", async (method, path) => {
    const { app } = build();
    const res =
      method === "GET"
        ? await request(app).get(path)
        : await request(app).post(path).send({});
    expect(res.status).toBe(404);
  });
});
