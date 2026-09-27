// Interim (0302) — removed by 0301. The owner ruled (2026-09-26) that until the
// full citizenship explainer ships, a locked perk opens this simple notice: a
// title, one line and Close. Deliberately NO buy button. 0301 deletes this file
// and re-points onLockedFeatureTap() (LockedFeature.ts) at its explainer.

import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { FlashistFacade } from "./flashist/FlashistFacade";
import { translateText } from "./Utils";

/** "This feature is for citizens only" notice. Follows GameStartingModal. */
@customElement("citizens-only-modal")
export class CitizensOnlyModal extends LitElement {
  @state()
  isVisible = false;

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
    return html`
      <div class="modal-overlay ${this.isVisible ? "visible" : ""}">
        <div class="modal-box" role="dialog" aria-modal="true">
          <h2>${translateText("citizens_only_modal.title")}</h2>
          <p>${translateText("citizens_only_modal.body")}</p>
          <button id="citizens-only-modal-close" @click=${this.hide}>
            ${translateText("citizens_only_modal.close")}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Does nothing while the citizenship surfaces are off (kill switch, task
   * 0236): a player who cannot see citizenship must never be told about it.
   */
  async show(): Promise<void> {
    if (!(await FlashistFacade.instance.isCitizenshipSurfacesEnabled())) {
      return;
    }
    this.isVisible = true;
    this.requestUpdate();
  }

  hide() {
    this.isVisible = false;
    this.requestUpdate();
  }
}
