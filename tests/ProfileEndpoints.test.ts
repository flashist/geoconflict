import {
  DEFAULT_PROFILE_HTTP_PORT,
  profileHttpPort,
} from "../src/profile-server/ProfileEndpoints";

describe("profileHttpPort", () => {
  const original = process.env.PROFILE_PORT;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.PROFILE_PORT;
    } else {
      process.env.PROFILE_PORT = original;
    }
  });

  it("defaults to 8080 when PROFILE_PORT is unset", () => {
    delete process.env.PROFILE_PORT;
    expect(profileHttpPort()).toBe(DEFAULT_PROFILE_HTTP_PORT);
    expect(profileHttpPort()).toBe(8080);
  });

  it.each(["", "   "])(
    "falls back to 8080 for empty/whitespace value %p",
    (value) => {
      process.env.PROFILE_PORT = value;
      expect(profileHttpPort()).toBe(8080);
    },
  );

  it.each(["abc", "0", "-5"])(
    "falls back to 8080 for invalid value %p",
    (value) => {
      process.env.PROFILE_PORT = value;
      expect(profileHttpPort()).toBe(8080);
    },
  );

  it("parses a valid positive integer", () => {
    process.env.PROFILE_PORT = "3000";
    expect(profileHttpPort()).toBe(3000);
  });

  it("trims surrounding whitespace around a valid value", () => {
    process.env.PROFILE_PORT = " 9090 ";
    expect(profileHttpPort()).toBe(9090);
  });
});
