import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { CITIZENSHIP_XP_THRESHOLD } from "../core/profile/Citizenship";
import { translateText } from "./Utils";

export interface TenureGrantModalParams {
  /** XP the grant added. */
  xpAwarded: number;
  /** The player's XP total after the grant. */
  xp: number;
}

/**
 * One-time "thank you" notice for the tenure XP grant (task 0253; ADR-112 as
 * amended 2026-09-15). Opened by the citizenship card only after the SERVER
 * answered `granted` with XP > 0, so it is only reachable behind the
 * citizenship kill switch. Follows GameStartingModal.
 */
@customElement("tenure-grant-modal")
export class TenureGrantModal extends LitElement {
  @state()
  isVisible = false;

  @state()
  private params: TenureGrantModalParams | null = null;

  // Task 0303: the card waits for this before offering the restart popup, so
  // the two popups come one after the other, never stacked.
  private onClosed: (() => void) | null = null;

  static styles = css`
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9999;
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
      width: 320px;
      max-width: 90vw;
      text-align: center;
    }

    .modal-box h2 {
      margin: 0 0 12px;
      font-size: 20px;
      font-weight: bold;
    }

    .modal-box p {
      margin: 0 0 20px;
      font-size: 14px;
      line-height: 1.45;
      color: rgba(255, 255, 255, 0.85);
    }

    .modal-box button {
      width: 100%;
      padding: 12px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      transition: background-color 0.2s ease;
    }

    .modal-box button:hover {
      background: #1d4ed8;
    }
  `;

  render() {
    const params = this.params;
    return html`
      <div class="modal-overlay ${this.isVisible ? "visible" : ""}">
        <div class="modal-box" role="dialog" aria-modal="true">
          <h2>${translateText("citizenship_tenure_grant.title")}</h2>
          <p>
            ${params === null
              ? ""
              : translateText("citizenship_tenure_grant.body", {
                  xp: params.xpAwarded,
                  total: params.xp,
                  threshold: CITIZENSHIP_XP_THRESHOLD,
                })}
          </p>
          <button id="tenure-grant-modal-cta" @click=${this.onCtaTap}>
            ${translateText("citizenship_tenure_grant.cta")}
          </button>
        </div>
      </div>
    `;
  }

  show(params: TenureGrantModalParams, onClosed?: () => void) {
    this.params = params;
    this.onClosed = onClosed ?? null;
    this.isVisible = true;
    this.requestUpdate();
  }

  hide() {
    this.isVisible = false;
    this.requestUpdate();
  }

  /**
   * Main.ts's pre-start close list (task 0336): hides; the close follow-up is
   * dropped. Usually moot, as the page reloads after a match; an in-page
   * Back/hash leave mid-match does not reload, and then a "tenure" restart
   * offer is lost (accepted residual, 0336 review R2).
   */
  close() {
    this.onClosed = null;
    this.hide();
  }

  private readonly onCtaTap = (): void => {
    this.hide();
    const onClosed = this.onClosed;
    this.onClosed = null;
    onClosed?.();
  };
}
