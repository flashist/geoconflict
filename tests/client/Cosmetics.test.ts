/**
 * @jest-environment jsdom
 */

jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      changeHref: jest.fn(),
      windowOrigin: "http://localhost:9000",
    },
  },
}));
jest.mock("../../src/client/jwt", () => ({
  getApiBase: jest.fn(() => "http://api.test"),
  getAuthHeader: jest.fn(() => ""),
}));
jest.mock("../../src/client/Main", () => ({
  getPersistentID: jest.fn(() => "persistent-id"),
}));
jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

import { fetchCosmetics } from "../../src/client/Cosmetics";

describe("fetchCosmetics", () => {
  const originalFetch = global.fetch;
  const originalWarn = console.warn;

  afterEach(() => {
    global.fetch = originalFetch;
    console.warn = originalWarn;
    jest.restoreAllMocks();
  });

  test("returns null and deduplicates warnings for optional HTTP failures", async () => {
    const warn = jest.fn();
    console.warn = warn;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(fetchCosmetics()).resolves.toBeNull();
    await expect(fetchCosmetics()).resolves.toBeNull();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "Unable to load optional cosmetics config from http://api.test/cosmetics.json: HTTP 404",
    );
    expect(global.fetch).toHaveBeenCalledWith("http://api.test/cosmetics.json");
  });
});
