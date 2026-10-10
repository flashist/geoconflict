import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { v4 as uuidv4 } from "uuid";
import { translateText } from "../client/Utils";
import { UserSettings } from "../core/game/UserSettings";
import {
  MAX_USERNAME_LENGTH,
  usernameRuleErrorMessage,
  usernameRulesHint,
} from "../core/validations/username";
import {
  checkUsernameRules,
  sanitizeUsernameForJoin,
} from "../core/validations/usernameRules";
import {
  type ApprovedNameState,
  getApprovedName,
  subscribeApprovedName,
} from "./ApprovedName";
import {
  flashist_logErrorToAnalytics,
  flashist_logErrorTypes,
  FlashistFacade,
} from "./flashist/FlashistFacade";

const usernameKey: string = "username";
// Task 0321: which stored name came from an approved name, so a cleared name
// (task 0314) can remove exactly that copy and leave a typed name alone.
const approvedUsernameKey: string = "approved_username";

@customElement("username-input")
export class UsernameInput extends LitElement {
  // What the input shows — the player's draft, which may break the rule.
  @state() private username: string = "";
  @property({ type: String }) validationError: string = "";
  // True while the input has focus: the rule hint shows then (task 0307, Q-C).
  @state() private isEditing: boolean = false;
  private _isValid: boolean = true;
  // The last name that PASSED the rule — the only name ever handed out to join a
  // game (task 0307, owner ruling Q-B). A half-typed invalid draft stays in the
  // input with its error, but is never sent: the server now refuses it (1002).
  private lastValidUsername: string = "";
  private userSettings: UserSettings = new UserSettings();
  // Task 0321 (owner ruling D4): a citizen's approved name, shown read-only.
  // `approvedName` is the latest approved name that passes the join rule; it is
  // what joins even while the switch waits for the player to leave the box.
  // `isLocked` is true once the box actually shows it.
  @state() private approvedName: string | null = null;
  @state() private isLocked: boolean = false;
  // False until connectedCallback's own fill has run: that fill would overwrite
  // anything applied before it, so the approved name is applied after it.
  private hasFilled: boolean = false;
  // A cleared name's replacement that landed while the box had focus; like a
  // lock, it waits for blur so the text never swaps under the player's fingers.
  private pendingRefillName: string | null = null;
  // Counts the player's edits, so a refill can tell the player typed during its
  // await even if the text ended up equal to the cleared name (review R4).
  private usernameEditCount: number = 0;
  private unsubscribeApprovedName: (() => void) | null = null;

  // Remove static styles since we're using Tailwind

  createRenderRoot() {
    // Disable shadow DOM to allow Tailwind classes to work
    return this;
  }

  /**
   * The name to play under: the last one that passed the rule (Q-B), never an
   * invalid draft. Before the stored name has loaded there is no accepted name
   * yet; the sanitized draft stands in ("xxx" for an empty one — what PlayerImpl
   * used to show for the empty name this path sent before task 0307), so even
   * that window never produces a name the server refuses. The same fallback
   * covers a cleared approved name: it is dropped from `lastValidUsername`, so
   * an invalid draft typed after the clear never joins under it (review R3).
   */
  public getCurrentUsername(): string {
    // Also covers a switch still waiting for blur (task 0321).
    if (this.approvedName !== null) {
      return this.approvedName;
    }
    return this.lastValidUsername !== ""
      ? this.lastValidUsername
      : sanitizeUsernameForJoin(this.username);
  }

  // Flashist Adaptation
  // connectedCallback() {
  async connectedCallback() {
    super.connectedCallback();

    // Task 0321: subscribe BEFORE the await, so an approved name published
    // while the box fills is not lost; it is applied once the fill is done.
    this.hasFilled = false;
    this.unsubscribeApprovedName?.();
    this.unsubscribeApprovedName = subscribeApprovedName(
      this.onApprovedNamePublished,
    );

    // Flashist Adaptation
    // this.username = this.getStoredUsername();
    this.username = await this.getStoredUsername();
    // getStoredUsername always returns a name that passes the rule
    // (sanitizeUsernameForJoin's output, or a generated Anon####).
    this.lastValidUsername = this.username;
    this.hasFilled = true;
    this.dispatchUsernameEvent();
    this.requestUpdate();
    // Whatever arrived during the await (or before mount) wins over the fill.
    this.applyApprovedName(getApprovedName());
  }

  disconnectedCallback() {
    this.unsubscribeApprovedName?.();
    this.unsubscribeApprovedName = null;
    super.disconnectedCallback();
  }

  private readonly onApprovedNamePublished = (
    state: ApprovedNameState,
  ): void => {
    // Before the fill, connectedCallback applies the latest state itself.
    if (this.hasFilled) {
      this.applyApprovedName(state);
    }
  };

