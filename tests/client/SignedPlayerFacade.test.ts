/**
 * @jest-environment jsdom
 */
import { GameAnalytics } from "gameanalytics";
import {
  FlashistFacade,
  SIGNED_PLAYER_HANG_MS,
  SIGNED_PLAYER_HELD_MAX_AGE_MS,
} from "../../src/client/flashist/FlashistFacade";
import { SIGNATURE_TAKE_BACKSTOP_MS } from "../../src/client/ProfileSession";
import { SIGNATURE_MAX } from "../../src/core/profile/LoginContract";

jest.mock("gameanalytics");

// Task 0325, S2: the facade's signed-player-data pre-fetch and take-once, with the
// owner's D1 ruling — no limit on a slow answer, only a 60 s hang safety net — and
// D2's four Profile:Login:Signature:* events. Driven on a bare prototype instance
// (the PlatformDegradedFacade.test.ts pattern): class-field initializers do not run
// on Object.create, so state is seeded explicitly. Synthetic signatures only.

type Internals = {
  initPlayer(): Promise<void>;
  yandexSdkPlayerObject?: unknown;
};
type TestFacade = Omit<FlashistFacade, keyof Internals> & Internals;

const SIGNATURE = "c3ludGhldGljLW1hYw==.eyJzeW50aGV0aWMiOnRydWV9";
const SIGNATURE_B = "c3ludGhldGljLW1hYy1i.eyJzeW50aGV0aWMiOiJiIn0=";
const SIGNATURE_LATE = "c3ludGhldGljLWxhdGU=.eyJsYXRlIjp0cnVlfQ==";

const authorizedPlayer = { isAuthorized: () => true, getUniqueID: () => "u" };
const guestPlayer = { isAuthorized: () => false };

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * An SDK whose plain getPlayer() answers `plain`, and whose signed calls are
 * answered in order by `signedAnswers` (each a function returning the promise).
 */
function makeSdk(
  plain: unknown,
  signedAnswers: Array<() => Promise<unknown>>,
): { getPlayer: jest.Mock } {
  const queue = [...signedAnswers];
  return {
    getPlayer: jest.fn((options?: { signed?: boolean }) => {
      if (options?.signed === true) {
        const next = queue.shift();
        if (next === undefined) {
          throw new Error("unexpected extra signed call");
        }
        return next();
      }
      return Promise.resolve(plain);
    }),
  };
}

function makeFacade(fields: Record<string, unknown>): TestFacade {
  return Object.assign(Object.create(FlashistFacade.prototype), {
    yaGamesAvailable: true,
    yandexInitPromise: Promise.resolve(),
    ...fields,
  }) as unknown as TestFacade;
}

const signedCalls = (sdk: { getPlayer: jest.Mock }) =>
  sdk.getPlayer.mock.calls.filter(([options]) => options?.signed === true);

const addDesignEvent = GameAnalytics.addDesignEvent as jest.Mock;
/** [event, value] for every Profile:Login:Signature:* event fired. */
const signatureEvents = (): Array<[string, unknown]> =>
  addDesignEvent.mock.calls
    .filter(
      ([event]) =>
        typeof event === "string" &&
        event.startsWith("Profile:Login:Signature:"),
    )
    .map(([event, value]) => [event, value]);

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

/** A facade that has run initPlayer() for an authorized player. */
async function bootedFacade(
  signedAnswers: Array<() => Promise<unknown>>,
): Promise<{ facade: TestFacade; sdk: { getPlayer: jest.Mock } }> {
  const sdk = makeSdk(authorizedPlayer, signedAnswers);
  const facade = makeFacade({ yandexGamesSDK: sdk });
  await facade.initPlayer();
  return { facade, sdk };
}

const originalDeployEnv = process.env.DEPLOY_ENV;

beforeEach(() => {
  // flashist_logEventAnalytics only reaches GameAnalytics on prod builds.
  process.env.DEPLOY_ENV = "prod";
  addDesignEvent.mockReset();
  (GameAnalytics.addErrorEvent as jest.Mock).mockReset();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  if (originalDeployEnv === undefined) {
    delete process.env.DEPLOY_ENV;
  } else {
    process.env.DEPLOY_ENV = originalDeployEnv;
  }
  jest.restoreAllMocks();
});

