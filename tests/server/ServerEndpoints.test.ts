import {
  COSMETICS_JSON_PATH,
  localCosmeticsJsonUrl,
  localMasterUrl,
  masterInternalOrigin,
  MASTER_HTTP_PORT,
} from "../../src/server/ServerEndpoints";

describe("ServerEndpoints", () => {
  const originalMasterInternalOrigin = process.env.MASTER_INTERNAL_ORIGIN;

  afterEach(() => {
    if (originalMasterInternalOrigin === undefined) {
      delete process.env.MASTER_INTERNAL_ORIGIN;
    } else {
      process.env.MASTER_INTERNAL_ORIGIN = originalMasterInternalOrigin;
    }
  });

  test("worker cosmetics refresh uses the local master endpoint", () => {
    delete process.env.MASTER_INTERNAL_ORIGIN;

    expect(MASTER_HTTP_PORT).toBe(3000);
    expect(COSMETICS_JSON_PATH).toBe("/cosmetics.json");
    expect(masterInternalOrigin()).toBe("http://127.0.0.1:3000");
    expect(localCosmeticsJsonUrl()).toBe(
      "http://127.0.0.1:3000/cosmetics.json",
    );
  });

  test("supports an explicit internal master origin override", () => {
    process.env.MASTER_INTERNAL_ORIGIN = "http://master.internal:3000/";

    expect(masterInternalOrigin()).toBe("http://master.internal:3000");
    expect(localMasterUrl("/api/env")).toBe(
      "http://master.internal:3000/api/env",
    );
  });
});
