import { Logger } from "winston";
import { z } from "zod";
import { ServerConfig } from "../core/configuration/Config";
import {
  CreditBatchRequest,
  CreditBatchResponse,
  CreditBatchResponseSchema,
  CreditItem,
  ProfileUpsertRequest,
} from "../core/profile/CreditContract";
import { MatchCredit } from "../core/profile/MatchQualification";
import { formatError } from "./Logger";

const CREDIT_PATH = "/internal/v1/credit";
const UPSERT_PATH = "/internal/v1/profile/upsert";
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 250;
// Per-attempt ceiling so a stalled-but-not-down backend can't hold a socket/promise
// open for undici's ~300s default. An abort is retried like any transport failure.
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Game-server → profile-backend HTTP client (the first and only caller of the
 * profile API from the game server; T6). Calls the internal, service-authenticated
 * write endpoints `POST /internal/v1/credit` and `POST /internal/v1/profile/upsert`.
 *
 * CONTRACT: every public method is fully FAIL-SOFT — it never throws and never
 * blocks the caller. A profile-backend outage must never stall, delay, or error a
 * match. Crediting is at-least-once with bounded retries; the profile server's
 * `(game_id, yandex_player_id)` idempotency key makes retries safe (a duplicate is
 * a no-op). There is no durable retry queue — a hard outage past the retry budget
 * drops that match's credit, which is the documented fail-soft tradeoff.
 *
 * Instantiate once per worker process (mirrors PrivilegeRefresher) and share it.
 */
export class ProfileApiClient {
  private readonly log: Logger;
  private readonly disabledLoggedOps = new Set<string>();

  constructor(
    private readonly config: ServerConfig,
    parentLog: Logger,
    private readonly maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
    private readonly backoffMs: number = DEFAULT_BACKOFF_MS,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {
    this.log = parentLog.child({ comp: "profile-api-client" });
  }

  /**
   * Create-or-relink a profile by Yandex identity so a `player_profiles` row exists
   * before any crediting (and before the Citizenship UI reads it). Idempotent
   * server-side. Fire-and-forget; never throws.
   */
  public async upsertProfile(
    yandexPlayerId: string,
    persistentId: string,
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.logDisabledOnce("upsertProfile");
      return;
    }
    try {
      const body: ProfileUpsertRequest = { yandexPlayerId, persistentId };
      const ok = await this.postWithRetry(UPSERT_PATH, body);
      if (ok === null) {
        this.log.warn(
          `profile upsert failed after retries (will retry on next join / credit no_profile)`,
        );
      }
    } catch (error) {
      this.log.warn(
        `unexpected error upserting profile: ${formatError(error)}`,
      );
    }
  }

  /**
   * Award XP for a finished match. Bounded at-least-once retry, fully fail-soft.
   * On a `no_profile` result (the upsert-at-join did not land — e.g. a race or a
   * brief outage at join), upserts those players and re-credits them once.
   */
  public async creditMatch(credits: readonly MatchCredit[]): Promise<void> {
    if (credits.length === 0) return;
    if (!this.isConfigured()) {
      this.logDisabledOnce("creditMatch");
      return;
    }
    try {
      const response = await this.sendCredits(credits.map(toCreditItem));
      if (response === null) {
        this.log.warn(
          `credit batch failed after retries; ${credits.length} award(s) dropped (idempotent — a later retry is safe)`,
        );
        return;
      }
      this.logOutcomes(response);
      await this.backfillMissingProfiles(credits, response);
    } catch (error) {
      // Defensive: must never throw out of the match-end path.
      this.log.warn(`unexpected error crediting match: ${formatError(error)}`);
    }
  }

  /** Profile backend base URL (trailing slash stripped), or "" when unconfigured. */
  private baseUrl(): string {
    return this.config.profileApiUrl().replace(/\/+$/, "");
  }

  /** Internal service-to-service bearer token — secret, read from env not config. */
  private token(): string {
    return process.env.PROFILE_INTERNAL_TOKEN ?? "";
  }

