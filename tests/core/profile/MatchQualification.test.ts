import {
  applyMatchXp,
  CITIZENSHIP_XP_THRESHOLD,
  GUEST_XP_PER_MATCH,
  MatchParticipation,
  qualifiesForMatchXp,
} from "../../../src/core/profile/MatchQualification";
import { createGuestProfile } from "../../../src/core/profile/PlayerProfile";

const NOW = "2026-06-13T12:00:00.000Z";
const LATER = "2026-06-14T08:30:00.000Z";

function participation(
  overrides: Partial<MatchParticipation> = {},
): MatchParticipation {
  return {
    hasSpawned: true,
    isAliveAtEnd: true,
    wasEliminated: false,
    leftVoluntarily: false,
    ...overrides,
  };
}

describe("qualifiesForMatchXp", () => {
  it("qualifies a player who spawned and survived to the end", () => {
    expect(qualifiesForMatchXp(participation())).toBe(true);
  });

  it("qualifies a player eliminated after participating", () => {
    expect(
      qualifiesForMatchXp(
        participation({ isAliveAtEnd: false, wasEliminated: true }),
      ),
    ).toBe(true);
  });

  it("disqualifies a player who never spawned", () => {
    expect(
      qualifiesForMatchXp(
        participation({ hasSpawned: false, isAliveAtEnd: true }),
      ),
    ).toBe(false);
  });

  it("disqualifies a player who voluntarily left", () => {
    expect(qualifiesForMatchXp(participation({ leftVoluntarily: true }))).toBe(
      false,
    );
  });

  it("disqualifies a player who neither survived nor was eliminated", () => {
    expect(
      qualifiesForMatchXp(
        participation({ isAliveAtEnd: false, wasEliminated: false }),
      ),
    ).toBe(false);
  });

  it("disqualifies a voluntary leaver even when eliminated", () => {
    expect(
      qualifiesForMatchXp(
        participation({
          isAliveAtEnd: false,
          wasEliminated: true,
          leftVoluntarily: true,
        }),
      ),
    ).toBe(false);
  });
});

describe("applyMatchXp", () => {
  it("adds GUEST_XP_PER_MATCH and updates updated_at", () => {
    const profile = createGuestProfile("p1", NOW);
    const updated = applyMatchXp(profile, LATER);
    expect(updated.xp).toBe(GUEST_XP_PER_MATCH);
    expect(updated.updated_at).toBe(LATER);
    expect(updated.created_at).toBe(NOW);
  });

  it("does not mutate the input profile", () => {
    const profile = createGuestProfile("p1", NOW);
    applyMatchXp(profile, LATER);
    expect(profile.xp).toBe(0);
    expect(profile.updated_at).toBe(NOW);
  });

  it("flips is_citizen and stamps citizenship_earned_at on crossing the threshold", () => {
    const profile = {
      ...createGuestProfile("p1", NOW),
      xp: CITIZENSHIP_XP_THRESHOLD - GUEST_XP_PER_MATCH,
    };
    const updated = applyMatchXp(profile, LATER);
    expect(updated.xp).toBe(CITIZENSHIP_XP_THRESHOLD);
    expect(updated.is_citizen).toBe(true);
    expect(updated.citizenship_earned_at).toBe(LATER);
  });

  it("does not flip below the threshold", () => {
    const profile = {
      ...createGuestProfile("p1", NOW),
      xp: CITIZENSHIP_XP_THRESHOLD - GUEST_XP_PER_MATCH - 10,
    };
    const updated = applyMatchXp(profile, LATER);
    expect(updated.is_citizen).toBe(false);
    expect(updated.citizenship_earned_at).toBeNull();
  });

  it("does not re-stamp citizenship_earned_at for an already-citizen profile", () => {
    const earned = "2026-01-01T00:00:00.000Z";
    const profile = {
      ...createGuestProfile("p1", NOW),
      xp: CITIZENSHIP_XP_THRESHOLD,
      is_citizen: true,
      citizenship_earned_at: earned,
    };
    const updated = applyMatchXp(profile, LATER);
    expect(updated.xp).toBe(CITIZENSHIP_XP_THRESHOLD + GUEST_XP_PER_MATCH);
    expect(updated.is_citizen).toBe(true);
    expect(updated.citizenship_earned_at).toBe(earned);
  });

  it("never touches paid-entitlement fields", () => {
    const profile = {
      ...createGuestProfile("p1", NOW),
      xp: CITIZENSHIP_XP_THRESHOLD - GUEST_XP_PER_MATCH,
    };
    const updated = applyMatchXp(profile, LATER);
    expect(updated.is_paid_citizen).toBe(false);
    expect(updated.citizenship_purchased_at).toBeNull();
  });
});
