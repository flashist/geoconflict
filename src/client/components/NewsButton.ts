import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import bellIcon from "../../../resources/images/Bell.svg";
import {
  announcements,
  hasUnreadAnnouncements,
  readLastSeenAnnouncementId,
} from "../Announcements";
import {
  flashistConstants,
  FlashistFacade,
  flashist_waitGameInitComplete,
} from "../flashist/FlashistFacade";
import {
  INBOX_STATE_CHANGED_EVENT,
  getInboxState,
  loadInboxState,
  refreshInbox,
} from "../Inbox";
import { NewsModal } from "../NewsModal";
import { PURCHASES_RECONCILED_EVENT } from "../PaymentsReconciliation";
import { translateText } from "../Utils";

@customElement("news-button")
export class NewsButton extends LitElement {
  @property({ type: Boolean }) hidden = false;
  @state() private isActive = false;

  connectedCallback() {
    super.connectedCallback();
    this.refreshUnreadState();
    window.addEventListener(
      "announcements-state-changed",
      this.handleAnnouncementsStateChanged,
    );
    // Personal inbox (task 0012): the dot also reflects unread personal
    // messages. Kick the (shared, single-flight) load once init completes; a
    // purchase reconciled mid-session may have produced a welcome message, so
    // re-fetch on that signal too. Both are best-effort and never throw.
    window.addEventListener(
      INBOX_STATE_CHANGED_EVENT,
      this.handleAnnouncementsStateChanged,
    );
    window.addEventListener(
      PURCHASES_RECONCILED_EVENT,
      this.handlePurchasesReconciled,
    );
    flashist_waitGameInitComplete()
      .then(() => loadInboxState())
      .catch(() => {
        // Degraded init or a failed load — the bell simply shows no inbox dot.
      });
  }

  disconnectedCallback() {
    window.removeEventListener(
      "announcements-state-changed",
      this.handleAnnouncementsStateChanged,
    );
    window.removeEventListener(
      INBOX_STATE_CHANGED_EVENT,
      this.handleAnnouncementsStateChanged,
    );
    window.removeEventListener(
      PURCHASES_RECONCILED_EVENT,
      this.handlePurchasesReconciled,
    );
    super.disconnectedCallback();
  }

  private handleAnnouncementsStateChanged = () => this.refreshUnreadState();

  private handlePurchasesReconciled = () => {
    void refreshInbox();
  };

  private refreshUnreadState() {
    this.isActive =
      hasUnreadAnnouncements(announcements, readLastSeenAnnouncementId()) ||
      getInboxState().unreadCount > 0;
  }

  private handleClick() {
    FlashistFacade.instance.logUiTapEvent(
      flashistConstants.uiElementIds.announcementsBell,
    );

    const newsModal = document.querySelector("news-modal") as NewsModal;
    if (newsModal) {
      newsModal.open();
    }
  }

  render() {
    return html`
      <div
        class="relative ${this.hidden ? "parent-hidden" : ""} ${this.isActive
          ? "active"
          : ""}"
      >
        <button
          class="flex size-10 cursor-pointer items-center justify-center rounded-full bg-[#0075ff] text-white shadow-lg transition-colors duration-300 hover:bg-[#0068de] focus:outline-none"
          @click=${this.handleClick}
          title=${translateText("announcements.title")}
          aria-label=${translateText("announcements.title")}
        >
          <img
            class="size-7 brightness-0 invert"
            src="${bellIcon}"
            alt=${translateText("announcements.title")}
          />
        </button>
      </div>
    `;
  }

  createRenderRoot() {
    return this;
  }
}