describe("the constants", () => {
  test("the hang net is 60 s (owner ruling D1) and the held limit 300 s (B4)", () => {
    expect(SIGNED_PLAYER_HANG_MS).toBe(60_000);
    expect(SIGNED_PLAYER_HELD_MAX_AGE_MS).toBe(300_000);
  });

  test("ProfileSession's backstop sits ABOVE the facade's hang net, so it never cuts a take short", () => {
    expect(SIGNATURE_TAKE_BACKSTOP_MS).toBeGreaterThan(SIGNED_PLAYER_HANG_MS);
  });
});

describe("the boot pre-fetch (initPlayer)", () => {
  test("an authorized player starts ONE signed call, and initPlayer does not wait for it", async () => {
    const never = deferred<unknown>();
    const { facade, sdk } = await bootedFacade([() => never.promise]);
    // initPlayer resolved above while the signed call is still pending — it can
    // never extend the platform-init deadline.
    expect(signedCalls(sdk)).toHaveLength(1);
    // The boot path's plain player is untouched.
    expect(facade.yandexSdkPlayerObject).toBe(authorizedPlayer);
  });

  test("a guest starts no signed call", async () => {
    const sdk = makeSdk(guestPlayer, []);
    await makeFacade({ yandexGamesSDK: sdk }).initPlayer();
    expect(signedCalls(sdk)).toHaveLength(0);
  });

  test("a failed plain getPlayer() starts no signed call (initPlayer still rethrows)", async () => {
    const sdk = {
      getPlayer: jest.fn().mockRejectedValue(new Error("synthetic")),
    };
    await expect(
      makeFacade({ yandexGamesSDK: sdk }).initPlayer(),
    ).rejects.toThrow("synthetic");
    expect(signedCalls(sdk)).toHaveLength(0);
  });
});

