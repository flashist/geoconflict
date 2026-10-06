// Shared "sign a test session token" helper for the profile-server route suites.
// Since task 0273 (S4) a public route accepts NOTHING but a Bearer token — the
// legacy client-asserted Yandex id is gone — so every suite that exercises a
// player-facing route needs one of these.

import { signSessionToken } from "../../../src/profile-server/SessionToken";

/** Long enough for isUsableSessionSecret (32 chars minimum). */
export const TEST_SESSION_SECRET = "0273-test-session-secret-0123456789ab";

/** The `session` argument createApp takes. */
export const TEST_SESSION_CONFIG = { secret: TEST_SESSION_SECRET };

/**
 * A full `Authorization` value for the given internal player id. `verified` mints a
 * `vfy:true` token (task 0340); it defaults to an unverified one.
 */
export function bearerFor(
  playerId: string,
  options: { secret?: string; nowMs?: number; verified?: boolean } = {},
): string {
  const {
    secret = TEST_SESSION_SECRET,
    nowMs = Date.now(),
    verified = false,
  } = options;
  const { token } = signSessionToken(
    secret,
    { playerId, platform: "yandex_games", verified },
    nowMs,
  );
  return `Bearer ${token}`;
}
