// Data layer for Yandex payments (task 0019). Same rules as
// PlayerProfileRepository: the ONLY component that touches the payments tables,
// snake_case column names end-to-end, shared pg Pool.
//
// Grant invariant (brief "sole authority", 2026-06-13): `is_paid_citizen` /
// `citizenship_purchased_at` are written by grantPaidPurchase ONLY — the single
// code path reachable exclusively through HMAC-verified /complete or /reconcile.

import { Pool, PoolClient } from "pg";
import { logInboxSendFailure, type InboxSender } from "./InboxRepository";

/** A purchase_intents row, camelCased for the route layer. */
export interface PurchaseIntent {
  id: string;
  /** The internal player id (task 0270) the intent was created for. */
  playerId: string;
  productId: string;
  usedAt: string | null;
}

/** A processed_purchases receipt row. */
export interface ProcessedPurchase {
  purchaseToken: string;
  playerId: string;
  productId: string;
}

export interface PaidPurchaseGrant {
  purchaseToken: string;
  productId: string;
  playerId: string;
  intentId: string | null;
  rawPayload: string;
}

/** granted = fresh grant; already_processed = token seen before (idempotent no-op). */
export type GrantStatus = "granted" | "already_processed";

// The paid-flag write. Sets is_citizen too (chk_paid_implies_citizen);
// citizenship_purchased_at is COALESCEd so a re-grant never rewrites history.
//
// There is no "ensure profile" step any more (task 0270): a purchase is bound to
// an intent, the intent references players(id), and the route only creates
// intents for players that already exist. The grant still checks the row count —
// see grantPaidPurchase.
const GRANT_FLAGS_SQL = `
UPDATE players
SET is_citizen = true,
    is_paid_citizen = true,
    citizenship_purchased_at = coalesce(citizenship_purchased_at, now()),
    updated_at = now()
WHERE id = $1
`;

export class PaymentsRepository {
  /** `inbox` optional: without it the post-grant seam sends nothing (tests/tools). */
  constructor(
    private readonly pool: Pool,
    private readonly inbox?: InboxSender,
  ) {}

  /**
   * Create a purchase intent for an EXISTING player (the route resolves the
   * caller find-only and 404s an unknown one; the FK refuses anything else).
   * Returns the new intent id (the uuid the client passes to Yandex as
   * developerPayload).
   */
  async createIntent(playerId: string, productId: string): Promise<string> {
    return this.inTransaction(async (client) => {
      const res = await client.query(
        `INSERT INTO purchase_intents (player_id, product_id)
         VALUES ($1, $2)
         RETURNING id`,
        [playerId, productId],
      );
      return res.rows[0].id as string;
    });
  }

  /** Read an intent by id (any state). Caller validates the uuid format first. */
  async findIntent(intentId: string): Promise<PurchaseIntent | null> {
    const res = await this.pool.query(
      `SELECT id, player_id, product_id, used_at
       FROM purchase_intents WHERE id = $1`,
      [intentId],
    );
    if (res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];
    return {
      id: row.id,
      playerId: row.player_id,
      productId: row.product_id,
      usedAt: row.used_at ? (row.used_at as Date).toISOString() : null,
    };
  }

  /** Read a processed-purchase receipt by token (the idempotent-retry path). */
  async getProcessedPurchase(
    purchaseToken: string,
  ): Promise<ProcessedPurchase | null> {
    const res = await this.pool.query(
      `SELECT purchase_token, player_id, product_id
       FROM processed_purchases WHERE purchase_token = $1`,
      [purchaseToken],
    );
    if (res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];
    return {
      purchaseToken: row.purchase_token,
      playerId: row.player_id,
      productId: row.product_id,
    };
  }

  /**
   * Grant a verified paid purchase in ONE transaction: record the receipt
   * (token PK = idempotency + concurrency guard), set the paid flags, mark the
   * intent used. A token already in the ledger short-circuits to
   * "already_processed" WITHOUT touching flags again — safe under concurrent
   * double-submit because the conflicting INSERT serializes on the PK.
   */
  async grantPaidPurchase(grant: PaidPurchaseGrant): Promise<GrantStatus> {
    // GRANT_FLAGS_SQL is citizenship-specific. The day a second product joins
    // PAYMENT_PRODUCT_IDS it needs its OWN grant branch here — fail loudly
    // rather than silently minting citizenship for it.
    if (grant.productId !== "citizenship") {
      throw new Error(
        `grantPaidPurchase: no grant defined for productId "${grant.productId}"`,
      );
    }
    const status = await this.inTransaction<GrantStatus>(async (client) => {
      const inserted = await client.query(
        `INSERT INTO processed_purchases
           (purchase_token, player_id, product_id, intent_id, raw_payload)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (purchase_token) DO NOTHING
         RETURNING purchase_token`,
        [
          grant.purchaseToken,
          grant.playerId,
          grant.productId,
          grant.intentId,
          grant.rawPayload,
        ],
      );
      if (inserted.rows.length === 0) {
        return "already_processed";
      }
      const flags = await client.query(GRANT_FLAGS_SQL, [grant.playerId]);
      if ((flags.rowCount ?? 0) === 0) {
        // No players row to flag. processed_purchases.player_id has no FK (a
        // receipt must outlive an erasure), so without this check the receipt
        // would commit with no entitlement behind it and a retry would read
        // "already processed". Throwing rolls the whole grant back instead.
        // Practically unreachable: the intent's FK cascades on erasure.
        throw new Error("grantPaidPurchase: no player row to grant");
      }
      if (grant.intentId !== null) {
        await client.query(
          `UPDATE purchase_intents
           SET used_at = coalesce(used_at, now())
           WHERE id = $1`,
          [grant.intentId],
        );
      }
      return "granted";
    });
    if (status === "granted") {
      // Fires AFTER commit — a hook failure must never roll back a real grant,
      // nor misreport a durable grant as a wire error (0017 review residual R1,
      // owner-ruled 2026-08-24): the hook never throws by contract, and this
      // call site is guarded too (belt and suspenders). "already_processed"
      // never reaches here, so a /reconcile re-grant never duplicates the
      // welcome message.
      try {
        this.afterPaidPurchaseGranted(grant);
      } catch (error) {
        logInboxSendFailure("citizenship_paid", error);
      }
    }
    return status;
  }

  /**
   * Post-grant hook (task 0012 filled the 0019 seam; same shape as
   * PlayerProfileRepository.afterCitizenshipEarned). Sends the
   * `citizenship_paid` "Welcome, Citizen!" inbox template — rendered
   * client-side from `inbox.templates.citizenship_paid.{title,body}` in
   * resources/lang/*.json. Best-effort and contractually never-throwing: a
   * sync throw is caught here, an async rejection is logged, and the grant
   * status is returned unchanged either way.
   */
  private afterPaidPurchaseGranted(grant: PaidPurchaseGrant): void {
    if (this.inbox === undefined) {
      return;
    }
    try {
      void this.inbox
        .sendTemplate(grant.playerId, "citizenship_paid")
        .catch((error: unknown) =>
          logInboxSendFailure("citizenship_paid", error),
        );
    } catch (error) {
      logInboxSendFailure("citizenship_paid", error);
    }
  }

  private async inTransaction<T>(
    work: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ROLLBACK failed (connection gone) — surface the ORIGINAL error.
      }
      throw error;
    } finally {
      client.release();
    }
  }
}