  /**
   * Task 0321. `unknown` changes nothing — the box behaves as before, which is
   * also the degraded load (owner ruling Q2: show a stored name, never lock
   * from it). `approved` locks, `none` unlocks.
   */
  private applyApprovedName(state: ApprovedNameState): void {
    if (state.kind === "unknown") {
      return;
    }
    if (state.kind === "none") {
      this.releaseApprovedName();
      return;
    }
    // The same check the server's join schema runs (trim, then the rule), so
    // a locked name is never refused at join. A name that fails it (the rule
    // changed after approval, 0308) is neither locked nor cleaned into a string
    // nobody approved: the box keeps the normal order. The name is not logged.
    const candidate = state.name.trim();
    if (checkUsernameRules(candidate) !== null) {
      flashist_logErrorToAnalytics(
        "UsernameInput | approved name fails the join rule, not locked",
        flashist_logErrorTypes.DEBUG,
      );
      this.approvedName = null;
      this.isLocked = false;
      this.requestUpdate();
      return;
    }
    this.approvedName = candidate;
    // Mid-edit (brief item 4): never swap the text under the player's fingers.
    // handleBlur applies it; until then getCurrentUsername() already hands out
    // the approved name.
    if (this.isEditing && !this.isLocked) {
      this.requestUpdate();
      return;
    }
    this.lockToApprovedName(candidate);
  }

  private lockToApprovedName(name: string): void {
    this.pendingRefillName = null;
    this.isLocked = true;
    this.username = name;
    this.lastValidUsername = name;
    this.validationError = "";
    this._isValid = true;
    // Stored, so a later degraded load still starts with it (brief item 3).
    this.storeUsername(name);
    localStorage.setItem(approvedUsernameKey, name);
    this.dispatchUsernameEvent();
    this.requestUpdate();
  }

  /**
   * The approved name is gone (usually an operator cleared it, task 0314).
   * Unlock, and remove the stored copy of it — else a player with an empty
   * Yandex name would keep playing under it from storage. Typing a name
   * removes the marker (handleChange), so a stored name the player typed
   * stays — even one equal to the approved name.
   */
  private releaseApprovedName(): void {
    this.approvedName = null;
    this.isLocked = false;
    const clearedName = localStorage.getItem(approvedUsernameKey);
    if (clearedName !== null) {
      localStorage.removeItem(approvedUsernameKey);
      if (localStorage.getItem(usernameKey) === clearedName) {
        localStorage.removeItem(usernameKey);
        if (this.username === clearedName) {
          // Never hand the cleared name out again, not even as the fallback
          // behind an invalid draft typed before the refill lands (R3).
          this.lastValidUsername = "";
          void this.refillAfterClearedName();
        }
      }
    }
    this.requestUpdate();
  }

  // The normal order again, now without the removed stored copy: the Yandex
  // name, else a fresh Anon####.
  private async refillAfterClearedName(): Promise<void> {
    const editCountBefore = this.usernameEditCount;
    const name = await this.resolveUsername();
    // Something newer won meanwhile (a fresh lock, or the player typed — even
    // if they typed the cleared name back, R4).
    if (
      this.approvedName !== null ||
      this.usernameEditCount !== editCountBefore
    ) {
      return;
    }
    // Focused: wait for blur, as a lock does (handleBlur applies it). Until
    // then it is already what joins — also behind an invalid edit (R3).
    if (this.isEditing) {
      this.pendingRefillName = name;
      this.lastValidUsername = name;
      this.requestUpdate();
      return;
    }
    this.fillAfterClearedName(name);
  }

  private fillAfterClearedName(name: string): void {
    this.pendingRefillName = null;
    this.storeUsername(name);
    this.username = name;
    this.lastValidUsername = name;
    this.validationError = "";
    this._isValid = true;
    this.dispatchUsernameEvent();
    this.requestUpdate();
  }

  render() {
    // Task 0321: a locked box is read-only and muted, with a lock icon; its
    // hint points at the citizenship card, where the name is changed.
    const lockedHint = this.isLocked
      ? translateText("username.locked_hint")
      : undefined;
    return html`
      <input
        type="text"
        .value=${this.username}
        ?readonly=${this.isLocked}
        aria-readonly=${ifDefined(this.isLocked ? "true" : undefined)}
        @input=${this.handleChange}
        @change=${this.handleChange}
        @focus=${this.handleFocus}
        @blur=${this.handleBlur}
        placeholder="${translateText("username.enter_username")}"
        maxlength="${MAX_USERNAME_LENGTH}"
        class="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-300/60 dark:bg-gray-700 dark:text-white ${this
          .isLocked
          ? "pl-10 pr-10 opacity-70 cursor-default"
          : ""}"
      />
      ${this.isLocked
        ? html`<span
            id="username-lock-icon"
            class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>`
        : null}
      ${lockedHint !== undefined && this.isEditing
        ? html`<div
            id="username-locked-hint"
            class="absolute z-10 w-full mt-2 px-3 py-1 text-lg border rounded bg-white text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-300/60"
          >
            ${lockedHint}
          </div>`
        : null}
      ${this.validationError
        ? html`<div
            id="username-validation-error"
            class="absolute z-10 w-full mt-2 px-3 py-1 text-lg border rounded bg-white text-red-600 border-red-600 dark:bg-gray-700 dark:text-red-300 dark:border-red-300"
          >
            ${this.validationError}
          </div>`
        : this.isEditing && !this.isLocked
          ? html`<div
              id="username-rules-hint"
              class="absolute z-10 w-full mt-2 px-3 py-1 text-lg border rounded bg-white text-gray-600 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-300/60"
            >
              ${usernameRulesHint()}
            </div>`
          : null}
    `;
  }

