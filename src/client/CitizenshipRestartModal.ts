import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";
import { translateText } from "./Utils";

/**
 * "Citizenship is active — restart to finish applying it" (task 0303). Opened
 * only by the restart offer (CitizenshipRestartOffer.ts), which owns the kill
 * switch, the once-per-load cap and the reload itself. Follows GameStartingModal.
 *
 * Nothing closes it by clicking outside or pressing Esc, so a dismiss is always
 * the Later button.
 */
@customElement("citizenship-restart-modal")
export class CitizenshipRestartModal extends LitElement {
  @state()
  isVisible = false;

  private onRestart: (() => boolean) | null = null;
  // `Shown` is logged once per page load: a refused Restart re-shows the same
  // offer later (CitizenshipRestartOffer), and that is not a second offer.
  private shownLogged = false;

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

    .button-container {
      display: flex;
      gap: 10px;
    }

    .modal-box button {
      flex: 1;
      padding: 12px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      color: white;
      border: none;
      border-radius: 8px;
      transition: background-color 0.2s ease;
    }

    .modal-box .restart-btn {
      background: #2563eb;
    }

    .modal-box .restart-btn:hover {
      background: #1d4ed8;
    }

    .modal-box .later-btn {
      background: rgba(255, 255, 255, 0.1);
    }

    .modal-box .later-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `;

  render() {
    return html`
      <div class="modal-overlay ${this.isVisible ? "visible" : ""}">
        <div class="modal-box" role="dialog" aria-modal="true">
          <h2>${translateText("citizenship_restart_modal.title")}</h2>
          <p>${translateText("citizenship_restart_modal.body")}</p>
          <div class="button-container">
            <button
              id="citizenship-restart-modal-restart"
              class="restart-btn"
              @click=${this.onRestartTap}
            >
              ${translateText("citizenship_restart_modal.restart")}
            </button>
            <button
              id="citizenship-restart-modal-later"
              class="later-btn"
              @click=${this.onLaterTap}
            >
              ${translateText("citizenship_restart_modal.later")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /** `onRestart` returns true when the page is reloading. */
  show(onRestart: () => boolean) {
    this.onRestart = onRestart;
    this.isVisible = true;
    this.requestUpdate();
    if (this.shownLogged) {
      return;
    }
    this.shownLogged = true;
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.CITIZENSHIP_RESTART_PROMPT_SHOWN,
    );
  }

  hide() {
    this.isVisible = false;
    this.requestUpdate();
  }

  /** For Main.ts's pre-start close list: hides without logging a Later. */
  close() {
    this.hide();
  }

  private readonly onRestartTap = (): void => {
    const reloading = this.onRestart?.() ?? false;
    if (!reloading) {
      this.hide();
    }
  };

  private readonly onLaterTap = (): void => {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.CITIZENSHIP_RESTART_PROMPT_LATER,
    );
    this.hide();
  };
}
