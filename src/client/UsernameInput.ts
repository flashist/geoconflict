import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
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
  flashist_logErrorToAnalytics,
  flashist_logErrorTypes,
  FlashistFacade,
} from "./flashist/FlashistFacade";

const usernameKey: string = "username";

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
   * that window never produces a name the server refuses.
   */
  public getCurrentUsername(): string {
    return this.lastValidUsername !== ""
      ? this.lastValidUsername
      : sanitizeUsernameForJoin(this.username);
  }

  // Flashist Adaptation
  // connectedCallback() {
  async connectedCallback() {
    super.connectedCallback();

    // Flashist Adaptation
    // this.username = this.getStoredUsername();
    this.username = await this.getStoredUsername();
    // getStoredUsername always returns a name that passes the rule
    // (sanitizeUsernameForJoin's output, or a generated Anon####).
    this.lastValidUsername = this.username;
    this.dispatchUsernameEvent();
  }

  render() {
    return html`
      <input
        type="text"
        .value=${this.username}
        @input=${this.handleChange}
        @change=${this.handleChange}
        @focus=${this.handleFocus}
        @blur=${this.handleBlur}
        placeholder="${translateText("username.enter_username")}"
        maxlength="${MAX_USERNAME_LENGTH}"
        class="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-300/60 dark:bg-gray-700 dark:text-white"
      />
      ${this.validationError
        ? html`<div
            id="username-validation-error"
            class="absolute z-10 w-full mt-2 px-3 py-1 text-lg border rounded bg-white text-red-600 border-red-600 dark:bg-gray-700 dark:text-red-300 dark:border-red-300"
          >
            ${this.validationError}
          </div>`
        : this.isEditing
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
    this.requestUpdate();
  }

  private handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.username = input.value.trim();
    const violation = checkUsernameRules(this.username);
    this._isValid = violation === null;
    if (violation === null) {
      this.lastValidUsername = this.username;
      this.storeUsername(this.username);
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

    // Make sure we're updating the saved in the local storage data about the username
    // (needed for correct migration from the previous versions of the app)
    this.storeUsername(result);

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

  private generateNewUsername(): string {
    const newUsername = "Anon" + this.uuidToFourDigits();
    this.storeUsername(newUsername);
    return newUsername;
  }

  private uuidToFourDigits(): string {
    const uuid = uuidv4();
    const cleanUuid = uuid.replace(/-/g, "").toLowerCase();
    const decimal = BigInt(`0x${cleanUuid}`);
    const fourDigits = (decimal % 9000n) + 1000n;
    return fourDigits.toString().padStart(4, "0");
  }

  public isValid(): boolean {
    return this._isValid;
  }
}
