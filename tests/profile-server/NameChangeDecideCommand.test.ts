// Unit tests for the operator's name-change decide command (task 0312):
// src/profile-server/NameChangeDecideCommand.ts, run on the profile box by
// `npm run name-change:decide` (src/profile-server/decideNameChange.ts). A fake fetch
// stands in for the decide route; the real route is exercised by
// tests/integration/NameChange.it.test.ts.

import fs from "fs";
import path from "path";
import {
  DECIDE_NPM_SCRIPT,
  EXIT_BAD_INPUT,
  EXIT_OK,
  EXIT_REFUSED,
  PROFILE_API_SERVICE,
  PROFILE_COMPOSE_FILE,
  REASON_PLACEHOLDER,
  describeDecideResponse,
  escapeForTerminal,
  parseDecideInput,
  runNameChangeDecide,
  type DecideFetch,
} from "../../src/profile-server/NameChangeDecideCommand";
import { buildDecideCommandBody } from "../../src/profile-server/NameChangeRepository";

const REPO_ROOT = path.resolve(__dirname, "../..");
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
// Distinctive so a leak assertion cannot pass by accident.
const TOKEN = "internal-token-fixture-0312";
const PORT = 18080;

const approveJson = (name = "Ivan") =>
  buildDecideCommandBody(PLAYER_ID, name, "approve");
const rejectJson = (name = "Ivan") =>
  buildDecideCommandBody(PLAYER_ID, name, "reject");

function harness(
  respond: () => Promise<{ status: number; body?: unknown }> = async () => ({
    status: 200,
    body: { status: "ok" },
  }),
) {
  const calls: Array<{ url: string; init: Parameters<DecideFetch>[1] }> = [];
  const out: string[] = [];
  const err: string[] = [];
  const fetch: DecideFetch = async (url, init) => {
    calls.push({ url, init });
    const { status, body } = await respond();
    return {
      status,
      text: async () => (body === undefined ? "" : JSON.stringify(body)),
    };
  };
  // The token is a rest argument, not a default: `undefined` is a case under test,
  // and a default parameter would silently replace it with the fixture.
  const run = (
    decisionJson: string | undefined,
    reason: string | undefined,
    ...token: [string | undefined] | []
  ) =>
    runNameChangeDecide({
      decisionJson,
      reason,
      token: token.length === 0 ? TOKEN : token[0],
      port: PORT,
      fetch,
      out: (line) => out.push(line),
      err: (line) => err.push(line),
    });
  return { run, calls, out, err, printed: () => [...out, ...err].join("\n") };
}

describe("runNameChangeDecide — what is sent", () => {
  it("approve → 200 → exit 0, posting exactly the bound decision to the local route", async () => {
    const h = harness();
    await expect(h.run(approveJson(), undefined)).resolves.toBe(EXIT_OK);
    expect(h.calls).toHaveLength(1);
    const { url, init } = h.calls[0];
    expect(url).toBe(`http://127.0.0.1:${PORT}/internal/v1/name-change/decide`);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body)).toEqual({
      playerId: PLAYER_ID,
      decision: "approve",
      expectedName: "Ivan",
    });
    expect(h.out.join("\n")).toContain("HTTP 200: approved");
    expect(h.err).toEqual([]);
  });

  it("reject posts the operator's reason and the exact (escaped-in-transit) name", async () => {
    const h = harness();
    const name = "Iv\u00A0an";
    await expect(h.run(rejectJson(name), "Offensive name")).resolves.toBe(
      EXIT_OK,
    );
    expect(JSON.parse(h.calls[0].init.body)).toEqual({
      playerId: PLAYER_ID,
      decision: "reject",
      reason: "Offensive name",
      expectedName: name,
    });
    expect(h.out.join("\n")).toContain("HTTP 200: rejected");
  });

  it("takes the reason ONLY from its own variable, never from the JSON", async () => {
    const h = harness();
    const json = JSON.stringify({
      ...JSON.parse(approveJson()),
      reason: "smuggled",
    });
    await expect(h.run(json, undefined)).resolves.toBe(EXIT_OK);
    expect(JSON.parse(h.calls[0].init.body)).not.toHaveProperty("reason");
  });
});

