// What the end-of-match popup offers (task 0488): a rewarded video that doubles
// this match's XP, a plain login prompt for a guest, or nothing. Pure, so every
// gate is unit-testable without a browser.

import { GameType } from "../core/game/Game";
import { qualifiesForMatchXp } from "../core/profile/MatchQualification";
import type { PlayerParticipation } from "../core/Schemas";
import type {
  CitizenshipStatus,
  ProfileVerificationStatus,
} from "./CitizenshipStatus";

export type RewardedOffer = "hidden" | "watch" | "log_in";

export interface RewardedOfferInputs {
  /** The `rewarded_video` Yandex flag (fails closed). */
  isOfferFlagEnabled: boolean;
  /** The citizenship kill switch: no citizenship read, no way to hide citizens. */
  isCitizenshipSurfacesEnabled: boolean;
  isRewardedVideoAvailable: boolean;
  gameType: GameType;
  isTutorial: boolean;
  isReplay: boolean;
  /** This player's own participation, or null with no own player (spectator). */
  participation: PlayerParticipation | null;
  citizenshipStatus: CitizenshipStatus;
  verificationStatus: ProfileVerificationStatus;
  /** A reward claim already started for this match: one reward per match. */
  isMatchAlreadyClaimed: boolean;
}

export interface RewardedOfferDecision {
  offer: RewardedOffer;
  /** The popup would have offered, but the player is a citizen. */
  isSuppressedForCitizen: boolean;
}

const HIDDEN: RewardedOfferDecision = {
  offer: "hidden",
  isSuppressedForCitizen: false,
};

export function deriveRewardedOffer(
  inputs: RewardedOfferInputs,
): RewardedOfferDecision {
  if (
    !inputs.isOfferFlagEnabled ||
    !inputs.isCitizenshipSurfacesEnabled ||
    !inputs.isRewardedVideoAvailable
  ) {
    return HIDDEN;
  }
  // Only multiplayer matches credit XP: single-player, tutorial and replay run
  // on LocalServer and give none, so there is nothing to double.
  const isMultiplayer =
    inputs.gameType === GameType.Public || inputs.gameType === GameType.Private;
  if (!isMultiplayer || inputs.isTutorial || inputs.isReplay) {
    return HIDDEN;
  }
  if (
    inputs.participation === null ||
    !qualifiesForMatchXp(inputs.participation)
  ) {
    return HIDDEN;
  }
  if (inputs.citizenshipStatus === "citizen") {
    return { offer: "hidden", isSuppressedForCitizen: true };
  }
  // Fail closed: an unknown status or a failed read could be a citizen.
  if (inputs.citizenshipStatus === "unknown") {
    return HIDDEN;
  }
  if (inputs.isMatchAlreadyClaimed) {
    return HIDDEN;
  }
  switch (inputs.verificationStatus) {
    case "guest":
      return { offer: "log_in", isSuppressedForCitizen: false };
    case "verified":
    case "unverified":
      return { offer: "watch", isSuppressedForCitizen: false };
    case "unknown":
    case "read_failed":
      return HIDDEN;
  }
}
