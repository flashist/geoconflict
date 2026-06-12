/**
 * @jest-environment jsdom
 */
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/FlagInput", () => ({
  FLAG_STORAGE_KEY: "flag",
}));
jest.mock("../../src/client/PlayerProfileView", () => ({
  CITIZENSHIP_XP_THRESHOLD: 1000,
  loadPlayerProfileView: jest.fn().mockResolvedValue(null),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      CITIZENSHIP_SURFACE_SEEN: "Citizenship:Seen",
    },
    uiElementIds: {
      citizenshipLoginToEarn: "CitizenshipLoginToEarn",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
  flashist_waitGameInitComplete: jest.fn().mockResolvedValue(undefined),
  FlashistFacade: {
    instance: {
      logUiTapEvent: jest.fn(),
      openYandexAuthDialog: jest.fn().mockResolvedValue(false),
      isCitizenshipUiEnabled: jest.fn().mockResolvedValue(true),
    },
  },
}));

import {
  CITIZENSHIP_LOGIN_REQUESTED_EVENT,
  CitizenshipCard,
  resetCitizenshipSeenReportedForTests,
} from "../../src/client/CitizenshipCard";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import { loadPlayerProfileView } from "../../src/client/PlayerProfileView";

const logUiTapEvent = FlashistFacade.instance.logUiTapEvent as jest.Mock;
const openYandexAuthDialog = FlashistFacade.instance
  .openYandexAuthDialog as jest.Mock;
const isCitizenshipUiEnabled = FlashistFacade.instance
  .isCitizenshipUiEnabled as jest.Mock;
const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;
const loadProfile = loadPlayerProfileView as jest.Mock;

