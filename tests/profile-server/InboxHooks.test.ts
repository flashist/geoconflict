// The post-commit citizenship seams (task 0012 filled them; 0017 review
// residual R1 hardened them): a throwing or rejecting inbox send must never
// change the durable outcome the caller reports, and the hook fires ONLY on a
// fresh false→true grant / a fresh paid grant.

jest.mock("../../src/profile-server/Logger", () => ({
  logger: {
    child: () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn() }),
  },
  formatError: (error: unknown) => String(error),
}));

import type { Pool } from "pg";
import type { InboxSender } from "../../src/profile-server/InboxRepository";
import {
  durableItemGrant,
  PaymentsRepository,
  PRODUCT_GRANTS,
} from "../../src/profile-server/PaymentsRepository";
import { PlayerProfileRepository } from "../../src/profile-server/PlayerProfileRepository";

interface MockClient {
  query: jest.Mock;
  release: jest.Mock;
}

function makePool(client: MockClient): Pool {
  return {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue(client),
  } as unknown as Pool;
}

/** A credit client: `inserted` 1 = fresh credit, 0 = duplicate. */
function creditClient(row: {
  inserted: number;
  new_xp: number;
  was_citizen: boolean;
  earned_at: Date | null;
}): MockClient {
  return {
    query: jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("player_match_xp_credits")) {
        return { rows: [row] };
      }
      return { rows: [] };
    }),
    release: jest.fn(),
  };
}

function freshGrantClient(): MockClient {
  return creditClient({
    inserted: 1,
    new_xp: 100,
    was_citizen: false,
    earned_at: null,
  });
}

const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";

function grantInput() {
  return {
    purchaseToken: "tok-1",
    productId: "citizenship",
    playerId: PLAYER_ID,
    intentId: "11111111-1111-1111-1111-111111111111",
    rawPayload: "{}",
  };
}

const FRESH_GRANT = { status: "granted", becamePaidCitizen: true };

/** A payments client: fresh token (receipt row returned) or replay (no row). */
function paymentsClient(fresh: boolean, wasPaid = false): MockClient {
  return {
    query: jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO processed_purchases") && fresh) {
        return { rows: [{ purchase_token: "tok-1" }] };
      }
      if (sql.includes("FOR NO KEY UPDATE")) {
        return { rows: [{ is_paid_citizen: wasPaid }] };
      }
      if (sql.includes("is_paid_citizen = true")) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    }),
    release: jest.fn(),
  };
}

function inboxWith(sendTemplate: jest.Mock): InboxSender {
  return { sendTemplate };
}

