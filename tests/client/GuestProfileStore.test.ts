/**
 * @jest-environment jsdom
 */
import {
  creditQualifyingMatch,
  guestCreditedGamesStorageKey,
  guestProfileStorageKey,
  loadOrCreateGuestProfile,
  MAX_CREDITED_GAMES,
} from "../../src/client/GuestProfileStore";
import {
  CURRENT_PROFILE_SCHEMA_VERSION,
  createGuestProfile,
  PlayerProfile,
} from "../../src/core/profile/PlayerProfile";
import {
  CITIZENSHIP_XP_THRESHOLD,
  GUEST_XP_PER_MATCH,
  MatchParticipation,
} from "../../src/core/profile/MatchQualification";

const PID = "guest-123";
const KEY = guestProfileStorageKey(PID);
const GAME_ID = "game-1";
const NOW = "2026-06-13T12:00:00.000Z";
const LATER = "2026-06-14T08:30:00.000Z";

function qualifying(): MatchParticipation {
  return {
    hasSpawned: true,
    isAliveAtEnd: true,
    wasEliminated: false,
    leftVoluntarily: false,
  };
}

function readStored(): PlayerProfile {
  return JSON.parse(localStorage.getItem(KEY) as string);
}

describe("GuestProfileStore", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  describe("guestProfileStorageKey", () => {
    it("scopes the key to the persistent id", () => {
      expect(guestProfileStorageKey("abc")).toBe("geoconflict_profile_abc");
    });
  });

  describe("loadOrCreateGuestProfile", () => {
    it("creates and persists a fresh profile when none exists", () => {
      const profile = loadOrCreateGuestProfile(PID, localStorage, NOW);
      expect(profile.persistent_id).toBe(PID);
      expect(profile.xp).toBe(0);
      expect(profile.schema_version).toBe(CURRENT_PROFILE_SCHEMA_VERSION);
      expect(readStored().persistent_id).toBe(PID);
    });

    it("round-trips an existing current-version profile unchanged", () => {
      loadOrCreateGuestProfile(PID, localStorage, NOW);
      const before = readStored();
      const profile = loadOrCreateGuestProfile(PID, localStorage, LATER);
      expect(profile.xp).toBe(0);
      expect(readStored()).toEqual(before);
    });

    it("migrates an older-version stored profile and writes it back", () => {
      localStorage.setItem(
        KEY,
        JSON.stringify({ schema_version: 0, persistent_id: PID, xp: 42 }),
      );
      const profile = loadOrCreateGuestProfile(PID, localStorage, NOW);
      expect(profile.schema_version).toBe(CURRENT_PROFILE_SCHEMA_VERSION);
      expect(profile.xp).toBe(42);
      expect(readStored().schema_version).toBe(CURRENT_PROFILE_SCHEMA_VERSION);
    });

    it("falls through to create when the stored value is corrupt JSON", () => {
      localStorage.setItem(KEY, "}{ not json");
      const profile = loadOrCreateGuestProfile(PID, localStorage, NOW);
      expect(profile.xp).toBe(0);
      expect(readStored().persistent_id).toBe(PID);
    });

    it("does NOT overwrite a profile whose stored version is newer than this build", () => {
      const newer = {
        schema_version: CURRENT_PROFILE_SCHEMA_VERSION + 1,
        persistent_id: PID,
        xp: 777,
        future_field: "keep me",
      };
      localStorage.setItem(KEY, JSON.stringify(newer));
      const profile = loadOrCreateGuestProfile(PID, localStorage, NOW);
      // Returned in-memory profile is a downgraded current-shaped view.
      expect(profile.schema_version).toBe(CURRENT_PROFILE_SCHEMA_VERSION);
      expect(profile.xp).toBe(777);
      // Stored blob is untouched: newer version preserved AND unknown field intact.
      expect(readStored()).toEqual(newer);
    });

    it("returns a usable profile even when storage reads throw", () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("denied");
      });
      const profile = loadOrCreateGuestProfile(PID, localStorage, NOW);
      expect(profile.persistent_id).toBe(PID);
      expect(profile.xp).toBe(0);
    });
  });

  describe("creditQualifyingMatch", () => {
    it("adds XP for a qualifying match and updates updated_at", () => {
      loadOrCreateGuestProfile(PID, localStorage, NOW);
      const profile = creditQualifyingMatch(
        PID,
        GAME_ID,
        qualifying(),
        localStorage,
        LATER,
      );
      expect(profile.xp).toBe(GUEST_XP_PER_MATCH);
      expect(profile.updated_at).toBe(LATER);
      expect(readStored().xp).toBe(GUEST_XP_PER_MATCH);
    });

    it("creates then credits when no profile exists yet", () => {
      const profile = creditQualifyingMatch(
        PID,
        GAME_ID,
        qualifying(),
        localStorage,
        NOW,
      );
      expect(profile.xp).toBe(GUEST_XP_PER_MATCH);
      expect(readStored().xp).toBe(GUEST_XP_PER_MATCH);
    });

    it("leaves the profile unchanged for a disqualified match", () => {
      loadOrCreateGuestProfile(PID, localStorage, NOW);
      const profile = creditQualifyingMatch(
        PID,
        GAME_ID,
        {
          hasSpawned: false,
          isAliveAtEnd: true,
          wasEliminated: false,
          leftVoluntarily: false,
        },
        localStorage,
        LATER,
      );
      expect(profile.xp).toBe(0);
      expect(readStored().xp).toBe(0);
    });

    it("flips is_citizen locally when reaching the XP threshold", () => {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          ...createGuestProfile(PID, NOW),
          xp: CITIZENSHIP_XP_THRESHOLD - GUEST_XP_PER_MATCH,
        }),
      );
      const profile = creditQualifyingMatch(
        PID,
        GAME_ID,
        qualifying(),
        localStorage,
        LATER,
      );
      expect(profile.xp).toBe(CITIZENSHIP_XP_THRESHOLD);
      expect(profile.is_citizen).toBe(true);
      expect(profile.citizenship_earned_at).toBe(LATER);
      expect(readStored().is_citizen).toBe(true);
    });

    it("does NOT overwrite a newer stored profile even for a qualifying match", () => {
      const newer = {
        schema_version: CURRENT_PROFILE_SCHEMA_VERSION + 1,
        persistent_id: PID,
        xp: 500,
        future_field: "keep me",
      };
      localStorage.setItem(KEY, JSON.stringify(newer));
      const profile = creditQualifyingMatch(
        PID,
        GAME_ID,
        qualifying(),
        localStorage,
        LATER,
      );
      // The +10 is dropped; the newer persisted blob is left intact.
      expect(readStored()).toEqual(newer);
      expect(profile.xp).toBe(500);
    });

    it("does not throw when storage writes fail", () => {
      jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });
      expect(() =>
        creditQualifyingMatch(PID, GAME_ID, qualifying(), localStorage, LATER),
      ).not.toThrow();
    });

    it("credits a given game id only once (idempotent by game)", () => {
      const first = creditQualifyingMatch(
        PID,
        GAME_ID,
        qualifying(),
        localStorage,
        NOW,
      );
      expect(first.xp).toBe(GUEST_XP_PER_MATCH);

      const second = creditQualifyingMatch(
        PID,
        GAME_ID,
        qualifying(),
        localStorage,
        LATER,
      );
      // Same match: no additional XP, and the stored profile is unchanged.
      expect(second.xp).toBe(GUEST_XP_PER_MATCH);
      expect(readStored().xp).toBe(GUEST_XP_PER_MATCH);
      expect(readStored().updated_at).toBe(NOW);
    });

    it("credits distinct game ids cumulatively", () => {
      creditQualifyingMatch(PID, "game-a", qualifying(), localStorage, NOW);
      creditQualifyingMatch(PID, "game-b", qualifying(), localStorage, LATER);
      expect(readStored().xp).toBe(2 * GUEST_XP_PER_MATCH);
    });

    it("bounds the credited-games ledger and prunes oldest entries", () => {
      const total = MAX_CREDITED_GAMES + 5;
      for (let i = 0; i < total; i++) {
        creditQualifyingMatch(
          PID,
          `game-${i}`,
          qualifying(),
          localStorage,
          NOW,
        );
      }
      const ledger: string[] = JSON.parse(
        localStorage.getItem(guestCreditedGamesStorageKey(PID)) as string,
      );
      // Every distinct game was credited...
      expect(readStored().xp).toBe(total * GUEST_XP_PER_MATCH);
      // ...but the ledger is capped and the oldest IDs were pruned FIFO.
      expect(ledger).toHaveLength(MAX_CREDITED_GAMES);
      expect(ledger).not.toContain("game-0");
      expect(ledger).toContain(`game-${total - 1}`);
    });
  });
});
