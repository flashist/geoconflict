/**
 * @jest-environment jsdom
 */
// Task 0507: the one-player message popup — contact text, Telegram and VK
// links in a new tab, and a Close button. Every tap logs its event.
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      PLAYER_MESSAGE_CLOSED: "PlayerMessage:Closed",
      PLAYER_MESSAGE_CLICK_TELEGRAM: "PlayerMessage:ClickTelegram",
      PLAYER_MESSAGE_CLICK_VK: "PlayerMessage:ClickVk",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
  TELEGRAM_CHANNEL_URL: "https://t.me/example",
  VK_CHANNEL_URL: "https://vk.com/example",
}));

import { flashist_logEventAnalytics } from "../../src/client/flashist/FlashistFacade";
import { PlayerMessageModal } from "../../src/client/PlayerMessageModal";

const logEvent = flashist_logEventAnalytics as jest.Mock;

async function mount(): Promise<PlayerMessageModal> {
  const modal = new PlayerMessageModal();
  document.body.appendChild(modal);
  await modal.updateComplete;
  return modal;
}

const overlay = (modal: PlayerMessageModal) =>
  modal.shadowRoot!.querySelector(".modal-overlay")!;
const byId = <T extends Element>(modal: PlayerMessageModal, id: string) =>
  modal.shadowRoot!.querySelector(`#${id}`) as T;

describe("PlayerMessageModal (task 0507)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    logEvent.mockClear();
  });

  it("is registered as <player-message-modal>", () => {
    expect(customElements.get("player-message-modal")).toBe(PlayerMessageModal);
  });

  it("is hidden until shown", async () => {
    const modal = await mount();
    expect(modal.isVisible).toBe(false);
    expect(overlay(modal).classList.contains("visible")).toBe(false);

    modal.show();
    await modal.updateComplete;
    expect(overlay(modal).classList.contains("visible")).toBe(true);
  });

  it("renders the contact text and both buttons from translation keys", async () => {
    const modal = await mount();
    const text = modal.shadowRoot!.textContent!;
    expect(text).toContain("player_message.contact_us_text");
    expect(text).toContain("player_message.telegram_button");
    expect(text).toContain("player_message.vk_button");
    expect(text).toContain("common.close");
  });

  it("both links point at our channels and open in a new tab", async () => {
    const modal = await mount();
    const telegram = byId<HTMLAnchorElement>(modal, "player-message-telegram");
    const vk = byId<HTMLAnchorElement>(modal, "player-message-vk");

    expect(telegram.getAttribute("href")).toBe("https://t.me/example");
    expect(vk.getAttribute("href")).toBe("https://vk.com/example");
    for (const link of [telegram, vk]) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener");
    }
  });

  it("Close hides it and logs Closed", async () => {
    const modal = await mount();
    modal.show();
    await modal.updateComplete;

    byId<HTMLButtonElement>(modal, "player-message-close").click();
    await modal.updateComplete;

    expect(modal.isVisible).toBe(false);
    expect(logEvent.mock.calls).toEqual([["PlayerMessage:Closed"]]);
  });

  it("each link tap logs its own event", async () => {
    const modal = await mount();
    modal.show();
    await modal.updateComplete;
    // jsdom does not navigate; stop it trying.
    modal.shadowRoot!.addEventListener("click", (event) =>
      event.preventDefault(),
    );

    byId<HTMLAnchorElement>(modal, "player-message-telegram").click();
    byId<HTMLAnchorElement>(modal, "player-message-vk").click();

    expect(logEvent.mock.calls).toEqual([
      ["PlayerMessage:ClickTelegram"],
      ["PlayerMessage:ClickVk"],
    ]);
  });

  it("close() from the pre-start list hides it without logging a close", async () => {
    const modal = await mount();
    modal.show();
    await modal.updateComplete;

    modal.close();
    await modal.updateComplete;

    expect(modal.isVisible).toBe(false);
    expect(logEvent).not.toHaveBeenCalled();
  });
});
