import { Logger } from "winston";
import { z } from "zod";
import { ServerConfig } from "../core/configuration/Config";
import {
  CreditBatchRequest,
  CreditBatchResponse,
  CreditBatchResponseSchema,
  CreditItem,
  CreditItemSchema,
  PlayerResolveRequest,
  PlayerResolveRequestSchema,
  PlayerResolveResponse,
  PlayerResolveResponseSchema,
} from "../core/profile/CreditContract";
import { MatchCredit } from "../core/profile/MatchQualification";
import { formatError } from "./Logger";

const CREDIT_PATH = "/internal/v1/credit";
const RESOLVE_PATH = "/internal/v1/players/resolve";
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 250;
// Per-attempt ceiling so a stalled-but-not-down backend can't hold a socket/promise
// open for undici's ~300s default. An abort is retried like any transport failure.
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Game-server → profile-backend HTTP client (the first and only caller of the
 * profile API from the game server; T6). Calls the internal, service-authenticated
 * endpoints `POST /internal/v1/players/resolve` and `POST /internal/v1/credit`.
 *
 * CONTRACT: every public method is fully FAIL-SOFT — it never throws and never
 * blocks the caller. A profile-backend outage must never stall, delay, or error a
 * match. Crediting is at-least-once with bounded retries; the profile server's
 * `(game_id, player_id)` idempotency key makes retries safe (a duplicate is a
 * no-op). There is no durable retry queue — a hard outage past the retry budget
 * drops that match's credit, which is the documented fail-soft tradeoff (ADR-101).
 *
 * ⛔ Never log a platform id or a player id from here (ADR-113) — lengths and
 * counts only.
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
    this.warnIfPartiallyConfigured();
  }

  /**
   * A partially configured client silently no-ops every call (fail-soft by
   * contract), which is how the prod token-forwarding gap went unnoticed —
   * so make the half-configured state audible once, at `warn` (visible at the
   * production `info` log level). Names variables only; never logs values.
   */
  private warnIfPartiallyConfigured(): void {
    const hasUrl = this.baseUrl().length > 0;
    const hasToken = this.token().length > 0;
    if (hasUrl && !hasToken) {
      this.log.warn(
        `PROFILE_API_URL is set but PROFILE_INTERNAL_TOKEN is empty — profile integration is unauthenticated and every profile call will no-op`,
      );
    } else if (!hasUrl && hasToken) {
      this.log.warn(
        `PROFILE_INTERNAL_TOKEN is set but PROFILE_API_URL is empty — profile integration is off and every profile call will no-op`,
      );
    }
  }

  /**
   * Find-or-create the internal player behind a Yandex identity (task 0272) and
   * return its id plus the display-only `isCitizen` (task 0068) — both come back on
   * the one response, so there is no second request and no second trust seam.
   *
   * FAIL-SOFT IS THE WHOLE CONTRACT: every failure path (unconfigured, an id the
   * contract refuses, transport error, 4xx, 5xx after retries, unparseable body)
   * returns `null` — never an exception and never a delay beyond the retry budget.
   * `null` means "not resolved": the caller may try again later (the credit path
   * does), and must never clear an already-known citizen flag on it.
   */
  public async resolvePlayer(
    platformUserId: string,
  ): Promise<PlayerResolveResponse | null> {
    if (!this.isConfigured()) {
      this.logDisabledOnce("resolvePlayer");
      return null;
    }
    try {
      const body: PlayerResolveRequest = {
        platform: "yandex_games",
        platformUserId,
      };
      // An id accepted at the 256-char join boundary can exceed the 128-char
      // contract; the server would 400 it anyway, so don't spend a request on it.
      if (!PlayerResolveRequestSchema.safeParse(body).success) {
        // Never log the (untrusted) id value — length is enough to diagnose.
        this.log.warn(
          `not resolving player: id fails the resolve contract (id length ${platformUserId.length})`,
        );
        return null;
      }
      const json = await this.postWithRetry(RESOLVE_PATH, body);
      if (json === null) {
        this.log.warn(
          `player resolve failed after retries (retried on the next identity event or at credit time)`,
        );
        return null;
      }
      const parsed = PlayerResolveResponseSchema.safeParse(json);
      if (!parsed.success) {
        this.log.warn(
          `player resolve response failed validation: ${z.prettifyError(parsed.error)}`,
        );
        return null;
      }
      return parsed.data;
    } catch (error) {
      this.log.warn(`unexpected error resolving player: ${formatError(error)}`);
      return null;
    }
  }

  /**
   * Award XP for a match, keyed by the internal player id. Bounded at-least-once
   * retry, fully fail-soft. A `no_profile` result (the player was erased since it
   * was resolved) is warned about and dropped for this match — there is no backfill
   * (task 0272): the game server resolves before crediting, and the next join
   * recreates the player.
   */
  public async creditMatch(credits: readonly MatchCredit[]): Promise<void> {
    if (credits.length === 0) return;
    if (!this.isConfigured()) {
      this.logDisabledOnce("creditMatch");
      return;
    }
    // Isolate any item that would fail the profile server's per-item contract BEFORE
    // posting. The server rejects the whole `/internal/v1/credit` batch (400, which we
    // don't retry) if a single item is invalid. Dropping just that item keeps every
    // other player's XP.
    const valid: CreditItem[] = [];
    for (const credit of credits) {
      const item: CreditItem = {
        gameId: credit.gameId,
        playerId: credit.playerId,
        xpAwarded: credit.xpAwarded,
      };
      if (CreditItemSchema.safeParse(item).success) {
        valid.push(item);
        continue;
      }
      // Never log the id value — the game id is not a player identifier.
      this.log.warn(
        `dropping invalid credit item (player id length ${credit.playerId.length}) for game ${credit.gameId}`,
      );
    }
    if (valid.length === 0) return;
    try {
      const response = await this.sendCredits(valid);
      if (response === null) {
        this.log.warn(
          `credit batch failed after retries; ${valid.length} award(s) dropped (idempotent — a later retry is safe)`,
        );
        return;
      }
      this.logOutcomes(response);
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

  /**
   * Profile calls are no-ops unless both the URL and the token are present. Public so
   * a caller can tell "not configured" (every call is a silent no-op) apart from "a
   * configured call failed" when deciding whether a drop is worth a warn (review R1).
   */
  public isConfigured(): boolean {
    return this.baseUrl().length > 0 && this.token().length > 0;
  }

  private logDisabledOnce(op: string): void {
    // Per-op so a frequent op (resolve-at-join) can't suppress the log for a
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
    if (counts.no_profile > 0) {
      this.log.warn(
        `${counts.no_profile} credit item(s) were no_profile (player erased since it was resolved); dropped for this match`,
      );
    }
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
        // Non-2xx: drain the unread body so the connection can be reused. At Node 24
        // undici auto-drains on GC, but don't depend on the runtime for this.
        await drainBody(response);
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Best-effort drain of an unread response body so the socket can be reused. */
async function drainBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch (error) {
    // A failed cancel doesn't affect crediting correctness.
    void error;
  }
}
