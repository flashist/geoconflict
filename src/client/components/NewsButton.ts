import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import bellIcon from "../../../resources/images/Bell.svg";
import {
  announcements,
  hasUnreadAnnouncements,
  readLastSeenAnnouncementId,
} from "../Announcements";
import { flashistConstants, FlashistFacade } from "../flashist/FlashistFacade";
import { NewsModal } from "../NewsModal";
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
  }

  disconnectedCallback() {
    window.removeEventListener(
      "announcements-state-changed",
      this.handleAnnouncementsStateChanged,
    );
    super.disconnectedCallback();
  }

  private handleAnnouncementsStateChanged = () => this.refreshUnreadState();

  private refreshUnreadState() {
    this.isActive = hasUnreadAnnouncements(
      announcements,
      readLastSeenAnnouncementId(),
    );
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
        class="flex relative ${this.hidden ? "parent-hidden" : ""} ${this
          .isActive
          ? "active"
          : ""}"
      >
        <button
          class="border p-[4px] rounded-lg flex cursor-pointer border-black/30 dark:border-gray-300/60 bg-white/70 dark:bg-[rgba(55,65,81,0.7)]"
          @click=${this.handleClick}
          title=${translateText("announcements.title")}
          aria-label=${translateText("announcements.title")}
        >
          <img
            class="size-[48px] dark:invert"
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
