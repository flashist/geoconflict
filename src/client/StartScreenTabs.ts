import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { FlashistFacade, flashistConstants } from "./flashist/FlashistFacade";
import {
  StartScreenTab,
  getActiveTab,
  setActiveTab,
} from "./StartScreenTabStorage";
import { translateText } from "./Utils";

export const START_SCREEN_TAB_CHANGED_EVENT = "start-screen-tab-changed";

const TAB_CONTENT_IDS: Record<StartScreenTab, string> = {
  multiplayer: "multiplayer-tab-content",
  singleplayer: "singleplayer-tab-content",
  private: "private-tab-content",
};

const TAB_UI_ELEMENT_IDS: Record<StartScreenTab, string> = {
  multiplayer: flashistConstants.uiElementIds.multiplayerTab,
  singleplayer: flashistConstants.uiElementIds.singleplayerTab,
  private: flashistConstants.uiElementIds.privateTab,
};

@customElement("start-screen-tabs")
export class StartScreenTabs extends LitElement {
  // Task 0412: the Private tab exists only once PrivateLobbyAccess has decided
  // the private-lobby rule is on (one rule check feeds the buttons AND the tab).
  @state() private isPrivateTabEnabled = false;
  // The tab read from storage. A stored "private" waits here until the tab is
  // enabled; storage is not rewritten meanwhile.
  private storedTab: StartScreenTab = getActiveTab();
  private hasTappedTab = false;
  @state() private activeTab: StartScreenTab =
    this.storedTab === "private" ? "multiplayer" : this.storedTab;

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    // Restore the persisted tab without firing analytics or storage writes.
    this.applyTab(this.activeTab);
  }

  render() {
    return html`
      <div
        class="flex w-full gap-[3px] rounded-[10px] bg-[#1c1c1e]/85 p-[3px]"
        role="tablist"
      >
        ${this.renderTabButton("multiplayer", "main.tab_multiplayer")}
        ${this.renderTabButton("singleplayer", "main.tab_singleplayer")}
        ${this.isPrivateTabEnabled
          ? this.renderTabButton("private", "main.tab_private")
          : nothing}
      </div>
    `;
  }

  /**
   * Shows the Private tab (task 0412). Safe to call more than once. If the
   * player's stored tab is "private" and they have not tapped a tab yet, switch
   * to it — no analytics, no storage write (owner ruling 2026-10-08, "Switch
   * unless they tapped").
   */
  public enablePrivateTab(): void {
    if (this.isPrivateTabEnabled) {
      return;
    }
    this.isPrivateTabEnabled = true;
    if (this.storedTab === "private" && !this.hasTappedTab) {
      this.activeTab = "private";
      this.applyTab("private");
    }
    this.requestUpdate();
  }

  private renderTabButton(tab: StartScreenTab, translationKey: string) {
    const isActive = this.activeTab === tab;
    return html`
      <button
        id="${tab}-tab-button"
        role="tab"
        aria-selected="${isActive}"
        class="flex-1 py-[7px] px-2 rounded-lg text-[13px] leading-tight font-bold transition-colors duration-200 ${isActive
          ? "bg-blue-600 text-white"
          : "bg-transparent text-[#8e8e93] hover:text-white"}"
        @click=${() => this.onTabTap(tab)}
      >
        ${translateText(translationKey)}
      </button>
    `;
  }

  private onTabTap(tab: StartScreenTab) {
    this.hasTappedTab = true;
    FlashistFacade.instance.logUiTapEvent(TAB_UI_ELEMENT_IDS[tab]);
    setActiveTab(tab);
    this.activeTab = tab;
    this.requestUpdate();
    this.applyTab(tab);
  }

  private applyTab(tab: StartScreenTab) {
    (Object.keys(TAB_CONTENT_IDS) as StartScreenTab[]).forEach(
      (contentTab) => {
        const element = document.getElementById(TAB_CONTENT_IDS[contentTab]);
        if (!element) {
          return;
        }
        if (contentTab === tab) {
          element.classList.remove("hidden");
        } else {
          element.classList.add("hidden");
        }
      },
    );
    document.dispatchEvent(
      new CustomEvent(START_SCREEN_TAB_CHANGED_EVENT, { detail: { tab } }),
    );
  }
}
