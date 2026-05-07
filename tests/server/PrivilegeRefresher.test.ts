jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

import { Logger } from "winston";
import { PrivilegeRefresher } from "../../src/server/PrivilegeRefresher";

function testLogger() {
  const child = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return {
    child,
    parent: {
      child: jest.fn(() => child),
    } as unknown as Logger,
  };
}

describe("PrivilegeRefresher", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("failed refreshes stay fail-open without rejecting", async () => {
    const { child, parent } = testLogger();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    const refresher = new PrivilegeRefresher(
      "http://api.test/cosmetics.json",
      parent,
    );

    await expect(refresher.refreshNow()).resolves.toBeUndefined();
    await expect(refresher.refreshNow()).resolves.toBeUndefined();

    expect(child.warn).toHaveBeenCalledTimes(1);
    expect(child.warn).toHaveBeenCalledWith(
      expect.stringContaining("HTTP error! status: 404"),
    );
    expect(child.error).not.toHaveBeenCalled();
    expect(refresher.get().isAllowed([], {})).toEqual({
      type: "allowed",
      cosmetics: {},
    });
  });
});
