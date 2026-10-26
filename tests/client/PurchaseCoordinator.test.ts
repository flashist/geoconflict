/**
 * @jest-environment jsdom
 */
// Task 0494 (spec §4.3, §10): the page's one purchase flow, logged-in path;
// task 0495: the guest path (log in, then continue). Fake deps only — no card,
// no SDK, no network.
jest.mock("../../src/core/profile/PaymentsContract", () => {
  const actual = jest.requireActual("../../src/core/profile/PaymentsContract");
  // A test-only durable item: no real item id exists yet (spec §10, B4).
  return {
    ...actual,
    PRODUCT_DEFINITIONS: {
      ...actual.PRODUCT_DEFINITIONS,
      second_product: { kind: "durable_item" },
    },
  };
});

import type { PaymentProductId } from "../../src/core/profile/PaymentsContract";
import type { ReconcileNowResult } from "../../src/client/PaymentsReconciliation";
import type { ProductAnalytics } from "../../src/client/ProductClientConfig";
import type {
  ProductPurchaseOptions,
  ProductPurchaseResult,
} from "../../src/client/ProductPurchase";
import {
  createPurchaseCoordinator,
  PURCHASE_FLOW_STATE_EVENT,
  PURCHASE_GRANTED_EVENT,
  type PurchaseFlowState,
  type PurchaseFlowStateDetail,
  type PurchaseGrantedDetail,
  type PurchaseProfileSource,
} from "../../src/client/PurchaseCoordinator";
import type { PurchaseProfileSnapshot } from "../../src/client/PurchaseOffer";

const SECOND_PRODUCT = "second_product" as unknown as PaymentProductId;

const BUYABLE: PurchaseProfileSnapshot = {
  isRevealed: true,
  isChecking: false,
  profile: {
    isCitizen: false,
    isAuthoritative: true,
    isVerifiedRead: false,
    isPaidCitizen: false,
    xp: 40,
    entitlements: null,
  },
  paidGrantConfirmed: false,
  grantedThisPage: new Set(),
  canLogIn: true,
};

const GUEST: PurchaseProfileSnapshot = { ...BUYABLE, profile: null };

const ANALYTICS: ProductAnalytics = {
  started: "Started",
  completed: "Completed",
  abandoned: "Abandoned",
  restartPrompt: { shown: "Shown", restart: "Restart", later: "Later" },
  loginRequested: "LoginRequested",
  loginSucceeded: "LoginSucceeded",
  loginCancelled: "LoginCancelled",
  loginProfileFailed: "LoginProfileFailed",
  continueReady: "ContinueReady",
  continueNeedsTap: "ContinueNeedsTap",
  blockedAlreadyOwned: "BlockedAlreadyOwned",
  blockedEarlierPurchasePending: "BlockedEarlierPurchasePending",
  blockedCannotVerify: null,
};

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(
  options: {
    snapshot?: PurchaseProfileSnapshot;
    /** What the re-read applies (a guest's login makes it a player's read). */
    snapshotAfterReread?: PurchaseProfileSnapshot;
    noSource?: boolean;
    price?: string | null;
    autoContinueDeadlineMs?: number;
    analytics?: ProductAnalytics;
  } = {},
) {
  const order: string[] = [];
  let currentSnapshot = options.snapshot ?? BUYABLE;
  const source = {
    snapshot: jest.fn(() => currentSnapshot),
    reread: jest.fn(async (_options?: { showChecking?: boolean }) => {
      order.push("reread");
      if (options.snapshotAfterReread !== undefined) {
        currentSnapshot = options.snapshotAfterReread;
      }
    }),
    markGranted: jest.fn((productId: PaymentProductId) => {
      order.push(`markGranted:${productId}`);
    }),
  } satisfies PurchaseProfileSource;
  const runProductPurchase = jest.fn(
    async (
      _productId: PaymentProductId,
      _options?: ProductPurchaseOptions,
    ): Promise<ProductPurchaseResult> => "granted",
  );
  const logUiTap = jest.fn();
  const openAuthDialog = jest.fn(async () => true);
  const refreshPaymentsAfterLogin = jest.fn(
    async (_timeoutMs: number): Promise<boolean> => true,
  );
  const ensureSession = jest.fn(async (): Promise<string | null> => "token");
  const reconcileNow = jest.fn(
    async (_timeoutMs: number): Promise<ReconcileNowResult> => "none",
  );
  const requestLoginRestart = jest.fn();
  const logEvent = jest.fn();
  const price = options.price === undefined ? "99 ₽" : options.price;
  const coordinator = createPurchaseCoordinator({
    profileSource: () => (options.noSource ? null : source),
    runProductPurchase,
    catalogPrice: () => price,
    logUiTap,
    openAuthDialog,
    refreshPaymentsAfterLogin,
    ensureSession,
    reconcileNow,
    requestLoginRestart,
    now: () => Date.now(),
    setTimer: (callback, delayMs) => {
      const timer = setTimeout(callback, delayMs);
      return () => clearTimeout(timer);
    },
    autoContinueDeadlineMs: options.autoContinueDeadlineMs ?? 15_000,
    handOffDelayMs: 5_000,
    productAnalytics: () => options.analytics ?? ANALYTICS,
    logEvent,
  });
  return {
    coordinator,
    source,
    runProductPurchase,
    logUiTap,
    openAuthDialog,
    refreshPaymentsAfterLogin,
    ensureSession,
    reconcileNow,
    requestLoginRestart,
    logEvent,
    order,
    setSnapshot: (next: PurchaseProfileSnapshot) => {
      currentSnapshot = next;
    },
  };
}

