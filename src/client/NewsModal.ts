import { LitElement, css, html } from "lit";
import { customElement, query } from "lit/decorators.js";
import {
  AnnouncementEntry,
  getAnnouncements,
  markAnnouncementsRead,
} from "./Announcements";
import {
  flashistConstants,
  flashist_logEventAnalytics,
} from "./flashist/FlashistFacade";
import { translateText } from "../client/Utils";
import "./components/baseComponents/Modal";

@customElement("news-modal")
export class NewsModal extends LitElement {
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
  };

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.handleKeyDown);
    super.disconnectedCallback();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape") {
      e.preventDefault();
      this.close();
    }
  };

  static styles = css`
    :host {
      display: block;
    }

    .news-container {
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .announcement-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      color: #f4f4f5;
      line-height: 1.5;
      background: rgba(0, 0, 0, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 1rem;
    }

    .announcement-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .announcement-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      line-height: 1.3;
      color: #fff;
    }

    .announcement-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
      color: #d4d4d8;
      font-size: 0.92rem;
    }

    .announcement-tag {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 0.2rem 0.55rem;
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      text-transform: uppercase;
    }

    .announcement-tag.new {
      background: rgba(34, 197, 94, 0.16);
      color: #86efac;
    }

    .announcement-tag.upcoming {
      background: rgba(245, 158, 11, 0.16);
      color: #fcd34d;
    }

    .announcement-tag.update {
      background: rgba(59, 130, 246, 0.16);
      color: #93c5fd;
    }

    .announcement-body {
      margin: 0;
      white-space: pre-wrap;
      color: #e4e4e7;
    }

    .empty-state {
      color: #ddd;
      line-height: 1.5;
      background: rgba(0, 0, 0, 0.6);
      border-radius: 8px;
      padding: 1rem;
    }
  `;

  render() {
    const entries = getAnnouncements();

    return html`
      <o-modal title=${translateText("announcements.title")}>
        <div class="options-layout">
          <div class="options-section">
            <div class="news-container">
              ${entries.length === 0
                ? html`
                    <div class="empty-state">
                      ${translateText("announcements.empty")}
                    </div>
                  `
                : entries.map((entry) => this.renderAnnouncement(entry))}
            </div>
          </div>
        </div>
      </o-modal>
    `;
  }

  private renderAnnouncement(entry: AnnouncementEntry) {
    return html`
      <article class="announcement-card">
        <div class="announcement-header">
          <h3 class="announcement-title">${entry.title}</h3>
          <div class="announcement-meta">
            <span>${entry.date}</span>
            ${entry.tag
              ? html`
                  <span class="announcement-tag ${entry.tag}">
                    ${translateText(`announcements.tag.${entry.tag}`)}
                  </span>
                `
              : null}
          </div>
        </div>
        <p class="announcement-body">${entry.body}</p>
      </article>
    `;
  }

  public open() {
    markAnnouncementsRead();
    window.dispatchEvent(new CustomEvent("announcements-state-changed"));
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.ANNOUNCEMENTS_OPENED,
    );
    this.requestUpdate();
    this.modalEl?.open();
  }

  private close() {
    this.modalEl?.close();
  }
}