  /** Profile calls are no-ops unless both the URL and the token are present. */
  private isConfigured(): boolean {
    return this.baseUrl().length > 0 && this.token().length > 0;
  }

  private logDisabledOnce(op: string): void {
    // Per-op so a frequent op (upsert-at-join) can't suppress the log for a
    // distinct op (creditMatch) that may never have logged its own miss.
    if (this.disabledLoggedOps.has(op)) return;
    this.disabledLoggedOps.add(op);
    this.log.debug(
      `profile API not configured (missing PROFILE_API_URL and/or PROFILE_INTERNAL_TOKEN); skipping ${op}`,
    );
  }

  private async sendCredits(
    credits: CreditItem[],
  ): Promise<CreditBatchResponse | null> {
    const body: CreditBatchRequest = { credits };
    const json = await this.postWithRetry(CREDIT_PATH, body);
    if (json === null) return null;
    const parsed = CreditBatchResponseSchema.safeParse(json);
    if (!parsed.success) {
      this.log.warn(
        `credit response failed validation: ${z.prettifyError(parsed.error)}`,
      );
      return null;
    }
    return parsed.data;
  }

  private logOutcomes(response: CreditBatchResponse): void {
    const counts = { credited: 0, duplicate: 0, no_profile: 0, error: 0 };
    for (const r of response.results) counts[r.status]++;
    this.log.info(
      `match credit results: ${counts.credited} credited, ${counts.duplicate} duplicate, ${counts.no_profile} no_profile, ${counts.error} error`,
    );
    if (counts.error > 0) {
      this.log.warn(`${counts.error} credit item(s) errored server-side`);
    }
  }

  private async backfillMissingProfiles(
    credits: readonly MatchCredit[],
    response: CreditBatchResponse,
  ): Promise<void> {
    const missing = new Set(
      response.results
        .filter((r) => r.status === "no_profile")
        .map((r) => r.yandexPlayerId),
    );
    if (missing.size === 0) return;
    const toRetry = credits.filter((c) => missing.has(c.yandexPlayerId));
    await Promise.all(
      toRetry.map((c) => this.upsertProfile(c.yandexPlayerId, c.persistentId)),
    );
    const retryResponse = await this.sendCredits(toRetry.map(toCreditItem));
    if (retryResponse === null) {
      this.log.warn(
        `re-credit after profile upsert failed for ${toRetry.length} player(s) (idempotent — safe to retry later)`,
      );
      return;
    }
    this.logOutcomes(retryResponse);
  }

  /**
   * POST `body` as JSON with the internal bearer token. Returns the parsed JSON
   * body on a 2xx, or null after exhausting retries. Retries transport failures
   * (including a per-attempt timeout abort), 5xx and 429; gives up immediately on
   * other 4xx (a caller/config error retrying cannot fix). Never throws.
   */
  private async postWithRetry(
    path: string,
    body: unknown,
  ): Promise<unknown | null> {
    const url = `${this.baseUrl()}${path}`;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${this.token()}`,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (response.ok) {
          return await response.json();
        }
        if (response.status < 500 && response.status !== 429) {
          this.log.warn(
            `profile ${path} returned ${response.status}; not retrying`,
          );
          return null;
        }
        this.log.warn(
          `profile ${path} returned ${response.status} (attempt ${attempt}/${this.maxAttempts})`,
        );
      } catch (error) {
        this.log.warn(
          `profile ${path} request failed (attempt ${attempt}/${this.maxAttempts}): ${formatError(error)}`,
        );
      }
      if (attempt < this.maxAttempts && this.backoffMs > 0) {
        await delay(this.backoffMs * attempt);
      }
    }
    return null;
  }
}

/** Strip the internal-only `persistentId` to the on-the-wire credit payload. */
function toCreditItem(c: MatchCredit): CreditItem {
  return {
    gameId: c.gameId,
    yandexPlayerId: c.yandexPlayerId,
    xpAwarded: c.xpAwarded,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
