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
