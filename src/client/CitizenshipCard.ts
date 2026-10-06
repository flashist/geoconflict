import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import shieldIcon from "../../resources/images/ShieldIconWhite.svg";
import {
  MAX_USERNAME_LENGTH,
  usernameRuleErrorMessage,
  usernameRulesHint,
} from "../core/validations/username";
import { publishApprovedName } from "./ApprovedName";
import { openCitizenshipExplainer } from "./CitizenshipExplainer";
import {
  type CitizenshipNotice,
  deriveCitizenshipNotice,
  reportCitizenshipNoticeShown,
} from "./CitizenshipNotice";
import {
  CITIZENSHIP_OFFER_CHANGED_EVENT,
  type CitizenshipOffer,
  deriveCitizenshipOffer,
} from "./CitizenshipOffer";
import {
  type CitizenshipPurchaseResult,
  runCitizenshipPurchase,
} from "./CitizenshipPurchase";
import { dispatchCitizenshipGrantedMidSession } from "./CitizenshipRestartOffer";
import {
  deriveCitizenshipStatus,
  derivePaidCitizenship,
  deriveProfileVerificationStatus,
  getProfileVerificationStatus,
  isCurrentPlayerPaidCitizen,
  publishCitizenshipStatus,
  publishPaidCitizenship,
  publishProfileVerificationStatus,
} from "./CitizenshipStatus";
import { FLAG_STORAGE_KEY } from "./FlagInput";
import {
  cancelNameChangeRequest,
  dismissNameChangeRejection,
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
  restartAfterProfileReadFailure,
  wasRestartedAfterProfileReadFailure,
} from "./ProfileReadRestart";
import { isOnStartScreen, whenOnStartScreen } from "./StartScreenPresence";
import { maybeClaimTenureGrant } from "./TenureGrantClaim";
import type {
  TenureGrantModal,
  TenureGrantModalParams,
} from "./TenureGrantModal";
import {
  CITIZENSHIP_XP_THRESHOLD,
  PlayerProfileView,
  loadPlayerProfileView,
} from "./PlayerProfileView";
import { translateText } from "./Utils";

export const CITIZENSHIP_LOGIN_REQUESTED_EVENT = "citizenship-login-requested";

/**
 * Dispatched (bubbling, composed) only after the Yandex auth dialog reported
 * SUCCESS from a player's own tap on the guest card's login button. `Client` in
 * Main.ts listens and restarts the page so the whole start sequence re-runs with
 * the player logged in (task 0273, owner ruling D3). A cancelled dialog does not
 * dispatch it.
 */
export const CITIZENSHIP_LOGIN_SUCCEEDED_EVENT = "citizenship-login-succeeded";

/**
 * `fallback` is what the card wants done when the restart is REFUSED (mid-match,
 * or already restarted once this load): re-read the profile, which is exactly
 * what the card did before this task. Carried on the event so the listener needs
 * no reference to the card.
 */
export interface CitizenshipLoginSucceededDetail {
  fallback: () => void;
}

// Citizenship:Seen must fire at most once per page load, no matter how many
// times the card re-renders or reconnects.
let citizenshipSeenReported = false;

export function resetCitizenshipSeenReportedForTests(): void {
  citizenshipSeenReported = false;
}

/**
 * Citizenship card on the start screen (s4-start-screen-redesign-impl +
 * s4-citizenship-xp-progress-ui). Renders one of four states from the
 * player profile view:
 *   checking (no read applied yet, task 0397) — one quiet line, no login CTA,
 *   guest (not Yandex-authorized) — lock + login CTA,
 *   authorized non-citizen — name + XP progress toward the threshold,
 *   citizen — adds the CITIZEN badge, bar full.
 * The logged-in states can carry one session status line under the XP bar
 * (task 0397, CitizenshipNotice.ts): "verified, paid benefits on", "not
 * confirmed" for an unverified citizen, or "couldn't load" with a player-pressed
 * Restart game button (and its "still not working" variant).
 * XP/citizenship values come from PlayerProfileView.
 *
 * Task 0301: the card is the only owner of purchase state. The "What is
 * citizenship?" explainer popup asks it what may be offered
 * (getCitizenshipOffer) and buys or logs in through it (buyCitizenship /
 * logIn), so both surfaces share one rule, one latch and one end state.
 */