describe("CitizenshipCard", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    jest.clearAllMocks();
    loadProfile.mockResolvedValue(null);
    openYandexAuthDialog.mockResolvedValue(false);
    isCitizenshipUiEnabled.mockResolvedValue(true);
    resetCitizenshipSeenReportedForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("citizenship_ui experiment flag", () => {
    it("renders nothing and fires no analytics when the flag is disabled", async () => {
      isCitizenshipUiEnabled.mockResolvedValue(false);

      const card = await appendCard({ visible: true });

      expect(card.textContent!.trim()).toBe("");
      expect(card.classList.contains("hidden")).toBe(true);
      expect(logEventAnalytics).not.toHaveBeenCalled();
      expect(loadProfile).not.toHaveBeenCalled();
    });

    it("renders the card and fires Citizenship:Seen when the flag is enabled", async () => {
      const card = await appendCard({ visible: true });

      expect(card.textContent).toContain("citizenship_card.title");
      expect(card.classList.contains("hidden")).toBe(false);
      expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Seen");
    });
  });

  describe("guest state", () => {
    it("renders the guest shell strings", async () => {
      const card = await appendCard({ visible: true });

      expect(card.textContent).toContain("citizenship_card.title");
      expect(card.textContent).toContain("citizenship_card.guest_subtitle");
      expect(card.textContent).toContain("citizenship_card.login_cta");
      expect(card.textContent).not.toContain("citizenship_card.xp_label");
    });

    it("fires the login analytics and event on CTA tap", async () => {
      const card = await appendCard({ visible: true });
      const loginRequests: Event[] = [];
      document.addEventListener(CITIZENSHIP_LOGIN_REQUESTED_EVENT, (event) => {
        loginRequests.push(event);
      });

      const loginButton = card.querySelector(
        "#citizenship-login-button",
      ) as HTMLButtonElement;
      expect(loginButton).not.toBeNull();
      loginButton.click();

      expect(logUiTapEvent).toHaveBeenCalledTimes(1);
      expect(logUiTapEvent).toHaveBeenCalledWith("CitizenshipLoginToEarn");
      expect(loginRequests).toHaveLength(1);
    });

    it("transitions to the logged-in state after a successful login", async () => {
      const card = await appendCard({ visible: true });
      openYandexAuthDialog.mockResolvedValue(true);
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 0,
        isCitizen: false,
      });

      (
        card.querySelector("#citizenship-login-button") as HTMLButtonElement
      ).click();
      await flushMicrotasks();
      await flushLit(card);

      expect(openYandexAuthDialog).toHaveBeenCalledTimes(1);
      expect(card.textContent).toContain("Игрок_7734");
      expect(card.textContent).toContain("citizenship_card.xp_label");
      expect(card.querySelector("#citizenship-login-button")).toBeNull();
    });

    it("ignores re-taps while the auth dialog is open", async () => {
      const card = await appendCard({ visible: true });
      let resolveDialog: (value: boolean) => void = () => {};
      openYandexAuthDialog.mockImplementation(
        () => new Promise<boolean>((resolve) => (resolveDialog = resolve)),
      );

      const loginButton = card.querySelector(
        "#citizenship-login-button",
      ) as HTMLButtonElement;
      loginButton.click();
      loginButton.click();
      loginButton.click();

      expect(logUiTapEvent).toHaveBeenCalledTimes(1);
      expect(openYandexAuthDialog).toHaveBeenCalledTimes(1);

      resolveDialog(false);
      await flushMicrotasks();

      loginButton.click();
      expect(openYandexAuthDialog).toHaveBeenCalledTimes(2);
    });

    it("stays in the guest state when the auth dialog is dismissed", async () => {
      const card = await appendCard({ visible: true });
      openYandexAuthDialog.mockResolvedValue(false);

      (
        card.querySelector("#citizenship-login-button") as HTMLButtonElement
      ).click();
      await flushMicrotasks();
      await flushLit(card);

      expect(card.textContent).toContain("citizenship_card.login_cta");
    });
  });

  describe("authorized, not yet a citizen", () => {
    it("renders name, XP value, and a partial bar without the citizen badge", async () => {
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 250,
        isCitizen: false,
      });

      const card = await appendCard({ visible: true });

      expect(card.textContent).toContain("Игрок_7734");
      expect(card.textContent).toContain("citizenship_card.xp_label");
      expect(card.textContent).toContain((250).toLocaleString());
      expect(card.textContent).toContain((1000).toLocaleString());
      expect(card.textContent).not.toContain("citizenship_card.citizen_badge");
      expect(card.textContent).not.toContain("citizenship_card.guest_subtitle");

      const bar = card.querySelector(
        "#citizenship-xp-bar-fill",
      ) as HTMLElement;
      expect(bar).not.toBeNull();
      expect(bar.style.width).toBe("25%");
    });

    it("caps the bar at 100% while showing XP past the threshold", async () => {
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 1500,
        isCitizen: false,
      });

      const card = await appendCard({ visible: true });

      const bar = card.querySelector(
        "#citizenship-xp-bar-fill",
      ) as HTMLElement;
      expect(bar.style.width).toBe("100%");
      expect(card.textContent).toContain((1500).toLocaleString());
    });
  });

  describe("citizen state", () => {
    it("renders the citizen badge and a full bar", async () => {
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 1240,
        isCitizen: true,
      });

      const card = await appendCard({ visible: true });

      expect(card.textContent).toContain("citizenship_card.citizen_badge");
      expect(card.textContent).toContain((1240).toLocaleString());
      const bar = card.querySelector(
        "#citizenship-xp-bar-fill",
      ) as HTMLElement;
      expect(bar.style.width).toBe("100%");
    });
  });

  describe("Citizenship:Seen", () => {
    it("fires exactly once when the card is visible, in any state", async () => {
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 0,
        isCitizen: false,
      });
      await appendCard({ visible: true });

      expect(logEventAnalytics).toHaveBeenCalledTimes(1);
      expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Seen");
    });

    it("does not fire again on re-render or reconnect", async () => {
      const card = await appendCard({ visible: true });

      card.requestUpdate();
      await flushLit(card);
      card.remove();
      document.body.appendChild(card);
      await flushLit(card);
      await flushMicrotasks();

      expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    });

    it("does not fire while the card is not visible", async () => {
      const card = await appendCard({ visible: false });

      expect(logEventAnalytics).not.toHaveBeenCalled();

      setCardVisibility(true);
      card.maybeReportSeen();

      expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    });
  });
});

function setCardVisibility(visible: boolean): void {
  jest
    .spyOn(
      CitizenshipCard.prototype as never as { isCardVisible: () => boolean },
      "isCardVisible",
    )
    .mockReturnValue(visible);
}

async function appendCard({
  visible,
}: {
  visible: boolean;
}): Promise<CitizenshipCard> {
  setCardVisibility(visible);
  const card = new CitizenshipCard();
  document.body.appendChild(card);
  await flushLit(card);
  await flushMicrotasks();
  await flushLit(card);
  return card;
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function flushLit(element: Element): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  if ("updateComplete" in element) {
    await (element as Element & { updateComplete: Promise<unknown> })
      .updateComplete;
  }
}
