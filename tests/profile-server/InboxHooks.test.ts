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
import { PaymentsRepository } from "../../src/profile-server/PaymentsRepository";
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
    new_xp: 1000,
    was_citizen: false,
    earned_at: null,
  });
}

function grantInput() {
  return {
    purchaseToken: "tok-1",
    productId: "citizenship",
    yandexPlayerId: "yandex-1",
    intentId: "11111111-1111-1111-1111-111111111111",
    rawPayload: "{}",
  };
}

/** A payments client: fresh token (receipt row returned) or replay (no row). */
function paymentsClient(fresh: boolean): MockClient {
  return {
    query: jest.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO processed_purchases") && fresh) {
        return { rows: [{ purchase_token: "tok-1" }] };
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

    await expect(repo.creditMatchXp("g1", "yandex-1", 10)).resolves.toEqual({
      status: "credited",
      citizenshipNewlyGranted: true,
    });
    expect(sendTemplate).toHaveBeenCalledTimes(1);
    expect(sendTemplate).toHaveBeenCalledWith("yandex-1", "citizenship_earned");
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
    await expect(repo.creditMatchXp("g1", "yandex-1", 10)).resolves.toEqual({
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
    await expect(repo.creditMatchXp("g1", "yandex-1", 10)).resolves.toEqual({
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
          new_xp: 1000,
          was_citizen: false,
          earned_at: null,
        }),
      ),
      inboxWith(sendTemplate),
    );
    await expect(repo.creditMatchXp("g1", "yandex-1", 10)).resolves.toEqual({
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
          new_xp: 1000,
          was_citizen: true,
          earned_at: null,
        }),
      ),
      inboxWith(sendTemplate),
    );
    await expect(repo.creditMatchXp("g1", "yandex-1", 10)).resolves.toEqual({
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
          new_xp: 990,
          was_citizen: false,
          earned_at: null,
        }),
      ),
      inboxWith(sendTemplate),
    );
    await repo.creditMatchXp("g1", "yandex-1", 10);
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  test("without an inbox the grant still resolves credited", async () => {
    const repo = new PlayerProfileRepository(makePool(freshGrantClient()));
    await expect(repo.creditMatchXp("g1", "yandex-1", 10)).resolves.toEqual({
      status: "credited",
      citizenshipNewlyGranted: true,
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
    await expect(repo.grantPaidPurchase(grantInput())).resolves.toBe("granted");
    expect(sendTemplate).toHaveBeenCalledTimes(1);
    expect(sendTemplate).toHaveBeenCalledWith("yandex-1", "citizenship_paid");
    const statements = client.query.mock.calls.map((call) => String(call[0]));
    expect(sendTemplate.mock.invocationCallOrder[0]).toBeGreaterThan(
      client.query.mock.invocationCallOrder[statements.indexOf("COMMIT")],
    );
  });

  test("a replayed token (already_processed) never sends — /reconcile re-grants stay silent", async () => {
    const sendTemplate = jest.fn().mockResolvedValue(undefined);
    const repo = new PaymentsRepository(
      makePool(paymentsClient(false)),
      inboxWith(sendTemplate),
    );
    await expect(repo.grantPaidPurchase(grantInput())).resolves.toBe(
      "already_processed",
    );
    expect(sendTemplate).not.toHaveBeenCalled();
  });

  test("an inbox REJECTION leaves the granted status untouched", async () => {
    const sendTemplate = jest.fn().mockRejectedValue(new Error("inbox down"));
    const repo = new PaymentsRepository(
      makePool(paymentsClient(true)),
      inboxWith(sendTemplate),
    );
    await expect(repo.grantPaidPurchase(grantInput())).resolves.toBe("granted");
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
    await expect(repo.grantPaidPurchase(grantInput())).resolves.toBe("granted");
  });

  test("without an inbox the grant still resolves granted", async () => {
    const repo = new PaymentsRepository(makePool(paymentsClient(true)));
    await expect(repo.grantPaidPurchase(grantInput())).resolves.toBe("granted");
  });
});
