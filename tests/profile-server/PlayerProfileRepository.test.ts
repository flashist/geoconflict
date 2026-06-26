// Pure unit tests for PlayerProfileRepository domain types that need no DB.
// (The DB-touching repository behavior is covered in
// tests/integration/PlayerProfileRepository.it.test.ts under RUN_DB_TESTS.)

import { PersistentIdConflictError } from "../../src/profile-server/PlayerProfileRepository";

describe("PersistentIdConflictError", () => {
  // The first arg is the irreversible id-HASH (the route hashes the raw id before
  // it ever reaches the repo), so a hash-looking placeholder stands in here.
  const error = new PersistentIdConflictError("yandex-1-hash", "pid-secret-1");

  test("keeps both identifiers as programmatic fields", () => {
    expect(error.yandexPlayerIdHash).toBe("yandex-1-hash");
    expect(error.persistentId).toBe("pid-secret-1");
  });

  test("message surfaces the id-hash for traceability", () => {
    expect(error.message).toContain("yandex-1-hash");
  });

  test("message and stack never embed the raw persistentId (R5-1)", () => {
    // The raw persistentId must not reach logs: callers log the message/stack.
    expect(error.message).not.toContain("pid-secret-1");
    expect(error.stack ?? "").not.toContain("pid-secret-1");
  });
});