describe("createPurchaseCoordinator (logged-in path)", () => {
  let states: PurchaseFlowStateDetail[];
  let grants: PurchaseGrantedDetail[];
  let order: string[] | null;
  const onState = (event: Event) => {
    states.push((event as CustomEvent<PurchaseFlowStateDetail>).detail);
  };
  const onGrant = (event: Event) => {
    grants.push((event as CustomEvent<PurchaseGrantedDetail>).detail);
    order?.push("grantedEvent");
  };

  beforeEach(() => {
    states = [];
    grants = [];
    order = null;
    window.addEventListener(PURCHASE_FLOW_STATE_EVENT, onState);
    window.addEventListener(PURCHASE_GRANTED_EVENT, onGrant);
  });

  afterEach(() => {
    window.removeEventListener(PURCHASE_FLOW_STATE_EVENT, onState);
    window.removeEventListener(PURCHASE_GRANTED_EVENT, onGrant);
  });

  const request = (
    coordinator: ReturnType<typeof setup>["coordinator"],
    productId: PaymentProductId = "citizenship",
  ) => coordinator.requestPurchase({ productId, tapElementId: "TapId" });

  it("buy → granted: markGranted, then PURCHASE_GRANTED_EVENT once, then the re-read", async () => {
    const t = setup();
    order = t.order;

    await expect(request(t.coordinator)).resolves.toBe("granted");

    expect(t.runProductPurchase).toHaveBeenCalledWith("citizenship");
    expect(grants).toEqual([{ productId: "citizenship" }]);
    expect(t.order).toEqual([
      "markGranted:citizenship",
      "grantedEvent",
      "reread",
    ]);
    expect(states.map((s) => s.state)).toEqual([
      "preparing",
      "paying",
      "granted",
    ]);
    expect(states.every((s) => s.productId === "citizenship")).toBe(true);
    expect(t.coordinator.currentState("citizenship")).toBe("granted");
  });

  it("logs the tap once, and calls the purchase synchronously inside the tap", () => {
    const t = setup();

    void request(t.coordinator);

    expect(t.logUiTap).toHaveBeenCalledTimes(1);
    expect(t.logUiTap).toHaveBeenCalledWith("TapId");
    expect(t.runProductPurchase).toHaveBeenCalledTimes(1);
  });

  it("decides on the current snapshot: no re-read before paying", async () => {
    const t = setup();

    await request(t.coordinator);

    expect(t.source.reread).toHaveBeenCalledTimes(1);
    expect(t.source.reread.mock.invocationCallOrder[0]).toBeGreaterThan(
      t.runProductPurchase.mock.invocationCallOrder[0],
    );
  });

  it("one latch for all products: a second request is busy, with no tap logged", async () => {
    const t = setup();
    const flow = deferred<ProductPurchaseResult>();
    t.runProductPurchase.mockReturnValueOnce(flow.promise);

    const first = request(t.coordinator, "citizenship");
    await expect(request(t.coordinator, SECOND_PRODUCT)).resolves.toBe("busy");
    await expect(request(t.coordinator, "citizenship")).resolves.toBe("busy");

    expect(t.runProductPurchase).toHaveBeenCalledTimes(1);
    expect(t.logUiTap).toHaveBeenCalledTimes(1);

    flow.resolve("error");
    await expect(first).resolves.toBe("error");
    await expect(request(t.coordinator, SECOND_PRODUCT)).resolves.toBe(
      "granted",
    );
  });

  it("the latch is held until the post-grant re-read has settled", async () => {
    const t = setup();
    const reread = deferred<void>();
    t.source.reread.mockReturnValueOnce(reread.promise);

    const first = request(t.coordinator);
    await Promise.resolve();
    await Promise.resolve();
    expect(t.source.markGranted).toHaveBeenCalledTimes(1);
    await expect(request(t.coordinator)).resolves.toBe("busy");

    reread.resolve();
    await expect(first).resolves.toBe("granted");
    t.runProductPurchase.mockResolvedValueOnce("error");
    await expect(request(t.coordinator)).resolves.toBe("error");
  });

  it.each<[string, PurchaseProfileSnapshot, PurchaseFlowState]>([
    ["owned", { ...BUYABLE, paidGrantConfirmed: true }, "already_owned"],
    [
      "read_failed",
      {
        ...BUYABLE,
        profile: { ...BUYABLE.profile!, isAuthoritative: false },
      },
      "profile_unavailable",
    ],
    ["checking", { ...BUYABLE, isChecking: true }, "error"],
  ])(
    "offer %s → %s, with no purchase call",
    async (_label, snapshot, expected) => {
      const t = setup({ snapshot });

      await expect(request(t.coordinator)).resolves.toBe(expected);

      expect(t.runProductPurchase).not.toHaveBeenCalled();
      expect(t.source.markGranted).not.toHaveBeenCalled();
      expect(grants).toEqual([]);
      expect(states.map((s) => s.state)).toEqual(["preparing", expected]);
    },
  );

  it("offer cannot_verify → cannot_verify, with no purchase call", async () => {
    // A citizen whose ownership of the test item is unknown.
    const t = setup({
      snapshot: {
        ...BUYABLE,
        profile: { ...BUYABLE.profile!, isCitizen: true },
      },
    });

    await expect(request(t.coordinator, SECOND_PRODUCT)).resolves.toBe(
      "cannot_verify",
    );
    expect(t.runProductPurchase).not.toHaveBeenCalled();
  });

  it("no catalog price → error, with no purchase call", async () => {
    const t = setup({ price: null });

    await expect(request(t.coordinator)).resolves.toBe("error");
    expect(t.runProductPurchase).not.toHaveBeenCalled();
  });

  it.each(["already_owned", "error"] as const)(
    "purchase result %s: passed through, no grant",
    async (result) => {
      const t = setup();
      t.runProductPurchase.mockResolvedValueOnce(result);

      await expect(request(t.coordinator)).resolves.toBe(result);

      expect(t.source.markGranted).not.toHaveBeenCalled();
      expect(t.source.reread).not.toHaveBeenCalled();
      expect(grants).toEqual([]);
      expect(states.map((s) => s.state)).toEqual([
        "preparing",
        "paying",
        result,
      ]);
    },
  );

  it("a throw → error, and the latch is released", async () => {
    const t = setup();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    t.runProductPurchase.mockRejectedValueOnce(new Error("boom"));

    await expect(request(t.coordinator)).resolves.toBe("error");
    expect(t.coordinator.currentState("citizenship")).toBe("error");

    await expect(request(t.coordinator)).resolves.toBe("granted");
    warn.mockRestore();
  });

  it("a failed post-grant re-read keeps granted and releases the latch", async () => {
    const t = setup();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    t.source.reread.mockRejectedValueOnce(new Error("read"));

    await expect(request(t.coordinator)).resolves.toBe("granted");
    await expect(request(t.coordinator)).resolves.toBe("granted");
    warn.mockRestore();
  });

  it("no profile source → error, with no purchase call", async () => {
    const t = setup({ noSource: true });

    await expect(request(t.coordinator)).resolves.toBe("error");
    expect(t.runProductPurchase).not.toHaveBeenCalled();
    expect(t.logUiTap).toHaveBeenCalledTimes(1);
  });

  it("currentState is idle before any request", () => {
    expect(setup().coordinator.currentState("citizenship")).toBe("idle");
  });
});

