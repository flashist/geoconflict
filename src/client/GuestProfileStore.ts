import {
  CURRENT_PROFILE_SCHEMA_VERSION,
  createGuestProfile,
  migrateProfile,
  type PlayerProfile,
} from "../core/profile/PlayerProfile";
import {
  applyMatchXp,
  type MatchParticipation,
  qualifiesForMatchXp,
} from "../core/profile/MatchQualification";

/**
 * Guest player-profile store (S4 Profile T2).
 *
 * For players NOT authenticated with Yandex, the profile lives in localStorage
 * using the shared versioned schema (see src/core/profile/PlayerProfile.ts).
 * This is fully client-side; there is no server fallback for guests.
 *
 * Durability tradeoff: localStorage is cleared by a browser data wipe, so a guest
 * profile (and its accumulated XP) can be lost. This is an accepted best-effort
 * limitation for v1 — guests gain immediate value (XP starts accumulating) with no
 * backend, and a real durable profile requires authenticating, at which point T7
 * migrates the local profile up to the server.
 */

/** Minimal subset of the Web Storage API this module needs (injectable for tests). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * localStorage key for a guest profile, scoped to the internal persistent ID so
 * distinct users on a shared device do not collide.
 */
export function guestProfileStorageKey(persistentId: string): string {
  return `geoconflict_profile_${persistentId}`;
}

interface ReadResult {
  /**
   * Usable, current-shaped profile (always migrated). Safe to read even when it
   * is a downgraded view of a newer stored blob.
   */
  profile: PlayerProfile;
  /**
   * Raw integer `schema_version` from the stored JSON, or null when the value is
   * absent, non-integer, missing, or unparseable. Read from the raw blob, NOT
   * from the migrated profile (which is always stamped to the current version).
   */
  storedVersion: number | null;
  /** Whether a parseable profile already existed in storage. */
  existed: boolean;
}

function readProfile(
  persistentId: string,
  storage: StorageLike,
  nowIso: string | undefined,
): ReadResult {
  const raw = storage.getItem(guestProfileStorageKey(persistentId));
  if (raw === null) {
    return {
      profile: createGuestProfile(persistentId, nowIso),
      storedVersion: null,
      existed: false,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupt / non-JSON value: treat as if nothing was stored.
    return {
      profile: createGuestProfile(persistentId, nowIso),
      storedVersion: null,
      existed: false,
    };
  }

  const rawVersion =
    typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>).schema_version
      : undefined;
  const storedVersion =
    typeof rawVersion === "number" && Number.isInteger(rawVersion)
      ? rawVersion
      : null;

  return {
    profile: migrateProfile(parsed),
    storedVersion,
    existed: true,
  };
}

/**
 * Whether it is safe to overwrite the stored profile with a current-shaped one.
 *
 * A stored profile whose version is NEWER than this build must NOT be overwritten:
 * `migrateProfile` returns a current-shaped (downgraded) object that strips fields
 * this build does not know about, so writing it back would corrupt a newer profile
 * created by a future client. A missing/non-integer version is treated as writable.
 */
function canWrite(storedVersion: number | null): boolean {
  return (
    storedVersion === null || storedVersion <= CURRENT_PROFILE_SCHEMA_VERSION
  );
}

function writeProfile(
  persistentId: string,
  profile: PlayerProfile,
  storage: StorageLike,
): void {
  storage.setItem(
    guestProfileStorageKey(persistentId),
    JSON.stringify(profile),
  );
}

/**
 * App-init entry point for guests: load the local profile, creating one if none
 * exists and migrating an older one before use. Writes back the (possibly created
 * or migrated) profile — but never overwrites a profile whose stored version is
 * newer than this build. Returns the usable profile (which may be a downgraded,
 * unpersisted view of a newer stored blob).
 *
 * Best-effort: storage failures are swallowed and a usable in-memory profile is
 * still returned, so callers never have to handle null.
 */
export function loadOrCreateGuestProfile(
  persistentId: string,
  storage: StorageLike = localStorage,
  nowIso: string = new Date().toISOString(),
): PlayerProfile {
  try {
    const { profile, storedVersion, existed } = readProfile(
      persistentId,
      storage,
      nowIso,
    );
    if (!existed || canWrite(storedVersion)) {
      writeProfile(persistentId, profile, storage);
    }
    return profile;
  } catch {
    return createGuestProfile(persistentId, nowIso);
  }
}

/**
 * Credit a finished match for a guest. Reads (or creates) the local profile and —
 * only if the match qualifies — adds XP and writes the result back. A disqualified
 * match leaves the profile unchanged. A stored profile that is newer than this
 * build is never overwritten (the +10 XP is dropped rather than risk corrupting
 * it). Returns the resulting profile (unchanged when disqualified or when the write
 * is blocked).
 *
 * Best-effort: storage failures are swallowed.
 */
export function creditQualifyingMatch(
  persistentId: string,
  participation: MatchParticipation,
  storage: StorageLike = localStorage,
  nowIso: string = new Date().toISOString(),
): PlayerProfile {
  try {
    const { profile, storedVersion } = readProfile(
      persistentId,
      storage,
      nowIso,
    );
    if (!qualifiesForMatchXp(participation)) {
      return profile;
    }
    if (!canWrite(storedVersion)) {
      // Stored profile is newer than this build — leave it intact.
      return profile;
    }
    const updated = applyMatchXp(profile, nowIso);
    writeProfile(persistentId, updated, storage);
    return updated;
  } catch {
    return createGuestProfile(persistentId, nowIso);
  }
}
