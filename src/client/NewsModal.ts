import { LitElement, css, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import {
  AnnouncementEntry,
  getAnnouncements,
  markAnnouncementsRead,
} from "./Announcements";
import {
  FlashistFacade,
  flashistConstants,
  flashist_logEventAnalytics,
} from "./flashist/FlashistFacade";
import {
  INBOX_STATE_CHANGED_EVENT,
  formatInboxDate,
  getInboxState,
  markInboxRead,
  refreshInbox,
  renderInboxMessage,
  type InboxState,
} from "./Inbox";
import type { InboxMessage } from "../core/profile/InboxContract";
import { translateText } from "../client/Utils";
import "./components/baseComponents/Modal";

type NewsTab = "global" | "personal";

@customElement("news-modal")
export class NewsModal extends LitElement {
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
  };
  private isOpen = false;

  // Personal inbox (task 0012). The tab strip exists ONLY while the inbox is
  // available (server-confirmed citizen); otherwise the modal is exactly the
  // single global list it always was — no greyed-out tab.
  @state() private activeTab: NewsTab = "global";
  @state() private inbox: InboxState = getInboxState();
  // Messages that were unread when the Personal tab was selected keep their
  // unread marker for this view even though they are marked read on open.
  private unreadAtOpen = new Set<number>();

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener(
      INBOX_STATE_CHANGED_EVENT,
      this.handleInboxStateChanged,
    );
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener(
      INBOX_STATE_CHANGED_EVENT,
      this.handleInboxStateChanged,
    );
    super.disconnectedCallback();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape") {
      e.preventDefault();
      this.close();
    }
  };

  private handleInboxStateChanged = () => {
    this.inbox = getInboxState();
    if (!this.inbox.available && this.activeTab === "personal") {
      this.activeTab = "global";
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

    /* Tab strip — same look as the start-screen tabs (StartScreenTabs.ts),
       written as plain CSS because this component renders in a shadow root. */
    .news-tabs {
      display: flex;
      gap: 3px;
      border-radius: 10px;
      background: rgba(28, 28, 30, 0.85);
      padding: 3px;
      margin: 1rem 1rem 0;
      box-sizing: border-box;
      width: calc(100% - 2rem);
    }

    .news-tab {
      flex: 1;
      padding: 7px 8px;
      border: 0;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.25;
      font-weight: 700;
      cursor: pointer;
      background: transparent;
      color: #8e8e93;
      transition:
        color 0.2s ease,
        background-color 0.2s ease;
    }

    .news-tab:hover {
      color: #fff;
    }

    .news-tab[aria-selected="true"] {
      background: #2563eb;
      color: #fff;
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

    .announcement-card.unread {
      border-color: rgba(59, 130, 246, 0.6);
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
    const showPersonal = this.inbox.available && this.activeTab === "personal";

    return html`
      <o-modal
        title=${translateText("announcements.title")}
        @modal-close=${this.handleModalClosed}
      >
        <div class="options-layout">
          <div class="options-section">
            ${this.inbox.available ? this.renderTabs() : null}
            <div class="news-container">
              ${showPersonal ? this.renderInbox() : this.renderGlobal()}
            </div>
          </div>
        </div>
      </o-modal>
    `;
  }

  private renderTabs() {
    return html`
      <div class="news-tabs" role="tablist">
        ${this.renderTabButton("global", "announcements.tab_global")}
        ${this.renderTabButton("personal", "announcements.tab_personal")}
      </div>
    `;
  }

  private renderTabButton(tab: NewsTab, translationKey: string) {
    const isActive = this.activeTab === tab;
    return html`
      <button
        id="news-tab-${tab}"
        class="news-tab"
        role="tab"
        aria-selected="${isActive}"
        @click=${() => this.selectTab(tab)}
      >
        ${translateText(translationKey)}
      </button>
    `;
  }

  private selectTab(tab: NewsTab) {
    FlashistFacade.instance.logUiTapEvent(
      tab === "personal"
        ? flashistConstants.uiElementIds.announcementsTabPersonal
        : flashistConstants.uiElementIds.announcementsTabGlobal,
    );
    if (tab === "personal") {
      flashist_logEventAnalytics(flashistConstants.analyticEvents.INBOX_OPENED);
      this.unreadAtOpen = new Set(
        this.inbox.messages
          .filter((message) => message.readAt === null)
          .map((message) => message.id),
      );
      // Brief: opening the Personal tab marks everything read (server-side,
      // so every device agrees). Best-effort — a failure re-syncs next load.
      void markInboxRead();
    }
    this.activeTab = tab;
  }

  private renderGlobal() {
    const entries = getAnnouncements();
    return entries.length === 0
      ? html`
          <div class="empty-state">${translateText("announcements.empty")}</div>
        `
      : entries.map((entry) => this.renderAnnouncement(entry));
  }

  private renderInbox() {
    const messages = this.inbox.messages;
    return messages.length === 0
      ? html`<div class="empty-state">${translateText("inbox.empty")}</div>`
      : messages.map((message) => this.renderInboxMessage(message));
  }

  private renderInboxMessage(message: InboxMessage) {
    const { title, body } = renderInboxMessage(message);
    const isUnread =
      message.readAt === null || this.unreadAtOpen.has(message.id);
    return html`
      <article class="announcement-card ${isUnread ? "unread" : ""}">
        <div class="announcement-header">
          <h3 class="announcement-title">${title}</h3>
          <div class="announcement-meta">
            <span>${formatInboxDate(message.sentAt)}</span>
            ${isUnread
              ? html`
                  <span class="announcement-tag new">
                    ${translateText("announcements.tag.new")}
                  </span>
                `
              : null}
          </div>
        </div>
        <p class="announcement-body">${body}</p>
      </article>
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
    if (this.isOpen) {
      return;
    }

    markAnnouncementsRead();
    window.dispatchEvent(new CustomEvent("announcements-state-changed"));
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.ANNOUNCEMENTS_OPENED,
    );
    // Always land on Global; re-fetch the inbox so a message sent since page
    // load (or a read on another device) is reflected. Never throws.
    this.activeTab = "global";
    this.unreadAtOpen = new Set();
    void refreshInbox();
    this.isOpen = true;
    this.requestUpdate();
    this.modalEl?.open();
  }

  private handleModalClosed = () => {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.ANNOUNCEMENTS_CLOSED,
    );
  };

  private close() {
    this.modalEl?.close();
  }
}
