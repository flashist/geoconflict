import { LitElement, html } from "lit";
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
};

@customElement("start-screen-tabs")
export class StartScreenTabs extends LitElement {
  @state() private activeTab: StartScreenTab = getActiveTab();

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
        class="flex w-full rounded-xl overflow-hidden border border-black/30 dark:border-gray-300/60 bg-white/70 dark:bg-[rgba(55,65,81,0.7)]"
        role="tablist"
      >
        ${this.renderTabButton("multiplayer", "main.tab_multiplayer")}
        ${this.renderTabButton("singleplayer", "main.tab_singleplayer")}
      </div>
    `;
  }

  private renderTabButton(tab: StartScreenTab, translationKey: string) {
    const isActive = this.activeTab === tab;
    return html`
      <button
        id="${tab}-tab-button"
        role="tab"
        aria-selected="${isActive}"
        class="flex-1 py-2 px-2 text-base font-medium transition-colors duration-200 ${isActive
          ? "bg-[#0075ff] text-white"
          : "text-gray-700 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/10"}"
        @click=${() => this.onTabTap(tab)}
      >
        ${translateText(translationKey)}
      </button>
    `;
  }

  private onTabTap(tab: StartScreenTab) {
    FlashistFacade.instance.logUiTapEvent(
      tab === "multiplayer"
        ? flashistConstants.uiElementIds.multiplayerTab
        : flashistConstants.uiElementIds.singleplayerTab,
    );
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
