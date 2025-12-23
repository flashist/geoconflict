import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { v4 as uuidv4 } from "uuid";
import { translateText } from "../client/Utils";
import { UserSettings } from "../core/game/UserSettings";
import {
  MAX_USERNAME_LENGTH,
  sanitizeUsername,
  validateUsername,
} from "../core/validations/username";
import { flashist_logErrorToAnalytics, flashist_logErrorTypes, FlashistFacade } from "./flashist/FlashistFacade";
import { FlashistGameSettings } from "./flashist-game/FlashistGameSettings";

const usernameKey: string = "username";

@customElement("username-input")
export class UsernameInput extends LitElement {
  @state() private username: string = "";
  @property({ type: String }) validationError: string = "";
  private _isValid: boolean = true;
  private userSettings: UserSettings = new UserSettings();

  // Remove static styles since we're using Tailwind

  createRenderRoot() {
    // Disable shadow DOM to allow Tailwind classes to work
    return this;
  }

  public getCurrentUsername(): string {
    return this.username;
  }

  // Flashist Adaptation
  // connectedCallback() {
  async connectedCallback() {
    super.connectedCallback();

    // Flashist Adaptation
    // this.username = this.getStoredUsername();
    this.username = await this.getStoredUsername();
    this.dispatchUsernameEvent();
  }

  render() {
    return html`
      <input
        type="text"
        .value=${this.username}
        @input=${this.handleChange}
        @change=${this.handleChange}
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
        : null}
    `;
  }

  private handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.username = input.value.trim();
    const result = validateUsername(this.username);
    this._isValid = result.isValid;
    if (result.isValid) {
      this.storeUsername(this.username);
      this.validationError = "";
    } else {
      this.validationError = result.error ?? "";
    }
  }

  // Flashist Adaptation
  // private getStoredUsername(): string {
  private async getStoredUsername(): Promise<string> {
    let result: string | null = "";

    // Flashist Adaptation: experiment (username from platform)
    try {
      result = await FlashistFacade.instance.getCurPlayerName();

    } catch (error) {
      flashist_logErrorToAnalytics(`ERROR! UsernameInput | getStoredUsername __ error: ${error}`, flashist_logErrorTypes.DEBUG);
    }

    if (!result) {
      let localStorageUserName = localStorage.getItem(usernameKey);
      if (localStorageUserName) {
        result = localStorageUserName;
      }
    }

    // Make sure the username is always checked for being correct
    if (result) {
      result = sanitizeUsername(result);
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
    const newUsername = "Anon" + this.uuidToThreeDigits();
    this.storeUsername(newUsername);
    return newUsername;
  }

  private uuidToThreeDigits(): string {
    const uuid = uuidv4();
    const cleanUuid = uuid.replace(/-/g, "").toLowerCase();
    const decimal = BigInt(`0x${cleanUuid}`);
    const threeDigits = decimal % 1000n;
    return threeDigits.toString().padStart(3, "0");
  }

  public isValid(): boolean {
    return this._isValid;
  }
}
