export type StartScreenTab = "multiplayer" | "singleplayer";

export const ACTIVE_TAB_STORAGE_KEY = "geoconflict_active_tab";
export const DEFAULT_TAB: StartScreenTab = "multiplayer";

export function getActiveTab(): StartScreenTab {
  try {
    const raw = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (raw === "multiplayer" || raw === "singleplayer") {
      return raw;
    }
    return DEFAULT_TAB;
  } catch (error) {
    console.warn("Failed to read active start screen tab:", error);
    return DEFAULT_TAB;
  }
}

export function setActiveTab(tab: StartScreenTab): void {
  try {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tab);
  } catch (error) {
    console.warn("Failed to store active start screen tab:", error);
  }
}
