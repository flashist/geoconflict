import { z } from "zod";

/**
 * Shared, versioned player-profile contract (citizenship / XP).
 *
 * This is the SINGLE source of truth for the profile payload used identically on:
 *   - the client (guest profile in localStorage), and
 *   - the server (profile API request/response bodies + Postgres row).
 *
 * Because the one object travels verbatim across localStorage JSON, the HTTP body,
 * and the DB row, fields are intentionally snake_case to match the Part B JSON
 * contract and the Postgres column names — there is no field-mapping layer.
 *
 * This module is pure: no storage, no I/O, no clocks inside `migrateProfile`.
 * See ai-agents/tasks/backlog/s4-profile-01-schema-contract.md (T1) and the epic
 * s4-player-profile-store-impl.md (Part B) for the contract.
 */

/** Current profile schema version. Bump when the payload shape changes. */
export const CURRENT_PROFILE_SCHEMA_VERSION = 1;

/**
 * Strict shape of a CURRENT-version profile. Use this to validate a payload that
 * is expected to already be current (e.g. an API request body, or the output of
 * `migrateProfile`). Unknown keys are stripped (default zod behavior) rather than
 * rejected, so a forward-compatible read of a slightly newer payload does not hard
 * fail at the schema boundary — version handling is the job of `migrateProfile`.
 */
export const PlayerProfileSchema = z.object({
  schema_version: z.literal(CURRENT_PROFILE_SCHEMA_VERSION),
  yandex_player_id: z.string().nullable(),
  persistent_id: z.string(),
  xp: z.number().int().nonnegative(),
  is_citizen: z.boolean(),
  is_paid_citizen: z.boolean(),
  citizenship_earned_at: z.iso.datetime().nullable(),
  citizenship_purchased_at: z.iso.datetime().nullable(),
  display_name: z.string().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

/**
 * Deterministic, clock-free default for timestamps that are missing or malformed
 * during migration. `new Date(0)` is a fixed constant (the Unix epoch), not a clock
 * read, so `migrateProfile` stays pure and trivially testable.
 */
const EPOCH_ISO = new Date(0).toISOString(); // "1970-01-01T00:00:00.000Z"

/**
 * Permissive mirror of `PlayerProfileSchema` used only as the first step of
 * migration. Every field has a `.catch(default)` so parsing a partial, older, or
 * structurally-damaged object NEVER throws — missing keys and wrong-typed values
 * both collapse to a safe default. Unknown keys (e.g. fields from a hypothetical
 * future version) are stripped here.
 */
const RawProfileSchema = z.object({
  schema_version: z.number().int().catch(0),
  yandex_player_id: z.string().nullable().catch(null),
  persistent_id: z.string().catch(""),
  xp: z.number().int().nonnegative().catch(0),
  is_citizen: z.boolean().catch(false),
  is_paid_citizen: z.boolean().catch(false),
  citizenship_earned_at: z.iso.datetime().nullable().catch(null),
  citizenship_purchased_at: z.iso.datetime().nullable().catch(null),
  display_name: z.string().nullable().catch(null),
  created_at: z.iso.datetime().catch(EPOCH_ISO),
  updated_at: z.iso.datetime().catch(EPOCH_ISO),
});

type NormalizedProfile = z.infer<typeof RawProfileSchema>;

/**
 * Per-version upgrade steps. Each entry transforms a profile FROM version `N` to
 * version `N + 1`. Empty today because v1 is the base version — this is the
 * extension point: when a v2 ships, add a `1: (p) => ({ ...p, ...v1ToV2Changes })`
 * entry and the loop in `migrateProfile` will chain through it automatically.
 */
const MIGRATIONS: Record<
  number,
  (profile: NormalizedProfile) => NormalizedProfile
> = {};

/**
 * Pure migration: normalize an arbitrary `raw` value into a valid current-version
 * `PlayerProfile`. Never throws and never reads a clock.
 *
 * Behavior:
 *  - Non-object input (null, array, primitive) is treated as an empty object, so
 *    every field falls back to its documented default.
 *  - Older `schema_version` values are upgraded step-by-step via `MIGRATIONS`.
 *  - Current or (hypothetical) future versions carry their known fields forward and
 *    are stamped to the current version. Note: downgrading a genuine future profile
 *    loses fields this build doesn't know about; that is an accepted Sprint-4
 *    limitation (only v1 exists) and is revisited when a v2 actually ships.
 */
export function migrateProfile(raw: unknown): PlayerProfile {
  // `RawProfileSchema`'s field-level `.catch` fills defaults for a partial object,
  // but a top-level `.catch` on a non-object would short-circuit and skip those
  // field defaults — so coerce non-objects to `{}` first.
  const source =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const normalized = RawProfileSchema.parse(source);
  const upgraded = upgradeToCurrent(normalized);

  // Invariant check: by construction every field was normalized with a fallback,
  // so this cannot throw — it documents and guarantees the output contract.
  return PlayerProfileSchema.parse(upgraded);
}

function upgradeToCurrent(profile: NormalizedProfile): PlayerProfile {
  let working = profile;
  let version = profile.schema_version;

  // Chain forward through known upgrade steps for older versions. If a step is
  // missing (gap), carry the object forward unchanged — `RawProfileSchema` has
  // already supplied any fields that version lacked.
  while (version < CURRENT_PROFILE_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (migrate !== undefined) {
      working = migrate(working);
    }
    version += 1;
  }

  return { ...working, schema_version: CURRENT_PROFILE_SCHEMA_VERSION };
}

/**
 * Factory for a fresh guest profile (xp 0, no citizenship, no Yandex identity).
 * Reused by the guest localStorage store (T2) and the backend (T5).
 *
 * `nowIso` is injected (defaulting to the current time) so callers set the
 * timestamp at the call site and tests stay deterministic — `migrateProfile`
 * itself never touches a clock.
 */
export function createGuestProfile(
  persistentId: string,
  nowIso: string = new Date().toISOString(),
): PlayerProfile {
  return {
    schema_version: CURRENT_PROFILE_SCHEMA_VERSION,
    yandex_player_id: null,
    persistent_id: persistentId,
    xp: 0,
    is_citizen: false,
    is_paid_citizen: false,
    citizenship_earned_at: null,
    citizenship_purchased_at: null,
    display_name: null,
    created_at: nowIso,
    updated_at: nowIso,
  };
}
