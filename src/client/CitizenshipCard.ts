import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import shieldIcon from "../../resources/images/ShieldIconWhite.svg";
import { FLAG_STORAGE_KEY } from "./FlagInput";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashist_waitGameInitComplete,
  flashistConstants,
} from "./flashist/FlashistFacade";
import {
  CITIZENSHIP_XP_THRESHOLD,
  PlayerProfileView,
  loadPlayerProfileView,
} from "./PlayerProfileView";
import { translateText } from "./Utils";

export const CITIZENSHIP_LOGIN_REQUESTED_EVENT = "citizenship-login-requested";

// Citizenship:Seen must fire at most once per page load, no matter how many
// times the card re-renders or reconnects.
let citizenshipSeenReported = false;

export function resetCitizenshipSeenReportedForTests(): void {
  citizenshipSeenReported = false;
}

/**
 * Citizenship card on the start screen (s4-start-screen-redesign-impl +
 * s4-citizenship-xp-progress-ui). Renders one of three states from the
 * player profile view:
 *   guest (not Yandex-authorized) — lock + login CTA,
 *   authorized non-citizen — name + XP progress toward the threshold,
 *   citizen — adds the CITIZEN badge, bar full.
 * XP/citizenship values come from PlayerProfileView, which stays a zero-XP
 * stub until the Player Profile Store task lands.
 */
@customElement("citizenship-card")
export class CitizenshipCard extends LitElement {
  @state() private profile: PlayerProfileView | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    flashist_waitGameInitComplete()
      .then(() => {
        this.maybeReportSeen();
        return this.refreshProfile();
      })
      .catch((error) => {
        console.warn("Failed to load profile for citizenship card:", error);
      });
  }

  private async refreshProfile(): Promise<void> {
    this.profile = await loadPlayerProfileView();
    this.requestUpdate();
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

  private isAuthDialogOpen = false;

  private async onLoginCtaTap() {
    if (this.isAuthDialogOpen) {
      return;
    }
    this.isAuthDialogOpen = true;
    try {
      FlashistFacade.instance.logUiTapEvent(
        flashistConstants.uiElementIds.citizenshipLoginToEarn,
      );
      this.dispatchEvent(
        new CustomEvent(CITIZENSHIP_LOGIN_REQUESTED_EVENT, {
          bubbles: true,
          composed: true,
        }),
      );
      const authorized = await FlashistFacade.instance.openYandexAuthDialog();
      if (authorized && this.isConnected) {
        await this.refreshProfile();
      }
    } finally {
      this.isAuthDialogOpen = false;
    }
  }

  render() {
    return this.profile === null
      ? this.renderGuest()
      : this.renderLoggedIn(this.profile);
  }

  private renderGuest() {
    return html`
      <div
        class="w-full flex items-center gap-3 p-3 rounded-[12px] bg-[#1c1c1e]/85"
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

  private renderLoggedIn(profile: PlayerProfileView) {
    const xpPercent = Math.min(
      100,
      Math.round((profile.xp / CITIZENSHIP_XP_THRESHOLD) * 100),
    );
    const barPercent = profile.isCitizen ? 100 : xpPercent;
    const flag = this.getPlayerFlag();
    return html`
      <div class="w-full py-[10px] px-3 rounded-[12px] bg-[#1c1c1e]/85">
        <div class="flex items-center gap-2.5">
          <div
            class="flex items-center justify-center w-[38px] h-[38px] rounded-lg shrink-0 text-[18px] overflow-hidden"
            style="background: linear-gradient(135deg, #1e40af, #7c3aed)"
            aria-hidden="true"
          >
            ${flag
              ? html`<img
                  src="/flags/${flag}.svg"
                  alt=""
                  class="w-full h-full object-contain"
                />`
              : "🏳️"}
          </div>
          <div class="flex-1 min-w-0 text-left">
            ${profile.isCitizen
              ? html`<div class="flex items-center gap-[5px] mb-0.5">
                  <img
                    src="${shieldIcon}"
                    width="13"
                    height="13"
                    class="shrink-0 opacity-60"
                    style="filter: brightness(10)"
                    alt=""
                    aria-hidden="true"
                  />
                  <span
                    class="text-[11px] font-semibold text-white/60 uppercase tracking-wider"
                  >
                    ${translateText("citizenship_card.citizen_badge")}
                  </span>
                </div>`
              : nothing}
            <div class="text-[14px] font-bold text-white truncate">
              ${profile.displayName}
            </div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-[10px] text-white/50 mb-0.5">
              ${translateText("citizenship_card.xp_label")}
            </div>
            <div class="text-[12px] font-bold text-white">
              ${profile.xp.toLocaleString()} /
              ${CITIZENSHIP_XP_THRESHOLD.toLocaleString()}
            </div>
          </div>
        </div>
        <div class="mt-2 h-[5px] rounded-[3px] bg-white/[0.12] overflow-hidden">
          <div
            id="citizenship-xp-bar-fill"
            class="h-full rounded-[3px] transition-[width] duration-[400ms] bg-gradient-to-r from-blue-600 to-blue-400"
            style="width: ${barPercent}%"
          ></div>
        </div>
      </div>
    `;
  }

  private getPlayerFlag(): string {
    try {
      return localStorage.getItem(FLAG_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  }
}
