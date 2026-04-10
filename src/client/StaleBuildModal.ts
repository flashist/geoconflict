import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { FeedbackModalScreenSource, showFeedbackModal } from "./FeedbackModal";
import { translateText } from "./Utils";
import { flashist_logEventAnalytics, flashistConstants } from "./flashist/FlashistFacade";

@customElement("stale-build-modal")
export class StaleBuildModal extends LitElement {
  @state() isVisible = false;

  static styles = css`
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.7);
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
      background-color: rgba(30, 30, 30, 0.9);
      backdrop-filter: blur(5px);
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      color: white;
      width: 340px;
      max-width: 90vw;
      text-align: center;
    }

    .message {
      margin: 0 0 24px;
      line-height: 1.5;
    }

    .refresh-button {
      display: block;
      width: 100%;
      padding: 12px;
      background-color: #4caf50;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      margin-bottom: 14px;
    }

    .refresh-button:hover {
      background-color: #45a049;
    }

    .contact-link {
      background: none;
      border: none;
      color: #ccc;
      text-decoration: underline;
      cursor: pointer;
      font-size: 13px;
      padding: 0;
    }

    .contact-link:hover {
      color: white;
    }
  `;

  private onRefreshClick(): void {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.UI_CLICK_STALE_BUILD_REFRESH
    );

    window.location.reload();
  }

  private onContactClick(): void {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.UI_CLICK_STALE_BUILD_CONTACT
    );

    showFeedbackModal(FeedbackModalScreenSource.staleBuild);
  }

  render() {
    return html`
      <div class="modal-overlay ${this.isVisible ? "visible" : ""}">
        <div class="modal-box">
          <p class="message">${translateText("stale_build_modal.message")}</p>
          <button class="refresh-button" @click=${this.onRefreshClick}>
            ${translateText("stale_build_modal.refresh_button")}
          </button>
          <button class="contact-link" @click=${this.onContactClick}>
            ${translateText("stale_build_modal.contact_link")}
          </button>
        </div>
      </div>
    `;
  }

  show(): void {
    this.isVisible = true;
    this.requestUpdate();
  }
}
