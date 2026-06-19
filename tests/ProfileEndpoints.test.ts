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

  // parseInt is too lenient on its own — these must NOT slip through.
  it.each(["1.5", "3000abc", "8080abc"])(
    "falls back to 8080 for non-integer / numeric-suffix value %p",
    (value) => {
      process.env.PROFILE_PORT = value;
      expect(profileHttpPort()).toBe(8080);
    },
  );

  it.each(["65536", "99999999", "70000"])(
    "falls back to 8080 for out-of-range port %p",
    (value) => {
      process.env.PROFILE_PORT = value;
      expect(profileHttpPort()).toBe(8080);
    },
  );

  it("accepts the maximum valid port 65535", () => {
    process.env.PROFILE_PORT = "65535";
    expect(profileHttpPort()).toBe(65535);
  });

  it("parses a valid positive integer", () => {
    process.env.PROFILE_PORT = "3000";
    expect(profileHttpPort()).toBe(3000);
  });

  it("trims surrounding whitespace around a valid value", () => {
    process.env.PROFILE_PORT = " 9090 ";
    expect(profileHttpPort()).toBe(9090);
  });
});
