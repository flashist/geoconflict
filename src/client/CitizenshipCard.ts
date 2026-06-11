import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashist_waitGameInitComplete,
  flashistConstants,
} from "./flashist/FlashistFacade";
import { translateText } from "./Utils";

export const CITIZENSHIP_LOGIN_REQUESTED_EVENT = "citizenship-login-requested";

// Citizenship:Seen must fire at most once per page load, no matter how many
// times the card re-renders or reconnects.
let citizenshipSeenReported = false;

export function resetCitizenshipSeenReportedForTests(): void {
  citizenshipSeenReported = false;
}

/**
 * Static guest-state shell of the citizenship card (start screen redesign,
 * s4-start-screen-redesign-impl). Live profile states (guest/citizen, XP bar,
 * login flow) are added by s4-citizenship-xp-progress-ui on top of this
 * component — the element name, translation keys, and the
 * citizenship-login-requested event are the stable boundary.
 */
@customElement("citizenship-card")
export class CitizenshipCard extends LitElement {
  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    flashist_waitGameInitComplete().then(() => this.maybeReportSeen());
  }

  public maybeReportSeen(): void {
    if (citizenshipSeenReported || !this.isCardVisible()) {
      return;
    }
    citizenshipSeenReported = true;
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.CITIZENSHIP_SURFACE_SEEN,
    );
  }

  // Layout-based check so the event stays honest during the Yandex preload
  // curtain; jsdom cannot do layout, so tests override this method.
  protected isCardVisible(): boolean {
    const elementWithCheckVisibility = this as HTMLElement & {
      checkVisibility?: () => boolean;
    };
    if (typeof elementWithCheckVisibility.checkVisibility === "function") {
      return elementWithCheckVisibility.checkVisibility();
    }
    return this.getClientRects().length > 0;
  }

  private onLoginCtaTap() {
    FlashistFacade.instance.logUiTapEvent(
      flashistConstants.uiElementIds.citizenshipLoginToEarn,
    );
    this.dispatchEvent(
      new CustomEvent(CITIZENSHIP_LOGIN_REQUESTED_EVENT, {
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <div
        class="w-full flex items-center gap-3 p-3 rounded-xl border border-black/30 dark:border-gray-300/60 bg-white/70 dark:bg-[rgba(55,65,81,0.7)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-6 h-6 shrink-0 text-gray-500 dark:text-gray-300"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
            clip-rule="evenodd"
          />
        </svg>
        <div class="flex-1 min-w-0 text-left">
          <div class="text-base font-semibold text-gray-900 dark:text-white">
            ${translateText("citizenship_card.title")}
          </div>
          <div class="text-xs text-gray-600 dark:text-gray-300">
            ${translateText("citizenship_card.guest_subtitle")}
          </div>
        </div>
        <button
          id="citizenship-login-button"
          class="shrink-0 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors duration-200 hover:opacity-90"
          style="background-color: #0075ff;"
          @click=${this.onLoginCtaTap}
        >
          ${translateText("citizenship_card.login_cta")}
        </button>
      </div>
    `;
  }
}
