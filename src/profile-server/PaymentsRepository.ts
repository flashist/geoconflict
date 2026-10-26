// Data layer for Yandex payments (task 0019). Same rules as
// PlayerProfileRepository: the ONLY component that touches the payments tables,
// snake_case column names end-to-end, shared pg Pool.
//
// Grant invariant (brief "sole authority", 2026-06-13): `is_paid_citizen` /
// `citizenship_purchased_at` are written by grantPaidPurchase ONLY — the single
// code path reachable exclusively through HMAC-verified /complete or /reconcile.
// ONE documented exception (task 0425, owner ruling 2026-10-09): the SSH-only,
// allowlisted tester-role command (src/profile-server/TesterRoleRepository.ts) sets
// both flags for its `paid-citizen` role and puts the tester's own values back on
// `restore` — with NO purchase record (no processed_purchases or purchase_intents
// row). It is no route; it runs only inside the profile container on the box.

import { Pool, PoolClient } from "pg";
import type { InboxTemplateKey } from "../core/profile/InboxContract";
import {
  PRODUCT_DEFINITIONS,
  type PaymentProductId,
} from "../core/profile/PaymentsContract";
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

/**
 * One verified sighting of a purchase held by another profile (task 0506, spec
 * §6.2): evidence for the owner's manual merge, never a move.
 */
export interface HolderSighting {
  purchaseToken: string;
  holderPlayerId: string;
  seenPlayerId: string;
  payloadIssuedAt: Date | null;
}

// 2019-01-01T00:00:00Z: older than any Geoconflict purchase.
const EARLIEST_PLAUSIBLE_ISSUED_AT_SECONDS = 1_546_300_800;
const ISSUED_AT_FUTURE_SLACK_SECONDS = 86_400;

/**
 * A payload's `issuedAt` (seconds) as a timestamp worth storing, or null. An
 * implausible value (milliseconds, 1e15) would otherwise be a Postgres range
 * error and lose the sighting.
 */
export function plausibleIssuedAt(
  issuedAt: number | null,
  nowMs: number,
): Date | null {
  if (
    issuedAt === null ||
    issuedAt < EARLIEST_PLAUSIBLE_ISSUED_AT_SECONDS ||
    issuedAt > nowMs / 1000 + ISSUED_AT_FUTURE_SLACK_SECONDS
  ) {
    return null;
  }
  return new Date(issuedAt * 1000);
}

/**
 * granted = fresh grant; already_processed = token seen before (idempotent no-op).
 * becamePaidCitizen exists only on a fresh grant: a replay cannot know it.
 */
export type GrantOutcome =
  | { status: "granted"; becamePaidCitizen: boolean }
  | { status: "already_processed" };

/** One product's own part of a grant; the paid flags are shared and written for every product. */
export interface ProductGrant {
  /** Runs inside the grant transaction; must never touch the paid flags. */
  applyEntitlement(client: PoolClient, grant: PaidPurchaseGrant): Promise<void>;
  /** Item welcome sent after commit; null for citizenship (citizenship_paid covers it). */
  itemInboxTemplate: InboxTemplateKey | null;
}

/** Keyed by the id union, so a sellable product without a grant fails to compile. */
export const PRODUCT_GRANTS: Record<PaymentProductId, ProductGrant> = {
  citizenship: { applyEntitlement: async () => {}, itemInboxTemplate: null },
};

/**
 * The grant every durable item uses (task 0496, spec §5): one ownership row per
 * player and product. The primary key makes a second grant of an owned item a
 * no-op, so a two-tab double charge never duplicates ownership.
 */
export function durableItemGrant(
  itemInboxTemplate: InboxTemplateKey | null,
): ProductGrant {
  return {
    applyEntitlement: async (client, grant) => {
      await client.query(
        `INSERT INTO player_entitlements (player_id, product_id, purchase_token)
         VALUES ($1, $2, $3)
         ON CONFLICT (player_id, product_id) DO NOTHING`,
        [grant.playerId, grant.productId, grant.purchaseToken],
      );
    },
    itemInboxTemplate,
  };
}

// Own-property lookup: a plain index would hand "constructor" or "__proto__"
// an inherited value instead of refusing it (0019 R2).
function productGrantFor(
  registry: Readonly<Record<string, ProductGrant>>,
  productId: string,
): ProductGrant {
  if (!Object.prototype.hasOwnProperty.call(registry, productId)) {
    throw new Error(
      `grantPaidPurchase: no grant defined for productId "${productId}"`,
    );
  }
  return registry[productId];
}

function isCitizenshipProduct(productId: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(PRODUCT_DEFINITIONS, productId) &&
    PRODUCT_DEFINITIONS[productId as PaymentProductId].kind === "citizenship"
  );
}

/**
 * The welcome messages a fresh grant sends, oldest first (task 0496). Every
 * citizenship purchase gets `citizenship_paid`, as before; an item gets it only
 * when it is what made the buyer paid, then its own template if it has one.
 */
export function welcomeTemplatesFor(
  isCitizenship: boolean,
  becamePaidCitizen: boolean,
  itemTemplate: InboxTemplateKey | null,
): InboxTemplateKey[] {
  const templates: InboxTemplateKey[] = [];
  if (isCitizenship || becamePaidCitizen) {
    templates.push("citizenship_paid");
  }
  if (itemTemplate !== null) {
    templates.push(itemTemplate);
  }
  return templates;
}

