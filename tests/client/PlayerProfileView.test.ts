/**
 * @jest-environment jsdom
 */
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      isYandexAuthorized: jest.fn(),
      getCurPlayerName: jest.fn(),
    },
  },
}));

import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import { loadPlayerProfileView } from "../../src/client/PlayerProfileView";

const isYandexAuthorized = FlashistFacade.instance
  .isYandexAuthorized as jest.Mock;
const getCurPlayerName = FlashistFacade.instance.getCurPlayerName as jest.Mock;

describe("loadPlayerProfileView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null for guests", async () => {
    isYandexAuthorized.mockResolvedValue(false);

    await expect(loadPlayerProfileView()).resolves.toBeNull();
    expect(getCurPlayerName).not.toHaveBeenCalled();
  });

  it("returns the stub profile with the Yandex name for authorized players", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    getCurPlayerName.mockResolvedValue("Игрок_7734");

    await expect(loadPlayerProfileView()).resolves.toEqual({
      displayName: "Игрок_7734",
      xp: 0,
      isCitizen: false,
    });
  });

  it("falls back to an empty name when the name lookup fails", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    getCurPlayerName.mockRejectedValue(new Error("sdk failure"));

    await expect(loadPlayerProfileView()).resolves.toEqual({
      displayName: "",
      xp: 0,
      isCitizen: false,
    });
  });
});
