import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { EmailSubscribeModal } from "./EmailSubscribeModal";
import {
  flashistConstants,
  FlashistFacade,
  TELEGRAM_CHANNEL_URL,
} from "./flashist/FlashistFacade";
import { translateText } from "./Utils";

@customElement("game-starting-modal")
export class GameStartingModal extends LitElement {
  @state()
  isVisible = false;

  @state()
  private isSubscribeButtonEnabled = false;

  @state()
  private isTelegramLinkVisible = false;

  connectedCallback() {
    super.connectedCallback();
    void this.loadCtaFlags();
  }

  private async loadCtaFlags(): Promise<void> {
    const [isSubscribeEnabled, isTelegramLinkEnabled] = await Promise.all([
      FlashistFacade.instance.isEmailSubscribeButtonEnabled(),
      FlashistFacade.instance.isTelegramLinkEnabled(),
    ]);
    if (!this.isConnected) return;
    this.isSubscribeButtonEnabled = isSubscribeEnabled;
    this.isTelegramLinkVisible = isTelegramLinkEnabled;
  }

  static styles = css`
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.4);
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
      background-color: rgba(30, 30, 30, 0.7);
      backdrop-filter: blur(5px);
      padding: 25px;
      border-radius: 10px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      color: white;
      width: 300px;
      max-width: 90vw;
      text-align: center;
    }

    .modal-box h2 {
      margin-bottom: 15px;
      font-size: 22px;
      color: white;
    }

    .modal-box p {
      margin: 2px 0;
      font-size: 14px;
    }

    .modal-box .loading {
      font-size: 16px;
      margin-top: 20px;
      margin-bottom: 20px;
      background-color: rgba(0, 0, 0, 0.3);
      padding: 10px;
      border-radius: 5px;
    }

    .button-container {
      display: flex;
      justify-content: center;
      gap: 10px;
    }

    .modal-box button {
      padding: 12px;
      font-size: 16px;
      cursor: pointer;
      background: rgba(255, 100, 100, 0.7);
      color: white;
      border: none;
      border-radius: 5px;
      transition:
        background-color 0.2s ease,
        transform 0.1s ease;
    }

    .modal-box button:hover {
      background: rgba(255, 100, 100, 0.9);
      transform: translateY(-1px);
    }

    .modal-box button:active {
      transform: translateY(1px);
    }

    .copyright {
      font-size: 32px;
      margin-top: 20px;
      margin-bottom: 10px;
      opacity: 1;
    }

    .modal-box a {
      display: block;
      margin-top: 10px;
      margin-bottom: 15px;
      font-size: 20px;
      color: #4a9eff;
      text-decoration: none;
      transition: color 0.2s ease;
    }

    .modal-box a:hover {
      color: #6bb0ff;
      text-decoration: underline;
    }

    .modal-box .subscribe-btn {
      display: block;
      width: 100%;
      margin-top: 12px;
      padding: 12px;
      background: rgba(22, 163, 74, 0.6);
      border: none;
      border-radius: 5px;
      color: white;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.1s ease;
      box-sizing: border-box;
    }

    .modal-box .subscribe-btn:hover {
      background: rgba(22, 163, 74, 0.8);
      transform: translateY(-1px);
    }

    .modal-box .subscribe-btn:active {
      transform: translateY(1px);
    }

    .modal-box .telegram-link {
      display: inline-block;
      margin-top: 12px;
      color: #60a5fa;
      font-size: 16px;
      text-decoration: underline;
      text-underline-offset: 2px;
      transition: color 0.2s ease;
    }

    .modal-box .telegram-link:hover {
      color: #93c5fd;
    }
  `;

  render() {
    // Flashist Adaptation
    return html`
      <div class="modal-overlay ${this.isVisible ? "visible" : ""}">
        <div class="modal-box">
          <p class="loading">${translateText("game_starting_modal.title")}</p>
          ${this.isSubscribeButtonEnabled
            ? html`
                <button
                  class="subscribe-btn"
                  @click=${this.openSubscribeModal}
                >
                  ${translateText("email_subscribe_modal.subscribe_button")}
                </button>
              `
            : nothing}
          ${this.isTelegramLinkVisible
            ? html`
                <a
                  href=${TELEGRAM_CHANNEL_URL}
                  target="_blank"
                  rel="noopener"
                  class="telegram-link"
                  @click=${this.onTelegramLinkClick}
                >
                  ${translateText("telegram_link.cta_text")}
                </a>
              `
            : nothing}
        </div>
      </div>
    `;
    // return html`
    //   <div class="modal ${this.isVisible ? "visible" : ""}">
    //     <div class="copyright">© OpenFront</div>
    //     <a
    //       href="https://github.com/openfrontio/OpenFrontIO/blob/main/CREDITS.md"
    //       target="_blank"
    //       rel="noopener noreferrer"
    //       >${translateText("game_starting_modal.credits")}</a
    //     >
    //     <p>${translateText("game_starting_modal.code_license")}</p>
    //     <p class="loading">${translateText("game_starting_modal.title")}</p>
    //   </div>
    // `;
  }

  private openSubscribeModal() {
    if (!this.isSubscribeButtonEnabled) return;
    const modal = document.querySelector("email-subscribe-modal");
    if (!(modal instanceof EmailSubscribeModal)) return;
    void modal.show();
  }

  private onTelegramLinkClick() {
    FlashistFacade.instance.logUiTapEvent(
      flashistConstants.uiElementIds.telegramLinkStartScreen,
    );
  }

  show() {
    this.isVisible = true;
    this.requestUpdate();
  }

  hide() {
    this.isVisible = false;
    this.requestUpdate();
  }
}
