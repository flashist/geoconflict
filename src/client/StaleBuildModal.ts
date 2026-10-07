import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { FeedbackModalScreenSource, showFeedbackModal } from "./FeedbackModal";
import { translateText } from "./Utils";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

@customElement("stale-build-modal")
export class StaleBuildModal extends LitElement {
  @state() isVisible = false;
  // Task 0404: one element, two messages, so two refresh popups never stack.
  // "longSession" = the forced refresh after 23 h (LongSessionRefresh.ts).
  @state() private reason: "staleBuild" | "longSession" = "staleBuild";

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

    /* Task 0404 review R1: the forced long-session popup must sit above every
       other window (o-modal, reconnect-modal and most others are 9999 and come
       later in the DOM, so at 9999 they would paint over it; the citizenship
       explainer is 10000, the tutorial layer 10001). Long-session only: the
       stale-build popup keeps its 9999 stacking (task 0113, locked). */
    .modal-overlay.long-session {
      z-index: 10002;
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

    .title {
      margin: 0 0 12px;
      font-size: 20px;
      font-weight: bold;
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

  private onLongSessionRefreshClick(): void {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.LONG_SESSION_REFRESH_PRESSED,
    );

    FlashistFacade.instance.reloadAppWithoutHash();
  }

  private onContactClick(): void {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.UI_CLICK_STALE_BUILD_CONTACT
    );

    showFeedbackModal(FeedbackModalScreenSource.staleBuild);
  }

  render() {
    if (this.reason === "longSession") {
      // No contact link: the game is not broken, and "contact support" would
      // alarm. No close control either — forced (owner ruling 2, 2026-10-07).
      return html`
        <div
          class="modal-overlay long-session ${this.isVisible ? "visible" : ""}"
        >
          <div class="modal-box">
            <p class="title">
              ${translateText("long_session_refresh_modal.title")}
            </p>
            <p class="message">
              ${translateText("long_session_refresh_modal.message")}
            </p>
            <button
              class="refresh-button"
              @click=${this.onLongSessionRefreshClick}
            >
              ${translateText("long_session_refresh_modal.refresh_button")}
            </button>
          </div>
        </div>
      `;
    }

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
    // The stale-build reason wins: it replaces a long-session message that is
    // up, so there is still one popup, with the stronger message.
    this.reason = "staleBuild";
    this.isVisible = true;
    this.requestUpdate();
  }

  /**
   * True while the forced long-session popup is up (task 0404 review R1). False
   * once a stale-build message has replaced it: the stale path is unchanged.
   */
  get isShowingLongSession(): boolean {
    return this.isVisible && this.reason === "longSession";
  }

  /**
   * The long-session message (task 0404). Returns false and changes nothing
   * when the popup is already up for either reason.
   */
  showLongSession(): boolean {
    if (this.isVisible) {
      return false;
    }
    this.reason = "longSession";
    this.isVisible = true;
    this.requestUpdate();
    return true;
  }
}
