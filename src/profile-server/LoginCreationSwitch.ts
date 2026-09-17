// The login-creation switch (task 0274, S5; owner ruling D3).
//
// One boolean, read once at boot from PROFILE_LOGIN_CREATE_ENABLED, that decides
// whether `POST /v1/login` may CREATE a player. It is the incident lever for the
// accepted risk S2 shipped with: login needs no proof of identity, so a flood of
// asserted ids would otherwise mean a flood of junk player rows and nothing to
// pull. The game server's own find-or-create is deliberately NOT gated by it
// (design §4) — a real match must always be creditable.
//
// ⚠️ The parse rule is fail-OPEN by owner ruling D3: an unrecognised value leaves
// creation ENABLED and warns loudly. A typo that silently paused every new player
// would be an outage nobody could see; a typo that is merely noisy is not.
//
// The switch survives a redeploy: setup-profile.sh persists it beside the other
// box-owned values (/opt/profile/.login_create_enabled), so a deploy that supplies
// nothing cannot quietly turn creation back on mid-incident.

/** The one logging call this module makes — `logger.child(...)` satisfies it. */
export interface SwitchLogger {
  warn(message: string): void;
}

/** Env var name, in one place: Server.ts reads it LITERALLY for the parity checker. */
export const LOGIN_CREATE_ENABLED_VAR = "PROFILE_LOGIN_CREATE_ENABLED";

/**
 * Blank/unset → enabled. `true`/`false` (any case, surrounding space trimmed) →
 * that value. Anything else → enabled, with a warning naming the variable, the
 * value seen and the effective state.
 */
export function parseLoginCreateEnabled(
  raw: string | undefined,
  log: SwitchLogger,
): boolean {
  const value = (raw ?? "").trim().toLowerCase();
  if (value.length === 0) {
    return true;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  // ⚠️ This line echoes the RAW value, which looks like a violation of this module's
  // "never a raw value in a log line" habit. It is a DELIBERATE, OWNER-APPROVED
  // EXCEPTION (review R10, ruled 2026-09-16): PROFILE_LOGIN_CREATE_ENABLED is a
  // boolean flag, not a credential, and echoing what was actually set is the only
  // thing that makes this warning actionable — it tells the operator what they
  // mistyped. Redacting it would leave "something was wrong" with no way to see what.
  // ⛔ Do NOT "fix" this by redacting the value. If the variable ever stops being a
  // plain boolean, revisit the ruling rather than silently changing the behaviour.
  log.warn(
    `${LOGIN_CREATE_ENABLED_VAR}='${raw}' is not 'true' or 'false' — login creation stays ENABLED. ` +
      "Set it to exactly 'false' to pause creating players at login.",
  );
  return true;
}