describe("PlayerProfileRepository.afterCitizenshipEarned", () => {
  test("a fresh threshold crossing sends citizenship_earned after commit", async () => {
    const client = freshGrantClient();
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PlayerProfileRepository(
      makePool(client),
      inboxWith(sendTemplate),
    );

    await expect(repo.creditMatchXp("g1", PLAYER_ID, 1)).resolves.toEqual({
      status: "credited",
      citizenshipNewlyGranted: true,
    });
    expect(sendTemplate).toHaveBeenCalledTimes(1);
    expect(sendTemplate).toHaveBeenCalledWith(PLAYER_ID, "citizenship_earned");
    // Post-commit: COMMIT was issued before the send.
    const statements = client.query.mock.calls.map((call) => String(call[0]));
    expect(statements).toContain("COMMIT");
    expect(sendTemplate.mock.invocationCallOrder[0]).toBeGreaterThan(
      client.query.mock.invocationCallOrder[statements.indexOf("COMMIT")],
    );
  });

  test("an inbox REJECTION leaves the credited outcome untouched", async () => {
    const sendTemplate = jest.fn().mockRejectedValue(new Error("inbox down"));
    const repo = new PlayerProfileRepository(
      makePool(freshGrantClient()),
      inboxWith(sendTemplate),
    );
    await expect(repo.creditMatchXp("g1", PLAYER_ID, 1)).resolves.toEqual({
      status: "credited",
      citizenshipNewlyGranted: true,
    });
    // Let the rejected promise settle — nothing may escape as unhandled.
    await new Promise((resolve) => setImmediate(resolve));
    expect(sendTemplate).toHaveBeenCalledTimes(1);
  });

  test("an inbox SYNC THROW leaves the credited outcome untouched", async () => {
    const sendTemplate = jest.fn().mockImplementation(() => {
      throw new Error("sync boom");
    });
    const repo = new PlayerProfileRepository(
      makePool(freshGrantClient()),
      inboxWith(sendTemplate),
    );
    await expect(repo.creditMatchXp("g1", PLAYER_ID, 1)).resolves.toEqual({
      status: "credited",
      citizenshipNewlyGranted: true,
    });
    expect(sendTemplate).toHaveBeenCalledTimes(1);
  });

  test("a duplicate credit never sends", async () => {
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PlayerProfileRepository(
      makePool(
        creditClient({
          inserted: 0,
          new_xp: 100,
          was_citizen: false,
          earned_at: null,
        }),
      ),
      inboxWith(sendTemplate),
    );
    await expect(repo.creditMatchXp("g1", PLAYER_ID, 1)).resolves.toEqual({
      status: "duplicate",
      citizenshipNewlyGranted: false,
    });
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  test("a paid citizen crossing the threshold never sends (stamp-on-crossing only)", async () => {
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PlayerProfileRepository(
      makePool(
        creditClient({
          inserted: 1,
          new_xp: 100,
          was_citizen: true,
          earned_at: null,
        }),
      ),
      inboxWith(sendTemplate),
    );
    await expect(repo.creditMatchXp("g1", PLAYER_ID, 1)).resolves.toEqual({
      status: "credited",
      citizenshipNewlyGranted: false,
    });
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  test("a credit below the threshold never sends", async () => {
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PlayerProfileRepository(
      makePool(
        creditClient({
          inserted: 1,
          new_xp: 99,
          was_citizen: false,
          earned_at: null,
        }),
      ),
      inboxWith(sendTemplate),
    );
    await repo.creditMatchXp("g1", PLAYER_ID, 1);
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  test("without an inbox the grant still resolves credited", async () => {
    const repo = new PlayerProfileRepository(makePool(freshGrantClient()));
    await expect(repo.creditMatchXp("g1", PLAYER_ID, 1)).resolves.toEqual({
      status: "credited",
      citizenshipNewlyGranted: true,
    });
  });
});

/**
 * A tenure-check client (task 0253). `inserted` false = the player was already
 * checked (ON CONFLICT DO NOTHING returned no row).
 */
function tenureClient(state: {
  xp: number;
  isCitizen: boolean;
  earnedAt: Date | null;
  inserted: boolean;
  storedXp?: number;
}): MockClient {
  return {
    query: jest
      .fn()
      .mockImplementation(async (sql: string, params?: unknown[]) => {
        if (sql.includes("FOR UPDATE")) {
          return {
            rows: [
              {
                xp: state.xp,
                is_citizen: state.isCitizen,
                citizenship_earned_at: state.earnedAt,
              },
            ],
          };
        }
        if (sql.includes("INSERT INTO player_xp_grants")) {
          return {
            rows: state.inserted ? [{ xp_awarded: params?.[1] }] : [],
          };
        }
        if (sql.includes("SELECT xp_awarded FROM player_xp_grants")) {
          return { rows: [{ xp_awarded: state.storedXp ?? 0 }] };
        }
        if (sql.includes("SET xp = xp + $2")) {
          return { rows: [{ xp: state.xp + Number(params?.[1]) }] };
        }
        return { rows: [] };
      }),
    release: jest.fn(),
  };
}

const TENURE_EVIDENCE = { daysPlayed: 60, gameRecordDays: 10 };

describe("PlayerProfileRepository.recordTenureCheck → afterCitizenshipEarned (task 0253)", () => {
  test("a grant crossing 100 sends citizenship_earned after commit", async () => {
    const client = tenureClient({
      xp: 60,
      isCitizen: false,
      earnedAt: null,
      inserted: true,
    });
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PlayerProfileRepository(
      makePool(client),
      inboxWith(sendTemplate),
    );

    await expect(
      repo.recordTenureCheck(PLAYER_ID, 50, TENURE_EVIDENCE),
    ).resolves.toEqual({
      status: "granted",
      xpAwarded: 50,
      xp: 110,
      citizenshipNewlyGranted: true,
      isCitizen: true,
    });
    expect(sendTemplate).toHaveBeenCalledTimes(1);
    expect(sendTemplate).toHaveBeenCalledWith(PLAYER_ID, "citizenship_earned");
    const statements = client.query.mock.calls.map((call) => String(call[0]));
    expect(statements.some((sql) => sql.includes("is_citizen = true"))).toBe(
      true,
    );
    expect(sendTemplate.mock.invocationCallOrder[0]).toBeGreaterThan(
      client.query.mock.invocationCallOrder[statements.indexOf("COMMIT")],
    );
  });

  test("a grant below 100 never sends", async () => {
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PlayerProfileRepository(
      makePool(
        tenureClient({
          xp: 10,
          isCitizen: false,
          earnedAt: null,
          inserted: true,
        }),
      ),
      inboxWith(sendTemplate),
    );
    await expect(
      repo.recordTenureCheck(PLAYER_ID, 50, TENURE_EVIDENCE),
    ).resolves.toMatchObject({ status: "granted", xp: 60 });
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  test("below_minimum records a 0-XP check, adds nothing and never sends", async () => {
    const client = tenureClient({
      xp: 99,
      isCitizen: false,
      earnedAt: null,
      inserted: true,
    });
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PlayerProfileRepository(
      makePool(client),
      inboxWith(sendTemplate),
    );
    await expect(
      repo.recordTenureCheck(PLAYER_ID, 0, {
        daysPlayed: 2,
        gameRecordDays: 1,
      }),
    ).resolves.toEqual({
      status: "below_minimum",
      xpAwarded: 0,
      xp: 99,
      citizenshipNewlyGranted: false,
      isCitizen: false,
    });
    const statements = client.query.mock.calls.map((call) => String(call[0]));
    expect(
      statements.some((sql) => sql.includes("INSERT INTO player_xp_grants")),
    ).toBe(true);
    expect(statements.some((sql) => sql.includes("SET xp = xp + $2"))).toBe(
      false,
    );
    expect(statements).toContain("COMMIT");
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  test("duplicate reports the stored amount, adds nothing and never sends", async () => {
    const client = tenureClient({
      xp: 99,
      isCitizen: false,
      earnedAt: null,
      inserted: false,
      storedXp: 30,
    });
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PlayerProfileRepository(
      makePool(client),
      inboxWith(sendTemplate),
    );
    await expect(
      repo.recordTenureCheck(PLAYER_ID, 50, TENURE_EVIDENCE),
    ).resolves.toEqual({
      status: "duplicate",
      xpAwarded: 30,
      xp: 99,
      citizenshipNewlyGranted: false,
      isCitizen: false,
    });
    const statements = client.query.mock.calls.map((call) => String(call[0]));
    expect(statements.some((sql) => sql.includes("SET xp = xp + $2"))).toBe(
      false,
    );
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  test("the stored evidence is the two counts only — never an extra field", async () => {
    const client = tenureClient({
      xp: 0,
      isCitizen: false,
      earnedAt: null,
      inserted: true,
    });
    const repo = new PlayerProfileRepository(makePool(client));
    await repo.recordTenureCheck(PLAYER_ID, 10, {
      ...TENURE_EVIDENCE,
      yandexPlayerId: "yandex-1",
    } as typeof TENURE_EVIDENCE);
    const insert = client.query.mock.calls.find((call) =>
      String(call[0]).includes("INSERT INTO player_xp_grants"),
    );
    expect(JSON.parse(String(insert?.[1]?.[2]))).toEqual(TENURE_EVIDENCE);
  });

  test("an inbox REJECTION leaves the granted outcome untouched", async () => {
    const sendTemplate = jest.fn().mockRejectedValue(new Error("inbox down"));
    const repo = new PlayerProfileRepository(
      makePool(
        tenureClient({
          xp: 60,
          isCitizen: false,
          earnedAt: null,
          inserted: true,
        }),
      ),
      inboxWith(sendTemplate),
    );
    await expect(
      repo.recordTenureCheck(PLAYER_ID, 50, TENURE_EVIDENCE),
    ).resolves.toMatchObject({
      status: "granted",
      citizenshipNewlyGranted: true,
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(sendTemplate).toHaveBeenCalledTimes(1);
  });

  test("an inbox SYNC THROW leaves the granted outcome untouched", async () => {
    const sendTemplate = jest.fn().mockImplementation(() => {
      throw new Error("sync boom");
    });
    const repo = new PlayerProfileRepository(
      makePool(
        tenureClient({
          xp: 60,
          isCitizen: false,
          earnedAt: null,
          inserted: true,
        }),
      ),
      inboxWith(sendTemplate),
    );
    await expect(
      repo.recordTenureCheck(PLAYER_ID, 50, TENURE_EVIDENCE),
    ).resolves.toMatchObject({
      status: "granted",
      citizenshipNewlyGranted: true,
    });
    expect(sendTemplate).toHaveBeenCalledTimes(1);
  });

  // Review R8 (round 3): the error path, the sibling repositories' pattern.
  test("a mid-transaction throw issues ROLLBACK, re-throws the ORIGINAL error and releases the client", async () => {
    const client = tenureClient({
      xp: 60,
      isCitizen: false,
      earnedAt: null,
      inserted: true,
    });
    const base = client.query.getMockImplementation()!;
    client.query.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes("SET xp = xp + $2")) {
        throw new Error("boom mid-transaction");
      }
      return base(sql, params);
    });
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PlayerProfileRepository(
      makePool(client),
      inboxWith(sendTemplate),
    );

    await expect(
      repo.recordTenureCheck(PLAYER_ID, 50, TENURE_EVIDENCE),
    ).rejects.toThrow("boom mid-transaction");
    const statements = client.query.mock.calls.map((call) => String(call[0]));
    expect(statements).toContain("ROLLBACK");
    expect(statements).not.toContain("COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  test("a ROLLBACK that itself fails still surfaces the ORIGINAL error and releases the client", async () => {
    const client = tenureClient({
      xp: 60,
      isCitizen: false,
      earnedAt: null,
      inserted: true,
    });
    const base = client.query.getMockImplementation()!;
    client.query.mockImplementation(async (sql: string, params?: unknown[]) => {
      if (sql.includes("INSERT INTO player_xp_grants")) {
        throw new Error("original insert failure");
      }
      if (sql === "ROLLBACK") {
        throw new Error("connection gone");
      }
      return base(sql, params);
    });
    const repo = new PlayerProfileRepository(makePool(client));

    await expect(
      repo.recordTenureCheck(PLAYER_ID, 50, TENURE_EVIDENCE),
    ).rejects.toThrow("original insert failure");
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test("a paid citizen crossing 100 never sends", async () => {
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PlayerProfileRepository(
      makePool(
        tenureClient({
          xp: 60,
          isCitizen: true,
          earnedAt: null,
          inserted: true,
        }),
      ),
      inboxWith(sendTemplate),
    );
    await expect(
      repo.recordTenureCheck(PLAYER_ID, 50, TENURE_EVIDENCE),
    ).resolves.toMatchObject({
      status: "granted",
      citizenshipNewlyGranted: false,
      isCitizen: true,
    });
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  // Task 0250 S1: `isCitizen` is the citizen state AFTER the call, so the route
  // can equalize `xp` for an unverified caller.
  describe("isCitizen on every outcome (task 0250 S1)", () => {
    test.each([
      { inserted: false, xpAwarded: 50, status: "duplicate" },
      { inserted: true, xpAwarded: 0, status: "below_minimum" },
      { inserted: true, xpAwarded: 10, status: "granted" },
    ])(
      "an already-citizen (paid, xp 30) → $status reports isCitizen true",
      async ({ inserted, xpAwarded, status }) => {
        const repo = new PlayerProfileRepository(
          makePool(
            tenureClient({ xp: 30, isCitizen: true, earnedAt: null, inserted }),
          ),
        );
        await expect(
          repo.recordTenureCheck(PLAYER_ID, xpAwarded, TENURE_EVIDENCE),
        ).resolves.toMatchObject({ status, isCitizen: true });
      },
    );

    test("a non-citizen granted below 100 reports isCitizen false", async () => {
      const repo = new PlayerProfileRepository(
        makePool(
          tenureClient({
            xp: 10,
            isCitizen: false,
            earnedAt: null,
            inserted: true,
          }),
        ),
      );
      await expect(
        repo.recordTenureCheck(PLAYER_ID, 50, TENURE_EVIDENCE),
      ).resolves.toMatchObject({ status: "granted", isCitizen: false });
    });

    test("not_found reports isCitizen false", async () => {
      const client: MockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      const repo = new PlayerProfileRepository(makePool(client));
      await expect(
        repo.recordTenureCheck(PLAYER_ID, 50, TENURE_EVIDENCE),
      ).resolves.toEqual({
        status: "not_found",
        xpAwarded: 0,
        xp: 0,
        citizenshipNewlyGranted: false,
        isCitizen: false,
      });
    });
  });
});

describe("PaymentsRepository.afterPaidPurchaseGranted", () => {
  test("a fresh grant sends citizenship_paid after commit", async () => {
    const client = paymentsClient(true);
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PaymentsRepository(
      makePool(client),
      inboxWith(sendTemplate),
    );
    await expect(repo.grantPaidPurchase(grantInput())).resolves.toEqual(
      FRESH_GRANT,
    );
    expect(sendTemplate).toHaveBeenCalledTimes(1);
    expect(sendTemplate).toHaveBeenCalledWith(PLAYER_ID, "citizenship_paid");
    const statements = client.query.mock.calls.map((call) => String(call[0]));
    expect(sendTemplate.mock.invocationCallOrder[0]).toBeGreaterThan(
      client.query.mock.invocationCallOrder[statements.indexOf("COMMIT")],
    );
  });

  // Task 0492: the welcome follows every fresh citizenship grant, as before B1 —
  // becamePaidCitizen gates it only for a durable item (task 0496).
  test("a fresh grant to an already-paid player still sends citizenship_paid", async () => {
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PaymentsRepository(
      makePool(paymentsClient(true, true)),
      inboxWith(sendTemplate),
    );
    await expect(repo.grantPaidPurchase(grantInput())).resolves.toEqual({
      status: "granted",
      becamePaidCitizen: false,
    });
    expect(sendTemplate).toHaveBeenCalledTimes(1);
    expect(sendTemplate).toHaveBeenCalledWith(PLAYER_ID, "citizenship_paid");
  });

  test("a replayed token (already_processed) never sends — /reconcile re-grants stay silent", async () => {
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PaymentsRepository(
      makePool(paymentsClient(false)),
      inboxWith(sendTemplate),
    );
    await expect(repo.grantPaidPurchase(grantInput())).resolves.toEqual({
      status: "already_processed",
    });
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  test("an inbox REJECTION leaves the granted status untouched", async () => {
    const sendTemplate = jest.fn().mockRejectedValue(new Error("inbox down"));
    const repo = new PaymentsRepository(
      makePool(paymentsClient(true)),
      inboxWith(sendTemplate),
    );
    await expect(repo.grantPaidPurchase(grantInput())).resolves.toEqual(
      FRESH_GRANT,
    );
    await new Promise((resolve) => setImmediate(resolve));
  });

  test("an inbox SYNC THROW leaves the granted status untouched", async () => {
    const sendTemplate = jest.fn().mockImplementation(() => {
      throw new Error("sync boom");
    });
    const repo = new PaymentsRepository(
      makePool(paymentsClient(true)),
      inboxWith(sendTemplate),
    );
    await expect(repo.grantPaidPurchase(grantInput())).resolves.toEqual(
      FRESH_GRANT,
    );
  });

  test("without an inbox the grant still resolves granted", async () => {
    const repo = new PaymentsRepository(makePool(paymentsClient(true)));
    await expect(repo.grantPaidPurchase(grantInput())).resolves.toEqual(
      FRESH_GRANT,
    );
  });
});

// Task 0496: an item is not sellable yet, so it reaches the grant through the
// repository's registry seam. "name_change_approved" stands in for an item's
// own template (no item key exists yet).
describe("PaymentsRepository.afterPaidPurchaseGranted — durable items (task 0496)", () => {
  const TEST_ITEM = "test_durable_item";
  const ITEM_TEMPLATE = "name_change_approved" as const;

  function itemRepo(
    client: MockClient,
    sendTemplate: jest.Mock,
    itemTemplate: typeof ITEM_TEMPLATE | null = ITEM_TEMPLATE,
  ): PaymentsRepository {
    return new PaymentsRepository(makePool(client), inboxWith(sendTemplate), {
      ...PRODUCT_GRANTS,
      [TEST_ITEM]: durableItemGrant(itemTemplate),
    });
  }

  function itemGrant() {
    return { ...grantInput(), productId: TEST_ITEM };
  }

  async function settle(): Promise<void> {
    await new Promise((resolve) => setImmediate(resolve));
  }

  test("an item to a non-paid buyer sends citizenship_paid, then the item's template", async () => {
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = itemRepo(paymentsClient(true, false), sendTemplate);
    await expect(repo.grantPaidPurchase(itemGrant())).resolves.toEqual(
      FRESH_GRANT,
    );
    await settle();
    expect(sendTemplate.mock.calls).toEqual([
      [PLAYER_ID, "citizenship_paid"],
      [PLAYER_ID, ITEM_TEMPLATE],
    ]);
  });

  test("the item send waits for the welcome send to settle", async () => {
    let releaseWelcome: () => void = () => {};
    const sendTemplate = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            releaseWelcome = resolve;
          }),
      )
      .mockResolvedValue(undefined);
    const repo = itemRepo(paymentsClient(true, false), sendTemplate);
    await repo.grantPaidPurchase(itemGrant());
    await settle();
    expect(sendTemplate).toHaveBeenCalledTimes(1);
    releaseWelcome();
    await settle();
    expect(sendTemplate).toHaveBeenCalledTimes(2);
  });

  test("an item to an already-paid buyer sends only the item's template", async () => {
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = itemRepo(paymentsClient(true, true), sendTemplate);
    await expect(repo.grantPaidPurchase(itemGrant())).resolves.toEqual({
      status: "granted",
      becamePaidCitizen: false,
    });
    await settle();
    expect(sendTemplate.mock.calls).toEqual([[PLAYER_ID, ITEM_TEMPLATE]]);
  });

  test("an item with no template to an already-paid buyer sends nothing", async () => {
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = itemRepo(paymentsClient(true, true), sendTemplate, null);
    await repo.grantPaidPurchase(itemGrant());
    await settle();
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  test("a replayed item token sends nothing", async () => {
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = itemRepo(paymentsClient(false), sendTemplate);
    await expect(repo.grantPaidPurchase(itemGrant())).resolves.toEqual({
      status: "already_processed",
    });
    await settle();
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  test("a failing welcome send never throws and still lets the item send run", async () => {
    const sendTemplate = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("sync boom");
      })
      .mockRejectedValueOnce(new Error("inbox down"));
    const repo = itemRepo(paymentsClient(true, false), sendTemplate);
    await expect(repo.grantPaidPurchase(itemGrant())).resolves.toEqual(
      FRESH_GRANT,
    );
    await settle();
    expect(sendTemplate).toHaveBeenCalledTimes(2);
  });
});
