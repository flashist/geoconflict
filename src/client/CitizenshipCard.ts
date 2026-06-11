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
        class="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#1c1c1e]/85"
      >
        <span class="shrink-0 opacity-50" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect
              x="5"
              y="11"
              width="14"
              height="10"
              rx="2"
              fill="white"
              fill-opacity="0.25"
              stroke="white"
              stroke-opacity="0.5"
              stroke-width="1.5"
            />
            <path
              d="M8 11V7a4 4 0 0 1 8 0v4"
              stroke="white"
              stroke-opacity="0.6"
              stroke-width="1.5"
              stroke-linecap="round"
            />
            <circle cx="12" cy="16" r="1.5" fill="white" fill-opacity="0.7" />
          </svg>
        </span>
        <div class="flex-1 min-w-0 text-left">
          <div class="text-[13px] font-bold text-white leading-tight mb-0.5">
            ${translateText("citizenship_card.title")}
          </div>
          <div class="text-[11px] text-[#98989f] leading-[1.4]">
            ${translateText("citizenship_card.guest_subtitle")}
          </div>
        </div>
        <button
          id="citizenship-login-button"
          class="shrink-0 px-3 py-[7px] rounded-lg text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          @click=${this.onLoginCtaTap}
        >
          ${translateText("citizenship_card.login_cta")}
        </button>
      </div>
    `;
  }
}
