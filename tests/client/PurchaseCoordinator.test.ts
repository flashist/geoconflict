/**
 * @jest-environment jsdom
 */
// Task 0494 (spec §4.3, §10): the page's one purchase flow, logged-in path.
// Fake deps only — no card, no SDK, no network.
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
import type { ProductPurchaseResult } from "../../src/client/ProductPurchase";
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
    noSource?: boolean;
    price?: string | null;
  } = {},
) {
  const order: string[] = [];
  let currentSnapshot = options.snapshot ?? BUYABLE;
  const source = {
    snapshot: jest.fn(() => currentSnapshot),
    reread: jest.fn(async () => {
      order.push("reread");
    }),
    markGranted: jest.fn((productId: PaymentProductId) => {
      order.push(`markGranted:${productId}`);
    }),
  } satisfies PurchaseProfileSource;
  const runProductPurchase = jest.fn(
    async (_productId: PaymentProductId): Promise<ProductPurchaseResult> =>
      "granted",
  );
  const logUiTap = jest.fn();
  const price = options.price === undefined ? "99 ₽" : options.price;
  const coordinator = createPurchaseCoordinator({
    profileSource: () => (options.noSource ? null : source),
    runProductPurchase,
    catalogPrice: () => price,
    logUiTap,
  });
  return {
    coordinator,
    source,
    runProductPurchase,
    logUiTap,
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
    ["guest", { ...BUYABLE, profile: null }, "error"],
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
