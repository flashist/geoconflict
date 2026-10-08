import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  CITIZENSHIP_XP_THRESHOLD,
  XP_PER_MATCH,
} from "../core/profile/Citizenship";
import type { CitizenshipCard } from "./CitizenshipCard";
import type { CitizenshipExplainerSource } from "./CitizenshipExplainer";
import {
  CITIZENSHIP_OFFER_CHANGED_EVENT,
  type CitizenshipOffer,
} from "./CitizenshipOffer";
import { CITIZENSHIP_GRANTED_MID_SESSION_EVENT } from "./CitizenshipRestartOffer";
import { FlashistFacade, flashistConstants } from "./flashist/FlashistFacade";
import { isPrivateLobbyRowEnabled } from "./PrivateLobbyAccess";
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

  // Bumped by close(), so a show() still awaiting its checks does not open a
  // popup that was closed meanwhile (e.g. by a match start).
  private showGeneration = 0;

  static styles = css`
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

    /* The app's dark scrollbar (styles.css), copied: page styles do not reach
       into this component. No scrollbar-color here — in Chromium it turns
       these rules off. */
    .modal-box::-webkit-scrollbar {
      width: 8px;
    }

    .modal-box::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
    }

    .modal-box::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }

    .modal-box::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
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

    .modal-box .close-btn {
      margin-top: 16px;
      background: rgba(255, 255, 255, 0.1);
    }

    .modal-box .close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `;

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
  }

  disconnectedCallback() {
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
  // out of the way of 0303's "restart to apply" popup at once.
  private readonly onGrantedMidSession = (): void => {
    if (this.isVisible) {
      this.close();
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
    this.isVisible = true;
    this.requestUpdate();
    FlashistFacade.instance.logCitizenshipExplainerOpenedEvent(
      this.sourceSuffix(source),
    );
  }

  /** Also Main.ts's pre-start close (PreStartModals.ts). */
  close() {
    this.showGeneration++;
    this.isVisible = false;
    this.requestUpdate();
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
          <p>${translateText("citizenship_explainer.intro")}</p>

          <h3>${translateText("citizenship_explainer.benefits_title")}</h3>
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

          <h3>${translateText("citizenship_explainer.free_title")}</h3>
          <p id="citizenship-explainer-free-body">
            ${translateText("citizenship_explainer.free_body", {
              xpPerMatch: XP_PER_MATCH,
              threshold: CITIZENSHIP_XP_THRESHOLD,
            })}
          </p>
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

  // Driven entirely by the card's offer — the same rule as the card's own
  // buttons (CitizenshipOffer.ts).
  private renderAction(offer: CitizenshipOffer) {
    switch (offer.kind) {
      case "buy":
        return html`
          <h3>${translateText("citizenship_explainer.buy_title")}</h3>
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
          ${offer.canLogIn
            ? html`<button
                id="citizenship-explainer-login"
                class="primary-btn"
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
      case "checking":
        return html`<p id="citizenship-explainer-checking" class="muted">
          ${translateText("citizenship_status.checking")}
        </p>`;
    }
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
