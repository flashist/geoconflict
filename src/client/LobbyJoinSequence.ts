// Task 0228: the order of lobby joins and leaves. Main.ts's join handler awaits
// server config, cosmetics and the Yandex id before it connects, and a second
// join or a leave could land in that gap: the leave was dropped (no stopper
// yet), and two joins both connected, the first one's stopper lost. Here the
// latest join wins, and a leave cancels a join still being set up — a counter
// compare, no flag that can get stuck. Lives outside Main.ts so the order is
// unit-testable without a browser (as 0333's HostLobbyOpen.ts).
//
// Presence ("away from the start screen") is NOT tracked here — that is
// StartScreenPresence's beginJoiningLobby counter (task 0336), left as it is.

export interface JoinTicket {
  /** False once a later join or a leave has happened. */
  isCurrent(): boolean;
  /**
   * Stores the connected join's stopper. Ignored when the ticket is no longer
   * current — Main.ts checks isCurrent() right before it connects, with no
   * await in between, so that cannot happen there.
   */
  connected(stop: () => void): void;
  /**
   * The join ended without connecting (something before connected() threw).
   * If it is still the current join it stops counting as being set up, so
   * nothing is left stuck in that state. A no-op once it connected or went
   * stale.
   */
  abandon(): void;
}

/**
 * "left": a connected join was stopped. "cancelled-setup": a join still being
 * set up was cancelled; it never connected. "nothing": no join to leave.
 */
export type LobbyLeaveOutcome = "left" | "cancelled-setup" | "nothing";

export class LobbyJoinSequence {
  private stopper: (() => void) | null = null;
  private generation = 0;
  // The generation of the join still being set up, if any.
  private settingUp: number | null = null;

  /**
   * Starts a join: stops the connected one (if any) and makes any join still
   * being set up stale.
   */
  beginJoin(): JoinTicket {
    this.stopConnected();
    const generation = ++this.generation;
    this.settingUp = generation;
    return {
      isCurrent: () => this.generation === generation,
      connected: (stop) => {
        if (this.generation !== generation) {
          return;
        }
        this.stopper = stop;
        this.settingUp = null;
      },
      abandon: () => {
        if (this.settingUp === generation) {
          this.settingUp = null;
        }
      },
    };
  }

  /**
   * Runs one join: takes its ticket, then `setUpAndConnect` — Main.ts's setup
   * awaits, its isCurrent() check and its synchronous connect. However that
   * ends (a setup await or the connect step throwing, review R1), a join that
   * never reached connected() does not stay "being set up"; an error is passed
   * on unchanged.
   */
  async runJoin(
    setUpAndConnect: (join: JoinTicket) => Promise<void>,
  ): Promise<void> {
    const join = this.beginJoin();
    try {
      await setUpAndConnect(join);
    } finally {
      join.abandon();
    }
  }

  leave(): LobbyLeaveOutcome {
    if (this.stopConnected()) {
      return "left";
    }
    if (this.settingUp !== null) {
      this.generation++;
      this.settingUp = null;
      return "cancelled-setup";
    }
    return "nothing";
  }

  /** The connected join's stopper — Main.ts's `gameStop`. */
  currentStopper(): (() => void) | null {
    return this.stopper;
  }

  hasStopper(): boolean {
    return this.stopper !== null;
  }

  isInLobbyOrJoining(): boolean {
    return this.stopper !== null || this.settingUp !== null;
  }

  // Cleared before it is called, so a stopper runs once even if it re-enters.
  private stopConnected(): boolean {
    const stop = this.stopper;
    if (stop === null) {
      return false;
    }
    this.stopper = null;
    stop();
    return true;
  }
}