describe("runNameChangeDecide — refused locally, nothing sent (exit 2)", () => {
  it.each([
    ["a reject with no reason", () => rejectJson(), undefined],
    ["a reject with a blank reason", () => rejectJson(), "   "],
    [
      "a reject with the unedited placeholder",
      () => rejectJson(),
      REASON_PLACEHOLDER,
    ],
    [
      "the placeholder with stray spaces",
      () => rejectJson(),
      ` ${REASON_PLACEHOLDER} `,
    ],
    ["a reason on an approve", () => approveJson(), "why"],
    ["malformed JSON", () => '{"playerId":', undefined],
    ["a JSON array", () => "[]", undefined],
    ["an unset decision variable", () => undefined, undefined],
    [
      "no expectedName (an unbound decision)",
      () => JSON.stringify({ playerId: PLAYER_ID, decision: "approve" }),
      undefined,
    ],
    [
      "a player id that is not a uuid",
      () =>
        JSON.stringify({
          playerId: "p1",
          decision: "approve",
          expectedName: "Ivan",
        }),
      undefined,
    ],
    [
      "an unknown decision",
      () =>
        JSON.stringify({
          playerId: PLAYER_ID,
          decision: "maybe",
          expectedName: "Ivan",
        }),
      undefined,
    ],
    ["a reason over 500 characters", () => rejectJson(), "x".repeat(501)],
  ])("%s", async (_label, json, reason) => {
    const h = harness();
    await expect(h.run(json(), reason)).resolves.toBe(EXIT_BAD_INPUT);
    expect(h.calls).toHaveLength(0);
    expect(h.err.join("\n")).toContain("Nothing was sent.");
    expect(h.out).toEqual([]);
  });

  it("accepts a reason of exactly 500 characters", async () => {
    const h = harness();
    await expect(h.run(rejectJson(), "x".repeat(500))).resolves.toBe(EXIT_OK);
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["blank", "  "],
  ])("refuses when the token is %s, sending nothing", async (_label, token) => {
    const h = harness();
    await expect(h.run(approveJson(), undefined, token)).resolves.toBe(
      EXIT_BAD_INPUT,
    );
    expect(h.calls).toHaveLength(0);
    expect(h.err.join("\n")).toContain("PROFILE_INTERNAL_TOKEN is not set");
  });

  it("names the 500-character limit in plain words", () => {
    const parsed = parseDecideInput(rejectJson(), "x".repeat(501));
    expect(parsed).toEqual({
      ok: false,
      error: expect.stringContaining("the limit is 500"),
    });
  });

  it("never echoes the pasted input back", async () => {
    const h = harness();
    await h.run('{"playerId":"\u001b[2J evil', undefined);
    expect(h.printed()).not.toContain("evil");
    expect(h.printed()).not.toContain("\u001b");
  });
});

