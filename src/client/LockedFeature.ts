import type { CitizensOnlyModal } from "./CitizensOnlyModal";
import { FlashistFacade } from "./flashist/FlashistFacade";

/**
 * The one place a tap on a LOCKED citizen perk goes (task 0302). Fires
 * `LockedFeature:Tap:{featureId}` and opens the citizenship popup.
 *
 * Today the popup is the interim "citizens only" notice (no buy button, owner
 * ruling 2026-09-26). Task 0301 re-points THIS function at its citizenship
 * explainer; later perks (0249, 0030, ...) call it with their own
 * `flashistConstants.lockedFeatureIds` value.
 */
export function onLockedFeatureTap(featureId: string): void {
  FlashistFacade.instance.logLockedFeatureTapEvent(featureId);
  void document.querySelector<CitizensOnlyModal>("citizens-only-modal")?.show();
}
