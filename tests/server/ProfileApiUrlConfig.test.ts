// jose pulls in ESM that jest can't load directly; DefaultConfig imports it.
// Mock it the same way CosmeticsConfig.test.ts does so the config module loads.
jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

import { DevServerConfig } from "../../src/core/configuration/DevConfig";
import { setRuntimeConfig } from "../../src/core/configuration/RuntimeConfig";

describe("profileApiUrl config resolution", () => {
  const originalEnv = process.env.PROFILE_API_URL;

  beforeEach(() => {
    delete process.env.PROFILE_API_URL;
    setRuntimeConfig({ profileApiUrl: undefined });
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.PROFILE_API_URL;
    } else {
      process.env.PROFILE_API_URL = originalEnv;
    }
    setRuntimeConfig({ profileApiUrl: undefined });
  });

  test("returns empty string when neither runtime override nor env var is set", () => {
    expect(new DevServerConfig().profileApiUrl()).toBe("");
  });

  test("reads PROFILE_API_URL from the environment", () => {
    process.env.PROFILE_API_URL = "https://api.geoconflict.ru";
    expect(new DevServerConfig().profileApiUrl()).toBe(
      "https://api.geoconflict.ru",
    );
  });

  test("trims surrounding whitespace from the env value", () => {
    process.env.PROFILE_API_URL = "  https://api.geoconflict.ru  ";
    expect(new DevServerConfig().profileApiUrl()).toBe(
      "https://api.geoconflict.ru",
    );
  });

  test("runtime override takes precedence over the env var", () => {
    process.env.PROFILE_API_URL = "https://env.example.com";
    setRuntimeConfig({ profileApiUrl: "https://runtime.example.com" });
    expect(new DevServerConfig().profileApiUrl()).toBe(
      "https://runtime.example.com",
    );
  });

  test("ignores a blank env var and falls back to empty string", () => {
    process.env.PROFILE_API_URL = "   ";
    expect(new DevServerConfig().profileApiUrl()).toBe("");
  });
});