describe("runNameChangeDecide — server answers", () => {
  it.each([
    [404, { error: "no_pending" }, "no pending request"],
    [409, { error: "name_taken" }, "STILL PENDING"],
    [400, { error: "bad_request" }, "HTTP 400 bad_request"],
    [401, { error: "unauthorized" }, "HTTP 401 unauthorized"],
    [503, { error: "name_change_unavailable" }, "switched off"],
    [500, { error: "internal_error" }, "read-only check in the runbook"],
    [418, undefined, "unexpected answer"],
  ])(
    "HTTP %i → exit 1 with a plain-language message",
    async (status, body, words) => {
      const h = harness(async () => ({ status, body }));
      await expect(h.run(approveJson(), undefined)).resolves.toBe(EXIT_REFUSED);
      expect(h.err.join("\n")).toContain(words);
      expect(h.out).toEqual([]);
    },
  );

  it("409 name_mismatch prints the pending name ESCAPED — no terminal control reaches a root shell", async () => {
    const hostile = "Ev\u001b[2J\u001b]0;pwn\u0007il\u202Eeman\nfake";
    const h = harness(async () => ({
      status: 409,
      body: { error: "name_mismatch", pending_name: hostile },
    }));
    await expect(h.run(approveJson(), undefined)).resolves.toBe(EXIT_REFUSED);
    const printed = h.err.join("\n");
    expect(printed).toContain("name_mismatch");
    expect(printed).toMatch(/^[\x20-\x7E]*$/);
    expect(printed).toContain(escapeForTerminal(hostile));
    // …and it is a JSON string literal that decodes back to the exact name.
    expect(JSON.parse(escapeForTerminal(hostile))).toBe(hostile);
  });

  it("a network failure → exit 1, saying the outcome is unknown", async () => {
    const h = harness(async () => {
      throw Object.assign(new TypeError("fetch failed"), {
        cause: { code: "ECONNREFUSED" },
      });
    });
    await expect(h.run(approveJson(), undefined)).resolves.toBe(EXIT_REFUSED);
    const printed = h.err.join("\n");
    expect(printed).toContain("ECONNREFUSED");
    expect(printed).toContain("may or may not have been applied");
  });

  it("a non-JSON body is handled, not thrown", async () => {
    const calls: unknown[] = [];
    const err: string[] = [];
    const code = await runNameChangeDecide({
      decisionJson: approveJson(),
      reason: undefined,
      token: TOKEN,
      port: PORT,
      fetch: async () => {
        calls.push(1);
        return { status: 502, text: async () => "<html>bad gateway</html>" };
      },
      out: () => undefined,
      err: (line) => err.push(line),
    });
    expect(code).toBe(EXIT_REFUSED);
    expect(err.join("\n")).toContain("HTTP 502");
  });

  it("the token never appears in any output, whatever the outcome", async () => {
    const outcomes: Array<() => Promise<{ status: number; body?: unknown }>> = [
      async () => ({ status: 200, body: { status: "ok" } }),
      async () => ({ status: 401, body: { error: "unauthorized" } }),
      async () => ({
        status: 409,
        body: { error: "name_mismatch", pending_name: TOKEN.slice(0, 4) },
      }),
      async () => {
        throw new Error("socket hang up");
      },
    ];
    for (const respond of outcomes) {
      const h = harness(respond);
      await h.run(rejectJson(), "reason");
      expect(h.printed()).not.toContain(TOKEN);
    }
    const bad = harness();
    await bad.run("not json", undefined);
    expect(bad.printed()).not.toContain(TOKEN);
  });

  // Review 0312 R1: the fake fetch above never builds real Headers, so it cannot see
  // the one real leak — Node's fetch quotes a rejected header value in full. These
  // go through Node's own fetch / Headers.
  const HOSTILE_TOKENS: Array<[string, string]> = [
    ["an interior LF", `${TOKEN}\nx`],
    ["an interior CR", `${TOKEN}\rx`],
    ["an interior NUL", `${TOKEN}\u0000x`],
    ["a U+2028", `${TOKEN}\u2028x`],
    ["a non-ASCII letter", `${TOKEN}\u00e9x`],
  ];

  it("premise: Node's real fetch puts an LF-bearing token in its error message", async () => {
    await expect(
      fetch(`http://127.0.0.1:${PORT}/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN}\nx` },
      }),
    ).rejects.toThrow(TOKEN);
  });

  it.each(HOSTILE_TOKENS)(
    "a token with %s is refused before real fetch runs, and never printed",
    async (_label, token) => {
      let fetchCalls = 0;
      const out: string[] = [];
      const err: string[] = [];
      const code = await runNameChangeDecide({
        decisionJson: approveJson(),
        reason: undefined,
        token,
        port: PORT,
        fetch: (url, init) => {
          fetchCalls++;
          return fetch(url, init);
        },
        out: (line) => out.push(line),
        err: (line) => err.push(line),
      });
      expect(code).toBe(EXIT_BAD_INPUT);
      expect(fetchCalls).toBe(0);
      const printed = [...out, ...err].join("\n");
      expect(printed).toContain("cannot go in an HTTP header");
      expect(printed).not.toContain(TOKEN);
    },
  );

  it("redacts the token from a real Headers error that quotes it (second line of defence)", async () => {
    const err: string[] = [];
    const code = await runNameChangeDecide({
      decisionJson: approveJson(),
      reason: undefined,
      token: TOKEN,
      port: PORT,
      // Real header construction, fed the header the command built plus an
      // interior line break (a trailing one is trimmed, not refused): stands in for
      // any future path where Node rejects the value.
      fetch: async (_url, init) => {
        try {
          new Headers({ Authorization: `${init.headers.Authorization}\nx` });
        } catch (error) {
          // Node's own message text, re-thrown as this realm's TypeError: jest runs
          // the test in a vm context, so Node's error fails `instanceof Error` here
          // (it would not in the real command, which runs in one realm).
          throw new TypeError((error as { message: string }).message);
        }
        throw new Error("unreachable: Headers accepted a line break");
      },
      out: () => undefined,
      err: (line) => err.push(line),
    });
    expect(code).toBe(EXIT_REFUSED);
    const printed = err.join("\n");
    expect(printed).toContain("invalid header value");
    expect(printed).toContain("[token redacted]");
    expect(printed).not.toContain(TOKEN);
  });

  // Review 0312 R3: the unexpected-status fallback escapes the server's error code.
  it("an unexpected status prints the server's error code escaped", async () => {
    const h = harness(async () => ({
      status: 418,
      body: { error: "odd\u001b[2J‮code" },
    }));
    await expect(h.run(approveJson(), undefined)).resolves.toBe(EXIT_REFUSED);
    const printed = h.err.join("\n");
    expect(printed).toContain("HTTP 418");
    expect(printed).toMatch(/^[\x20-\x7E]*$/);
    expect(printed).toContain(escapeForTerminal("odd\u001b[2J‮code"));
  });

  it("describeDecideResponse: 200 is the only exit 0", () => {
    expect(describeDecideResponse(200, { status: "ok" }, "reject")).toEqual({
      exitCode: EXIT_OK,
      message: expect.stringContaining("rejected"),
    });
    expect(
      describeDecideResponse(409, { error: "other" }, "approve").exitCode,
    ).toBe(EXIT_REFUSED);
  });
});