describe("takeYandexPlayerSignature", () => {
  test("Ready: a finished pre-fetch is returned at once, with one Ready event", async () => {
    const { facade, sdk } = await bootedFacade([
      () => Promise.resolve({ signature: SIGNATURE }),
    ]);
    await flush();

    await expect(facade.takeYandexPlayerSignature()).resolves.toBe(SIGNATURE);
    // Task 0372 (A3): the value is the ms held — 0 here, no time has passed.
    expect(signatureEvents()).toEqual([["Profile:Login:Signature:Ready", 0]]);
    expect(signedCalls(sdk)).toHaveLength(1);
    // Never assigned to the boot path's player object.
    expect(facade.yandexSdkPlayerObject).toBe(authorizedPlayer);
  });

  test("take-once: a second take (a relogin) makes a FRESH call, never the first signature", async () => {
    const { facade, sdk } = await bootedFacade([
      () => Promise.resolve({ signature: SIGNATURE }),
      () => Promise.resolve({ signature: SIGNATURE_B }),
    ]);
    await flush();

    await expect(facade.takeYandexPlayerSignature()).resolves.toBe(SIGNATURE);
    await expect(facade.takeYandexPlayerSignature()).resolves.toBe(SIGNATURE_B);
    expect(signedCalls(sdk)).toHaveLength(2);
    expect(signatureEvents().map(([event]) => event)).toEqual([
      "Profile:Login:Signature:Ready",
      "Profile:Login:Signature:Waited",
    ]);
  });

  test("Waited: a pending pre-fetch answering 7 s after login asks is used; value = ms waited", async () => {
    const slow = deferred<unknown>();
    const { facade } = await bootedFacade([() => slow.promise]);

    const take = facade.takeYandexPlayerSignature();
    await jest.advanceTimersByTimeAsync(7_000);
    slow.resolve({ signature: SIGNATURE });

    await expect(take).resolves.toBe(SIGNATURE);
    expect(signatureEvents()).toEqual([
      ["Profile:Login:Signature:Waited", 7_000],
    ]);
  });

  test("no limit on a slow answer: 1 ms inside the hang net is still used", async () => {
    const slow = deferred<unknown>();
    const { facade } = await bootedFacade([() => slow.promise]);

    const take = facade.takeYandexPlayerSignature();
    await jest.advanceTimersByTimeAsync(SIGNED_PLAYER_HANG_MS - 1);
    slow.resolve({ signature: SIGNATURE });

    await expect(take).resolves.toBe(SIGNATURE);
    expect(signatureEvents()).toEqual([
      ["Profile:Login:Signature:Waited", SIGNED_PLAYER_HANG_MS - 1],
    ]);
  });

  test("Timeout: a pre-fetch silent for 60 s → null, one Timeout event; its late answer is NEVER reused", async () => {
    const hung = deferred<unknown>();
    const { facade, sdk } = await bootedFacade([
      () => hung.promise,
      () => Promise.resolve({ signature: SIGNATURE_B }),
    ]);

    const take = facade.takeYandexPlayerSignature();
    await jest.advanceTimersByTimeAsync(SIGNED_PLAYER_HANG_MS);
    await expect(take).resolves.toBeNull();
    expect(signatureEvents()).toEqual([
      ["Profile:Login:Signature:Timeout", SIGNED_PLAYER_HANG_MS],
    ]);

    // The abandoned call answers late — the next take must not get it.
    hung.resolve({ signature: SIGNATURE_LATE });
    await flush();
    await expect(facade.takeYandexPlayerSignature()).resolves.toBe(SIGNATURE_B);
    expect(signedCalls(sdk)).toHaveLength(2);
  });

  test("the hang net is counted from when login ASKS, not from the pre-fetch's start", async () => {
    const slow = deferred<unknown>();
    const { facade } = await bootedFacade([() => slow.promise]);
    // The pre-fetch has already been running 50 s before login asks.
    await jest.advanceTimersByTimeAsync(50_000);

    const take = facade.takeYandexPlayerSignature();
    await jest.advanceTimersByTimeAsync(30_000); // 80 s since start, 30 s since ask
    slow.resolve({ signature: SIGNATURE });

    await expect(take).resolves.toBe(SIGNATURE);
    expect(signatureEvents()).toEqual([
      ["Profile:Login:Signature:Waited", 30_000],
    ]);
  });

  describe("Failed: a real failure falls back AT ONCE, never waiting on the hang net", () => {
    test.each<[string, () => Promise<unknown>]>([
      ["the call rejects", () => Promise.reject(new Error("synthetic"))],
      ["no signature field", () => Promise.resolve({})],
      ["a non-string signature", () => Promise.resolve({ signature: 42 })],
      ["an empty signature", () => Promise.resolve({ signature: "" })],
      [
        "an over-bound signature (A1: the server would 400 → D3 latch)",
        () => Promise.resolve({ signature: "a".repeat(SIGNATURE_MAX + 1) }),
      ],
      ["a null player object", () => Promise.resolve(null)],
    ])("%s → null and one Failed event", async (_label, answer) => {
      // A fresh call (no pre-fetch): the degraded-recovery shape.
      const sdk = makeSdk(authorizedPlayer, [answer]);
      const facade = makeFacade({
        yandexGamesSDK: sdk,
        yandexSdkPlayerObject: authorizedPlayer,
      });

      // No timers advanced: the answer must not depend on the 60 s net.
      await expect(facade.takeYandexPlayerSignature()).resolves.toBeNull();
      expect(signatureEvents()).toEqual([
        ["Profile:Login:Signature:Failed", undefined],
      ]);
    });

    test("exactly SIGNATURE_MAX characters is still accepted", async () => {
      const exact = "a".repeat(SIGNATURE_MAX);
      const sdk = makeSdk(authorizedPlayer, [
        () => Promise.resolve({ signature: exact }),
      ]);
      const facade = makeFacade({
        yandexGamesSDK: sdk,
        yandexSdkPlayerObject: authorizedPlayer,
      });
      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(exact);
    });

    test("a pre-fetch that already failed → null and Failed at take, with no second call", async () => {
      const { facade, sdk } = await bootedFacade([
        () => Promise.reject(new Error("synthetic")),
      ]);
      await flush();

      await expect(facade.takeYandexPlayerSignature()).resolves.toBeNull();
      expect(signatureEvents()).toEqual([
        ["Profile:Login:Signature:Failed", undefined],
      ]);
      expect(signedCalls(sdk)).toHaveLength(1);
    });

    test("getPlayer throwing synchronously → null, never a rejection", async () => {
      const sdk = {
        getPlayer: jest.fn(() => {
          throw new Error("synthetic sync throw");
        }),
      };
      const facade = makeFacade({
        yandexGamesSDK: sdk,
        yandexSdkPlayerObject: authorizedPlayer,
      });
      await expect(facade.takeYandexPlayerSignature()).resolves.toBeNull();
      expect(signatureEvents().map(([event]) => event)).toEqual([
        "Profile:Login:Signature:Failed",
      ]);
    });
  });

  describe("the 300 s held-signature limit", () => {
    test("held exactly 300 s → still Ready", async () => {
      const { facade, sdk } = await bootedFacade([
        () => Promise.resolve({ signature: SIGNATURE }),
      ]);
      await flush();
      await jest.advanceTimersByTimeAsync(SIGNED_PLAYER_HELD_MAX_AGE_MS);

      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(SIGNATURE);
      expect(signedCalls(sdk)).toHaveLength(1);
      // Task 0372 (A3): Ready carries the ms held.
      expect(signatureEvents()).toEqual([
        ["Profile:Login:Signature:Ready", SIGNED_PLAYER_HELD_MAX_AGE_MS],
      ]);
    });

    test("held longer than 300 s → discarded, a fresh call is made and used", async () => {
      const { facade, sdk } = await bootedFacade([
        () => Promise.resolve({ signature: SIGNATURE }),
        () => Promise.resolve({ signature: SIGNATURE_B }),
      ]);
      await flush();
      await jest.advanceTimersByTimeAsync(SIGNED_PLAYER_HELD_MAX_AGE_MS + 1);

      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(
        SIGNATURE_B,
      );
      expect(signedCalls(sdk)).toHaveLength(2);
      expect(signatureEvents().map(([event]) => event)).toEqual([
        "Profile:Login:Signature:Waited",
      ]);
    });
  });

  test("degraded-boot recovery (player fetched late, no pre-fetch) → the first take makes a fresh call", async () => {
    const sdk = makeSdk(authorizedPlayer, [
      () => Promise.resolve({ signature: SIGNATURE }),
    ]);
    const facade = makeFacade({
      yandexGamesSDK: sdk,
      yandexSdkPlayerObject: authorizedPlayer,
    });

    await expect(facade.takeYandexPlayerSignature()).resolves.toBe(SIGNATURE);
    expect(signedCalls(sdk)).toHaveLength(1);
    expect(signatureEvents().map(([event]) => event)).toEqual([
      "Profile:Login:Signature:Waited",
    ]);
  });

  test.each<[string, Record<string, unknown>]>([
    ["a guest", { yandexSdkPlayerObject: guestPlayer }],
    ["no player object", {}],
    [
      "isAuthorized() throwing",
      {
        yandexSdkPlayerObject: {
          isAuthorized: () => {
            throw new Error("synthetic");
          },
        },
      },
    ],
  ])("%s → null, no signed call, and NO event", async (_label, fields) => {
    const sdk = makeSdk(authorizedPlayer, []);
    const facade = makeFacade({ yandexGamesSDK: sdk, ...fields });
    await expect(facade.takeYandexPlayerSignature()).resolves.toBeNull();
    expect(signedCalls(sdk)).toHaveLength(0);
    expect(signatureEvents()).toEqual([]);
  });

  test("no SDK → null, no event", async () => {
    const facade = makeFacade({ yandexSdkPlayerObject: authorizedPlayer });
    await expect(facade.takeYandexPlayerSignature()).resolves.toBeNull();
    expect(signatureEvents()).toEqual([]);
  });

  test("no leak: the signature reaches no analytics call and no console line", async () => {
    const slow = deferred<unknown>();
    const { facade } = await bootedFacade([
      () => Promise.resolve({ signature: SIGNATURE }),
      () => slow.promise,
    ]);
    await flush();
    await facade.takeYandexPlayerSignature();
    const take = facade.takeYandexPlayerSignature();
    await jest.advanceTimersByTimeAsync(1_000);
    slow.resolve({ signature: SIGNATURE_B });
    await take;

    const everything = JSON.stringify([
      addDesignEvent.mock.calls,
      (GameAnalytics.addErrorEvent as jest.Mock).mock.calls,
      (console.log as jest.Mock).mock.calls,
      (console.warn as jest.Mock).mock.calls,
      (console.error as jest.Mock).mock.calls,
    ]);
    expect(everything).not.toContain(SIGNATURE);
    expect(everything).not.toContain(SIGNATURE_B);
    expect(signatureEvents()).toHaveLength(2);
  });
});

