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
  yandexPlayerId: string;
  productId: string;
  usedAt: string | null;
}

/** A processed_purchases receipt row. */
export interface ProcessedPurchase {
  purchaseToken: string;
  yandexPlayerId: string;
  productId: string;
}

export interface PaidPurchaseGrant {
  purchaseToken: string;
  productId: string;
  yandexPlayerId: string;
  intentId: string | null;
  rawPayload: string;
}

/** granted = fresh grant; already_processed = token seen before (idempotent no-op). */
export type GrantStatus = "granted" | "already_processed";

// A buyer may have no profile row yet (upsert happens at match JOIN, and the
// citizenship CTA lives on the start screen), so every write path ensures the
// row first. Never touches xp/citizenship/paid fields — insert-only.
const ENSURE_PROFILE_SQL = `
INSERT INTO player_profiles (yandex_player_id)
VALUES ($1)
ON CONFLICT (yandex_player_id) DO NOTHING
`;

// The paid-flag write. Sets is_citizen too (chk_paid_implies_citizen);
// citizenship_purchased_at is COALESCEd so a re-grant never rewrites history.
const GRANT_FLAGS_SQL = `
UPDATE player_profiles
SET is_citizen = true,
    is_paid_citizen = true,
    citizenship_purchased_at = coalesce(citizenship_purchased_at, now()),
    updated_at = now()
WHERE yandex_player_id = $1
`;

export class PaymentsRepository {
  /** `inbox` optional: without it the post-grant seam sends nothing (tests/tools). */
  constructor(
    private readonly pool: Pool,
    private readonly inbox?: InboxSender,
  ) {}

  /**
   * Create a purchase intent for a (client-asserted) player, ensuring the
   * profile row exists first. Returns the new intent id (the uuid the client
   * passes to Yandex as developerPayload).
   */
  async createIntent(
    yandexPlayerId: string,
    productId: string,
  ): Promise<string> {
    return this.inTransaction(async (client) => {
      await client.query(ENSURE_PROFILE_SQL, [yandexPlayerId]);
      const res = await client.query(
        `INSERT INTO purchase_intents (yandex_player_id, product_id)
         VALUES ($1, $2)
         RETURNING id`,
        [yandexPlayerId, productId],
      );
      return res.rows[0].id as string;
    });
  }

  /** Read an intent by id (any state). Caller validates the uuid format first. */
  async findIntent(intentId: string): Promise<PurchaseIntent | null> {
    const res = await this.pool.query(
      `SELECT id, yandex_player_id, product_id, used_at
       FROM purchase_intents WHERE id = $1`,
      [intentId],
    );
    if (res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];
    return {
      id: row.id,
      yandexPlayerId: row.yandex_player_id,
      productId: row.product_id,
      usedAt: row.used_at ? (row.used_at as Date).toISOString() : null,
    };
  }

  /** Read a processed-purchase receipt by token (the idempotent-retry path). */
  async getProcessedPurchase(
    purchaseToken: string,
  ): Promise<ProcessedPurchase | null> {
    const res = await this.pool.query(
      `SELECT purchase_token, yandex_player_id, product_id
       FROM processed_purchases WHERE purchase_token = $1`,
      [purchaseToken],
    );
    if (res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];
    return {
      purchaseToken: row.purchase_token,
      yandexPlayerId: row.yandex_player_id,
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
      await client.query(ENSURE_PROFILE_SQL, [grant.yandexPlayerId]);
      const inserted = await client.query(
        `INSERT INTO processed_purchases
           (purchase_token, yandex_player_id, product_id, intent_id, raw_payload)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (purchase_token) DO NOTHING
         RETURNING purchase_token`,
        [
          grant.purchaseToken,
          grant.yandexPlayerId,
          grant.productId,
          grant.intentId,
          grant.rawPayload,
        ],
      );
      if (inserted.rows.length === 0) {
        return "already_processed";
      }
      await client.query(GRANT_FLAGS_SQL, [grant.yandexPlayerId]);
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
        .sendTemplate(grant.yandexPlayerId, "citizenship_paid")
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