@customElement("citizenship-card")
export class CitizenshipCard extends LitElement {
  @state() private profile: PlayerProfileView | null = null;

  // Gated by the "citizenship_ui" Yandex experiment flag: the card renders
  // nothing (and fires no analytics) until the flag is confirmed enabled.
  // checkExperimentFlag returns true unconditionally when GAME_ENV === "dev".
  // Task 0329: a card hidden by the flag check re-checks it once if the Yandex
  // platform recovers late (recheckWhenPlatformRecovers).
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
    // Task 0397 (review R1): consume the Restart game marker on every load,
    // whatever the card's state. A card killed or hidden on this load must not
    // leave it in sessionStorage for an unrelated failed read many loads later.
    // The answer is memoized per page, so a late 0329 reveal still sees it.
    wasRestartedAfterProfileReadFailure(this.sessionStorageOrNull());
    // Local absolute gate (task 0054): while citizenship is unlaunched the card
    // must not exist — this beats the dev experiment-flag override below, and
    // skips analytics and profile loads.
    if (!flashistConstants.features.CITIZENSHIP_CARD_ENABLED) {
      this.classList.add("hidden");
      return;
    }
    flashist_waitGameInitComplete()
      .then(async () => {
        const enabled = await FlashistFacade.instance.isCitizenshipUiEnabled();
        if (!enabled) {
          // Collapse the host so the start screen keeps the design's rhythm
          // (an empty flex child would still create a container gap slot).
          this.classList.add("hidden");
          this.recheckWhenPlatformRecovers();
          return;
        }
        await this.revealCard();
      })
      .catch((error) => {
        console.warn("Failed to load profile for citizenship card:", error);
      });
  }

  disconnectedCallback() {
    // Task 0329: a recovery waiter from this connection must do nothing.
    this.connectionGeneration++;
    window.removeEventListener(
      PURCHASES_RECONCILED_EVENT,
      this.onPurchasesReconciled,
    );
    super.disconnectedCallback();
  }

  // Bumped on every disconnect; a promise cannot be unsubscribed, so a waiter
  // compares the generation it started in (task 0329).
  private connectionGeneration = 0;

  /**
   * The one path that shows the card — from the first flag check at the gate,
   * and from the re-check after a late platform recovery (task 0329).
   */
  private async revealCard(): Promise<void> {
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
    // Task 0397 (0278): subscribed before this reveal's own read is issued.
    this.rereadWhenYandexAuthorizesLate();
    this.requestUpdate();
    await this.updateComplete;
    this.maybeReportSeen();
    await this.refreshProfile();
    this.startTenureClaim();
  }

  /**
   * Task 0397 (0278 folded in): the Yandex player can turn out to be logged in
   * only AFTER the card's read said guest — a boot getPlayer() that landed past
   * the platform-init deadline, or a late-SDK player recovery. Nothing latched
   * in that read (ProfileSession only latches a FAILED login), so reading again
   * logs in. The card shows "checking" meanwhile, never a login button to a
   * logged-in player, and ends in a real state — or "couldn't load" with its
   * Restart game button if that login fails.
   *
   * Guarded by the connection generation like recheckWhenPlatformRecovers().
   * A signal that lands before this reveal's own read is issued does nothing:
   * that read already sees the login (and a hidden card's 0329 reveal does its
   * own read), so there is never a second read for it.
   */
  private rereadWhenYandexAuthorizesLate(): void {
    const generation = this.connectionGeneration;
    const readsIssuedBeforeReveal = this.profileReadsIssued;
    void FlashistFacade.instance
      .whenYandexAuthorizedLate()
      .then(() => {
        if (
          generation !== this.connectionGeneration ||
          !this.isConnected ||
          !this.isEnabled ||
          this.profileReadsIssued === readsIssuedBeforeReveal
        ) {
          return;
        }
        publishProfileVerificationStatus("unknown");
        this.requestUpdate();
        // The single read path — never a second loadPlayerProfileView() caller.
        void this.refreshProfile();
      })
      .catch((error) => {
        console.warn(
          "Failed to re-read the citizenship card after a late Yandex login:",
          error,
        );
      });
  }

  /**
   * Task 0329: the flag check hid the card. On a degraded boot the flags may
   * simply have been missing, so wait for the facade's late-recovery signal
   * (fires at most once per page, never on a healthy boot) and ask the flag
   * again. Reveals only on a real `enabled` — a flag that is really off keeps
   * the card hidden, so 0291's fail-closed rule holds. Subscribes whenever the
   * card hides (owner ruling Q1, 2026-09-28): asking the facade "were the flags
   * missing?" afterwards would race the recovery itself.
   *
   * The recovery can land after the player joined a lobby or match, so the
   * reveal waits for the start screen (review R1): its tenure gift popup must
   * never cover a live match, and Citizenship:Seen fires only once the card can
   * be seen. The gate reveal needs no wait for the card itself; its gift popup
   * waits for the start screen in startTenureClaim (task 0336), as this one's
   * does.
   */
  private recheckWhenPlatformRecovers(): void {
    const generation = this.connectionGeneration;
    const isStillWanted = () =>
      generation === this.connectionGeneration &&
      this.isConnected &&
      !this.isEnabled;
    void FlashistFacade.instance
      .whenPlatformRecoveredLate()
      .then(async () => {
        if (!isStillWanted()) {
          return;
        }
        const enabled = await FlashistFacade.instance.isCitizenshipUiEnabled();
        if (!enabled || !isStillWanted()) {
          return;
        }
        await whenOnStartScreen();
        if (!isStillWanted()) {
          return;
        }
        await this.revealCard();
      })
      .catch((error) => {
        console.warn(
          "Failed to re-check the citizenship card after platform recovery:",
          error,
        );
      });
  }

  private readonly onPurchasesReconciled = (): void => {
    if (this.isEnabled) {
      void this.refreshProfile();
    }
  };

  // Task 0326: profile reads can overlap (first read vs reconciliation, tenure,
  // purchase, name change, login fallback). Each read takes a number; a read that
  // lands after a NEWER read has already been applied is dropped, so a slow stale
  // answer can never overwrite a fresher one. The read itself still runs: the
  // guard only decides whether its result is applied.
  private profileReadsIssued = 0;
  private newestAppliedProfileRead = 0;

  private async refreshProfile(): Promise<void> {
    const readNumber = ++this.profileReadsIssued;
    const profile = await loadPlayerProfileView();
    if (readNumber < this.newestAppliedProfileRead) {
      return; // superseded: settle normally, apply nothing
    }
    this.newestAppliedProfileRead = readNumber;
    this.profile = profile;
    this.publishCitizenshipStatus();
    // Task 0248: the interstitial-ad gate reads this. Every applied read
    // republishes it — a failed read publishes false, so ads come back (fail
    // open). Verified paid reads only; `paidGrantConfirmed` is deliberately not
    // used here (ADR-116 Decision 4): the post-purchase re-read carries it.
    publishPaidCitizenship(derivePaidCitizenship(profile));
    // Task 0397: the session status line reads this (display-only).
    publishProfileVerificationStatus(deriveProfileVerificationStatus(profile));
    reportCitizenshipNoticeShown(this.currentNotice());
    this.publishApprovedName();
    this.requestUpdate();
  }

  /**
   * Task 0397: which status line the card shows now. Paid comes from
   * `isCurrentPlayerPaidCitizen()` — the same published value the 0248 ad gate
   * reads, never a second source.
   */
  private currentNotice(): CitizenshipNotice {
    return deriveCitizenshipNotice({
      verificationStatus: getProfileVerificationStatus(),
      isCitizen: this.isCitizenNow(),
      isPaidCitizen: isCurrentPlayerPaidCitizen(),
      restartedAfterReadFailure: wasRestartedAfterProfileReadFailure(
        this.sessionStorageOrNull(),
      ),
    });
  }

  // sessionStorage can throw on access inside an iframe with blocked storage.
  private sessionStorageOrNull(): Storage | null {
    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  }

  private isCitizenNow(): boolean {
    return (
      deriveCitizenshipStatus(this.profile, this.paidGrantConfirmed) ===
      "citizen"
    );
  }

  // Task 0302: the card is the page's only citizenship reader, so perk locks
  // (the private-lobby row) follow what it publishes here.
  private publishCitizenshipStatus(): void {
    publishCitizenshipStatus(
      deriveCitizenshipStatus(this.profile, this.paidGrantConfirmed),
    );
  }

  // Task 0321: the start-screen name box locks to the approved name this
  // publishes — the card stays the page's only profile reader. Only an
  // AUTHORITATIVE read publishes (owner ruling Q1, 2026-09-28: a non-null
  // display_name locks, regardless of citizen status). A guest, a failed read
  // or a timeout publishes nothing, so the last good answer stands: a failed
  // read never locks the box, and never unlocks it mid-load either.
  private publishApprovedName(): void {
    const profile = this.profile;
    if (profile === null || !profile.isAuthoritative) {
      return;
    }
    // `?? null`: a view built by an older path (or a test stub) can omit it.
    const approvedName = profile.approvedName ?? null;
    publishApprovedName(
      approvedName === null
        ? { kind: "none" }
        : { kind: "approved", name: approvedName },
    );
  }

  /**
   * The one-time tenure XP grant (task 0253). Only reachable from the enabled
   * path of connectedCallback — behind CITIZENSHIP_CARD_ENABLED and the
   * citizenship_ui flag — after the first profile read. Fire-and-forget: the
   * card never waits on it. TenureGrantClaim decides everything else (login
   * outcome, once per load) and never throws.
   *
   * The popup opens ONLY on `granted` with XP > 0. The profile is re-read with
   * refreshProfile(), never a second loadPlayerProfileView() caller, so
   * `Citizenship:Earned:XP` cannot double-fire.
   *
   * Task 0303 (owner ruling Q-A, 2026-09-28): a gift that MADE the player a
   * citizen also offers the "restart to apply" popup, once the thank-you popup
   * is closed. The server's answer cannot say so (every citizen reads XP 100),
   * so the card compares its own status before the claim and after the re-read.
   * A failed re-read reads as not-citizen, so it offers nothing.
   *
   * Task 0326: if a newer read was applied before this re-read lands, the
   * re-read is dropped and the check below sees that newer read instead.
   */
  private startTenureClaim(): void {
    void (async () => {
      const wasCitizen = this.isCitizenNow();
      const result = await maybeClaimTenureGrant();
      if (
        result.status !== "granted" ||
        result.xpAwarded <= 0 ||
        !this.isConnected
      ) {
        return;
      }
      // Task 0336: never over a lobby or match — held until the start screen.
      const thankYouClosed = this.showTenureThankYouOnStartScreen({
        xpAwarded: result.xpAwarded,
        xp: result.xp,
      });
      // So the XP bar shows the granted total. Not held back with the popup:
      // the status and XP publish at once.
      await this.refreshProfile();
      if (wasCitizen || !this.isCitizenNow()) {
        return;
      }
      await thankYouClosed;
      dispatchCitizenshipGrantedMidSession("tenure");
    })().catch((error) => {
      console.warn("Tenure grant claim failed:", error);
    });
  }

  /**
   * Task 0336: the thank-you popup waits for the start screen, so it never
   * opens over a lobby or match (a join counts as away from its first line).
   * Resolves when the player closes the thank-you, or at once if it cannot be
   * shown (no modal in the page / card gone). Never resolves if the popup is
   * open when a match starts: the pre-start close drops the follow-up. Usually
   * the page reloads after the match, which makes that moot; an in-page
   * Back/hash leave does not reload, and the restart follow-up is lost
   * (accepted residual, 0336 review R2 — as 0303's onMatchStarting drop). A
   * popup still held back when a match starts shows on that leave instead.
   */
  private async showTenureThankYouOnStartScreen(
    params: TenureGrantModalParams,
  ): Promise<void> {
    await whenOnStartScreen();
    const modal =
      document.querySelector<TenureGrantModal>("tenure-grant-modal");
    if (modal === null || !this.isConnected) {
      return;
    }
    await new Promise<void>((resolve) => modal.show(params, resolve));
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

  /**
   * Task 0301: what a citizenship surface may offer right now — the card's own
   * render and the explainer popup both read this. `checking` until the card
   * has been revealed.
   */
  public getCitizenshipOffer(): CitizenshipOffer {
    const facade = FlashistFacade.instance;
    const product = this.isEnabled
      ? facade.getCatalogProduct("citizenship")
      : null;
    return deriveCitizenshipOffer({
      isRevealed: this.isEnabled,
      isChecking: this.isEnabled && this.currentNotice() === "checking",
      profile: this.profile,
      paidGrantConfirmed: this.paidGrantConfirmed,
      canLogIn: facade.yaGamesAvailable && !facade.isYandexDegraded(),
      productPrice: product === null ? null : product.price,
    });
  }

  // Task 0301: an open explainer popup re-reads the offer after every update.
  protected updated(changedProperties: Map<PropertyKey, unknown>): void {
    super.updated(changedProperties);
    window.dispatchEvent(new CustomEvent(CITIZENSHIP_OFFER_CHANGED_EVENT));
  }

  private isAuthDialogOpen = false;

  private readonly onLoginCtaTap = (): void => {
    void this.logIn(flashistConstants.uiElementIds.citizenshipLoginToEarn);
  };

  /**
   * The guest login (task 0301: shared with the explainer popup, which passes
   * its own tap id). The login events still bubble from the card, so Main.ts's
   * listener on `document` hears both.
   */
  public async logIn(tapElementId: string): Promise<void> {
    if (this.isAuthDialogOpen) {
      return;
    }
    this.isAuthDialogOpen = true;
    try {
      FlashistFacade.instance.logUiTapEvent(tapElementId);
      this.dispatchEvent(
        new CustomEvent(CITIZENSHIP_LOGIN_REQUESTED_EVENT, {
          bubbles: true,
          composed: true,
        }),
      );
      const authorized = await FlashistFacade.instance.openYandexAuthDialog();
      if (!authorized) {
        // Dialog closed, authorization failed, or no SDK — the player is still a
        // guest and nothing restarts.
        flashist_logEventAnalytics(
          flashistConstants.analyticEvents.PROFILE_LOGIN_RESTART_CANCELLED,
        );
        return;
      }
      if (!this.isConnected) {
        return;
      }
      // The login happened mid-page-load, so nothing has a session token: the
      // boot login either never ran (guest) or ran as a guest. Ask for a full
      // restart; Main.ts decides whether it is safe, and falls back to a profile
      // re-read when it is not (mid-match, or already restarted once).
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.PROFILE_LOGIN_RESTART_REQUESTED,
      );
      this.dispatchEvent(
        new CustomEvent<CitizenshipLoginSucceededDetail>(
          CITIZENSHIP_LOGIN_SUCCEEDED_EVENT,
          {
            bubbles: true,
            composed: true,
            detail: { fallback: () => void this.refreshProfile() },
          },
        ),
      );
    } finally {
      this.isAuthDialogOpen = false;
    }
  }

  render() {
    if (!this.isEnabled) {
      return nothing;
    }
    const offer = this.getCitizenshipOffer();
    if (offer.kind === "checking") {
      return this.renderChecking();
    }
    // `guest` is exactly "no profile" (CitizenshipOffer.ts); the null check
    // only narrows the type.
    if (offer.kind === "guest" || this.profile === null) {
      return this.renderGuest(offer.kind === "guest" && offer.canLogIn);
    }
    return this.renderLoggedIn(this.profile, offer);
  }

  // Task 0301 (owner ruling Q2, 2026-10-06): in every state but "checking".
  private renderExplainerLink() {
    return html`<button
      id="citizenship-explainer-link"
      class="mt-2 block text-left text-[11px] text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors duration-200"
      @click=${this.onExplainerLinkTap}
    >
      ${translateText("citizenship_explainer.link")}
    </button>`;
  }

  private readonly onExplainerLinkTap = (): void => {
    openCitizenshipExplainer({ source: "CardLink" });
  };

  // Task 0397: before the first read lands (and during the re-read after a late
  // Yandex login). Replaces the guest card, whose login button would be wrong
  // for a logged-in player. Quiet tone: this is the normal moment, not an error.
  private renderChecking() {
    return html`
      <div
        class="w-full flex items-center gap-3 p-3 rounded-[12px] bg-[#1c1c1e]/85"
      >
        <div
          id="citizenship-status-checking"
          class="flex-1 min-w-0 text-left text-[11px] text-[#98989f] leading-[1.4]"
        >
          ${translateText("citizenship_status.checking")}
        </div>
      </div>
    `;
  }

  private renderGuest(canLogIn: boolean) {
    const isDegraded = FlashistFacade.instance.isYandexDegraded();
    return html`
      <div class="w-full p-3 rounded-[12px] bg-[#1c1c1e]/85">
        <div class="flex items-center gap-3">
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
          ${canLogIn
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
        ${this.renderExplainerLink()}
      </div>
    `;
  }

  private renderLoggedIn(profile: PlayerProfileView, offer: CitizenshipOffer) {
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
        ${this.renderStatusNotice()}
        ${offer.kind === "buy"
          ? // Review R1: the CTA requires an AUTHORITATIVE non-citizen read.
            // A zero-state fallback also reports isCitizen: false — offering
            // a working buy button off it could double-charge a real citizen
            // whose profile read failed. The rule lives in CitizenshipOffer.ts
            // (task 0301), shared with the explainer popup.
            this.renderBuyCta(offer.price)
          : nothing}
        ${isCitizen && profile.isAuthoritative
          ? // The exact inverse of the buy-CTA gate: name change is the
            // citizens-only benefit. `isAuthoritative` is required for the same
            // reason it is there — a zero-state fallback knows neither the
            // citizenship nor the pending request, so acting on it would show a
            // citizens-only control to a non-citizen (whom the server would then
            // reject with 403) or hide a real pending request.
            this.renderNameChange(profile)
          : nothing}
        ${this.renderExplainerLink()}
      </div>
    `;
  }

  // Task 0397: the session status line (CitizenshipNotice.ts). Only the
  // couldn't-load notice gets a button (owner ruling Q3); "not confirmed" is
  // text advice only, because a reload does not usually fix it (ADR-121).
  private renderStatusNotice() {
    const notice = this.currentNotice();
    if (notice === "verified_paid") {
      return this.renderStatusLine("citizenship_status.verified_paid");
    }
    if (notice === "unverified") {
      return this.renderStatusLine("citizenship_status.unverified");
    }
    if (notice === "read_failed" || notice === "still_failing") {
      return this.renderStatusLine(
        notice === "read_failed"
          ? "citizenship_status.read_failed"
          : "citizenship_status.still_failing",
        html`<button
          id="citizenship-status-restart"
          class="mt-1.5 w-full px-3 py-[5px] rounded-lg text-[12px] font-bold text-white bg-white/10 hover:bg-white/20 transition-colors duration-200"
          @click=${this.onStatusRestartTap}
        >
          ${translateText("citizenship_status.restart")}
        </button>`,
      );
    }
    return nothing;
  }

  private renderStatusLine(
    textKey: string,
    action: ReturnType<typeof html> | typeof nothing = nothing,
  ) {
    return html`
      <div
        id="citizenship-status-notice"
        class="mt-2 p-2 rounded-lg bg-white/[0.06]"
      >
        <div class="text-[11px] text-[#98989f] leading-[1.4]">
          ${translateText(textKey)}
        </div>
        ${action}
      </div>
    `;
  }

  // Set once the page is reloading, so a second tap before it unloads does
  // nothing. A refused press (lobby, join or match) leaves the button working.
  private isStatusRestartInFlight = false;

  private readonly onStatusRestartTap = (): void => {
    if (this.isStatusRestartInFlight) {
      return;
    }
    this.isStatusRestartInFlight = restartAfterProfileReadFailure({
      isOnStartScreen,
      reload: () => FlashistFacade.instance.reloadApp(),
      storage: this.sessionStorageOrNull(),
    });
  };

  // ── Name change (task 0067, citizens only) ───────────────────────────────
  // Four states, all driven by the SERVER's name_change projection except the
  // local "editing" toggle: idle → editing → pending → (approved | rejected).
  // A decline the player hid, or a name an operator cleared, comes back from the
  // server as no request at all, i.e. idle (task 0314).
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
          maxlength="${MAX_USERNAME_LENGTH}"
          placeholder="${translateText(
            "citizenship_name_change.input_placeholder",
          )}"
          class="w-full px-3 py-[7px] rounded-lg text-[13px] text-white bg-black/40 border border-white/15 placeholder:text-white/35 focus:outline-none focus:border-blue-500"
        />
        ${this.nameError === null
          ? html`<div
              id="citizenship-name-change-rules-hint"
              class="mt-1 text-[11px] text-[#98989f] leading-[1.4]"
            >
              ${usernameRulesHint()}
            </div>`
          : nothing}
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
        <div class="mt-1.5 flex gap-1.5">
          <button
            id="citizenship-name-change-retry"
            class="flex-1 px-3 py-[5px] rounded-lg text-[12px] font-bold text-white bg-white/10 hover:bg-white/20 transition-colors duration-200"
            @click=${this.onNameChangeCtaTap}
          >
            ${translateText("citizenship_name_change.try_again")}
          </button>
          <button
            id="citizenship-name-change-dismiss"
            class="px-3 py-[5px] rounded-lg text-[12px] font-bold text-white/70 bg-white/10 hover:bg-white/20 transition-colors duration-200"
            @click=${this.onNameRejectionDismissTap}
          >
            ${translateText("citizenship_name_change.dismiss")}
          </button>
        </div>
        ${this.renderNameError()}
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
  private renderBuyCta(price: string) {
    return html`
      <button
        id="citizenship-buy-button"
        class="mt-2 w-full px-3 py-[7px] rounded-lg text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
        @click=${this.onBuyCtaTap}
      >
        ${translateText("citizenship_paid.buy_cta")} — ${price}
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

  private readonly onBuyCtaTap = (): void => {
    void this.buyCitizenship(
      flashistConstants.uiElementIds.purchaseCitizenship,
    );
  };

  /**
   * The paid purchase (task 0018). Task 0301: shared with the explainer popup,
   * which passes its own tap id. One in-flight latch for both, so a card tap
   * and a popup tap can never start two purchases — the second answers
   * `"busy"`. Either way the card ends in the same state.
   */
  public async buyCitizenship(
    tapElementId: string,
  ): Promise<CitizenshipPurchaseResult | "busy"> {
    if (this.isPurchaseInFlight) {
      return "busy";
    }
    this.isPurchaseInFlight = true;
    this.purchaseError = false;
    // Explicit requestUpdate() after each state change — the codebase
    // convention (see connectedCallback / refreshProfile): the decorator
    // transform does not reliably schedule updates under the test build.
    this.requestUpdate();
    try {
      FlashistFacade.instance.logUiTapEvent(tapElementId);
      const result = await runCitizenshipPurchase();
      if (!this.isConnected) {
        return result;
      }
      if (result === "granted") {
        this.paidGrantConfirmed = true;
        this.publishCitizenshipStatus();
        this.requestUpdate();
        await this.refreshProfile();
      } else {
        this.purchaseError = true;
        this.requestUpdate();
      }
      return result;
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
        // Through the shared helper, so {min}/{max} are filled in (the raw
        // "{max}" used to show here) and the full rule follows (task 0307).
        return usernameRuleErrorMessage(result.violation);
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

  // Hide a declined notice (task 0314). The server remembers it — nothing is
  // stored on the device — and the card re-reads the profile, so the idle state
  // comes from the server like every other name-change state.
  private readonly onNameRejectionDismissTap = async (): Promise<void> => {
    if (this.isNameRequestInFlight) {
      return;
    }
    this.isNameRequestInFlight = true;
    this.nameError = null;
    this.requestUpdate();
    try {
      const result = await dismissNameChangeRejection();
      if (!this.isConnected) {
        return;
      }
      if (result.status === "ok") {
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
