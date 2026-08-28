import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import shieldIcon from "../../resources/images/ShieldIconWhite.svg";
import { runCitizenshipPurchase } from "./CitizenshipPurchase";
import { FLAG_STORAGE_KEY } from "./FlagInput";
import {
  cancelNameChangeRequest,
  submitNameChangeRequest,
} from "./NameChangeRequest";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashist_waitGameInitComplete,
  flashistConstants,
} from "./flashist/FlashistFacade";
import { PURCHASES_RECONCILED_EVENT } from "./PaymentsReconciliation";
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

  // Gated by the "citizenship_ui" Yandex experiment flag: the card renders
  // nothing (and fires no analytics) until the flag is confirmed enabled.
  // checkExperimentFlag returns true unconditionally when GAME_ENV === "dev".
  @state() private isEnabled = false;

  // Paid purchase flow (task 0018): non-blocking error line under the buy CTA.
  @state() private purchaseError = false;

  // Set the moment the SERVER confirms a paid grant. Forces the citizen
  // presentation even when the follow-up profile re-fetch fails — a stale buy
  // button after a committed grant invites a second real charge.
  @state() private paidGrantConfirmed = false;

  // Name change (task 0067). `nameEditing` is the only local UI state; the
  // pending / rejected states are read from the server profile, never latched
  // locally, so a decision made between page loads is always reflected.
  @state() private nameEditing = false;
  @state() private nameError: string | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    // Local absolute gate (task 0054): while citizenship is unlaunched the card
    // must not exist — this beats the degraded-mode carve-out and the dev
    // experiment-flag override below, and skips analytics and profile loads.
    if (!flashistConstants.features.CITIZENSHIP_CARD_ENABLED) {
      this.classList.add("hidden");
      return;
    }
    flashist_waitGameInitComplete()
      .then(async () => {
        // In degraded mode the experiment flag is unknowable (getFlags needs
        // the SDK, which is exactly what's missing), so the flag gate would
        // always hide the card in production — show the honest "couldn't
        // connect" state instead of a silently missing surface.
        const enabled =
          FlashistFacade.instance.isYandexDegraded() ||
          (await FlashistFacade.instance.isCitizenshipUiEnabled());
        if (!enabled) {
          // Collapse the host so the start screen keeps the design's rhythm
          // (an empty flex child would still create a container gap slot).
          this.classList.add("hidden");
          return;
        }
        this.classList.remove("hidden");
        this.isEnabled = true;
        // Reconciliation can grant an interrupted purchase AFTER the profile
        // was fetched — re-fetch on its signal so the card leaves State 2
        // instead of offering a second purchase (task 0018).
        window.addEventListener(
          PURCHASES_RECONCILED_EVENT,
          this.onPurchasesReconciled,
        );
        // The payments catalog can settle after this first render (it races
        // the platform-init deadline) — re-render on settle so a late 'ready'
        // reveals the buy CTA. Never resolves in a catalog-less session.
        void FlashistFacade.instance.whenPaymentsCatalogSettled().then(() => {
          if (this.isConnected) {
            this.requestUpdate();
          }
        });
        this.requestUpdate();
        await this.updateComplete;
        this.maybeReportSeen();
        return this.refreshProfile();
      })
      .catch((error) => {
        console.warn("Failed to load profile for citizenship card:", error);
      });
  }

  disconnectedCallback() {
    window.removeEventListener(
      PURCHASES_RECONCILED_EVENT,
      this.onPurchasesReconciled,
    );
    super.disconnectedCallback();
  }

  private readonly onPurchasesReconciled = (): void => {
    if (this.isEnabled) {
      void this.refreshProfile();
    }
  };

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
    if (!this.isEnabled) {
      return nothing;
    }
    return this.profile === null
      ? this.renderGuest()
      : this.renderLoggedIn(this.profile);
  }

  private renderGuest() {
    const isDegraded = FlashistFacade.instance.isYandexDegraded();
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
            ${translateText(
              isDegraded
                ? "citizenship_card.guest_subtitle_degraded"
                : "citizenship_card.guest_subtitle",
            )}
          </div>
        </div>
        ${FlashistFacade.instance.yaGamesAvailable && !isDegraded
          ? html`<button
              id="citizenship-login-button"
              class="shrink-0 px-3 py-[7px] rounded-lg text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
              @click=${this.onLoginCtaTap}
            >
              ${translateText("citizenship_card.login_cta")}
            </button>`
          : // With no Yandex context at all, or with the SDK failed/timed out
            // (degraded), openYandexAuthDialog() silently no-ops — a login
            // button would be dead, so show only the lock + subtitle.
            nothing}
      </div>
    `;
  }

  private renderLoggedIn(profile: PlayerProfileView) {
    // paidGrantConfirmed: server-confirmed paid grant whose profile re-fetch
    // hasn't landed (or failed) — present as citizen, never re-offer the CTA.
    const isCitizen = profile.isCitizen || this.paidGrantConfirmed;
    const xpPercent = Math.min(
      100,
      Math.round((profile.xp / CITIZENSHIP_XP_THRESHOLD) * 100),
    );
    const barPercent = isCitizen ? 100 : xpPercent;
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
            ${isCitizen
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
        ${isCitizen || !profile.isAuthoritative
          ? // Review R1: the CTA requires an AUTHORITATIVE non-citizen read.
            // A zero-state fallback also reports isCitizen: false — offering
            // a working buy button off it could double-charge a real citizen
            // whose profile read failed.
            nothing
          : this.renderBuyCta()}
        ${isCitizen && profile.isAuthoritative
          ? // The exact inverse of the buy-CTA gate: name change is the
            // citizens-only benefit. `isAuthoritative` is required for the same
            // reason it is there — a zero-state fallback knows neither the
            // citizenship nor the pending request, so acting on it would show a
            // citizens-only control to a non-citizen (whom the server would then
            // reject with 403) or hide a real pending request.
            this.renderNameChange(profile)
          : nothing}
      </div>
    `;
  }

  // ── Name change (task 0067, citizens only) ───────────────────────────────
  // Four states, all driven by the SERVER's name_change projection except the
  // local "editing" toggle: idle → editing → pending → (approved | rejected).
  private renderNameChange(profile: PlayerProfileView) {
    // `?? null` is defensive, not decorative: a view object built by an older
    // path (or a test stub) can omit the field entirely, and `undefined !== null`
    // would then walk straight into a property read on undefined.
    const request = profile.nameChange ?? null;
    if (request !== null && request.status === "pending") {
      return this.renderNamePending(request.requested_name);
    }
    if (this.nameEditing) {
      return this.renderNameEditor();
    }
    if (request !== null && request.status === "rejected") {
      return this.renderNameRejected(request.requested_name);
    }
    return html`
      <button
        id="citizenship-name-change-cta"
        class="mt-2 w-full px-3 py-[7px] rounded-lg text-[13px] font-bold text-white bg-white/10 hover:bg-white/20 transition-colors duration-200"
        @click=${this.onNameChangeCtaTap}
      >
        ${translateText("citizenship_name_change.cta")}
      </button>
    `;
  }

  private renderNameEditor() {
    return html`
      <div class="mt-2">
        <input
          id="citizenship-name-change-input"
          type="text"
          .value=${this.nameDraft}
          @input=${this.onNameDraftInput}
          placeholder="${translateText(
            "citizenship_name_change.input_placeholder",
          )}"
          class="w-full px-3 py-[7px] rounded-lg text-[13px] text-white bg-black/40 border border-white/15 placeholder:text-white/35 focus:outline-none focus:border-blue-500"
        />
        <div class="mt-1.5 flex gap-1.5">
          <button
            id="citizenship-name-change-submit"
            class="flex-1 px-3 py-[7px] rounded-lg text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            @click=${this.onNameSubmitTap}
          >
            ${translateText("citizenship_name_change.submit")}
          </button>
          <button
            id="citizenship-name-change-cancel-edit"
            class="px-3 py-[7px] rounded-lg text-[13px] font-bold text-white/70 bg-white/10 hover:bg-white/20 transition-colors duration-200"
            @click=${this.onNameEditCancelTap}
          >
            ${translateText("citizenship_name_change.cancel_edit")}
          </button>
        </div>
        ${this.renderNameError()}
      </div>
    `;
  }

  private renderNamePending(requestedName: string) {
    return html`
      <div class="mt-2 p-2 rounded-lg bg-white/[0.06]">
        <div class="text-[11px] font-semibold text-amber-300/90">
          ${translateText("citizenship_name_change.pending_label")}
        </div>
        <div class="mt-0.5 text-[11px] text-[#98989f] leading-[1.4]">
          ${translateText("citizenship_name_change.pending_hint", {
            name: requestedName,
          })}
        </div>
        <button
          id="citizenship-name-change-withdraw"
          class="mt-1.5 w-full px-3 py-[5px] rounded-lg text-[12px] font-bold text-white/70 bg-white/10 hover:bg-white/20 transition-colors duration-200"
          @click=${this.onNameWithdrawTap}
        >
          ${translateText("citizenship_name_change.cancel_request")}
        </button>
        ${this.renderNameError()}
      </div>
    `;
  }

  private renderNameRejected(requestedName: string) {
    return html`
      <div class="mt-2 p-2 rounded-lg bg-white/[0.06]">
        <div class="text-[11px] font-semibold text-red-400">
          ${translateText("citizenship_name_change.rejected_label")}
        </div>
        <div class="mt-0.5 text-[11px] text-[#98989f] leading-[1.4]">
          ${translateText("citizenship_name_change.rejected_hint", {
            name: requestedName,
          })}
        </div>
        <button
          id="citizenship-name-change-retry"
          class="mt-1.5 w-full px-3 py-[5px] rounded-lg text-[12px] font-bold text-white bg-white/10 hover:bg-white/20 transition-colors duration-200"
          @click=${this.onNameChangeCtaTap}
        >
          ${translateText("citizenship_name_change.try_again")}
        </button>
      </div>
    `;
  }

  private renderNameError() {
    return this.nameError === null
      ? nothing
      : html`<div
          id="citizenship-name-change-error"
          class="mt-1.5 text-[11px] text-red-400 text-center"
        >
          ${this.nameError}
        </div>`;
  }

  // Buy CTA (task 0018, State 2 only). Hidden ENTIRELY — never disabled —
  // unless the catalog is ready and carries the citizenship product; the
  // price string comes from the catalog, never hardcoded.
  private renderBuyCta() {
    const product = FlashistFacade.instance.getCatalogProduct("citizenship");
    if (product === null) {
      return nothing;
    }
    return html`
      <button
        id="citizenship-buy-button"
        class="mt-2 w-full px-3 py-[7px] rounded-lg text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
        @click=${this.onBuyCtaTap}
      >
        ${translateText("citizenship_paid.buy_cta")} — ${product.price}
      </button>
      ${this.purchaseError
        ? html`<div
            id="citizenship-purchase-error"
            class="mt-1.5 text-[11px] text-red-400 text-center"
          >
            ${translateText("citizenship_paid.purchase_error")}
          </div>`
        : nothing}
    `;
  }

  private isPurchaseInFlight = false;

  private async onBuyCtaTap() {
    if (this.isPurchaseInFlight) {
      return;
    }
    this.isPurchaseInFlight = true;
    this.purchaseError = false;
    // Explicit requestUpdate() after each state change — the codebase
    // convention (see connectedCallback / refreshProfile): the decorator
    // transform does not reliably schedule updates under the test build.
    this.requestUpdate();
    try {
      FlashistFacade.instance.logUiTapEvent(
        flashistConstants.uiElementIds.purchaseCitizenship,
      );
      const result = await runCitizenshipPurchase();
      if (!this.isConnected) {
        return;
      }
      if (result === "granted") {
        this.paidGrantConfirmed = true;
        this.requestUpdate();
        await this.refreshProfile();
      } else {
        this.purchaseError = true;
        this.requestUpdate();
      }
    } finally {
      this.isPurchaseInFlight = false;
    }
  }

  // Draft name. Deliberately a plain field, not @state(): it is bound into the
  // input with `.value` and re-rendering on every keystroke would move the
  // caret. Only the submit/cancel handlers read it.
  private nameDraft = "";
  private isNameRequestInFlight = false;

  private readonly onNameDraftInput = (event: Event): void => {
    this.nameDraft = (event.target as HTMLInputElement).value;
  };

  private readonly onNameChangeCtaTap = (): void => {
    this.nameDraft = "";
    this.nameError = null;
    this.nameEditing = true;
    // Explicit requestUpdate() after each state change — the codebase
    // convention (see onBuyCtaTap): the decorator transform does not reliably
    // schedule updates under the test build.
    this.requestUpdate();
  };

  private readonly onNameEditCancelTap = (): void => {
    this.nameEditing = false;
    this.nameError = null;
    this.requestUpdate();
  };

  private readonly onNameSubmitTap = async (): Promise<void> => {
    if (this.isNameRequestInFlight) {
      return;
    }
    this.isNameRequestInFlight = true;
    this.nameError = null;
    this.requestUpdate();
    try {
      const result = await submitNameChangeRequest(this.nameDraft.trim());
      if (!this.isConnected) {
        return;
      }
      if (result.status === "ok") {
        this.nameEditing = false;
        this.nameDraft = "";
        this.requestUpdate();
        // Re-read the profile so the pending state comes from the SERVER
        // rather than being latched locally. refreshProfile() — NOT a second
        // loadPlayerProfileView() caller, which would double-fire the
        // Citizenship:Earned:XP transition (the documented reason Inbox.ts
        // avoids it).
        await this.refreshProfile();
        return;
      }
      this.nameError = this.nameErrorMessage(result);
      this.requestUpdate();
    } finally {
      this.isNameRequestInFlight = false;
    }
  };

  private nameErrorMessage(
    result: Awaited<ReturnType<typeof submitNameChangeRequest>>,
  ): string {
    switch (result.status) {
      case "invalid":
        // The SAME message the in-game username input shows for that rule —
        // owner ruling (c): mirror the existing validator, no bespoke rules.
        return translateText(`username.${result.violation}`);
      case "name_taken":
        return translateText("citizenship_name_change.error_name_taken");
      case "pending_exists":
        return translateText("citizenship_name_change.error_pending_exists");
      case "not_citizen":
        return translateText("citizenship_name_change.error_not_citizen");
      default:
        return translateText("citizenship_name_change.error_generic");
    }
  }

  private readonly onNameWithdrawTap = async (): Promise<void> => {
    if (this.isNameRequestInFlight) {
      return;
    }
    this.isNameRequestInFlight = true;
    this.nameError = null;
    this.requestUpdate();
    try {
      const result = await cancelNameChangeRequest();
      if (!this.isConnected) {
        return;
      }
      if (result.status === "ok" || result.status === "no_pending") {
        // `no_pending` is treated as success on purpose: it means the request
        // is already gone (an operator decided it, or another tab withdrew
        // it). Re-reading the profile shows whatever is actually true now.
        await this.refreshProfile();
        return;
      }
      this.nameError = translateText(
        result.status === "not_citizen"
          ? "citizenship_name_change.error_not_citizen"
          : "citizenship_name_change.error_generic",
      );
      this.requestUpdate();
    } finally {
      this.isNameRequestInFlight = false;
    }
  };

  private getPlayerFlag(): string {
    try {
      return localStorage.getItem(FLAG_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  }
}