// ── Task 0372: stale-signature diagnostics (A1 age, A2 refetch, A3 held ms) ─────
// Synthetic envelopes carrying a top-level issuedAt (seconds). The device clock is
// pinned with jest.setSystemTime, so each signature's age is exact.

const NOW_MS = 1_790_000_000_000;
const NOW_SECONDS = NOW_MS / 1000;
const SYNTHETIC_ID = "syntheticUniqueId0372";
const SYNTHETIC_NAME = "SyntheticPublicName0372";
const MAC_HALF = "c3ludGhldGljLW1hYw==";

/** A synthetic `<mac>.<payload>` whose payload's issuedAt is `issuedAtSeconds`. */
function signedAt(issuedAtSeconds: number): string {
  const payload = btoa(
    JSON.stringify({
      algorithm: "HMAC-SHA256",
      issuedAt: issuedAtSeconds,
      data: { uniqueID: SYNTHETIC_ID, publicName: SYNTHETIC_NAME },
    }),
  );
  return `${MAC_HALF}.${payload}`;
}
const STALE_ISSUED_AT = NOW_SECONDS - 2_000; // Past30m1h
const STALE = signedAt(STALE_ISSUED_AT);

const eventsWithPrefix = (prefix: string): Array<[string, unknown]> =>
  addDesignEvent.mock.calls
    .filter(([event]) => typeof event === "string" && event.startsWith(prefix))
    .map(([event, value]) => [event, value]);
