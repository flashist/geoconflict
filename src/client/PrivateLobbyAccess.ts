import {
  getCitizenshipStatus,
  subscribeCitizenshipStatus,
} from "./CitizenshipStatus";
import {
  FlashistFacade,
  flashist_waitGameInitComplete,
  flashistConstants,
} from "./flashist/FlashistFacade";
import { onLockedFeatureTap } from "./LockedFeature";

export const PRIVATE_LOBBY_ROW_ID = "private-lobby-row";
export const HOST_LOBBY_BUTTON_ID = "host-lobby-button";

/**
 * The private-lobby row on the start screen (task 0302). Creating a private
 * lobby is a citizen perk; joining one stays free for everyone (owner rulings
 * 2026-09-26 / 2026-09-27).
 *
 * - The row stays HIDDEN — exactly as it has been on Yandex since 2025 — unless
 *   BOTH the `private_lobbies` remote switch AND the citizenship surfaces are
 *   on. Either off (including a degraded boot, where flags are absent) means
 *   hidden, whatever the player's citizenship. It never falls back to
 *   "unlocked for everyone".
 * - When shown, Create is locked for anything but a confirmed citizen: unknown,
 *   guest, non-citizen and an unreadable profile all show locked (Q2 ruling),
 *   and it unlocks live when the citizenship card publishes `citizen`.
 * - Join is never locked (Q4 ruling).
 *
 * The switch only hides the row. It secures nothing: the server refuses to
 * start a private match whose creator is not a citizen, switch on or off.
 */
export class PrivateLobbyAccess {
  private isRowVisible = false;

  public isCreateLocked(): boolean {
    // Dev build only (review R2, owner ruling 2026-09-27, "Dev-only bypass"): the
    // standalone dev page has no Yandex identity, so nobody could host locally.
    // The same build-time value `checkExperimentFlag` uses; the production build
    // (`--mode production`) sets it to "prod". The server skips its citizen
    // check in the dev config only (`isPrivateLobbyCitizenGateBypassed`).
    if (process.env.GAME_ENV === "dev") {
      return false;
    }
    return getCitizenshipStatus() !== "citizen";
  }

  public isVisible(): boolean {
    return this.isRowVisible;
  }

  /** Resolves once the row's visibility has been decided. Never rejects. */
  public async start(): Promise<void> {
    try {
      await flashist_waitGameInitComplete();
      const facade = FlashistFacade.instance;
      const isEnabled =
        (await facade.isPrivateLobbiesEnabled()) &&
        (await facade.isCitizenshipSurfacesEnabled());
      if (!isEnabled) {
        return;
      }
      const row = document.getElementById(PRIVATE_LOBBY_ROW_ID);
      if (row === null) {
        return;
      }
      this.applyLock();
      subscribeCitizenshipStatus(() => this.applyLock());
      row.style.display = "";
      this.isRowVisible = true;
    } catch (error) {
      // Fail closed: the row stays hidden.
      console.warn("Private lobby row could not be shown:", error);
    }
  }

  /**
   * The Create Lobby click. Locked → the citizenship popup, and the host modal
   * never opens. Unlocked → `openHostModal`, exactly as before this task.
   */
  public onCreateTap(openHostModal: () => void): void {
    if (this.isCreateLocked()) {
      onLockedFeatureTap(flashistConstants.lockedFeatureIds.privateLobby);
      return;
    }
    openHostModal();
  }

  private applyLock(): void {
    const button = document.getElementById(HOST_LOBBY_BUTTON_ID) as
      | (HTMLElement & { locked?: boolean; requestUpdate?: () => void })
      | null;
    if (button === null) {
      return;
    }
    button.locked = this.isCreateLocked();
    button.requestUpdate?.();
  }
}
