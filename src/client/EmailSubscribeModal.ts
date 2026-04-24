import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import {
  flashist_logEventAnalytics,
  FlashistFacade,
  flashistConstants,
} from "./flashist/FlashistFacade";
import { translateText } from "./Utils";

@customElement("email-subscribe-modal")
export class EmailSubscribeModal extends LitElement {
  @state() isVisible = false;
  @state() email = "";
  @state() submitted = false;
  @state() loading = false;
  @state() error = "";
  @state() private isSubscribeButtonEnabled = false;

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  static styles = css`
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }

    .modal-overlay.visible {
      display: flex;
    }

    .modal-box {
      background: rgba(20, 20, 20, 0.92);
      backdrop-filter: blur(6px);
      border-radius: 12px;
      padding: 24px;
      width: 340px;
      max-width: 92vw;
      color: white;
      position: relative;
    }

    h2 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    input[type="email"] {
      width: 100%;
      padding: 8px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 13px;
      box-sizing: border-box;
      margin-bottom: 12px;
      font-family: inherit;
    }

    input[type="email"]::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    .send-btn {
      width: 100%;
      padding: 10px;
      background: #0075ff;
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .send-btn:hover:not(:disabled) {
      background: #0060d0;
    }

    .send-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error-text {
      color: #ff6b6b;
      font-size: 12px;
      margin-bottom: 8px;
    }

    .success-text {
      text-align: center;
      font-size: 15px;
      padding: 20px 0;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    void this.loadSubscribeButtonFlag();
  }

  private async loadSubscribeButtonFlag(): Promise<void> {
    const isEnabled =
      await FlashistFacade.instance.isEmailSubscribeButtonEnabled();
    if (!this.isConnected) return;
    this.isSubscribeButtonEnabled = isEnabled;
  }

  async show() {
    const isEnabled =
      this.isSubscribeButtonEnabled ||
      (await FlashistFacade.instance.isEmailSubscribeButtonEnabled());
    this.isSubscribeButtonEnabled = isEnabled;
    if (!isEnabled || this.isVisible) return;
    this.isVisible = true;
    this.email = "";
    this.submitted = false;
    this.loading = false;
    this.error = "";
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.SUBSCRIBE_BUTTON_OPENED,
    );
  }

  hide() {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.isVisible = false;
    this.email = "";
    this.submitted = false;
    this.loading = false;
    this.error = "";
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private async onSubmit() {
    if (!this.email.trim()) {
      this.error = translateText("email_subscribe_modal.error");
      return;
    }
    if (!this.isValidEmail(this.email.trim())) {
      this.error = translateText("email_subscribe_modal.invalid_email");
      return;
    }

    this.loading = true;
    this.error = "";

    try {
      const resp = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.email.trim() }),
      });
      if (!resp.ok) throw new Error("Server error");
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.SUBSCRIBE_SUBMITTED,
      );
      this.submitted = true;
      this.loading = false;
      this.hideTimer = setTimeout(() => this.hide(), 2000);
    } catch {
      this.error = translateText("email_subscribe_modal.error");
      this.loading = false;
    }
  }

  render() {
    return html`
      <div
        class="modal-overlay ${this.isVisible ? "visible" : ""}"
        @click=${this.hide}
      >
        <div class="modal-box" @click=${(e: Event) => e.stopPropagation()}>
          <button class="close-btn" @click=${this.hide}>✕</button>
          ${this.submitted
            ? html`<p class="success-text">
                ${translateText("email_subscribe_modal.success")}
              </p>`
            : html`
                <h2>${translateText("email_subscribe_modal.title")}</h2>
                <input
                  type="email"
                  placeholder=${translateText(
                    "email_subscribe_modal.placeholder",
                  )}
                  .value=${this.email}
                  @input=${(e: Event) => {
                    this.email = (e.target as HTMLInputElement).value;
                  }}
                />
                ${this.error
                  ? html`<p class="error-text">${this.error}</p>`
                  : ""}
                <button
                  class="send-btn"
                  ?disabled=${this.loading || !this.email.trim()}
                  @click=${this.onSubmit}
                >
                  ${this.loading
                    ? translateText("email_subscribe_modal.sending")
                    : translateText("email_subscribe_modal.submit")}
                </button>
              `}
        </div>
      </div>
    `;
  }
}
