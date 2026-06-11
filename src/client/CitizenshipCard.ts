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
        class="w-full flex items-center gap-2 p-2.5 rounded-2xl bg-[#1c1c1e]/85"
      >
        <span
          class="flex items-center justify-center w-9 h-9 rounded-lg bg-[#2c2c2e] shrink-0"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            class="w-5 h-5 text-[#98989f]"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </span>
        <div class="flex-1 min-w-0 text-left">
          <div class="text-[16px] font-bold text-white leading-tight">
            ${translateText("citizenship_card.title")}
          </div>
          <div class="text-[12px] text-[#98989f] leading-snug">
            ${translateText("citizenship_card.guest_subtitle")}
          </div>
        </div>
        <button
          id="citizenship-login-button"
          class="shrink-0 px-2.5 py-2 rounded-xl text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          @click=${this.onLoginCtaTap}
        >
          ${translateText("citizenship_card.login_cta")}
        </button>
      </div>
    `;
  }
}
