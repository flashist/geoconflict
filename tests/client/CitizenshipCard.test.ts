/**
 * @jest-environment jsdom
 */
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
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

const logUiTapEvent = FlashistFacade.instance.logUiTapEvent as jest.Mock;
const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;

describe("CitizenshipCard", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
    resetCitizenshipSeenReportedForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the guest shell strings", async () => {
    const card = await appendCard({ visible: true });

    expect(card.textContent).toContain("citizenship_card.title");
    expect(card.textContent).toContain("citizenship_card.guest_subtitle");
    expect(card.textContent).toContain("citizenship_card.login_cta");
  });

  it("fires Citizenship:Seen exactly once when the card is visible", async () => {
    await appendCard({ visible: true });

    expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Seen");
  });

  it("does not fire Citizenship:Seen again on re-render or reconnect", async () => {
    const card = await appendCard({ visible: true });

    card.requestUpdate();
    await flushLit(card);
    card.remove();
    document.body.appendChild(card);
    await flushLit(card);
    await flushMicrotasks();

    expect(logEventAnalytics).toHaveBeenCalledTimes(1);
  });

  it("does not fire Citizenship:Seen while the card is not visible", async () => {
    const card = await appendCard({ visible: false });

    expect(logEventAnalytics).not.toHaveBeenCalled();

    setCardVisibility(true);
    card.maybeReportSeen();

    expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Seen");
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
});

function setCardVisibility(visible: boolean): void {
  jest
    .spyOn(CitizenshipCard.prototype as never as { isCardVisible: () => boolean }, "isCardVisible")
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
  return card;
}

async function flushMicrotasks(): Promise<void> {
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
