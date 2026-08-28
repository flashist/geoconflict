// Client → profile-server name-change calls (task 0067). Follows the
// CitizenshipPurchase.ts precedent: the orchestration lives outside the card so
// the sequencing and its outcome mapping stay unit-testable in isolation, and
// the card keeps making no network calls of its own.
//
// Same degrade-gracefully contract as PaymentsApiClient: empty/unset
// profileApiUrl ⇒ no-op, bounded timeout, NEVER throws — every failure path
// resolves to an outcome value and the caller decides the UX.
//
// Unlike PaymentsApiClient, this one needs the response BODY on failure: the
// card shows a different message for "name taken" than for "you already have a
// pending request" than for "too short". So it reads the error code rather than
// collapsing every non-200 to null.

import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import type { UsernameRuleViolation } from "../core/validations/usernameRules";
import { FlashistFacade } from "./flashist/FlashistFacade";

const NAME_CHANGE_FETCH_TIMEOUT_MS = 10_000;

/**
 * Outcome of a submit. `invalid` carries the broken rule so the card can show
 * the SAME `username.<rule>` message the in-game username input shows.
 * `error` covers every transport/unknown failure and is always retryable.
 */
export type NameChangeSubmitResult =
  | { status: "ok" }
  | { status: "invalid"; violation: UsernameRuleViolation }
  | { status: "name_taken" }
  | { status: "pending_exists" }
  | { status: "not_citizen" }
  | { status: "error" };

export type NameChangeCancelResult =
  | { status: "ok" }
  | { status: "no_pending" }
  | { status: "not_citizen" }
  | { status: "error" };

async function resolveApiBase(): Promise<string | null> {
  let base: string;
  try {
    base = (await getServerConfigFromClient())
      .profileApiUrl()
      .replace(/\/+$/, "");
  } catch {
    return null;
  }
  return base.length > 0 ? base : null;
}

/** POST returning {ok, body} — or null when the call could not be made at all. */
async function postJson(
  path: string,
  body: unknown,
): Promise<{ ok: boolean; json: unknown } | null> {
  const base = await resolveApiBase();
  if (base === null) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    NAME_CHANGE_FETCH_TIMEOUT_MS,
  );
  try {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    // A body is expected on both arms (the error code is the point). A
    // non-JSON body degrades to `null` json, which maps to a generic error.
    const json = await response.json().catch(() => null);
    return { ok: response.ok, json };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Read the server's `{ error: "…" }` discriminator, or null if absent. */
function errorCode(json: unknown): string | null {
  if (typeof json !== "object" || json === null) {
    return null;
  }
  const value = (json as { error?: unknown }).error;
  return typeof value === "string" ? value : null;
}

const VIOLATIONS: readonly UsernameRuleViolation[] = [
  "not_string",
  "too_short",
  "too_long",
  "invalid_chars",
];

function toViolation(json: unknown): UsernameRuleViolation {
  const value = (json as { violation?: unknown } | null)?.violation;
  return typeof value === "string" &&
    (VIOLATIONS as readonly string[]).includes(value)
    ? (value as UsernameRuleViolation)
    : // A server that reported `invalid` without a recognized rule (version
      // skew) still gets a sensible message rather than a blank one.
      "invalid_chars";
}

/**
 * Submit a name-change request for the CURRENT Yandex player. Resolves the
 * player id itself (the runCitizenshipPurchase precedent) — the card never
 * handles it.
 */
export async function submitNameChangeRequest(
  requestedName: string,
): Promise<NameChangeSubmitResult> {
  const yandexPlayerId = await FlashistFacade.instance.getYandexUniqueId();
  if (yandexPlayerId === null) {
    return { status: "error" };
  }
  const response = await postJson("/v1/profile/name-change-request", {
    yandexPlayerId,
    requestedName,
  });
  if (response === null) {
    return { status: "error" };
  }
  if (response.ok) {
    return { status: "ok" };
  }
  switch (errorCode(response.json)) {
    case "invalid":
      return { status: "invalid", violation: toViolation(response.json) };
    case "name_taken":
      return { status: "name_taken" };
    case "pending_exists":
      return { status: "pending_exists" };
    case "not_citizen":
      return { status: "not_citizen" };
    default:
      return { status: "error" };
  }
}

/**
 * Withdraw the current player's own pending request (owner amendment 2). This
 * is what lets a citizen clear a request they did not make — see the residual
 * documented in NameChangeContract.
 */
export async function cancelNameChangeRequest(): Promise<NameChangeCancelResult> {
  const yandexPlayerId = await FlashistFacade.instance.getYandexUniqueId();
  if (yandexPlayerId === null) {
    return { status: "error" };
  }
  const response = await postJson("/v1/profile/name-change-cancel", {
    yandexPlayerId,
  });
  if (response === null) {
    return { status: "error" };
  }
  if (response.ok) {
    return { status: "ok" };
  }
  switch (errorCode(response.json)) {
    case "no_pending":
      return { status: "no_pending" };
    case "not_citizen":
      return { status: "not_citizen" };
    default:
      return { status: "error" };
  }
}