// Row-locked so two grants for one player queue here, and exactly one of them
// sees "not paid yet". NO KEY UPDATE is the level the flags UPDATE takes anyway.
const READ_WAS_PAID_SQL = `
SELECT is_paid_citizen FROM players WHERE id = $1 FOR NO KEY UPDATE
`;

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
  /**
   * `inbox` optional: without it the post-grant seam sends nothing (tests/tools).
   * `grants` is a test seam for a product id that is not sellable; production
   * passes nothing.
   */
  constructor(
    private readonly pool: Pool,
    private readonly inbox?: InboxSender,
    private readonly grants: Readonly<
      Record<string, ProductGrant>
    > = PRODUCT_GRANTS,
  ) {}

  /** Owned durable product ids, sorted (task 0496). Citizenship is never here. */
  async listEntitlements(playerId: string): Promise<string[]> {
    const res = await this.pool.query(
      `SELECT product_id FROM player_entitlements
       WHERE player_id = $1 ORDER BY product_id`,
      [playerId],
    );
    return res.rows.map((row) => row.product_id as string);
  }

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
   * Upsert one sighting (task 0506). The holder and `issuedAt` take the latest
   * value seen. The route calls it best-effort: a failure never fails a reconcile.
   */
  async recordHolderSighting(sighting: HolderSighting): Promise<void> {
    await this.pool.query(
      `INSERT INTO purchase_holder_sightings
         (purchase_token, holder_player_id, seen_player_id, payload_issued_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (purchase_token, seen_player_id) DO UPDATE
       SET last_seen_at = now(),
           seen_count = purchase_holder_sightings.seen_count + 1,
           holder_player_id = EXCLUDED.holder_player_id,
           payload_issued_at = EXCLUDED.payload_issued_at`,
      [
        sighting.purchaseToken,
        sighting.holderPlayerId,
        sighting.seenPlayerId,
        sighting.payloadIssuedAt,
      ],
    );
  }

  /**
   * Grant a verified paid purchase in ONE transaction: record the receipt
   * (token PK = idempotency + concurrency guard), set the paid flags (every
   * product makes the buyer a paid citizen), apply the product's own entitlement,
   * mark the intent used. A token already in the ledger short-circuits to
   * "already_processed" WITHOUT touching flags again — safe under concurrent
   * double-submit because the conflicting INSERT serializes on the PK.
   */
  async grantPaidPurchase(grant: PaidPurchaseGrant): Promise<GrantOutcome> {
    // Before connect(): an unknown product never reaches the database.
    const productGrant = productGrantFor(this.grants, grant.productId);
    const outcome = await this.inTransaction<GrantOutcome>(async (client) => {
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
        return { status: "already_processed" };
      }
      const before = await client.query(READ_WAS_PAID_SQL, [grant.playerId]);
      const wasPaid = before.rows[0]?.is_paid_citizen === true;
      const flags = await client.query(GRANT_FLAGS_SQL, [grant.playerId]);
      if ((flags.rowCount ?? 0) === 0) {
        // No players row to flag. processed_purchases.player_id has no FK (a
        // receipt must outlive an erasure), so without this check the receipt
        // would commit with no entitlement behind it and a retry would read
        // "already processed". Throwing rolls the whole grant back instead.
        // Practically unreachable: the intent's FK cascades on erasure.
        throw new Error("grantPaidPurchase: no player row to grant");
      }
      await productGrant.applyEntitlement(client, grant);
      if (grant.intentId !== null) {
        await client.query(
          `UPDATE purchase_intents
           SET used_at = coalesce(used_at, now())
           WHERE id = $1`,
          [grant.intentId],
        );
      }
      return { status: "granted", becamePaidCitizen: !wasPaid };
    });
    if (outcome.status === "granted") {
      // Fires AFTER commit — a hook failure must never roll back a real grant,
      // nor misreport a durable grant as a wire error (0017 review residual R1,
      // owner-ruled 2026-08-24): the hook never throws by contract, and this
      // call site is guarded too (belt and suspenders). "already_processed"
      // never reaches here, so a /reconcile re-grant never duplicates the
      // welcome message.
      try {
        this.afterPaidPurchaseGranted(
          grant,
          welcomeTemplatesFor(
            isCitizenshipProduct(grant.productId),
            outcome.becamePaidCitizen,
            productGrant.itemInboxTemplate,
          ),
        );
      } catch (error) {
        logInboxSendFailure("citizenship_paid", error);
      }
    }
    return outcome;
  }

  /**
   * Post-grant hook (task 0012 filled the 0019 seam; same shape as
   * PlayerProfileRepository.afterCitizenshipEarned). Sends `templates` in order
   * (see welcomeTemplatesFor) — rendered client-side from
   * `inbox.templates.<key>.{title,body}` in resources/lang/*.json. Best-effort
   * and contractually never-throwing: a sync throw is caught here, an async
   * rejection is logged under its own key, and the grant outcome is returned
   * unchanged either way.
   */
  private afterPaidPurchaseGranted(
    grant: PaidPurchaseGrant,
    templates: readonly InboxTemplateKey[],
  ): void {
    const inbox = this.inbox;
    if (inbox === undefined || templates.length === 0) {
      return;
    }
    // Each send waits for the one before to settle, so the welcome message is
    // always the older row.
    void templates.reduce<Promise<void>>(
      (previous, templateKey) =>
        previous.then(async () => {
          try {
            await inbox.sendTemplate(grant.playerId, templateKey);
          } catch (error) {
            logInboxSendFailure(templateKey, error);
          }
        }),
      Promise.resolve(),
    );
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
