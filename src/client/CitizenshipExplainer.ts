import type { CitizenshipExplainerModal } from "./CitizenshipExplainerModal";

/**
 * Where the "What is citizenship?" popup was opened from (task 0301). Each
 * source has its own `Citizenship:Explainer:Opened:*` event; a locked-perk tap
 * carries the perk's `flashistConstants.lockedFeatureIds` value.
 */
export type CitizenshipExplainerSource =
  | { source: "CardLink" }
  | { source: "Instructions" }
  | { source: "LockedFeature"; featureId: string };

/**
 * The one way to open the citizenship explainer popup (task 0301): the card's
 * link, the Instructions section and a locked-perk tap all come here. The popup
 * itself refuses while the citizenship kill switch is off.
 */
export function openCitizenshipExplainer(
  source: CitizenshipExplainerSource,
): void {
  void document
    .querySelector<CitizenshipExplainerModal>("citizenship-explainer-modal")
    ?.show(source);
}
