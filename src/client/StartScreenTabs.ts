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
        class="flex w-full gap-[3px] rounded-[10px] bg-[#1c1c1e]/85 p-[3px]"
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
