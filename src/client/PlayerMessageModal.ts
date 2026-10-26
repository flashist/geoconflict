import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  flashist_logEventAnalytics,
  flashistConstants,
  TELEGRAM_CHANNEL_URL,
  VK_CHANNEL_URL,
} from "./flashist/FlashistFacade";
import { translateText } from "./Utils";

/**
 * The one-player message popup (task 0507): our Telegram and VK contact links
 * for a player targeted by the `player_message_targets` flag. Opened by
 * PlayerMessage.ts. Follows TenureGrantModal / GameStartingModal.
 */
@customElement("player-message-modal")
export class PlayerMessageModal extends LitElement {
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

    .modal-box p {
      margin: 0 0 16px;
      font-size: 15px;
      line-height: 1.45;
      color: rgba(255, 255, 255, 0.9);
    }

    .modal-box .contact-link {
      display: block;
      margin-bottom: 10px;
      padding: 12px;
      font-size: 16px;
      font-weight: bold;
      color: white;
      background: #2563eb;
      border-radius: 8px;
      text-decoration: none;
      transition: background-color 0.2s ease;
    }

    .modal-box .contact-link:hover {
      background: #1d4ed8;
    }

    .modal-box button {
      width: 100%;
      margin-top: 6px;
      padding: 12px;
      font-size: 16px;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border: none;
      border-radius: 8px;
      transition: background-color 0.2s ease;
    }

    .modal-box button:hover {
      background: rgba(255, 255, 255, 0.25);
    }
  `;

  render() {
    return html`
      <div class="modal-overlay ${this.isVisible ? "visible" : ""}">
        <div class="modal-box" role="dialog" aria-modal="true">
          <p>${translateText("player_message.contact_us_text")}</p>
          <a
            id="player-message-telegram"
            class="contact-link"
            href=${TELEGRAM_CHANNEL_URL}
            target="_blank"
            rel="noopener"
            @click=${this.onTelegramClick}
          >
            ${translateText("player_message.telegram_button")}
          </a>
          <a
            id="player-message-vk"
            class="contact-link"
            href=${VK_CHANNEL_URL}
            target="_blank"
            rel="noopener"
            @click=${this.onVkClick}
          >
            ${translateText("player_message.vk_button")}
          </a>
          <button id="player-message-close" @click=${this.onCloseTap}>
            ${translateText("common.close")}
          </button>
        </div>
      </div>
    `;
  }

  show() {
    this.isVisible = true;
    this.requestUpdate();
  }

  hide() {
    this.isVisible = false;
    this.requestUpdate();
  }

  /** Main.ts's pre-start close list: hides without logging a player close. */
  close() {
    this.hide();
  }

  private readonly onCloseTap = (): void => {
    this.hide();
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.PLAYER_MESSAGE_CLOSED,
    );
  };

  private readonly onTelegramClick = (): void => {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.PLAYER_MESSAGE_CLICK_TELEGRAM,
    );
  };

  private readonly onVkClick = (): void => {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.PLAYER_MESSAGE_CLICK_VK,
    );
  };
}
