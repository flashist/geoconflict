import { rowToProfile } from "../../src/profile-server/PlayerProfileRepository";

function baseRow(): Record<string, unknown> {
  return {
    schema_version: 1,
    yandex_player_id: "yandex-1",
    persistent_id: "pid-1",
    xp: "1000", // pg returns bigint as a string
    is_citizen: true,
    is_paid_citizen: false,
    citizenship_earned_at: new Date("2026-06-24T10:00:00.000Z"),
    citizenship_purchased_at: null,
    display_name: "Commander",
    extra: { future_field: 42 }, // overflow column — must be ignored
    created_at: new Date("2026-06-01T00:00:00.000Z"),
    updated_at: new Date("2026-06-24T12:00:00.000Z"),
  };
}

describe("rowToProfile", () => {
  test("coerces bigint string xp to a number", () => {
    const profile = rowToProfile(baseRow());
    expect(typeof profile.xp).toBe("number");
    expect(profile.xp).toBe(1000);
  });

  test("converts timestamptz Dates to ISO strings", () => {
    const profile = rowToProfile(baseRow());
    expect(profile.created_at).toBe("2026-06-01T00:00:00.000Z");
    expect(profile.updated_at).toBe("2026-06-24T12:00:00.000Z");
    expect(profile.citizenship_earned_at).toBe("2026-06-24T10:00:00.000Z");
    expect(profile.citizenship_purchased_at).toBeNull();
  });

  test("drops the extra overflow column", () => {
    const profile = rowToProfile(baseRow());
    expect(profile).not.toHaveProperty("extra");
    expect(profile).not.toHaveProperty("future_field");
  });

  test("a newer schema_version row normalizes instead of throwing", () => {
    const row = { ...baseRow(), schema_version: 2 };
    expect(() => rowToProfile(row)).not.toThrow();
    const profile = rowToProfile(row);
    expect(profile.schema_version).toBe(1); // stamped to the build's current version
    expect(profile.xp).toBe(1000);
  });
});
