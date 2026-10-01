// Unit tests for the profile server's build identity (task 0355).
//
// build-deploy-profile.sh bakes the deploy's version name (e.g. 0.0.155-profile.3) and
// the full commit into the image as PROFILE_BUILD_VERSION / PROFILE_BUILD_COMMIT, and
// /health echoes them publicly. So the parse is deliberately strict: a value that is
// not a short, plain token becomes "unknown" rather than being reflected back.

import {
  UNKNOWN_BUILD_INFO,
  parseBuildInfo,
} from "../../src/profile-server/BuildInfo";

describe("parseBuildInfo", () => {
  test("a baked version and commit pass through", () => {
    expect(
      parseBuildInfo(
        "0.0.155-profile.3",
        "abc1234000000000000000000000000000000000",
      ),
    ).toEqual({
      version: "0.0.155-profile.3",
      commit: "abc1234000000000000000000000000000000000",
    });
  });

  test("unset or empty → unknown (a local run, or an image built without the args)", () => {
    expect(parseBuildInfo(undefined, undefined)).toEqual(UNKNOWN_BUILD_INFO);
    expect(parseBuildInfo("", "")).toEqual({
      version: "unknown",
      commit: "unknown",
    });
  });

  test("surrounding whitespace is trimmed", () => {
    expect(parseBuildInfo("  0.0.155-profile.3\n", " abc123 ")).toEqual({
      version: "0.0.155-profile.3",
      commit: "abc123",
    });
  });

  test.each([
    ["markup", "<script>alert(1)</script>"],
    ["an inner space", "0.0.155 profile"],
    ["a newline inside", "0.0.155\nprofile"],
    ["a URL", "https://example.invalid/x"],
    ["over 80 characters", "a".repeat(81)],
  ])("junk (%s) → unknown", (_label, raw) => {
    expect(parseBuildInfo(raw, raw)).toEqual({
      version: "unknown",
      commit: "unknown",
    });
  });

  test("80 characters is still accepted", () => {
    expect(parseBuildInfo("a".repeat(80), "b").version).toBe("a".repeat(80));
  });
});
