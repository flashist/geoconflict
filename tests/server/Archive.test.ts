// Schemas -> CosmeticSchemas uses `jose` at runtime (untransformed ESM under jest); mock it
// the same way LocalServer.test.ts does.
jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));

// Archive.ts -> Logger.ts pulls in winston + the OpenTelemetry SDK. Stub it so the test
// stays isolated to the archive gating logic.
jest.mock("../../src/server/Logger", () => ({
  logger: {
    child: () => ({
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    }),
  },
  formatError: (error: unknown) => String(error),
}));

import { DevServerConfig } from "../../src/core/configuration/DevConfig";
import { prodConfig } from "../../src/core/configuration/ProdConfig";
import { archive } from "../../src/server/Archive";

describe("archive() while archiving is disabled", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("makes no request, so it can no longer 404 / flood telemetry", async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    // Shape is irrelevant: the guard returns before the record is even read.
    await archive({ info: { gameID: "abcd1234" } } as never);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps archiving off by default (single interim switch)", () => {
    expect(prodConfig.archiveEnabled()).toBe(false);
    expect(new DevServerConfig().archiveEnabled()).toBe(false);
  });
});
