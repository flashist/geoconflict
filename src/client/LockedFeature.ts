import { openCitizenshipExplainer } from "./CitizenshipExplainer";
import { FlashistFacade } from "./flashist/FlashistFacade";

/**
 * The one place a tap on a LOCKED citizen perk goes (task 0302). Fires
 * `LockedFeature:Tap:{featureId}` first, then opens the citizenship explainer
 * popup (task 0301 — it replaced 0302's interim "citizens only" notice). The
 * popup's own `Citizenship:Explainer:Opened:LockedFeature:{featureId}` follows
 * only if it actually opens (not while the citizenship kill switch is off).
 * Later perks (0249, 0030, ...) call it with their own
 * `flashistConstants.lockedFeatureIds` value.
 */
export function onLockedFeatureTap(featureId: string): void {
  FlashistFacade.instance.logLockedFeatureTapEvent(featureId);
  openCitizenshipExplainer({ source: "LockedFeature", featureId });
}
