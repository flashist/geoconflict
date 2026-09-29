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
    expect(signatureEvents()).toEqual([
      ["Profile:Login:Signature:Ready", undefined],
    ]);
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
