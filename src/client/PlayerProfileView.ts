import { FlashistFacade } from "./flashist/FlashistFacade";

// Re-exported from the shared source of truth so the card keeps importing it from
// here while the server and client agree on one threshold value.
export { CITIZENSHIP_XP_THRESHOLD } from "../core/profile/Citizenship";

export type PlayerProfileView = {
  displayName: string;
  xp: number;
  isCitizen: boolean;
};

/**
 * View model the citizenship card renders from. Auth state and display name
 * are real (Yandex SDK). XP and citizenship are zero-valued stubs until the
 * Player Profile Store (s4-player-profile-store-impl) lands — it replaces the
 * body of this function without touching the card.
 */
export async function loadPlayerProfileView(): Promise<PlayerProfileView | null> {
  const isAuthorized = await FlashistFacade.instance.isYandexAuthorized();
  if (!isAuthorized) {
    return null;
  }
  const displayName = await FlashistFacade.instance
    .getCurPlayerName()
    .catch(() => "");
  return { displayName, xp: 0, isCitizen: false };
}
