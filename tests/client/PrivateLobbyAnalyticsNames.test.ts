/**
 * @jest-environment jsdom
 */

// Task 0451: the private-lobby event names in the REAL registry follow the
// project convention and the GameAnalytics limits, are new, and match the test
// helper map the other suites' mocks use.

import { flashistConstants } from "../../src/client/flashist/FlashistFacade";
import { PRIVATE_LOBBY_EVENTS } from "./support/privateLobbyEvents";

const registry = flashistConstants.analyticEvents as Record<string, string>;
const privateKeys = Object.keys(registry).filter((key) =>
  key.startsWith("PRIVATE_LOBBY_"),
);
const privateNames = privateKeys.map((key) => registry[key]);

describe("private-lobby analytics names (task 0451)", () => {
  it("there are exactly 16, all unique", () => {
    expect(privateKeys).toHaveLength(16);
    expect(new Set(privateNames).size).toBe(16);
  });

  it.each(privateNames)(
    "%s is PascalCase parts, colon-separated, 2-5 parts, no underscores, each part at most 64 chars",
    (name) => {
      expect(name).toMatch(/^[A-Z][A-Za-z0-9]*(:[A-Z][A-Za-z0-9]*){1,4}$/);
      expect(name).not.toContain("_");
      for (const part of name.split(":")) {
        expect(part.length).toBeLessThanOrEqual(64);
      }
      expect(name.startsWith("PrivateLobby:")).toBe(true);
    },
  );

  it("none equals an existing event name", () => {
    const others = Object.entries(registry)
      .filter(([key]) => !key.startsWith("PRIVATE_LOBBY_"))
      .map(([, name]) => name);
    for (const name of privateNames) {
      expect(others).not.toContain(name);
    }
  });

  it("the test helper map equals the real registry entries", () => {
    expect(
      Object.fromEntries(privateKeys.map((key) => [key, registry[key]])),
    ).toEqual(PRIVATE_LOBBY_EVENTS);
  });
});
