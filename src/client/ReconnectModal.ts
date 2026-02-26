import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "./Utils";
import { clearReconnectSession, ReconnectSession } from "./ReconnectSession";

@customElement("reconnect-modal")
export class ReconnectModal extends LitElement {
  @state() private isVisible = false;
  @state() private mode: "offer" | "connecting" | "failed" = "offer";
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
    button:not(:disabled):hover {
      transform: translateY(-1px);
    }
    button:not(:disabled):active {
      transform: translateY(1px);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-rejoin {
      background: rgba(37, 99, 235, 0.8);
      color: white;
    }
    .btn-rejoin:not(:disabled):hover {
      background: rgba(37, 99, 235, 1);
    }
    .btn-dismiss {
      background: rgba(100, 100, 120, 0.5);
      color: white;
    }
    .btn-dismiss:not(:disabled):hover {
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
    const isFailed = this.mode === "failed";
    const isConnecting = this.mode === "connecting";
    const title = isFailed
      ? translateText("reconnect.failed_title")
      : translateText("reconnect.title");
    const prompt = isFailed
      ? translateText("reconnect.failed_prompt")
      : translateText("reconnect.prompt");
    const rejoinLabel = isConnecting
      ? translateText("reconnect.connecting")
      : translateText("reconnect.rejoin");

    return html`
      <div class="modal-overlay ${this.isVisible ? "visible" : ""}">
        <div class="modal-box">
          <h2>${title}</h2>
          <p>${prompt}</p>
          <div class="buttons">
            ${!isFailed
              ? html`<button
                  class="btn-rejoin"
                  ?disabled=${isConnecting}
                  @click=${this._handleRejoin}
                >
                  ${rejoinLabel}
                </button>`
              : ""}
            <button
              class="btn-dismiss"
              ?disabled=${isConnecting}
              @click=${this._handleDismiss}
            >
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
  }

  public hide(): void {
    this.isVisible = false;
    this.mode = "offer";
    this.session = null;
  }

  private async _handleRejoin(): Promise<void> {
    const session = this.session;
    if (!session) return;

    this.mode = "connecting";

    try {
      const resp = await fetch(`/api/game/${session.gameID}/active`);
      const body = resp.ok
        ? ((await resp.json()) as { active: boolean })
        : { active: false };
      if (!body.active) {
        clearReconnectSession();
        this.mode = "failed";
        return;
      }
    } catch {
      // Network unreachable — treat as failure
      clearReconnectSession();
      this.mode = "failed";
      return;
    }

    // Game is still active — hand off to Main.ts (which will call modal.hide())
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

  private _onReconnectFailed = () => {
    // Only show failure UI if this modal is already active (i.e. the player
    // explicitly attempted a rejoin). A code-1002 on an initial connection
    // for a first-time player should not surface a "Reconnection Failed" message.
    if (this.session === null) return;
    clearReconnectSession();
    this.mode = "failed";
    this.isVisible = true;
  };

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("reconnect-failed", this._onReconnectFailed);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("reconnect-failed", this._onReconnectFailed);
  }
}
