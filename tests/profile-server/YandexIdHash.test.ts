// Unit tests for the 152-ФЗ keyed-hash helper. The pepper is read from
// process.env.PROFILE_ID_PEPPER and memoized, so each test sets the env and resets
// the cache before asserting.

import {
  __resetPepperCacheForTests,
  assertPepperConfigured,
  hashYandexId,
} from "../../src/profile-server/YandexIdHash";

// >= 32 chars so the fail-closed length check accepts it.
const PEPPER = "test-pepper-0123456789abcdef0123456789abcdef";
const OTHER_PEPPER = "other-pepper-0123456789abcdef0123456789abcdef";

describe("hashYandexId", () => {
  const ORIGINAL = process.env.PROFILE_ID_PEPPER;

  beforeEach(() => {
    process.env.PROFILE_ID_PEPPER = PEPPER;
    __resetPepperCacheForTests();
  });

  afterEach(() => {
    process.env.PROFILE_ID_PEPPER = ORIGINAL;
    __resetPepperCacheForTests();
  });

  test("is deterministic — same id + pepper yields an identical 64-char hex digest", () => {
    const a = hashYandexId("player-42");
    const b = hashYandexId("player-42");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  test("different ids produce different hashes", () => {
    expect(hashYandexId("player-1")).not.toBe(hashYandexId("player-2"));
  });

  test("a different pepper re-keys the hash (irreversibility depends on the key)", () => {
    const withFirst = hashYandexId("player-42");
    process.env.PROFILE_ID_PEPPER = OTHER_PEPPER;
    __resetPepperCacheForTests();
    expect(hashYandexId("player-42")).not.toBe(withFirst);
  });

  test("known-answer: a fixed (pepper, id) maps to a fixed digest", () => {
    // Anti-regression: pins the algorithm (HMAC-SHA256), key, and utf8/hex encoding.
    // If this changes, every stored hash is silently orphaned — fail loud instead.
    expect(hashYandexId("yandex-known-1")).toBe(
      "0814e9387305dd7f038226875b03565d27b0348a31cd38b244116667fe549b0a",
    );
  });

  describe("fails closed when the pepper is misconfigured", () => {
    test("throws when PROFILE_ID_PEPPER is unset", () => {
      delete process.env.PROFILE_ID_PEPPER;
      __resetPepperCacheForTests();
      expect(() => hashYandexId("player-42")).toThrow(/PROFILE_ID_PEPPER/);
    });

    test("throws when PROFILE_ID_PEPPER is empty", () => {
      process.env.PROFILE_ID_PEPPER = "";
      __resetPepperCacheForTests();
      expect(() => hashYandexId("player-42")).toThrow(/PROFILE_ID_PEPPER/);
    });

    test("throws when PROFILE_ID_PEPPER is shorter than 32 chars", () => {
      process.env.PROFILE_ID_PEPPER = "too-short";
      __resetPepperCacheForTests();
      expect(() => hashYandexId("player-42")).toThrow(/too short/);
    });
  });
});

describe("assertPepperConfigured", () => {
  const ORIGINAL = process.env.PROFILE_ID_PEPPER;

  afterEach(() => {
    process.env.PROFILE_ID_PEPPER = ORIGINAL;
    __resetPepperCacheForTests();
  });

  test("does not throw when a valid pepper is set", () => {
    process.env.PROFILE_ID_PEPPER = PEPPER;
    __resetPepperCacheForTests();
    expect(() => assertPepperConfigured()).not.toThrow();
  });

  test("throws at boot when the pepper is missing", () => {
    delete process.env.PROFILE_ID_PEPPER;
    __resetPepperCacheForTests();
    expect(() => assertPepperConfigured()).toThrow(/PROFILE_ID_PEPPER/);
  });
});