// ── Static checks — the traps that would only show up on the box ────────────
describe("decide command wiring (static)", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  const script = packageJson.scripts[DECIDE_NPM_SCRIPT];
  const entry = (script ?? "")
    .split(" ")
    .find((part) => /^src\/.*\.ts$/.test(part));

  it("package.json's script points at an existing entry file", () => {
    expect(script).toBeDefined();
    expect(entry).toBe("src/profile-server/decideNameChange.ts");
    expect(fs.existsSync(path.join(REPO_ROOT, entry ?? ""))).toBe(true);
  });

  // The 0283 trap: Server.ts calls listen() at module load, so a one-shot command
  // importing it would fight the running container for the port. Scanned over the
  // whole comment-stripped file by quoted specifier (the 0283 harness's rule), so a
  // multi-line import, a require or a `.js` respelling is caught too.
  it.each([
    ["src/profile-server/decideNameChange.ts", "./NameChangeDecideCommand"],
    [
      "src/profile-server/NameChangeDecideCommand.ts",
      "../core/profile/NameChangeContract",
    ],
  ])("%s never references ./Server, ./Routes or ./Telemetry", (file, known) => {
    const code = fs
      .readFileSync(path.join(REPO_ROOT, file), "utf8")
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, ""))
      .filter((line) => !/^\s*\*/.test(line))
      .join("\n");
    const quoted = (specifier: string) =>
      new RegExp(`["']${specifier.replace(/[.]/g, "\\.")}(\\.[jt]s)?["']`);
    // Not vacuous: the scan finds this file's own real import.
    expect(code).toMatch(quoted(known));
    for (const forbidden of [
      "./Server",
      "./Routes",
      "./Telemetry",
      "./Logger",
      "./Db",
    ]) {
      expect(code).not.toMatch(quoted(forbidden));
    }
  });

  it("the compose path matches setup-profile.sh's PROFILE_DIR, and the service exists there", () => {
    const setup = fs.readFileSync(
      path.join(REPO_ROOT, "setup-profile.sh"),
      "utf8",
    );
    const dir = /^PROFILE_DIR="([^"]+)"$/m.exec(setup)?.[1];
    expect(dir).toBeDefined();
    expect(PROFILE_COMPOSE_FILE).toBe(`${dir}/docker-compose.yml`);
    expect(setup).toMatch(new RegExp(`^  ${PROFILE_API_SERVICE}:$`, "m"));
  });
});
