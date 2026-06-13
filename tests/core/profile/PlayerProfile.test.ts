import {
  CURRENT_PROFILE_SCHEMA_VERSION,
  PlayerProfile,
  PlayerProfileSchema,
  createGuestProfile,
  migrateProfile,
} from "../../../src/core/profile/PlayerProfile";

const EPOCH_ISO = new Date(0).toISOString();

function validV1Profile(): PlayerProfile {
  return {
    schema_version: 1,
    yandex_player_id: "yandex-123",
    persistent_id: "11111111-1111-1111-1111-111111111111",
    xp: 250,
    is_citizen: false,
    is_paid_citizen: false,
    citizenship_earned_at: null,
    citizenship_purchased_at: null,
    display_name: "Commander",
    created_at: "2026-06-13T10:00:00.000Z",
    updated_at: "2026-06-13T12:00:00.000Z",
  };
}

describe("PlayerProfile contract", () => {
  test("CURRENT_PROFILE_SCHEMA_VERSION is 1", () => {
    expect(CURRENT_PROFILE_SCHEMA_VERSION).toBe(1);
  });

  describe("migrateProfile", () => {
    test("a valid v1 profile round-trips unchanged", () => {
      const profile = validV1Profile();
      expect(migrateProfile(profile)).toEqual(profile);
      expect(PlayerProfileSchema.safeParse(profile).success).toBe(true);
    });

    test("a hypothetical future v2 object migrates to a valid current object", () => {
      const future = {
        ...validV1Profile(),
        schema_version: 2,
        future_field: "not yet known",
      };

      const result = migrateProfile(future);

      expect(result.schema_version).toBe(CURRENT_PROFILE_SCHEMA_VERSION);
      expect(PlayerProfileSchema.safeParse(result).success).toBe(true);
      // Unknown future field is dropped, known fields are preserved.
      expect(result).not.toHaveProperty("future_field");
      expect(result.xp).toBe(250);
    });

    test("an older v0 profile is upgraded to the current version", () => {
      const old = { ...validV1Profile(), schema_version: 0 };
      const result = migrateProfile(old);
      expect(result.schema_version).toBe(1);
      expect(PlayerProfileSchema.safeParse(result).success).toBe(true);
    });

    test("missing fields receive documented defaults", () => {
      const result = migrateProfile({ persistent_id: "p" });

      expect(result).toEqual({
        schema_version: 1,
        yandex_player_id: null,
        persistent_id: "p",
        xp: 0,
        is_citizen: false,
        is_paid_citizen: false,
        citizenship_earned_at: null,
        citizenship_purchased_at: null,
        display_name: null,
        created_at: EPOCH_ISO,
        updated_at: EPOCH_ISO,
      });
    });

    test("bad field types are coerced deterministically", () => {
      const result = migrateProfile({
        persistent_id: "p",
        xp: -5,
        created_at: "nope",
        is_citizen: "yes",
        yandex_player_id: 123,
      });

      expect(result.xp).toBe(0);
      expect(result.created_at).toBe(EPOCH_ISO);
      expect(result.is_citizen).toBe(false);
      expect(result.yandex_player_id).toBeNull();
      expect(PlayerProfileSchema.safeParse(result).success).toBe(true);
    });

    test.each([
      ["null", null],
      ["a string", "garbage"],
      ["a number", 42],
      ["an array", []],
      ["undefined", undefined],
    ])("malformed input (%s) yields a valid default profile", (_label, input) => {
      const result = migrateProfile(input);
      expect(PlayerProfileSchema.safeParse(result).success).toBe(true);
      expect(result.schema_version).toBe(1);
      expect(result.xp).toBe(0);
      expect(result.persistent_id).toBe("");
      expect(result.created_at).toBe(EPOCH_ISO);
    });

    test("never throws on malformed input", () => {
      expect(() => migrateProfile(null)).not.toThrow();
      expect(() => migrateProfile(Symbol("x") as unknown)).not.toThrow();
      expect(() => migrateProfile({ xp: "lots", nested: { a: 1 } })).not.toThrow();
    });
  });

  describe("createGuestProfile", () => {
    test("produces a fresh v1 profile with injected timestamps", () => {
      const now = "2026-06-13T09:30:00.000Z";
      const profile = createGuestProfile("guest-uuid", now);

      expect(profile).toEqual({
        schema_version: 1,
        yandex_player_id: null,
        persistent_id: "guest-uuid",
        xp: 0,
        is_citizen: false,
        is_paid_citizen: false,
        citizenship_earned_at: null,
        citizenship_purchased_at: null,
        display_name: null,
        created_at: now,
        updated_at: now,
      });
      expect(PlayerProfileSchema.safeParse(profile).success).toBe(true);
    });

    test("output round-trips through migrateProfile unchanged", () => {
      const profile = createGuestProfile("guest-uuid", "2026-06-13T09:30:00.000Z");
      expect(migrateProfile(profile)).toEqual(profile);
    });

    test("defaults the timestamp to the current time when not injected", () => {
      const before = Date.now();
      const profile = createGuestProfile("guest-uuid");
      const after = Date.now();

      const created = Date.parse(profile.created_at);
      expect(created).toBeGreaterThanOrEqual(before);
      expect(created).toBeLessThanOrEqual(after);
      expect(profile.created_at).toBe(profile.updated_at);
      expect(PlayerProfileSchema.safeParse(profile).success).toBe(true);
    });
  });
});
