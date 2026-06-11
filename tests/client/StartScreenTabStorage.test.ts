/**
 * @jest-environment jsdom
 */
import {
  ACTIVE_TAB_STORAGE_KEY,
  getActiveTab,
  setActiveTab,
} from "../../src/client/StartScreenTabStorage";

describe("StartScreenTabStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it("defaults to the multiplayer tab when nothing is stored", () => {
    expect(getActiveTab()).toBe("multiplayer");
  });

  it("round-trips the singleplayer tab", () => {
    setActiveTab("singleplayer");
    expect(getActiveTab()).toBe("singleplayer");
  });

  it("writes the storage key from the task brief", () => {
    setActiveTab("singleplayer");
    expect(localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)).toBe("singleplayer");
    expect(ACTIVE_TAB_STORAGE_KEY).toBe("geoconflict_active_tab");
  });

  it("falls back to multiplayer for unknown stored values", () => {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "garbage");
    expect(getActiveTab()).toBe("multiplayer");
  });

  it("falls back to multiplayer when storage reads throw", () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    expect(getActiveTab()).toBe("multiplayer");
  });

  it("does not throw when storage writes fail", () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    expect(() => setActiveTab("singleplayer")).not.toThrow();
  });
});
