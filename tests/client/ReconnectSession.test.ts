// Task 0347 — saveReconnectSession now sits directly in front of the match
// start, so it must never throw (quota full, storage blocked in a privacy mode
// or an iframe). The jest environment is node, so localStorage is a stub.

import {
  loadReconnectSession,
  saveReconnectSession,
} from "../../src/client/ReconnectSession";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: jest.fn((key: string) => data.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: jest.fn((key: string) => {
      data.delete(key);
    }),
  };
}

describe("ReconnectSession (task 0347)", () => {
  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  test("R1: save does not throw when localStorage.setItem throws", () => {
    const storage = memoryStorage();
    storage.setItem.mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    (globalThis as any).localStorage = storage;
    expect(() => saveReconnectSession("g", "c")).not.toThrow();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  test("R2: save then load round-trips", () => {
    (globalThis as any).localStorage = memoryStorage();
    saveReconnectSession("g", "c");
    expect(loadReconnectSession()).toEqual({ gameID: "g", clientID: "c" });
  });
});
