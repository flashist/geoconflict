import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "./Utils";

/**
 * "Are you sure you want to exit the game?" (task 0437). Opened by both in-match
 * exit buttons — the sidebar's and the settings window's — through
 * MatchExit.ts's askToLeaveMatch(). Follows CitizenshipRestartModal's look.
 *
 * Leave runs the exit once: after the first Leave the popup never reopens and
 * ignores further taps (the page is navigating away). Stay, Escape and a tap
 * on the dark area outside the box all close it and change nothing.
 */
@customElement("exit-confirm-modal")
export class ExitConfirmModal extends LitElement {
  @state()
  isVisible = false;

  private onLeave: (() => void) | null = null;
  private hasLeft = false;

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
      margin: 0 0 20px;
      font-size: 16px;
      line-height: 1.45;
      color: rgba(255, 255, 255, 0.9);
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

    .modal-box .stay-btn {
      background: #2563eb;
    }

    .modal-box .stay-btn:hover {
      background: #1d4ed8;
    }

    .modal-box .leave-btn {
      background: rgba(255, 255, 255, 0.1);
    }

    .modal-box .leave-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `;

  render() {
    return html`
      <div
        class="modal-overlay ${this.isVisible ? "visible" : ""}"
        @click=${this.onOverlayTap}
      >
        <div class="modal-box" role="dialog" aria-modal="true">
          <p>${translateText("help_modal.exit_confirmation")}</p>
          <div class="button-container">
            <button
              id="exit-confirm-modal-leave"
              class="leave-btn"
              @click=${this.onLeaveTap}
            >
              ${translateText("exit_confirm_modal.leave")}
            </button>
            <button
              id="exit-confirm-modal-stay"
              class="stay-btn"
              @click=${this.onStayTap}
            >
              ${translateText("exit_confirm_modal.stay")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    // Capture phase, so this runs before the settings window's own Escape
    // listener (window, bubble phase) and can keep it from closing settings
    // underneath this popup.
    window.addEventListener("keydown", this.onKeyDown, true);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.onKeyDown, true);
    super.disconnectedCallback();
  }

  /** No-op while already open (no stacked popups) or after a Leave. */
  show(onLeave: () => void) {
    if (this.isVisible || this.hasLeft) {
      return;
    }
    this.onLeave = onLeave;
    this.isVisible = true;
    this.requestUpdate();
  }

  hide() {
    this.isVisible = false;
    this.requestUpdate();
  }

  private readonly onLeaveTap = (): void => {
    if (this.hasLeft) {
      return;
    }
    this.hasLeft = true;
    this.hide();
    this.onLeave?.();
  };

  private readonly onStayTap = (): void => {
    this.hide();
  };

  private readonly onOverlayTap = (event: MouseEvent): void => {
    // Only a tap on the dark area itself, never one inside the box.
    if (event.target === event.currentTarget) {
      this.hide();
    }
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.isVisible || event.key !== "Escape") {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    this.hide();
  };
}
