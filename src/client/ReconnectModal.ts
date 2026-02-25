import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "./Utils";
import { clearReconnectSession, ReconnectSession } from "./ReconnectSession";

@customElement("reconnect-modal")
export class ReconnectModal extends LitElement {
  @state() private isVisible = false;
  private session: ReconnectSession | null = null;

  static styles = css`
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.6);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.visible {
      display: flex;
      animation: fadeIn 0.3s ease-out;
    }
    .modal-box {
      background-color: rgba(30, 30, 40, 0.9);
      backdrop-filter: blur(8px);
      border-radius: 12px;
      padding: 28px 32px;
      width: 340px;
      max-width: 90vw;
      text-align: center;
      color: white;
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.6);
    }
    h2 {
      margin: 0 0 12px;
      font-size: 20px;
    }
    p {
      margin: 0 0 24px;
      font-size: 14px;
      opacity: 0.85;
    }
    .buttons {
      display: flex;
      gap: 10px;
      justify-content: center;
    }
    button {
      padding: 10px 20px;
      font-size: 15px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition:
        background-color 0.15s,
        transform 0.1s;
    }
    button:hover {
      transform: translateY(-1px);
    }
    button:active {
      transform: translateY(1px);
    }
    .btn-rejoin {
      background: rgba(37, 99, 235, 0.8);
      color: white;
    }
    .btn-rejoin:hover {
      background: rgba(37, 99, 235, 1);
    }
    .btn-dismiss {
      background: rgba(100, 100, 120, 0.5);
      color: white;
    }
    .btn-dismiss:hover {
      background: rgba(100, 100, 120, 0.75);
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `;

  render() {
    return html`
      <div class="modal-overlay ${this.isVisible ? "visible" : ""}">
        <div class="modal-box">
          <h2>${translateText("reconnect.title")}</h2>
          <p>${translateText("reconnect.prompt")}</p>
          <div class="buttons">
            <button class="btn-rejoin" @click=${this._handleRejoin}>
              ${translateText("reconnect.rejoin")}
            </button>
            <button class="btn-dismiss" @click=${this._handleDismiss}>
              ${translateText("reconnect.dismiss")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  public show(session: ReconnectSession): void {
    this.session = session;
    this.isVisible = true;
    this.requestUpdate();
  }

  public hide(): void {
    this.isVisible = false;
    this.session = null;
    this.requestUpdate();
  }

  private _handleRejoin(): void {
    const session = this.session;
    this.hide();
    if (!session) return;
    document.dispatchEvent(
      new CustomEvent("join-lobby", {
        detail: { clientID: session.clientID, gameID: session.gameID },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _handleDismiss(): void {
    clearReconnectSession();
    this.hide();
  }
}