  // Explicit requestUpdate() after each change — the codebase convention (see
  // CitizenshipCard): the decorator transform does not reliably schedule
  // updates under the test build.
  private handleFocus() {
    this.isEditing = true;
    this.requestUpdate();
  }

  private handleBlur() {
    this.isEditing = false;
    // Task 0321: an approved name that arrived mid-edit applies now. Pressing
    // Play blurs the box first, so this runs before the click reads the name.
    if (this.approvedName !== null && !this.isLocked) {
      this.lockToApprovedName(this.approvedName);
    } else if (this.pendingRefillName !== null) {
      this.fillAfterClearedName(this.pendingRefillName);
    }
    this.requestUpdate();
  }

  private handleChange(e: Event) {
    // Read-only already blocks typing; this guards the change event too.
    if (this.isLocked) {
      return;
    }
    // The player typed: a cleared name's pending replacement no longer applies.
    this.pendingRefillName = null;
    this.usernameEditCount++;
    const input = e.target as HTMLInputElement;
    this.username = input.value.trim();
    const violation = checkUsernameRules(this.username);
    this._isValid = violation === null;
    if (violation === null) {
      this.lastValidUsername = this.username;
      this.storeUsername(this.username);
      // A typed name is the player's own, even if it equals the approved name
      // (task 0321 R1, owner ruling 2026-09-28): drop the marker, so a later
      // cleared name never deletes it.
      localStorage.removeItem(approvedUsernameKey);
      this.validationError = "";
    } else {
      // The specific problem AND the full rule (task 0307, Q-C).
      this.validationError = usernameRuleErrorMessage(violation);
    }
    this.requestUpdate();
  }

  // Flashist Adaptation
  // private getStoredUsername(): string {
  private async getStoredUsername(): Promise<string> {
    const result = await this.resolveUsername();

    // Make sure we're updating the saved in the local storage data about the username
    // (needed for correct migration from the previous versions of the app)
    this.storeUsername(result);

    return result;
  }

  // The normal order — Yandex name, then storage, then Anon#### — without
  // writing anything (task 0321: refillAfterClearedName stores only if its
  // result is still wanted when it lands).
  private async resolveUsername(): Promise<string> {
    let result: string | null = "";

    // Flashist Adaptation: experiment (username from platform)
    try {
      result = await FlashistFacade.instance.getCurPlayerName();
    } catch (error) {
      flashist_logErrorToAnalytics(
        `ERROR! UsernameInput | getStoredUsername __ error: ${error}`,
        flashist_logErrorTypes.DEBUG,
      );
    }

    if (!result) {
      const localStorageUserName = localStorage.getItem(usernameKey);
      if (localStorageUserName) {
        result = localStorageUserName;
      }
    }

    // Make sure the username is always checked for being correct — cleaned AND
    // trimmed, because the server's join check trims before the rule (0307
    // review R2): a Yandex name like "★ A ★" must not become a blank-edged name
    // the server then refuses.
    if (result) {
      result = sanitizeUsernameForJoin(result);
    }
    // Make sure the edge cases are handled when due to some reason we don't have a user name
    if (!result) {
      result = this.generateNewUsername();
    }

    return result;
  }

  private storeUsername(username: string) {
    if (username) {
      localStorage.setItem(usernameKey, username);
    }
  }

  private dispatchUsernameEvent() {
    this.dispatchEvent(
      new CustomEvent("username-change", {
        detail: { username: this.username },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // Stored by the caller (getStoredUsername), not here.
  private generateNewUsername(): string {
    return "Anon" + this.uuidToFourDigits();
  }

  private uuidToFourDigits(): string {
    const uuid = uuidv4();
    const cleanUuid = uuid.replace(/-/g, "").toLowerCase();
    const decimal = BigInt(`0x${cleanUuid}`);
    const fourDigits = (decimal % 9000n) + 1000n;
    return fourDigits.toString().padStart(4, "0");
  }

  public isValid(): boolean {
    // Task 0321: an approved name passed the rule, and it is what joins —
    // even while a half-typed draft waits for blur to be replaced.
    return this.approvedName !== null || this._isValid;
  }
}
