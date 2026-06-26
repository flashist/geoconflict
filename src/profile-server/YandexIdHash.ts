// 152-ФЗ pseudonymization: turn a raw Yandex player ID into an irreversible,
// deterministic, KEYED hash so the raw, directly-identifying ID is never persisted
// or logged at rest. The profile server hashes every incoming raw ID at its API
// boundary (Routes.ts) and stores only this hash — the raw value is discarded.
//
// Keyed (HMAC), NOT a plain sha256: a bare sha256(id) is brute-forceable over the
// Yandex ID space and rainbow-tableable, which would defeat the pseudonymization.
// The secret "pepper" lives only on the profile box (profile.env, provisioned by
// setup-profile.sh) — never in git, never on the client, never in another tier.
//
// Fails CLOSED — unlike InternalAuth's `?? ""` token fallback, an empty/missing
// pepper here is unrecoverable: it would silently emit brute-forceable hashes
// (a compliance failure), so we throw rather than degrade. Server.ts asserts at
// boot so a misconfigured box never serves a single request.
//
// STABLE secret: rotating the pepper re-keys every stored hash and orphans all
// existing profiles (reads + crediting idempotency break), so it is long-lived and
// must be backed up alongside DB dumps. See s4-profile-hash-player-ids.md.

import { createHmac } from "crypto";

const PEPPER_ENV_VAR = "PROFILE_ID_PEPPER";

// Minimum acceptable pepper length. The provisioned value is `openssl rand -hex 32`
// (64 hex chars); require at least 32 so a too-short placeholder or an accidentally
// truncated value is rejected rather than weakening every hash.
const MIN_PEPPER_LENGTH = 32;

// Validated pepper, memoized after the first successful load so we read+check the
// env once rather than per hash. `undefined` means "not yet loaded".
let cachedPepper: string | undefined;

function loadPepper(): string {
  const pepper = process.env[PEPPER_ENV_VAR];
  if (pepper === undefined || pepper.length === 0) {
    throw new Error(
      `${PEPPER_ENV_VAR} is unset/empty — refusing to hash Yandex IDs with an ` +
        `empty key (152-ФЗ: an empty pepper yields brute-forceable hashes). Set it ` +
        `in profile.env (provisioned by setup-profile.sh).`,
    );
  }
  if (pepper.length < MIN_PEPPER_LENGTH) {
    throw new Error(
      `${PEPPER_ENV_VAR} is too short (${pepper.length} < ${MIN_PEPPER_LENGTH}). ` +
        `Use the persisted value from setup-profile.sh (openssl rand -hex 32).`,
    );
  }
  return pepper;
}

/**
 * Irreversible, deterministic keyed hash of a raw Yandex player ID.
 * Same (pepper, rawId) always yields the same 64-char lowercase hex digest, so a
 * returning player resolves to the same profile across sessions/devices (required
 * for XP crediting and citizenship). Throws if the pepper is not configured.
 */
export function hashYandexId(rawId: string): string {
  cachedPepper ??= loadPepper();
  return createHmac("sha256", cachedPepper).update(rawId, "utf8").digest("hex");
}

/**
 * Eager startup check — validate the pepper at boot so a misconfigured box crashes
 * immediately (caught by setup-profile.sh's health gate → rollback) instead of
 * 500ing on the first profile read/write. Call once from Server.ts after dotenv.
 */
export function assertPepperConfigured(): void {
  cachedPepper ??= loadPepper();
}

/** Test-only: drop the memoized pepper so a changed env var is re-read. */
export function __resetPepperCacheForTests(): void {
  cachedPepper = undefined;
}