describe("guest path (task 0495)", () => {
  let states: PurchaseFlowState[];
  const onState = (event: Event) => {
    states.push((event as CustomEvent<PurchaseFlowStateDetail>).detail.state);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    states = [];
    window.addEventListener(PURCHASE_FLOW_STATE_EVENT, onState);
  });

  afterEach(() => {
    window.removeEventListener(PURCHASE_FLOW_STATE_EVENT, onState);
    jest.useRealTimers();
  });

  async function settle(): Promise<void> {
    for (let i = 0; i < 30; i++) {
      await Promise.resolve();
    }
  }

  async function advance(ms: number): Promise<void> {
    await jest.advanceTimersByTimeAsync(ms);
    await settle();
  }

  function guestSetup(
    options: Parameters<typeof setup>[0] = {},
  ): ReturnType<typeof setup> {
    return setup({
      snapshot: GUEST,
      snapshotAfterReread: BUYABLE,
      ...options,
    });
  }

  const request = (
    t: ReturnType<typeof setup>,
    productId: PaymentProductId = "citizenship",
  ) => t.coordinator.requestPurchase({ productId, tapElementId: "TapId" });

  /** Resolves only after `ms` of fake time. */
  function after<T>(ms: number, value: T): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(value), ms));
  }

  const loggedEvents = (t: ReturnType<typeof setup>) =>
    t.logEvent.mock.calls.map((call) => call[0]);

  it("guest buy → granted with one dialog and no login restart", async () => {
    const t = guestSetup();
    t.ensureSession.mockImplementationOnce(() => after(1200, "token"));

    const flow = request(t);
    await advance(1200);

    await expect(flow).resolves.toBe("granted");
    expect(t.openAuthDialog).toHaveBeenCalledTimes(1);
    expect(t.source.reread.mock.calls[0]).toEqual([{ showChecking: true }]);
    expect(t.runProductPurchase).toHaveBeenCalledTimes(1);
    expect(t.source.markGranted).toHaveBeenCalledWith("citizenship");
    expect(t.logEvent.mock.calls).toEqual([
      ["LoginRequested"],
      ["LoginSucceeded"],
      ["ContinueReady", 1200],
    ]);
    expect(states).toEqual(["logging_in", "preparing", "paying", "granted"]);
    await advance(60_000);
    t.coordinator.surfaceClosed("citizenship");
    expect(t.requestLoginRestart).not.toHaveBeenCalled();
  });

  it("opens the login dialog synchronously inside the tap", () => {
    const t = guestSetup();

    void request(t);

    expect(t.logUiTap).toHaveBeenCalledWith("TapId");
    expect(t.openAuthDialog).toHaveBeenCalledTimes(1);
  });

  it("runs the payments refresh and the profile login side by side", async () => {
    const t = guestSetup();
    const refresh = deferred<boolean>();
    t.refreshPaymentsAfterLogin.mockReturnValueOnce(refresh.promise);

    const flow = request(t);
    await settle();

    expect(t.refreshPaymentsAfterLogin).toHaveBeenCalledWith(5_000);
    expect(t.ensureSession).toHaveBeenCalledTimes(1);
    expect(t.reconcileNow).not.toHaveBeenCalled();
    refresh.resolve(true);
    await settle();
    expect(t.reconcileNow).toHaveBeenCalledWith(10_000);
    await expect(flow).resolves.toBe("granted");
  });

  it("a cancelled login ends login_cancelled: no session, no intent, never a hand-off", async () => {
    const t = guestSetup();
    t.openAuthDialog.mockResolvedValueOnce(false);

    await expect(request(t)).resolves.toBe("login_cancelled");

    expect(t.ensureSession).not.toHaveBeenCalled();
    expect(t.runProductPurchase).not.toHaveBeenCalled();
    expect(loggedEvents(t)).toEqual(["LoginRequested", "LoginCancelled"]);
    expect(states).toEqual(["logging_in", "login_cancelled"]);
    await advance(60_000);
    t.coordinator.surfaceClosed("citizenship");
    expect(t.requestLoginRestart).not.toHaveBeenCalled();
    expect(t.coordinator.currentState("citizenship")).toBe("idle");
  });

  it("a guest who cannot log in → error, with no dialog", async () => {
    const t = guestSetup({ snapshot: { ...GUEST, canLogIn: false } });

    await expect(request(t)).resolves.toBe("error");

    expect(t.openAuthDialog).not.toHaveBeenCalled();
    expect(t.logEvent).not.toHaveBeenCalled();
    await advance(60_000);
    expect(t.requestLoginRestart).not.toHaveBeenCalled();
  });

  describe("the deadline", () => {
    it("passing during the profile login → needs_tap, no purchase", async () => {
      const t = guestSetup();
      t.ensureSession.mockReturnValueOnce(new Promise(() => {}));

      const flow = request(t);
      await advance(14_999);
      expect(t.coordinator.currentState("citizenship")).toBe("preparing");
      await advance(1);

      await expect(flow).resolves.toBe("needs_tap");
      expect(t.runProductPurchase).not.toHaveBeenCalled();
      expect(loggedEvents(t)).toEqual([
        "LoginRequested",
        "LoginSucceeded",
        "ContinueNeedsTap",
      ]);
    });

    it("passing during the reconcile → needs_tap, no purchase", async () => {
      const t = guestSetup();
      t.reconcileNow.mockReturnValueOnce(new Promise(() => {}));

      const flow = request(t);
      await advance(15_000);

      await expect(flow).resolves.toBe("needs_tap");
      expect(t.source.reread).not.toHaveBeenCalled();
      expect(t.runProductPurchase).not.toHaveBeenCalled();
    });

    it("passing during the read → needs_tap, no purchase", async () => {
      const t = guestSetup();
      t.source.reread.mockReturnValueOnce(new Promise(() => {}));

      const flow = request(t);
      await advance(15_000);

      await expect(flow).resolves.toBe("needs_tap");
      expect(t.runProductPurchase).not.toHaveBeenCalled();
    });

    it("passing after /intent but before purchase() → the guard says no → needs_tap", async () => {
      const t = guestSetup();
      const guardAnswers: boolean[] = [];
      t.runProductPurchase.mockImplementationOnce(async (_id, options) => {
        await after(16_000, null); // a slow /intent
        const mayOpen = options?.mayOpenPaymentWindow?.() ?? true;
        guardAnswers.push(mayOpen);
        return mayOpen ? "granted" : "not_opened";
      });

      const flow = request(t);
      await advance(16_000);

      await expect(flow).resolves.toBe("needs_tap");
      expect(guardAnswers).toEqual([false]);
      expect(t.source.markGranted).not.toHaveBeenCalled();
      expect(loggedEvents(t)).toEqual([
        "LoginRequested",
        "LoginSucceeded",
        "ContinueReady",
        "ContinueNeedsTap",
      ]);
    });

    it("the guard says yes inside the deadline", async () => {
      const t = guestSetup();
      const guardAnswers: boolean[] = [];
      t.runProductPurchase.mockImplementationOnce(async (_id, options) => {
        guardAnswers.push(options?.mayOpenPaymentWindow?.() ?? true);
        return "granted";
      });

      await expect(request(t)).resolves.toBe("granted");
      expect(guardAnswers).toEqual([true]);
    });

    it("a deadline of 0 → needs_tap at once, with the preparation still started", async () => {
      const t = guestSetup({ autoContinueDeadlineMs: 0 });

      await expect(request(t)).resolves.toBe("needs_tap");

      expect(t.ensureSession).toHaveBeenCalledTimes(1);
      expect(t.refreshPaymentsAfterLogin).toHaveBeenCalledTimes(1);
      expect(t.runProductPurchase).not.toHaveBeenCalled();
    });
  });

  describe("the reconcile", () => {
    it.each<ReconcileNowResult>(["failed", "timeout", "pending_ungranted"])(
      "%s → needs_tap: never a second payment window by itself (F5)",
      async (reconciled) => {
        const t = guestSetup();
        t.reconcileNow.mockResolvedValueOnce(reconciled);

        await expect(request(t)).resolves.toBe("needs_tap");
        expect(t.source.reread).not.toHaveBeenCalled();
        expect(t.runProductPurchase).not.toHaveBeenCalled();
      },
    );

    it.each<ReconcileNowResult>(["processed", "none"])(
      "%s → goes on to the purchase",
      async (reconciled) => {
        const t = guestSetup();
        t.reconcileNow.mockResolvedValueOnce(reconciled);

        await expect(request(t)).resolves.toBe("granted");
      },
    );
  });

  describe("the payments refresh after the login (review R2)", () => {
    it("failed or timed out → needs_tap even when the reconcile says none", async () => {
      const t = guestSetup();
      t.refreshPaymentsAfterLogin.mockResolvedValueOnce(false);

      await expect(request(t)).resolves.toBe("needs_tap");
      expect(t.reconcileNow).toHaveBeenCalledTimes(1);
      expect(t.source.reread).not.toHaveBeenCalled();
      expect(t.runProductPurchase).not.toHaveBeenCalled();
      expect(loggedEvents(t)).toContain("ContinueNeedsTap");
    });

    it("then a tap re-checks and, with nothing ungranted, buys", async () => {
      const t = guestSetup();
      t.refreshPaymentsAfterLogin.mockResolvedValueOnce(false);
      await expect(request(t)).resolves.toBe("needs_tap");

      await expect(request(t)).resolves.toBe("granted");
      expect(t.reconcileNow).toHaveBeenCalledTimes(2);
      expect(t.refreshPaymentsAfterLogin).toHaveBeenCalledTimes(1);
    });

    it("then a tap whose re-check finds an ungranted purchase opens no payment window", async () => {
      const t = guestSetup();
      t.refreshPaymentsAfterLogin.mockResolvedValueOnce(false);
      await expect(request(t)).resolves.toBe("needs_tap");
      t.reconcileNow.mockResolvedValueOnce("pending_ungranted");

      await expect(request(t)).resolves.toBe("earlier_purchase_pending");
      expect(t.runProductPurchase).not.toHaveBeenCalled();
    });
  });

  it("no profile session → profile_unavailable: one re-read, no intent, never a hand-off", async () => {
    const t = guestSetup();
    t.ensureSession.mockResolvedValueOnce(null);

    await expect(request(t)).resolves.toBe("profile_unavailable");

    expect(t.source.reread).toHaveBeenCalledTimes(1);
    expect(t.source.reread.mock.calls[0]).toEqual([]);
    expect(t.reconcileNow).not.toHaveBeenCalled();
    expect(t.runProductPurchase).not.toHaveBeenCalled();
    expect(loggedEvents(t)).toEqual([
      "LoginRequested",
      "LoginSucceeded",
      "LoginProfileFailed",
    ]);
    await advance(60_000);
    t.coordinator.surfaceClosed("citizenship");
    expect(t.requestLoginRestart).not.toHaveBeenCalled();
  });

  describe("the offer after the login", () => {
    it("owned → already_owned, Blocked:AlreadyOwned, no intent", async () => {
      const t = guestSetup({
        snapshotAfterReread: { ...BUYABLE, paidGrantConfirmed: true },
      });

      await expect(request(t)).resolves.toBe("already_owned");
      expect(t.runProductPurchase).not.toHaveBeenCalled();
      expect(loggedEvents(t)).toContain("BlockedAlreadyOwned");
    });

    it("cannot_verify (a test durable item) → cannot_verify, logged when the product has the event", async () => {
      const t = guestSetup({
        snapshotAfterReread: {
          ...BUYABLE,
          profile: { ...BUYABLE.profile!, isCitizen: true },
        },
        analytics: { ...ANALYTICS, blockedCannotVerify: "BlockedCannotVerify" },
      });

      await expect(request(t, SECOND_PRODUCT)).resolves.toBe("cannot_verify");
      expect(t.runProductPurchase).not.toHaveBeenCalled();
      expect(loggedEvents(t)).toContain("BlockedCannotVerify");
    });

    it("read_failed → profile_unavailable and Login:ProfileFailed, never a hand-off", async () => {
      const t = guestSetup({
        snapshotAfterReread: {
          ...BUYABLE,
          profile: { ...BUYABLE.profile!, isAuthoritative: false },
        },
      });

      await expect(request(t)).resolves.toBe("profile_unavailable");
      expect(loggedEvents(t)).toContain("LoginProfileFailed");
      await advance(60_000);
      t.coordinator.surfaceClosed("citizenship");
      expect(t.requestLoginRestart).not.toHaveBeenCalled();
    });

    it("still checking (a newer read in flight) → needs_tap", async () => {
      const t = guestSetup({
        snapshotAfterReread: { ...BUYABLE, isChecking: true },
      });

      await expect(request(t)).resolves.toBe("needs_tap");
      expect(t.runProductPurchase).not.toHaveBeenCalled();
    });

    it("/intent answers 409 → already_owned and Blocked:AlreadyOwned", async () => {
      const t = guestSetup();
      t.runProductPurchase.mockResolvedValueOnce("already_owned");

      await expect(request(t)).resolves.toBe("already_owned");
      expect(loggedEvents(t)).toContain("BlockedAlreadyOwned");
    });
  });

  describe("the hand-off to the login restart (spec §4.3 step 12)", () => {
    it("error → the restart exactly at the delay, not before, once", async () => {
      const t = guestSetup();
      t.runProductPurchase.mockResolvedValueOnce("error");

      await expect(request(t)).resolves.toBe("error");
      await advance(4_999);
      expect(t.requestLoginRestart).not.toHaveBeenCalled();
      await advance(1);
      expect(t.requestLoginRestart).toHaveBeenCalledTimes(1);
      expect(t.coordinator.currentState("citizenship")).toBe("idle");
      await advance(60_000);
      t.coordinator.surfaceClosed("citizenship");
      expect(t.requestLoginRestart).toHaveBeenCalledTimes(1);
    });

    it.each(["already_owned", "cannot_verify"] as const)(
      "%s → the restart after the delay",
      async (end) => {
        const t = guestSetup(
          end === "already_owned"
            ? { snapshotAfterReread: { ...BUYABLE, paidGrantConfirmed: true } }
            : {
                snapshotAfterReread: {
                  ...BUYABLE,
                  profile: { ...BUYABLE.profile!, isCitizen: true },
                },
              },
        );

        await expect(
          request(t, end === "already_owned" ? "citizenship" : SECOND_PRODUCT),
        ).resolves.toBe(end);
        await advance(5_000);
        expect(t.requestLoginRestart).toHaveBeenCalledTimes(1);
      },
    );

    it("the surface closing inside the delay → the restart at once, once", async () => {
      const t = guestSetup();
      t.runProductPurchase.mockResolvedValueOnce("error");

      await request(t);
      await advance(1_000);
      t.coordinator.surfaceClosed("citizenship");

      expect(t.requestLoginRestart).toHaveBeenCalledTimes(1);
      await advance(10_000);
      expect(t.requestLoginRestart).toHaveBeenCalledTimes(1);
    });

    it("a Buy tap inside the delay cancels it and goes on from the read: no second login, no deadline", async () => {
      const t = guestSetup();
      const guardAnswers: boolean[] = [];
      t.runProductPurchase
        .mockImplementationOnce(async () => {
          await after(14_000, null);
          return "error";
        })
        .mockImplementationOnce(async (_id, options) => {
          guardAnswers.push(options?.mayOpenPaymentWindow?.() ?? true);
          return "granted";
        });
      const first = request(t);
      await advance(14_000);
      await expect(first).resolves.toBe("error");
      await advance(4_000); // past the 15 s deadline, inside the 5 s delay

      await expect(request(t)).resolves.toBe("granted");

      expect(t.openAuthDialog).toHaveBeenCalledTimes(1);
      expect(t.ensureSession).toHaveBeenCalledTimes(1);
      expect(t.source.reread.mock.calls[1]).toEqual([{ showChecking: true }]);
      expect(guardAnswers).toEqual([true]);
      // Continue:Ready counts only the automatic path.
      expect(loggedEvents(t).filter((e) => e === "ContinueReady")).toHaveLength(
        1,
      );
      await advance(60_000);
      expect(t.requestLoginRestart).not.toHaveBeenCalled();
    });

    it("that tap re-arms the delay when it ends in error again", async () => {
      const t = guestSetup();
      t.runProductPurchase.mockResolvedValue("error");
      await request(t);
      await advance(3_000);

      await expect(request(t)).resolves.toBe("error");
      await advance(4_999);
      expect(t.requestLoginRestart).not.toHaveBeenCalled();
      await advance(1);
      expect(t.requestLoginRestart).toHaveBeenCalledTimes(1);
    });

    it("needs_tap never arms a timer; the surface closing hands off once", async () => {
      const t = guestSetup();
      t.reconcileNow.mockResolvedValueOnce("failed");
      await expect(request(t)).resolves.toBe("needs_tap");

      await advance(120_000);
      expect(t.requestLoginRestart).not.toHaveBeenCalled();
      t.coordinator.surfaceClosed("citizenship");
      t.coordinator.surfaceClosed("citizenship");

      expect(t.requestLoginRestart).toHaveBeenCalledTimes(1);
      expect(t.coordinator.currentState("citizenship")).toBe("idle");
    });

    it("a tap after needs_tap waits for the preparation with no deadline, then buys", async () => {
      const t = guestSetup();
      const session = deferred<string | null>();
      t.ensureSession.mockReturnValueOnce(session.promise);
      const first = request(t);
      await advance(15_000);
      await expect(first).resolves.toBe("needs_tap");

      const second = request(t);
      await advance(30_000);
      expect(t.coordinator.currentState("citizenship")).toBe("preparing");
      session.resolve("token");
      await settle();

      await expect(second).resolves.toBe("granted");
      expect(t.openAuthDialog).toHaveBeenCalledTimes(1);
      expect(t.ensureSession).toHaveBeenCalledTimes(1);
      expect(t.requestLoginRestart).not.toHaveBeenCalled();
    });

    it("a tap re-runs the reconcile before the read", async () => {
      const t = guestSetup();
      t.reconcileNow.mockResolvedValueOnce("failed");
      await expect(request(t)).resolves.toBe("needs_tap");
      const rereadsBefore = t.source.reread.mock.calls.length;
      t.reconcileNow.mockImplementationOnce(async () => {
        expect(t.source.reread).toHaveBeenCalledTimes(rereadsBefore);
        return "none";
      });

      await expect(request(t)).resolves.toBe("granted");
      expect(t.reconcileNow).toHaveBeenCalledTimes(2);
      expect(t.reconcileNow).toHaveBeenLastCalledWith(10_000);
    });

    it("a tap whose re-check finds an ungranted purchase → earlier_purchase_pending: no read, no payment window (review R1)", async () => {
      const t = guestSetup();
      t.reconcileNow.mockResolvedValueOnce("pending_ungranted");
      await expect(request(t)).resolves.toBe("needs_tap");
      t.reconcileNow.mockResolvedValueOnce("pending_ungranted");

      await expect(request(t)).resolves.toBe("earlier_purchase_pending");
      expect(t.source.reread).not.toHaveBeenCalled();
      expect(t.runProductPurchase).not.toHaveBeenCalled();
      expect(loggedEvents(t)).toContain("BlockedEarlierPurchasePending");
      expect(states.at(-1)).toBe("earlier_purchase_pending");
      // An end line like error: the login restart follows after the delay.
      await advance(4_999);
      expect(t.requestLoginRestart).not.toHaveBeenCalled();
      await advance(1);
      expect(t.requestLoginRestart).toHaveBeenCalledTimes(1);
    });

    it.each<ReconcileNowResult>(["failed", "timeout"])(
      "a tap whose re-check itself fails (%s) goes on to the payment, as before",
      async (rechecked) => {
        const t = guestSetup();
        t.reconcileNow.mockResolvedValueOnce("pending_ungranted");
        await expect(request(t)).resolves.toBe("needs_tap");
        t.reconcileNow.mockResolvedValueOnce(rechecked);

        await expect(request(t)).resolves.toBe("granted");
        expect(t.runProductPurchase).toHaveBeenCalledTimes(1);
      },
    );

    it.each<ReconcileNowResult>(["none", "processed"])(
      "a tap whose re-check answers %s goes on to the payment",
      async (rechecked) => {
        const t = guestSetup();
        t.reconcileNow.mockResolvedValueOnce("failed");
        await expect(request(t)).resolves.toBe("needs_tap");
        t.reconcileNow.mockResolvedValueOnce(rechecked);

        await expect(request(t)).resolves.toBe("granted");
      },
    );
  });

  describe("the surface closing", () => {
    it("during preparing → no purchase, needs_tap, the restart at once", async () => {
      const t = guestSetup();
      const session = deferred<string | null>();
      t.ensureSession.mockReturnValueOnce(session.promise);
      const flow = request(t);
      await settle();

      t.coordinator.surfaceClosed("citizenship");
      expect(t.requestLoginRestart).not.toHaveBeenCalled();
      session.resolve("token");

      await expect(flow).resolves.toBe("needs_tap");
      expect(t.runProductPurchase).not.toHaveBeenCalled();
      expect(t.requestLoginRestart).toHaveBeenCalledTimes(1);
      expect(t.coordinator.currentState("citizenship")).toBe("idle");
    });

    it("during the login dialog → no purchase after it, the restart at once", async () => {
      const t = guestSetup();
      const dialog = deferred<boolean>();
      t.openAuthDialog.mockReturnValueOnce(dialog.promise);
      const flow = request(t);
      await settle();

      t.coordinator.surfaceClosed("citizenship");
      dialog.resolve(true);

      await expect(flow).resolves.toBe("needs_tap");
      expect(t.runProductPurchase).not.toHaveBeenCalled();
      expect(t.requestLoginRestart).toHaveBeenCalledTimes(1);
    });

    it("during /intent → the guard says no", async () => {
      const t = guestSetup();
      const guardAnswers: boolean[] = [];
      t.runProductPurchase.mockImplementationOnce(async (_id, options) => {
        await after(1_000, null);
        const mayOpen = options?.mayOpenPaymentWindow?.() ?? true;
        guardAnswers.push(mayOpen);
        return mayOpen ? "granted" : "not_opened";
      });
      const flow = request(t);
      await settle();
      expect(t.coordinator.currentState("citizenship")).toBe("paying");

      t.coordinator.surfaceClosed("citizenship");
      await advance(1_000);

      await expect(flow).resolves.toBe("needs_tap");
      expect(guardAnswers).toEqual([false]);
      expect(t.requestLoginRestart).toHaveBeenCalledTimes(1);
    });

    it("while the payment window is open, then granted → no restart", async () => {
      const t = guestSetup();
      const paid = deferred<ProductPurchaseResult>();
      t.runProductPurchase.mockReturnValueOnce(paid.promise);
      const flow = request(t);
      await settle();

      t.coordinator.surfaceClosed("citizenship");
      paid.resolve("granted");

      await expect(flow).resolves.toBe("granted");
      t.coordinator.surfaceClosed("citizenship");
      await advance(60_000);
      expect(t.requestLoginRestart).not.toHaveBeenCalled();
    });
  });

  describe("after the hand-off, and the latch", () => {
    it("the hand-off leaves idle, and a new tap starts a fresh login", async () => {
      const t = guestSetup();
      t.runProductPurchase.mockResolvedValueOnce("error");
      await request(t);
      t.coordinator.surfaceClosed("citizenship");
      expect(t.coordinator.currentState("citizenship")).toBe("idle");
      t.setSnapshot(GUEST);

      await expect(request(t)).resolves.toBe("granted");
      expect(t.openAuthDialog).toHaveBeenCalledTimes(2);
    });

    it("a second request during the login is busy", async () => {
      const t = guestSetup();
      const dialog = deferred<boolean>();
      t.openAuthDialog.mockReturnValueOnce(dialog.promise);
      const flow = request(t);

      await expect(request(t)).resolves.toBe("busy");
      await expect(request(t, SECOND_PRODUCT)).resolves.toBe("busy");

      dialog.resolve(false);
      await expect(flow).resolves.toBe("login_cancelled");
      expect(t.openAuthDialog).toHaveBeenCalledTimes(1);
    });

    it("the logged-in path never hands off, even on error", async () => {
      const t = setup();
      t.runProductPurchase.mockResolvedValueOnce("error");

      await expect(request(t)).resolves.toBe("error");
      await advance(60_000);
      t.coordinator.surfaceClosed("citizenship");

      expect(t.requestLoginRestart).not.toHaveBeenCalled();
      expect(t.openAuthDialog).not.toHaveBeenCalled();
    });

    it("surfaceClosed with nothing running puts an end state back to idle", async () => {
      const t = setup();
      t.runProductPurchase.mockResolvedValueOnce("error");
      await request(t);
      expect(t.coordinator.currentState("citizenship")).toBe("error");

      t.coordinator.surfaceClosed("citizenship");

      expect(t.coordinator.currentState("citizenship")).toBe("idle");
    });
  });
});