const ageEvents = () => eventsWithPrefix("Profile:Login:SignatureAge:");
const refetchEvents = () =>
  eventsWithPrefix("Profile:Login:Signature:Refetch:");
/** The four take events only (Ready / Waited / Timeout / Failed). */
const takeEvents = () =>
  signatureEvents().filter(
    ([event]) => !event.startsWith("Profile:Login:Signature:Refetch:"),
  );

/** initPlayer() for an authorized player, with extra seeded fields. */
async function bootWith(
  fields: Record<string, unknown>,
  signedAnswers: Array<() => Promise<unknown>>,
): Promise<{ facade: TestFacade; sdk: { getPlayer: jest.Mock } }> {
  const sdk = makeSdk(authorizedPlayer, signedAnswers);
  const facade = makeFacade({ yandexGamesSDK: sdk, ...fields });
  await facade.initPlayer();
  return { facade, sdk };
}

describe("task 0372 — stale-signature diagnostics", () => {
  beforeEach(() => {
    jest.setSystemTime(NOW_MS);
  });

  describe("A1: the signature's age, by boot kind", () => {
    test.each<[string, Record<string, unknown>, string]>([
      ["unset (a test facade)", {}, "FirstBoot"],
      ["false", { bootFollowsMatchExit: false }, "FirstBoot"],
      ["true", { bootFollowsMatchExit: true }, "AfterMatch"],
    ])(
      "bootFollowsMatchExit %s → %s (Ready path)",
      async (_label, fields, bootKind) => {
        const { facade } = await bootWith(fields, [
          () => Promise.resolve({ signature: signedAt(NOW_SECONDS) }),
        ]);
        await flush();
        await facade.takeYandexPlayerSignature();
        expect(ageEvents()).toEqual([
          [`Profile:Login:SignatureAge:${bootKind}:Fresh`, undefined],
        ]);
      },
    );

    test("the Waited path fires it too, with the label from the device clock", async () => {
      const slow = deferred<unknown>();
      const { facade } = await bootWith({ bootFollowsMatchExit: true }, [
        () => slow.promise,
        () => new Promise(() => {}), // the A2 refetch — never answers here
      ]);
      const take = facade.takeYandexPlayerSignature();
      await jest.advanceTimersByTimeAsync(1_000);
      slow.resolve({ signature: signedAt(NOW_SECONDS - 1_000) }); // 1 001 s old now
      await expect(take).resolves.toBe(signedAt(NOW_SECONDS - 1_000));
      expect(ageEvents()).toEqual([
        ["Profile:Login:SignatureAge:AfterMatch:Past15m20m", undefined],
      ]);
    });

    test.each<[string, number, string]>([
      ["300 s + 1 s ahead", NOW_SECONDS + 301, "Future5m15m"],
      ["a day ahead", NOW_SECONDS + 86_400, "FutureOver15m"],
      ["901 s old", NOW_SECONDS - 901, "Past15m20m"],
      ["two days old", NOW_SECONDS - 2 * 86_400, "PastOver24h"],
    ])("%s → %s", async (_label, issuedAt, expected) => {
      const { facade } = await bootWith({}, [
        () => Promise.resolve({ signature: signedAt(issuedAt) }),
        () => new Promise(() => {}),
      ]);
      await flush();
      await facade.takeYandexPlayerSignature();
      expect(ageEvents()).toEqual([
        [`Profile:Login:SignatureAge:FirstBoot:${expected}`, undefined],
      ]);
    });

    test("an envelope with no readable issuedAt → Unreadable", async () => {
      const { facade } = await bootWith({}, [
        () => Promise.resolve({ signature: SIGNATURE }),
      ]);
      await flush();
      await facade.takeYandexPlayerSignature();
      expect(ageEvents()).toEqual([
        ["Profile:Login:SignatureAge:FirstBoot:Unreadable", undefined],
      ]);
    });

    test("no A1 on Failed", async () => {
      const { facade } = await bootWith({}, [
        () => Promise.reject(new Error("synthetic")),
      ]);
      await flush();
      await expect(facade.takeYandexPlayerSignature()).resolves.toBeNull();
      expect(ageEvents()).toEqual([]);
    });

    test("no A1 on Timeout", async () => {
      const { facade } = await bootWith({}, [() => new Promise(() => {})]);
      const take = facade.takeYandexPlayerSignature();
      await jest.advanceTimersByTimeAsync(SIGNED_PLAYER_HANG_MS);
      await expect(take).resolves.toBeNull();
      expect(ageEvents()).toEqual([]);
    });

    test("no A1 for a guest, or with no SDK", async () => {
      const sdk = makeSdk(authorizedPlayer, []);
      await makeFacade({
        yandexGamesSDK: sdk,
        yandexSdkPlayerObject: guestPlayer,
      }).takeYandexPlayerSignature();
      await makeFacade({
        yandexSdkPlayerObject: authorizedPlayer,
      }).takeYandexPlayerSignature();
      expect(ageEvents()).toEqual([]);
      expect(refetchEvents()).toEqual([]);
    });
  });

  describe("A2: a second signed call, only for a past-stale first take", () => {
    test.each<[string, string]>([
      ["Fresh", signedAt(NOW_SECONDS)],
      ["Future5m15m", signedAt(NOW_SECONDS + 400)],
      ["FutureOver15m", signedAt(NOW_SECONDS + 5_000)],
      ["Unreadable", SIGNATURE],
    ])("%s → no second call", async (_label, signature) => {
      // makeSdk throws on an unexpected extra signed call — so none may happen.
      const { facade, sdk } = await bootWith({}, [
        () => Promise.resolve({ signature }),
      ]);
      await flush();
      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(signature);
      await jest.advanceTimersByTimeAsync(SIGNED_PLAYER_HANG_MS);
      expect(signedCalls(sdk)).toHaveLength(1);
      expect(refetchEvents()).toEqual([]);
    });

    test.each<[string, () => Promise<unknown>, string]>([
      [
        "a later issuedAt",
        () => Promise.resolve({ signature: signedAt(STALE_ISSUED_AT + 1) }),
        "Newer",
      ],
      [
        "the same issuedAt",
        () => Promise.resolve({ signature: signedAt(STALE_ISSUED_AT) }),
        "Same",
      ],
      [
        "an earlier issuedAt",
        () => Promise.resolve({ signature: signedAt(STALE_ISSUED_AT - 1) }),
        "Older",
      ],
      [
        "a rejected call",
        () => Promise.reject(new Error("synthetic")),
        "Failed",
      ],
      [
        "a synchronous throw",
        () => {
          throw new Error("synthetic sync throw");
        },
        "Failed",
      ],
      ["signature: null", () => Promise.resolve({ signature: null }), "Failed"],
      [
        "an over-long signature",
        () => Promise.resolve({ signature: "a".repeat(SIGNATURE_MAX + 1) }),
        "Failed",
      ],
      [
        "an Unreadable second signature",
        () => Promise.resolve({ signature: SIGNATURE_B }),
        "Failed",
      ],
    ])("%s → Refetch:%s, exactly one", async (_label, answer, result) => {
      const { facade, sdk } = await bootWith({}, [
        () => Promise.resolve({ signature: STALE }),
        answer,
      ]);
      await flush();
      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(STALE);
      await flush();
      expect(signedCalls(sdk)).toHaveLength(2);
      expect(refetchEvents()).toEqual([
        [`Profile:Login:Signature:Refetch:${result}`, undefined],
      ]);
      // The take's own event is unchanged.
      expect(takeEvents()).toEqual([["Profile:Login:Signature:Ready", 0]]);
    });

    test("a second call silent for 60 s → Failed; its late answer fires nothing more", async () => {
      const hung = deferred<unknown>();
      const { facade } = await bootWith({}, [
        () => Promise.resolve({ signature: STALE }),
        () => hung.promise,
      ]);
      await flush();
      await facade.takeYandexPlayerSignature();
      await jest.advanceTimersByTimeAsync(SIGNED_PLAYER_HANG_MS - 1);
      expect(refetchEvents()).toEqual([]);
      await jest.advanceTimersByTimeAsync(1);
      expect(refetchEvents()).toEqual([
        ["Profile:Login:Signature:Refetch:Failed", undefined],
      ]);

      hung.resolve({ signature: signedAt(NOW_SECONDS) });
      await flush();
      await jest.advanceTimersByTimeAsync(SIGNED_PLAYER_HANG_MS);
      expect(refetchEvents()).toHaveLength(1);
    });

    test("login is not held up and gets the ORIGINAL signature (Ready path)", async () => {
      const never = deferred<unknown>();
      const { facade, sdk } = await bootWith({}, [
        () => Promise.resolve({ signature: STALE }),
        () => never.promise,
      ]);
      await flush();
      // No timer advanced: the take must not wait on the second call.
      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(STALE);
      expect(signedCalls(sdk)).toHaveLength(2); // the second call IS in flight
      expect(refetchEvents()).toEqual([]);
      expect(facade.yandexSdkPlayerObject).toBe(authorizedPlayer);
    });

    test("login is not held up and gets the ORIGINAL signature (Waited path)", async () => {
      const slow = deferred<unknown>();
      const { facade } = await bootWith({}, [
        () => slow.promise,
        () => new Promise(() => {}),
      ]);
      const take = facade.takeYandexPlayerSignature();
      slow.resolve({ signature: STALE });
      await expect(take).resolves.toBe(STALE);
      expect(refetchEvents()).toEqual([]);
    });

    test("the second signature is never returned — a later take makes its own call", async () => {
      const newer = signedAt(STALE_ISSUED_AT + 600);
      const third = signedAt(NOW_SECONDS);
      const { facade, sdk } = await bootWith({}, [
        () => Promise.resolve({ signature: STALE }),
        () => Promise.resolve({ signature: newer }),
        () => Promise.resolve({ signature: third }),
      ]);
      await flush();
      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(STALE);
      await flush();
      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(third);
      expect(signedCalls(sdk)).toHaveLength(3);
      expect(facade.yandexSdkPlayerObject).toBe(authorizedPlayer);
    });

    test("at most once per page load: a relogin with a past-stale signature fires A1 but never A2", async () => {
      const { facade, sdk } = await bootWith({}, [
        () => Promise.resolve({ signature: STALE }),
        () => Promise.resolve({ signature: signedAt(STALE_ISSUED_AT + 1) }),
        // The relogin's fresh call — also past-stale. No 4th answer: a second
        // refetch would make makeSdk throw "unexpected extra signed call".
        () => Promise.resolve({ signature: signedAt(STALE_ISSUED_AT + 2) }),
      ]);
      await flush();
      await facade.takeYandexPlayerSignature();
      await flush();
      await facade.takeYandexPlayerSignature();
      await jest.advanceTimersByTimeAsync(SIGNED_PLAYER_HANG_MS);
      expect(signedCalls(sdk)).toHaveLength(3);
      expect(ageEvents()).toEqual([
        ["Profile:Login:SignatureAge:FirstBoot:Past30m1h", undefined],
        ["Profile:Login:SignatureAge:FirstBoot:Past30m1h", undefined],
      ]);
      expect(refetchEvents()).toEqual([
        ["Profile:Login:Signature:Refetch:Newer", undefined],
      ]);
    });

    test("a Fresh first take, then a past-stale relogin → no refetch at all", async () => {
      const { facade, sdk } = await bootWith({}, [
        () => Promise.resolve({ signature: signedAt(NOW_SECONDS) }),
        () => Promise.resolve({ signature: STALE }),
      ]);
      await flush();
      await facade.takeYandexPlayerSignature();
      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(STALE);
      await jest.advanceTimersByTimeAsync(SIGNED_PLAYER_HANG_MS);
      expect(signedCalls(sdk)).toHaveLength(2);
      expect(refetchEvents()).toEqual([]);
    });

    test("a guest's take still counts as the first — a later take never refetches", async () => {
      const sdk = makeSdk(authorizedPlayer, [
        () => Promise.resolve({ signature: STALE }),
      ]);
      const facade = makeFacade({
        yandexGamesSDK: sdk,
        yandexSdkPlayerObject: guestPlayer,
      });
      await expect(facade.takeYandexPlayerSignature()).resolves.toBeNull();
      (facade as unknown as Record<string, unknown>).yandexSdkPlayerObject =
        authorizedPlayer;
      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(STALE);
      await jest.advanceTimersByTimeAsync(SIGNED_PLAYER_HANG_MS);
      expect(signedCalls(sdk)).toHaveLength(1);
      expect(refetchEvents()).toEqual([]);
    });
  });

  describe("fail-safe: a fault in the diagnostics never reaches login", () => {
    test("recordSignatureDiagnostics throwing → the take still returns the signature (Ready and Waited)", async () => {
      jest
        .spyOn(
          FlashistFacade.prototype as unknown as Record<string, () => void>,
          "recordSignatureDiagnostics",
        )
        .mockImplementation(() => {
          throw new Error("synthetic diagnostics fault");
        });
      const { facade } = await bootWith({}, [
        () => Promise.resolve({ signature: STALE }),
        () => Promise.resolve({ signature: SIGNATURE_B }),
      ]);
      await flush();
      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(STALE);
      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(
        SIGNATURE_B,
      );
    });

    test("GameAnalytics throwing → the take and the refetch are unaffected", async () => {
      addDesignEvent.mockImplementation(() => {
        throw new Error("synthetic analytics fault");
      });
      const { facade, sdk } = await bootWith({}, [
        () => Promise.resolve({ signature: STALE }),
        () => Promise.resolve({ signature: signedAt(STALE_ISSUED_AT) }),
      ]);
      await flush();
      await expect(facade.takeYandexPlayerSignature()).resolves.toBe(STALE);
      await flush();
      expect(signedCalls(sdk)).toHaveLength(2);
    });

    test("a refetch that throws synchronously never rejects into anything", async () => {
      const unhandled = jest.fn();
      process.on("unhandledRejection", unhandled);
      try {
        const { facade } = await bootWith({}, [
          () => Promise.resolve({ signature: STALE }),
          () => {
            throw new Error("synthetic sync throw");
          },
        ]);
        await flush();
        await expect(facade.takeYandexPlayerSignature()).resolves.toBe(STALE);
        await flush();
        await jest.advanceTimersByTimeAsync(SIGNED_PLAYER_HANG_MS);
        expect(unhandled).not.toHaveBeenCalled();
      } finally {
        process.off("unhandledRejection", unhandled);
      }
    });
  });

  test("no leak: across A1 and A2, no event or console line carries the signature, its halves, issuedAt, or player data", async () => {
    const second = signedAt(STALE_ISSUED_AT + 7);
    const slow = deferred<unknown>();
    const { facade } = await bootWith({ bootFollowsMatchExit: true }, [
      () => Promise.resolve({ signature: STALE }),
      () => Promise.resolve({ signature: second }),
      () => slow.promise, // the relogin's call
    ]);
    await flush();
    await facade.takeYandexPlayerSignature();
    await flush();
    const take = facade.takeYandexPlayerSignature();
    await jest.advanceTimersByTimeAsync(1_000);
    slow.resolve({ signature: STALE });
    await take;
    await flush();

    const everything = JSON.stringify([
      addDesignEvent.mock.calls,
      (GameAnalytics.addErrorEvent as jest.Mock).mock.calls,
      (console.log as jest.Mock).mock.calls,
      (console.warn as jest.Mock).mock.calls,
      (console.error as jest.Mock).mock.calls,
    ]);
    for (const signature of [STALE, second]) {
      const [macHalf, payloadHalf] = signature.split(".");
      expect(everything).not.toContain(signature);
      expect(everything).not.toContain(macHalf);
      expect(everything).not.toContain(payloadHalf);
    }
    expect(everything).not.toContain(String(STALE_ISSUED_AT));
    expect(everything).not.toContain(String(STALE_ISSUED_AT + 7));
    expect(everything).not.toContain(SYNTHETIC_ID);
    expect(everything).not.toContain(SYNTHETIC_NAME);

    // The new events fired, and every value is either none or A3's held ms.
    expect(ageEvents()).toHaveLength(2);
    expect(refetchEvents()).toEqual([
      ["Profile:Login:Signature:Refetch:Newer", undefined],
    ]);
    for (const [event, value] of addDesignEvent.mock.calls) {
      if (event === "Profile:Login:Signature:Ready") {
        expect(value).toBe(0);
      } else if (event === "Profile:Login:Signature:Waited") {
        expect(value).toBe(1_000);
      } else {
        expect(value).toBeUndefined();
      }
    }
  });
});
