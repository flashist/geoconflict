// Pure unit tests for PlayerProfileRepository domain types that need no DB.
// (The DB-touching repository behavior is covered in
// tests/integration/PlayerProfileRepository.it.test.ts under RUN_DB_TESTS.)

import { PersistentIdConflictError } from "../../src/profile-server/PlayerProfileRepository";

describe("PersistentIdConflictError", () => {
  const error = new PersistentIdConflictError("yandex-1", "pid-secret-1");

  test("keeps both identifiers as programmatic fields", () => {
    expect(error.yandexPlayerId).toBe("yandex-1");
    expect(error.persistentId).toBe("pid-secret-1");
  });

  test("message surfaces yandexPlayerId for traceability", () => {
    expect(error.message).toContain("yandex-1");
  });

  test("message and stack never embed the raw persistentId (R5-1)", () => {
    // The raw persistentId must not reach logs: callers log the message/stack.
    expect(error.message).not.toContain("pid-secret-1");
    expect(error.stack ?? "").not.toContain("pid-secret-1");
  });
});
