import {
  getCitizenshipStatus,
  subscribeCitizenshipStatus,
} from "./CitizenshipStatus";
import {
  FlashistFacade,
  flashist_waitGameInitComplete,
  flashistConstants,
  isTesterMarkerSet,
} from "./flashist/FlashistFacade";
import { onLockedFeatureTap } from "./LockedFeature";

export const PRIVATE_LOBBY_ROW_ID = "private-lobby-row";
export const HOST_LOBBY_BUTTON_ID = "host-lobby-button";

/**
 * Whether the private-lobby row is shown at all (task 0354): the citizenship
 * surfaces are on AND (the `geoconflict_tester` marker OR the
 * `private_lobbies_all` flag). Waits for platform init. The row and the
 * citizenship explainer's private-lobby line (task 0301) both read this — one
 * rule, two readers. May reject; callers fail closed.
 */
export async function isPrivateLobbyRowEnabled(): Promise<boolean> {
  await flashist_waitGameInitComplete();
  const facade = FlashistFacade.instance;
  return (
    (await facade.isCitizenshipSurfacesEnabled()) &&
    (isTesterMarkerSet() || (await facade.isPrivateLobbiesForEveryoneEnabled()))
  );
}

/**
 * The private-lobby row on the start screen (task 0302). Creating a private
 * lobby is a citizen perk; joining one stays free for everyone (owner rulings
 * 2026-09-26 / 2026-09-27).
 *
 * - The row is shown only when the citizenship surfaces are on AND (the player
 *   is a tester — the `geoconflict_tester` marker — OR the
 *   `private_lobbies_all` remote flag is on) (task 0354). Surfaces off,
 *   including a degraded boot where flags are absent, means hidden for
 *   everyone, testers too (owner ruling 2026-10-04, Q3). It never falls back
 *   to "unlocked for everyone".
 * - When shown, Create is locked for anything but a confirmed citizen: unknown,
 *   guest, non-citizen and an unreadable profile all show locked (Q2 ruling),
 *   and it unlocks live when the citizenship card publishes `citizen`.
 * - Join is never locked (Q4 ruling).
 *
 * The marker and the flag only hide the row. They secure nothing: the server
 * refuses to start a private match whose creator is not a citizen, whatever
 * they say.
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
      if (!(await isPrivateLobbyRowEnabled())) {
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
   * The Create Lobby click. Locked → the citizenship explainer, and the host modal
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
