import {
  deriveRewardedOffer,
  type RewardedOfferInputs,
} from "../../src/client/RewardedMatchXpOffer";
import { GameType } from "../../src/core/game/Game";

// Task 0488: who sees the rewarded-video offer at the end of a match.

function inputs(over: Partial<RewardedOfferInputs> = {}): RewardedOfferInputs {
  return {
    isOfferFlagEnabled: true,
    isCitizenshipSurfacesEnabled: true,
    isRewardedVideoAvailable: true,
    gameType: GameType.Public,
    isTutorial: false,
    isReplay: false,
    participation: { clientID: "me", hasSpawned: true, isAliveAtEnd: true },
    citizenshipStatus: "not_citizen",
    verificationStatus: "verified",
    isMatchAlreadyClaimed: false,
    ...over,
  };
}

describe("deriveRewardedOffer", () => {
  it("a verified non-citizen in a public match: watch", () => {
    expect(deriveRewardedOffer(inputs())).toEqual({
      offer: "watch",
      isSuppressedForCitizen: false,
    });
  });

  it("an unverified non-citizen and a private lobby: watch", () => {
    expect(
      deriveRewardedOffer(
        inputs({
          verificationStatus: "unverified",
          gameType: GameType.Private,
        }),
      ).offer,
    ).toBe("watch");
  });

  it("an eliminated player qualifies, like the server credit", () => {
    expect(
      deriveRewardedOffer(
        inputs({
          participation: {
            clientID: "me",
            hasSpawned: true,
            isAliveAtEnd: false,
            killedAt: 300,
          },
        }),
      ).offer,
    ).toBe("watch");
  });

  // getCitizenshipStatus() says `citizen` for paid AND earned citizens alike.
  it("a citizen (paid or earned): hidden, flagged as suppressed", () => {
    for (const verificationStatus of ["verified", "unverified"] as const) {
      expect(
        deriveRewardedOffer(
          inputs({ citizenshipStatus: "citizen", verificationStatus }),
        ),
      ).toEqual({ offer: "hidden", isSuppressedForCitizen: true });
    }
  });

  it("unknown citizenship or a failed read: hidden, not flagged", () => {
    expect(
      deriveRewardedOffer(inputs({ citizenshipStatus: "unknown" })),
    ).toEqual({ offer: "hidden", isSuppressedForCitizen: false });
    expect(
      deriveRewardedOffer(inputs({ verificationStatus: "read_failed" })).offer,
    ).toBe("hidden");
    expect(
      deriveRewardedOffer(inputs({ verificationStatus: "unknown" })).offer,
    ).toBe("hidden");
  });

  it("a guest: log_in", () => {
    expect(
      deriveRewardedOffer(inputs({ verificationStatus: "guest" })),
    ).toEqual({ offer: "log_in", isSuppressedForCitizen: false });
  });

  it("single-player, tutorial and replay: hidden, even for a guest", () => {
    for (const over of [
      { gameType: GameType.Singleplayer },
      { isTutorial: true },
      { isReplay: true },
    ]) {
      expect(deriveRewardedOffer(inputs(over)).offer).toBe("hidden");
      expect(
        deriveRewardedOffer(inputs({ ...over, verificationStatus: "guest" }))
          .offer,
      ).toBe("hidden");
    }
  });

  it("not spawned, or no own player (spectator): hidden", () => {
    expect(
      deriveRewardedOffer(
        inputs({
          participation: {
            clientID: "me",
            hasSpawned: false,
            isAliveAtEnd: false,
          },
        }),
      ).offer,
    ).toBe("hidden");
    expect(deriveRewardedOffer(inputs({ participation: null })).offer).toBe(
      "hidden",
    );
  });

  it("flag off, citizenship surfaces off or no SDK: hidden, and a citizen is not flagged", () => {
    for (const over of [
      { isOfferFlagEnabled: false },
      { isCitizenshipSurfacesEnabled: false },
      { isRewardedVideoAvailable: false },
    ]) {
      expect(deriveRewardedOffer(inputs(over))).toEqual({
        offer: "hidden",
        isSuppressedForCitizen: false,
      });
      expect(
        deriveRewardedOffer(inputs({ ...over, citizenshipStatus: "citizen" }))
          .isSuppressedForCitizen,
      ).toBe(false);
    }
  });

  it("already claimed this match: hidden", () => {
    expect(
      deriveRewardedOffer(inputs({ isMatchAlreadyClaimed: true })).offer,
    ).toBe("hidden");
  });
});
