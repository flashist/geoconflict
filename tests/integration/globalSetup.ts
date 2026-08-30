// Fail-fast guard for the DB-backed integration run. Wired into `integrationConfig`
// in jest.config.ts as jest's `globalSetup`, so it is the single choke point every
// `npm run test:integration` invocation passes through.
//
// Without it, an unset TEST_DATABASE_URL produces a fast, plausible-looking red
// (every suite fails on connection) that reads like a code regression instead of a
// missing variable. See the "Integration tests" subsection in CLAUDE.md.
//
// Trimmed before the check: a whitespace-only value is truthy, so it slipped past an
// earlier `!process.env...` version of this guard and reproduced the exact bogus fast
// red the guard exists to kill. Deliberately NOT a validity check — an arbitrary
// garbage connection string is unguardable here, and pg is the right thing to fail on
// it. This only catches "set, but effectively empty".

export default function requireIntegrationEnv(): void {
  if (!process.env.TEST_DATABASE_URL?.trim()) {
    throw new Error(
      "TEST_DATABASE_URL is not set — the integration suite needs a real Postgres.\n" +
        "These tests connect to a live database; without that variable every suite\n" +
        "fails on connection and the run looks like a code regression.\n" +
        "See the 'Integration tests' subsection under ## Testing in CLAUDE.md for\n" +
        "the command, the variables, and where the value belongs.",
    );
  }
}
