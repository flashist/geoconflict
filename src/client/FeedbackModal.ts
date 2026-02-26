import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import version from "../version";
import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";
import { translateText } from "./Utils";

@customElement("feedback-modal")
export class FeedbackModal extends LitElement {
  @state() isVisible = false;
  @state() category: "Bug" | "Suggestion" | "Other" = "Bug";
  @state() text = "";
  @state() contact = "";
  @state() submitted = false;
  @state() loading = false;
  @state() error = "";

  private screenSource: "start" | "battle" = "start";
  private matchId: string | undefined;
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

    .category-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .chip {
      padding: 4px 12px;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: transparent;
      color: white;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.15s;
    }

    .chip.selected {
      background: #0075ff;
      border-color: #0075ff;
    }

    .chip:hover:not(.selected) {
      background: rgba(255, 255, 255, 0.1);
    }

    textarea {
      width: 100%;
      min-height: 80px;
      padding: 8px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      font-size: 13px;
      resize: vertical;
      box-sizing: border-box;
      margin-bottom: 10px;
      font-family: inherit;
    }

    textarea::placeholder,
    input::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }

    input[type="text"] {
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

  show(screenSource: "start" | "battle", matchId?: string) {
    if (this.isVisible) return;
    this.screenSource = screenSource;
    this.matchId = matchId;
    this.isVisible = true;
    this.category = "Bug";
    this.text = "";
    this.contact = "";
    this.submitted = false;
    this.loading = false;
    this.error = "";
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.FEEDBACK_BUTTON_OPENED +
        ":" +
        screenSource,
    );
  }

  hide() {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.isVisible = false;
    this.category = "Bug";
    this.text = "";
    this.contact = "";
    this.submitted = false;
    this.loading = false;
    this.error = "";
  }

  private async onSubmit() {
    this.loading = true;
    this.error = "";

    const platform =
      window.matchMedia("(pointer: coarse)").matches ||
      /Android|iPhone|iPad/i.test(navigator.userAgent)
        ? "mobile"
        : "desktop";
    const yandexStatus =
      typeof (window as any).YaGames !== "undefined" ? "yandex" : "anonymous";

    const payload = {
      category: this.category,
      text: this.text || undefined,
      contact: this.contact || undefined,
      platform,
      yandexStatus,
      version,
      matchId: this.matchId,
      screenSource: this.screenSource,
    };

    try {
      const resp = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error("Server error");
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.FEEDBACK_SUBMITTED +
          ":" +
          this.screenSource,
      );
      this.submitted = true;
      this.loading = false;
      this.hideTimer = setTimeout(() => this.hide(), 2000);
    } catch {
      this.error = translateText("feedback_modal.error");
      this.loading = false;
    }
  }

  render() {
    return html`
      <div class="modal-overlay ${this.isVisible ? "visible" : ""}" @click=${this.hide}>
        <div class="modal-box" @click=${(e: Event) => e.stopPropagation()}>
          <button class="close-btn" @click=${this.hide}>✕</button>
          ${this.submitted
            ? html`<p class="success-text">
                ${translateText("feedback_modal.success")}
              </p>`
            : html`
                <h2>${translateText("feedback_modal.title")}</h2>
                <div class="category-row">
                  ${(
                    [
                      ["Bug", "feedback_modal.category_bug"],
                      ["Suggestion", "feedback_modal.category_suggestion"],
                      ["Other", "feedback_modal.category_other"],
                    ] as const
                  ).map(
                    ([cat, key]) => html`
                      <button
                        class="chip ${this.category === cat ? "selected" : ""}"
                        @click=${() => {
                          this.category = cat;
                        }}
                      >
                        ${translateText(key)}
                      </button>
                    `,
                  )}
                </div>
                <textarea
                  placeholder=${translateText("feedback_modal.text_placeholder")}
                  .value=${this.text}
                  @input=${(e: Event) => {
                    this.text = (e.target as HTMLTextAreaElement).value;
                  }}
                ></textarea>
                <input
                  type="text"
                  placeholder=${translateText(
                    "feedback_modal.contact_placeholder",
                  )}
                  .value=${this.contact}
                  @input=${(e: Event) => {
                    this.contact = (e.target as HTMLInputElement).value;
                  }}
                />
                ${this.error
                  ? html`<p class="error-text">${this.error}</p>`
                  : ""}
                <button
                  class="send-btn"
                  ?disabled=${this.loading || !this.text.trim()}
                  @click=${this.onSubmit}
                >
                  ${this.loading
                    ? translateText("feedback_modal.sending")
                    : translateText("feedback_modal.send")}
                </button>
              `}
        </div>
      </div>
    `;
  }
}
