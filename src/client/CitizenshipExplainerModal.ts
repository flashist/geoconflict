import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { CITIZENSHIP_XP_THRESHOLD } from "../core/profile/Citizenship";
import type { CitizenshipCard } from "./CitizenshipCard";
import type { CitizenshipExplainerSource } from "./CitizenshipExplainer";
import {
  CITIZENSHIP_OFFER_CHANGED_EVENT,
  type CitizenshipOffer,
} from "./CitizenshipOffer";
import {
  CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
  type CitizenshipGrantedMidSessionDetail,
} from "./CitizenshipRestartOffer";
import { darkScrollbarStyles } from "./components/baseComponents/DarkScrollbarStyles";
import {
  FlashistFacade,
  flashistConstants,
  TELEGRAM_CHANNEL_URL,
  VK_CHANNEL_URL,
} from "./flashist/FlashistFacade";
import { isPrivateLobbyRowEnabled } from "./PrivateLobbyAccess";
import { getProductClientConfig } from "./ProductClientConfig";
import { restartAfterProfileReadFailure } from "./ProfileReadRestart";
import {
  getPurchaseCoordinator,
  PURCHASE_FLOW_STATE_EVENT,
  PURCHASE_GRANTED_EVENT,
  type PurchaseFlowState,
  type PurchaseFlowStateDetail,
  type PurchaseGrantedDetail,
} from "./PurchaseCoordinator";
import { isOnStartScreen } from "./StartScreenPresence";
import { translateText } from "./Utils";

/**
 * "What is citizenship?" (task 0301): what citizenship is, what it gives, how
 * to get it free, and a Buy button. Opened only through
 * openCitizenshipExplainer() (CitizenshipExplainer.ts) — from the card's link,
 * the Instructions section, or a locked-perk tap. Follows GameStartingModal.
 *
 * The popup owns no purchase state. The citizenship card is the page's only
 * profile reader and the only owner of the purchase: the popup asks it what
 * may be offered (getCitizenshipOffer) and buys or logs in through it, so the
 * buy rule exists once and the card ends in the same state either way.
 *
 * The benefit list names only what is built (owner ruling Q4, 2026-10-06). A
 * perk adds its line in the task that ships it. Paid-only perks sit under their
 * own sub-heading (task 0408).
 *
 * An earned citizen whose verified read says "not paid" gets a Buy button at
 * the bottom, above Close (task 0409) — the card's `citizen_buy` offer.
 *
 * A guest gets "Log in and buy" (task 0495, ADR-125): the page's purchase
 * coordinator logs them in and goes on to the purchase with no reload. While
 * that flow runs, the action area shows the flow's state, not the offer.
 */
@customElement("citizenship-explainer-modal")
export class CitizenshipExplainerModal extends LitElement {
  @state()
  isVisible = false;

  // Owner ruling Q3 (2026-10-06): only for a player who can see the Create
  // Lobby button — the row's own rule, read once per show().
  @state()
  private showPrivateLobbyLine = false;

  // The error line under the popup's OWN Buy button, for its own tap only — a
  // stale card error never shows in a freshly opened popup.
  @state()
  private purchaseError = false;

  // A "Log in and buy" was tapped in this showing of the popup.
  @state()
  private isGuestFlowFromThisPopup = false;

  // Bumped by close(), so a show() still awaiting its checks does not open a
  // popup that was closed meanwhile (e.g. by a match start).
  private showGeneration = 0;

