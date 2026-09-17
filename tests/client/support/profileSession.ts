// Shared harness for the client suites that now call the profile server through
// ProfileSession's Bearer session (task 0273, S4). These suites deliberately use
// the REAL ProfileSession — a mock of it would not catch a wrong header spelling
// or a Yandex id left in a URL — so each of them has to get past the one
// `POST /v1/login` first. `primeProfileSession()` does exactly that, with a
// throwaway stub, so a test body's own fetch stub only has to answer its own route.

import {
  ensureSession,
  resetProfileSessionForTests,
} from "../../../src/client/ProfileSession";

export const TEST_SESSION_TOKEN = "v1.test-session-payload.test-session-mac";

/** A valid `POST /v1/login` 200 body (LoginResponseSchema). */
export function loginResponseBody(
  token: string = TEST_SESSION_TOKEN,
  created = false,
) {
  return {
    created,
    profile: {
      schema_version: 1,
      xp: 0,
      is_citizen: false,
      citizenship_earned_at: null,
      display_name: null,
      created_at: "2026-09-16T00:00:00.000Z",
      updated_at: "2026-09-16T00:00:00.000Z",
    },
    grantChecks: { tenure: "pending" },
    session: { token, expiresAt: "2026-09-17T00:00:00.000Z" },
  };
}

/**
 * Log in once so the token is held before the test body installs its own stub.
 * Requires the suite's FlashistFacade + ConfigLoader mocks to already report an
 * authorized player with a non-empty profile API base.
 */
export async function primeProfileSession(): Promise<void> {
  resetProfileSessionForTests();
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => loginResponseBody(),
  })) as unknown as typeof fetch;
  const token = await ensureSession();
  if (token !== TEST_SESSION_TOKEN) {
    throw new Error(
      "primeProfileSession: the login stub did not take — check the suite's facade/config mocks",
    );
  }
}

/** The `Authorization` value a primed request must carry. */
export const EXPECTED_BEARER = `Bearer ${TEST_SESSION_TOKEN}`;