  // The game's dark scrollbar (task 0417's look; shared since task 0423 —
  // see DarkScrollbarStyles.ts for why it is copied into shadow roots).
  static styles = [
    darkScrollbarStyles,
    css`
      .modal-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.5);
        /* Above the Instructions o-modal (9999), which stays open underneath. */
        z-index: 10000;
        align-items: center;
        justify-content: center;
      }

      .modal-overlay.visible {
        display: flex;
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .modal-box {
        background-color: rgba(28, 28, 30, 0.95);
        padding: 24px;
        border-radius: 12px;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        color: white;
        /* Task 0417: grows with the screen up to a comfortable reading width. */
        width: 600px;
        max-width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
        box-sizing: border-box;
        text-align: left;
      }

      .modal-box h2 {
        margin: 0 0 12px;
        font-size: 20px;
        font-weight: bold;
        text-align: center;
      }

      .modal-box h3 {
        margin: 16px 0 6px;
        font-size: 15px;
        font-weight: bold;
      }

      .modal-box h4 {
        margin: 4px 0 6px;
        font-size: 13px;
        font-weight: bold;
        color: rgba(255, 255, 255, 0.85);
      }

      .modal-box p,
      .modal-box li {
        margin: 0 0 8px;
        font-size: 14px;
        line-height: 1.45;
        color: rgba(255, 255, 255, 0.85);
      }

      .modal-box ul {
        margin: 0;
        padding-left: 20px;
      }

      .modal-box .muted {
        color: #98989f;
        font-size: 13px;
      }

      .modal-box .error {
        margin: 6px 0 0;
        color: #f87171;
        font-size: 12px;
        text-align: center;
      }

      .modal-box button {
        width: 100%;
        padding: 12px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        color: white;
        border: none;
        border-radius: 8px;
        transition: background-color 0.2s ease;
      }

      .modal-box .primary-btn {
        background: #2563eb;
      }

      .modal-box .primary-btn:hover {
        background: #1d4ed8;
      }

      .modal-box .secondary-btn {
        margin-top: 8px;
        background: rgba(255, 255, 255, 0.1);
      }

      .modal-box .secondary-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .modal-box .contact-link {
        display: block;
        margin-top: 8px;
        padding: 12px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 16px;
        font-weight: bold;
        text-align: center;
        text-decoration: none;
        transition: background-color 0.2s ease;
      }

      .modal-box .contact-link:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .modal-box .close-btn {
        margin-top: 16px;
        background: rgba(255, 255, 255, 0.1);
      }

      .modal-box .close-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(
      CITIZENSHIP_OFFER_CHANGED_EVENT,
      this.onOfferChanged,
    );
    window.addEventListener(
      CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
      this.onGrantedMidSession,
    );
    window.addEventListener(PURCHASE_FLOW_STATE_EVENT, this.onFlowState);
    window.addEventListener(PURCHASE_GRANTED_EVENT, this.onPurchaseGranted);
  }

  disconnectedCallback() {
    window.removeEventListener(PURCHASE_FLOW_STATE_EVENT, this.onFlowState);
    window.removeEventListener(PURCHASE_GRANTED_EVENT, this.onPurchaseGranted);
    window.removeEventListener(
      CITIZENSHIP_OFFER_CHANGED_EVENT,
      this.onOfferChanged,
    );
    window.removeEventListener(
      CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
      this.onGrantedMidSession,
    );
    super.disconnectedCallback();
  }

  // The card's profile read or the payments catalog landed while open.
  private readonly onOfferChanged = (): void => {
    if (this.isVisible) {
      this.requestUpdate();
    }
  };

  // A confirmed purchase (or the tenure gift) made the player a citizen: get
  // out of the way of 0303's "restart to apply" popup at once. Another
  // product's purchase leaves this popup alone.
  private readonly onGrantedMidSession = (event: Event): void => {
    const detail = (event as CustomEvent<CitizenshipGrantedMidSessionDetail>)
      .detail;
    if (
      detail?.source === "purchase" &&
      detail.productId !== undefined &&
      detail.productId !== "citizenship"
    ) {
      return;
    }
    if (this.isVisible) {
      this.close();
    }
  };

  private readonly onPurchaseGranted = (event: Event): void => {
    const detail = (event as CustomEvent<PurchaseGrantedDetail>).detail;
    if (detail?.productId === "citizenship" && this.isVisible) {
      this.close();
    }
  };

  private readonly onFlowState = (event: Event): void => {
    const detail = (event as CustomEvent<PurchaseFlowStateDetail>).detail;
    if (detail?.productId === "citizenship" && this.isVisible) {
      this.requestUpdate();
    }
  };

  /**
   * Does nothing while the citizenship surfaces are off (kill switch, task
   * 0236): a player who cannot see citizenship must never be told about it.
   * `Citizenship:Explainer:Opened:*` fires only when the popup really opens.
   */
  async show(source: CitizenshipExplainerSource): Promise<void> {
    const generation = ++this.showGeneration;
    let isSurfacesEnabled = false;
    try {
      isSurfacesEnabled =
        await FlashistFacade.instance.isCitizenshipSurfacesEnabled();
    } catch (error) {
      // Fail closed: the popup stays shut.
      console.warn("Citizenship explainer could not be opened:", error);
    }
    if (!isSurfacesEnabled || generation !== this.showGeneration) {
      return;
    }
    const showPrivateLobbyLine = await isPrivateLobbyRowEnabled().catch(
      () => false,
    );
    if (generation !== this.showGeneration) {
      return;
    }
    this.showPrivateLobbyLine = showPrivateLobbyLine;
    this.purchaseError = false;
    this.isGuestFlowFromThisPopup = false;
    this.isVisible = true;
    this.requestUpdate();
    FlashistFacade.instance.logCitizenshipExplainerOpenedEvent(
      this.sourceSuffix(source),
    );
  }

  /**
   * Also Main.ts's pre-start close (PreStartModals.ts). Tells the purchase
   * coordinator (spec §15.2 item 3): a guest flow from here then never opens
   * the payment window, and hands off to the login restart.
   */
  close() {
    this.showGeneration++;
    this.isVisible = false;
    this.requestUpdate();
    getPurchaseCoordinator()?.surfaceClosed("citizenship");
  }

  private sourceSuffix(source: CitizenshipExplainerSource): string {
    const sources = flashistConstants.citizenshipExplainerSources;
    switch (source.source) {
      case "CardLink":
        return sources.cardLink;
      case "Instructions":
        return sources.instructions;
      case "LockedFeature":
        return `${sources.lockedFeature}:${source.featureId}`;
    }
  }

  private findCard(): CitizenshipCard | null {
    const card = document.querySelector<CitizenshipCard>("citizenship-card");
    return card !== null && typeof card.getCitizenshipOffer === "function"
      ? card
      : null;
  }

  private currentOffer(): CitizenshipOffer {
    return this.findCard()?.getCitizenshipOffer() ?? { kind: "checking" };
  }

  private readonly onBuyTap = (): Promise<void> =>
    this.buyThroughCard(
      flashistConstants.uiElementIds.purchaseCitizenshipExplainer,
    );

  // Task 0409: an earned citizen's Buy, counted under its own tap id.
  private readonly onCitizenBuyTap = (): Promise<void> =>
    this.buyThroughCard(
      flashistConstants.uiElementIds.purchasePaidCitizenshipExplainer,
    );

  private async buyThroughCard(tapElementId: string): Promise<void> {
    const card = this.findCard();
    if (card === null) {
      return;
    }
    this.purchaseError = false;
    this.requestUpdate();
    const result = await card.buyCitizenship(tapElementId);
    // "busy": a purchase from the card is already running — nothing to show.
    if (result === "error") {
      this.purchaseError = true;
      this.requestUpdate();
    }
  }

  private readonly onLoginTap = (): void => {
    void this.findCard()?.logIn(
      flashistConstants.uiElementIds.citizenshipLoginExplainer,
    );
  };

  private readonly onLoginAndBuyTap = (): void =>
    this.purchaseThroughCoordinator(
      flashistConstants.uiElementIds.purchaseLoginCitizenshipExplainer,
    );

  // The Buy after `needs_tap` or a failed purchase, inside a guest flow.
  private readonly onFlowBuyTap = (): void =>
    this.purchaseThroughCoordinator(
      flashistConstants.uiElementIds.purchaseCitizenshipExplainer,
    );

  // Called inside the tap, so the login dialog opens from the player's gesture.
  private purchaseThroughCoordinator(tapElementId: string): void {
    const coordinator = getPurchaseCoordinator();
    if (coordinator === null) {
      return;
    }
    this.isGuestFlowFromThisPopup = true;
    this.requestUpdate();
    void coordinator.requestPurchase({
      productId: "citizenship",
      tapElementId,
    });
  }

  // Set once the page is reloading, as the card's own Restart game button.
  private isRestartInFlight = false;

  private readonly onRestartTap = (): void => {
    if (this.isRestartInFlight) {
      return;
    }
    this.isRestartInFlight = restartAfterProfileReadFailure({
      isOnStartScreen,
      reload: () => FlashistFacade.instance.reloadApp(),
      storage: sessionStorageOrNull(),
    });
  };

  private readonly onCloseTap = (): void => {
    this.close();
  };

  render() {
    const offer = this.currentOffer();
    return html`
      <div class="modal-overlay ${this.isVisible ? "visible" : ""}">
        <div
          class="modal-box"
          role="dialog"
          aria-modal="true"
          aria-labelledby="citizenship-explainer-title"
        >
          <h2 id="citizenship-explainer-title">
            ${translateText("citizenship_explainer.title")}
          </h2>

          <ul id="citizenship-explainer-benefits">
            <li>${translateText("citizenship_explainer.benefit_badge")}</li>
            <li>
              ${translateText("citizenship_explainer.benefit_name_change")}
            </li>
            ${this.showPrivateLobbyLine
              ? html`<li id="citizenship-explainer-benefit-private-lobby">
                  ${translateText(
                    "citizenship_explainer.benefit_private_lobby",
                  )}
                </li>`
              : nothing}
          </ul>
          <h4 id="citizenship-explainer-paid-only-title">
            ${translateText("citizenship_explainer.paid_only_title")}
          </h4>
          <ul id="citizenship-explainer-paid-only">
            <li id="citizenship-explainer-benefit-no-ads">
              ${translateText("citizenship_explainer.benefit_no_ads")}
            </li>
          </ul>

          ${offer.kind === "citizen" ||
          offer.kind === "citizen_buy" ||
          isCitizenHeldElsewhere(offer)
            ? // Task 0421: a citizen already has it — no "get it free" line.
              nothing
            : html`<p id="citizenship-explainer-free-body">
                ${translateText("citizenship_explainer.free_body", {
                  threshold: CITIZENSHIP_XP_THRESHOLD,
                })}
              </p>`}
          ${offer.kind === "buy" || offer.kind === "no_product"
            ? html`<p id="citizenship-explainer-your-xp" class="muted">
                ${translateText("citizenship_explainer.your_xp", {
                  xp: offer.xp,
                  threshold: CITIZENSHIP_XP_THRESHOLD,
                })}
              </p>`
            : nothing}
          ${this.renderAction(offer)}

          <button
            id="citizenship-explainer-close"
            class="close-btn"
            @click=${this.onCloseTap}
          >
            ${translateText("citizenship_explainer.close")}
          </button>
        </div>
      </div>
    `;
  }

  // Driven by the card's offer — the same rule as the card's own buttons
  // (CitizenshipOffer.ts) — except while this popup's guest flow runs.
  private renderAction(offer: CitizenshipOffer) {
    const flowState = this.isGuestFlowFromThisPopup
      ? (getPurchaseCoordinator()?.currentState("citizenship") ?? "idle")
      : "idle";
    if (flowState !== "idle" && flowState !== "granted") {
      return this.renderGuestFlow(flowState, isCitizenHeldElsewhere(offer));
    }
    switch (offer.kind) {
      case "buy":
        return html`
          <button
            id="citizenship-explainer-buy"
            class="primary-btn"
            @click=${this.onBuyTap}
          >
            ${translateText("citizenship_paid.buy_cta")} — ${offer.price}
          </button>
          ${this.renderPurchaseError()}
        `;
      case "guest":
        return html`
          <p id="citizenship-explainer-login-hint" class="muted">
            ${translateText("citizenship_explainer.login_hint")}
          </p>
          ${offer.canLogIn && offer.price !== null
            ? this.renderLoginAndBuyButton(offer.price)
            : nothing}
          ${offer.canLogIn
            ? html`<button
                id="citizenship-explainer-login"
                class=${offer.price !== null ? "secondary-btn" : "primary-btn"}
                @click=${this.onLoginTap}
              >
                ${translateText("citizenship_card.login_cta")}
              </button>`
            : // No Yandex context, or a degraded SDK: a login button would be
              // dead (the card's own rule).
              nothing}
        `;
      case "citizen":
        return html`<p id="citizenship-explainer-already-citizen">
          ${translateText("citizenship_explainer.already_citizen")}
        </p>`;
      case "citizen_buy":
        // Task 0409: verified "not paid" only — the rule fails closed on every
        // unknown, so this case never draws for an unverified session.
        return html`
          <p id="citizenship-explainer-already-citizen">
            ${translateText("citizenship_explainer.already_citizen")}
          </p>
          <h3 id="citizenship-explainer-citizen-buy-title">
            ${translateText("citizenship_explainer.citizen_buy_title")}
          </h3>
          <button
            id="citizenship-explainer-citizen-buy"
            class="primary-btn"
            @click=${this.onCitizenBuyTap}
          >
            ${translateText("citizenship_explainer.citizen_buy_cta")} —
            ${offer.price}
          </button>
          ${this.renderPurchaseError()}
        `;
      case "read_failed":
        return html`<p id="citizenship-explainer-read-failed" class="muted">
          ${translateText("citizenship_status.read_failed")}
        </p>`;
      case "no_product":
        // The same as the card: no product, no purchase line at all.
        return nothing;
      case "held_elsewhere":
        return this.renderHeldElsewhere(offer.isCitizen);
      case "checking":
        return html`<p id="citizenship-explainer-checking" class="muted">
          ${translateText("citizenship_status.checking")}
        </p>`;
    }
  }

  private renderLoginAndBuyButton(price: string) {
    return html`<button
      id="citizenship-explainer-login-and-buy"
      class="primary-btn"
      @click=${this.onLoginAndBuyTap}
    >
      ${translateText("citizenship_paid.login_and_buy_cta")} — ${price}
    </button>`;
  }

  private renderGuestFlow(
    state: Exclude<PurchaseFlowState, "idle" | "granted">,
    isCitizen: boolean,
  ) {
    const price =
      FlashistFacade.instance.getCatalogProduct("citizenship")?.price ?? null;
    switch (state) {
      case "logging_in":
      case "preparing":
      case "paying":
      case "cannot_verify":
      case "earlier_purchase_pending":
        return this.renderFlowLine(`purchase_flow.${state}`);
      case "login_cancelled":
        return html`${this.renderFlowLine("purchase_flow.login_cancelled")}
        ${price !== null ? this.renderLoginAndBuyButton(price) : nothing}`;
      case "needs_tap":
      case "error":
        return html`${this.renderFlowLine(`purchase_flow.${state}`)}
          <button
            id="citizenship-explainer-flow-buy"
            class="primary-btn"
            @click=${this.onFlowBuyTap}
          >
            ${translateText("citizenship_paid.buy_cta")}${price !== null
              ? ` — ${price}`
              : ""}
          </button>`;
      case "already_owned":
        return this.renderFlowLine(
          getProductClientConfig("citizenship").alreadyOwnedLineKey,
        );
      case "held_elsewhere":
        return this.renderHeldElsewhere(isCitizen);
      case "profile_unavailable":
        return html`${this.renderFlowLine("citizenship_status.read_failed")}
          <button
            id="citizenship-explainer-flow-restart"
            class="primary-btn"
            @click=${this.onRestartTap}
          >
            ${translateText("citizenship_status.restart")}
          </button>`;
    }
  }

  // ADR-126: paid for on another profile of this login — contact us instead.
  private renderHeldElsewhere(isCitizen: boolean) {
    return html`
      ${isCitizen
        ? html`<p id="citizenship-explainer-already-citizen">
            ${translateText("citizenship_explainer.already_citizen")}
          </p>`
        : nothing}
      <p id="citizenship-explainer-held-elsewhere" class="muted">
        ${translateText("purchase_flow.held_elsewhere")}
      </p>
      <a
        id="citizenship-explainer-held-elsewhere-telegram"
        class="contact-link"
        href=${TELEGRAM_CHANNEL_URL}
        target="_blank"
        rel="noopener"
        @click=${this.onHeldElsewhereTelegramTap}
      >
        ${translateText("purchase_flow.contact_telegram")}
      </a>
      <a
        id="citizenship-explainer-held-elsewhere-vk"
        class="contact-link"
        href=${VK_CHANNEL_URL}
        target="_blank"
        rel="noopener"
        @click=${this.onHeldElsewhereVkTap}
      >
        ${translateText("purchase_flow.contact_vk")}
      </a>
    `;
  }

  private readonly onHeldElsewhereTelegramTap = (): void => {
    FlashistFacade.instance.logUiTapEvent(
      flashistConstants.uiElementIds.telegramLinkHeldElsewhere,
    );
  };

  private readonly onHeldElsewhereVkTap = (): void => {
    FlashistFacade.instance.logUiTapEvent(
      flashistConstants.uiElementIds.vkLinkHeldElsewhere,
    );
  };

  private renderFlowLine(textKey: string) {
    return html`<p id="citizenship-explainer-flow-status" class="muted">
      ${translateText(textKey)}
    </p>`;
  }

  // Under either Buy button, for the popup's own tap only.
  private renderPurchaseError() {
    return this.purchaseError
      ? html`<p id="citizenship-explainer-purchase-error" class="error">
          ${translateText("citizenship_paid.purchase_error")}
        </p>`
      : nothing;
  }
}

// sessionStorage can throw on access inside an iframe with blocked storage.
function sessionStorageOrNull(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isCitizenHeldElsewhere(offer: CitizenshipOffer): boolean {
  return offer.kind === "held_elsewhere" && offer.isCitizen;
}
