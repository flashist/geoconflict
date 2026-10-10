// Unit tests for SSH-only tester roles (task 0425): the guard order, the fail-closed
// allowlist, the arguments, the run log and `show`'s output, in
// src/profile-server/TesterRoleCommand.ts. A fake store records every call, so "no
// write" means ZERO calls (or only `show` on the read-only path). The real repository
// over real Postgres is exercised by tests/integration/TesterRole.it.test.ts.

import fs from "fs";
import os from "os";
import path from "path";
import {
  EXIT_BAD_INPUT,
  EXIT_NOT_LOGGED,
  EXIT_OK,
  EXIT_REFUSED,
  LOGGED_NOT_A_UUID,
  LOGGED_UNKNOWN_ROLE,
  TESTER_ROLE_DIR,
  TESTER_ROLE_NPM_SCRIPT,
  UUID_SHAPED,
  fileAllowlistReader,
  fileRunLog,
  formatShow,
  parseAllowlist,
  parseTesterRoleArgs,
  readAllowlist,
  runTesterRole,
  type RunLog,
} from "../../src/profile-server/TesterRoleCommand";
import type {
  TesterApplyOutcome,
  TesterRestoreOutcome,
  TesterRoleState,
  TesterRoleStore,
  TesterShowOutcome,
} from "../../src/profile-server/TesterRoleRepository";

const REPO_ROOT = path.resolve(__dirname, "../..");
const TESTER = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const OTHER = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const NOW = new Date("2026-10-09T12:00:00.000Z");

const STATE: TesterRoleState = {
  appliedRole: "earned-citizen",
  appliedAt: new Date("2026-10-09T11:00:00.000Z"),
  xp: 100,
  isCitizen: true,
  isPaidCitizen: false,
  citizenshipEarnedAt: new Date("2026-10-09T11:00:00.000Z"),
  citizenshipPurchasedAt: null,
  tenureGrant: { xpAwarded: 12, grantedAt: new Date("2026-09-20T10:00:00Z") },
  snapshotSavedAt: new Date("2026-10-09T10:00:00.000Z"),
};

interface Harness {
  argv: string[];
  allowlist?: string | (() => string);
  operator?: string;
  openLogFails?: boolean;
  appendFails?: boolean;
  show?: TesterShowOutcome;
  apply?: TesterApplyOutcome;
  restore?: TesterRestoreOutcome;
  repoThrows?: Error;
}

async function run(h: Harness) {
  const calls: string[] = [];
  const lines: string[] = [];
  const out: string[] = [];
  const err: string[] = [];
  let closed = false;
  const answer = async <T>(value: T): Promise<T> => {
    if (h.repoThrows !== undefined) {
      throw h.repoThrows;
    }
    return value;
  };
  const repo: TesterRoleStore = {
    show: (id) => {
      calls.push(`show:${id}`);
      return answer(h.show ?? { status: "shown", state: STATE });
    },
    apply: (id, role) => {
      calls.push(`apply:${id}:${role.id}`);
      return answer(h.apply ?? { status: "applied", snapshotCreated: true });
    },
    restore: (id) => {
      calls.push(`restore:${id}`);
      return answer(h.restore ?? { status: "restored" });
    },
  };
  const allowlist = h.allowlist ?? `${TESTER}\n`;
  const code = await runTesterRole({
    argv: h.argv,
    operator: h.operator ?? "owner",
    readAllowlistFile:
      typeof allowlist === "function" ? allowlist : () => allowlist,
    openLog: (): RunLog => {
      if (h.openLogFails) {
        throw Object.assign(new Error("nope"), { code: "ENOENT" });
      }
      return {
        append: (line) => {
          if (h.appendFails) {
            throw new Error("disk full");
          }
          lines.push(line);
        },
        close: () => {
          closed = true;
        },
      };
    },
    repo,
    out: (line) => out.push(line),
    err: (line) => err.push(line),
    now: () => NOW,
  });
  return {
    code,
    calls,
    lines,
    entries: lines.map((line) => JSON.parse(line) as Record<string, unknown>),
    out: out.join("\n"),
    err: err.join("\n"),
    closed,
  };
}

const ALL_SUBCOMMANDS: string[][] = [
  ["apply", TESTER, "earned-citizen"],
  ["restore", TESTER],
  ["show", TESTER],
];

describe("tester-role: the allowlist guard (every subcommand, show included)", () => {
  it.each(ALL_SUBCOMMANDS)(
    "%s: a player not on the allowlist is refused with no DB call",
    async (...argv) => {
      const r = await run({ argv, allowlist: `${OTHER}\n` });
      expect(r.code).toBe(EXIT_REFUSED);
      expect(r.calls).toEqual([]);
      expect(r.err).toMatch(/not on the tester allowlist/);
      expect(r.entries).toHaveLength(1);
      expect(r.entries[0]).toMatchObject({
        outcome: "refused",
        reason: "not_allowlisted",
        tester: TESTER,
      });
    },
  );

  const failClosed: Array<[string, Harness["allowlist"], string]> = [
    [
      "missing (ENOENT)",
      () => {
        throw Object.assign(new Error("x"), { code: "ENOENT" });
      },
      "allowlist_missing",
    ],
    [
      "unreadable (EACCES)",
      () => {
        throw Object.assign(new Error("x"), { code: "EACCES" });
      },
      "allowlist_unreadable",
    ],
    ["empty", "", "allowlist_empty"],
    [
      "comments and blank lines only",
      "# tester\n\n   \n# x\n",
      "allowlist_empty",
    ],
    [
      "one malformed line among valid ones",
      `${TESTER}\nnot-an-id\n`,
      "allowlist_malformed",
    ],
    [
      "an inline comment after an id",
      `${TESTER} # owner\n`,
      "allowlist_malformed",
    ],
  ];
  describe.each(failClosed)("fail closed: %s", (_label, allowlist, reason) => {
    it.each(ALL_SUBCOMMANDS)(
      "%s is refused with no DB call and one log line",
      async (...argv) => {
        const r = await run({ argv, allowlist });
        expect(r.code).toBe(EXIT_REFUSED);
        expect(r.calls).toEqual([]);
        expect(r.err).toMatch(/REFUSED/);
        expect(r.entries).toEqual([
          expect.objectContaining({ outcome: "refused", reason }),
        ]);
      },
    );
  });

  it("a malformed line is named by number, never echoed", async () => {
    const r = await run({
      argv: ["show", TESTER],
      allowlist: `${TESTER}\nyandex-12345abc\n`,
    });
    expect(r.err).toMatch(/line 2/);
    expect(r.err).not.toContain("yandex-12345abc");
  });

  it("a real unreadable file (chmod 000) refuses (skipped as root, which can read anything)", async () => {
    if (process.getuid?.() === 0) {
      return;
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tester-role-"));
    const file = path.join(dir, "allowlist");
    try {
      fs.writeFileSync(file, `${TESTER}\n`);
      fs.chmodSync(file, 0o000);
      const result = readAllowlist(fileAllowlistReader(file));
      expect(result).toMatchObject({
        ok: false,
        reason: "allowlist_unreadable",
      });
      const missing = readAllowlist(
        fileAllowlistReader(path.join(dir, "absent")),
      );
      expect(missing).toMatchObject({ ok: false, reason: "allowlist_missing" });
    } finally {
      fs.chmodSync(file, 0o600);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("parsing accepts CRLF, a BOM, surrounding spaces and upper case, and normalizes them", () => {
    const result = parseAllowlist(
      `\uFEFF# testers\r\n  ${TESTER.toUpperCase()}  \r\n\r\n${OTHER}\r\n`,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect([...result.ids].sort()).toEqual([TESTER, OTHER].sort());
    }
  });

  it("an upper-case tester argument matches a lower-case allowlist entry", async () => {
    const r = await run({ argv: ["show", TESTER.toUpperCase()] });
    expect(r.code).toBe(EXIT_OK);
    expect(r.calls).toEqual([`show:${TESTER}`]);
  });

  it("the allowlist is read fresh on every run", async () => {
    let reads = 0;
    const reader = () => {
      reads++;
      return `${TESTER}\n`;
    };
    await run({ argv: ["show", TESTER], allowlist: reader });
    await run({ argv: ["show", TESTER], allowlist: reader });
    expect(reads).toBe(2);
  });
});

describe("tester-role: role ids and arguments", () => {
  it("an unknown role is refused (exit 2) with no DB call, after the allowlist", async () => {
    const r = await run({ argv: ["apply", TESTER, "admin"] });
    expect(r.code).toBe(EXIT_BAD_INPUT);
    expect(r.calls).toEqual([]);
    expect(r.entries).toEqual([
      expect.objectContaining({
        outcome: "refused",
        reason: "unknown_role",
        role: LOGGED_UNKNOWN_ROLE,
      }),
    ]);
  });

  it("the allowlist is checked BEFORE the role: a non-allowlisted unknown-role run is not_allowlisted", async () => {
    const r = await run({
      argv: ["apply", TESTER, "admin"],
      allowlist: `${OTHER}\n`,
    });
    expect(r.code).toBe(EXIT_REFUSED);
    expect(r.entries[0]).toMatchObject({ reason: "not_allowlisted" });
  });

  const badArgs: string[][] = [
    [],
    ["apply"],
    ["apply", TESTER],
    ["apply", TESTER, "earned-citizen", "extra"],
    ["restore"],
    ["restore", TESTER, OTHER],
    ["show"],
    ["show", TESTER, "earned-citizen"],
    ["delete", TESTER],
    ["apply", "yandex-12345abc", "earned-citizen"],
  ];
  it.each(badArgs.map((argv) => [argv.join(" ") || "(none)", argv]))(
    "bad arguments %s: exit 2, no DB call, logged",
    async (_label, argv) => {
      const r = await run({ argv: argv as string[] });
      expect(r.code).toBe(EXIT_BAD_INPUT);
      expect(r.calls).toEqual([]);
      expect(r.err).toMatch(/Usage:/);
      expect(r.entries).toEqual([
        expect.objectContaining({
          outcome: "refused",
          reason: "bad_arguments",
        }),
      ]);
    },
  );

  it("parseTesterRoleArgs: exact arity per subcommand", () => {
    expect(parseTesterRoleArgs(["apply", TESTER, "brand-new"])).toEqual({
      ok: true,
      args: { subcommand: "apply", tester: TESTER, role: "brand-new" },
    });
    expect(parseTesterRoleArgs(["restore", TESTER])).toEqual({
      ok: true,
      args: { subcommand: "restore", tester: TESTER },
    });
    expect(parseTesterRoleArgs(["show", ` ${TESTER} `]).ok).toBe(true);
  });

  it("a Yandex id typed by mistake never reaches the log or the output", async () => {
    const r = await run({ argv: ["show", "yandex-12345abc"] });
    expect(r.entries[0]).toMatchObject({ tester: LOGGED_NOT_A_UUID });
    expect(r.lines.join("\n")).not.toContain("yandex-12345abc");
    expect(r.err).not.toContain("yandex-12345abc");
  });

  it("an unknown subcommand is logged as null, never echoed", async () => {
    const r = await run({ argv: ["rm -rf", TESTER] });
    expect(r.entries[0]).toMatchObject({ subcommand: null });
    expect(r.lines.join("\n")).not.toContain("rm -rf");
  });
});

describe("tester-role: guard order and the run log", () => {
  it.each([...ALL_SUBCOMMANDS, ["apply"], ["bogus"]])(
    "with no openable log nothing else runs (%s)",
    async (...argv) => {
      let allowlistRead = false;
      const r = await run({
        argv,
        openLogFails: true,
        allowlist: () => {
          allowlistRead = true;
          return `${TESTER}\n`;
        },
      });
      expect(r.code).toBe(EXIT_REFUSED);
      expect(r.calls).toEqual([]);
      expect(allowlistRead).toBe(false);
      expect(r.err).toMatch(/run log could not be opened/);
    },
  );

  it("exactly one line per run, with every field", async () => {
    const r = await run({
      argv: ["apply", TESTER, "earned-citizen"],
      operator: "  owner  ",
    });
    expect(r.code).toBe(EXIT_OK);
    expect(r.calls).toEqual([`apply:${TESTER}:earned-citizen`]);
    expect(r.entries).toEqual([
      {
        at: NOW.toISOString(),
        operator: "owner",
        subcommand: "apply",
        role: "earned-citizen",
        tester: TESTER,
        outcome: "applied",
        reason: null,
      },
    ]);
    expect(r.closed).toBe(true);
  });

  it("an unset operator is logged as unknown", async () => {
    const r = await run({ argv: ["show", TESTER], operator: "" });
    expect(r.entries[0]).toMatchObject({
      operator: "unknown",
      outcome: "shown",
    });
  });

  it("restore and its refusals are logged", async () => {
    expect((await run({ argv: ["restore", TESTER] })).entries[0]).toMatchObject(
      { outcome: "restored", reason: null, role: null },
    );
    const none = await run({
      argv: ["restore", TESTER],
      restore: { status: "no_snapshot" },
    });
    expect(none.code).toBe(EXIT_REFUSED);
    expect(none.entries[0]).toMatchObject({
      outcome: "refused",
      reason: "no_snapshot",
    });
  });

  it.each(ALL_SUBCOMMANDS)(
    "%s for an unknown player: refused, exit 1, logged no_such_player",
    async (...argv) => {
      const r = await run({
        argv,
        show: { status: "no_such_player" },
        apply: { status: "no_such_player" },
        restore: { status: "no_such_player" },
      });
      expect(r.code).toBe(EXIT_REFUSED);
      expect(r.entries[0]).toMatchObject({
        outcome: "refused",
        reason: "no_such_player",
      });
    },
  );

  it("a DB error: exit 1, logged as db_error only — the pg text goes to stderr, never the log", async () => {
    const secretish = "connect ECONNREFUSED postgres://user:pw@db-host:5432/x";
    const r = await run({
      argv: ["apply", TESTER, "paid-citizen"],
      repoThrows: new Error(secretish),
    });
    expect(r.code).toBe(EXIT_REFUSED);
    expect(r.entries[0]).toMatchObject({
      outcome: "error",
      reason: "db_error",
    });
    expect(r.lines.join("\n")).not.toMatch(/postgres:|ECONNREFUSED|pw@/);
    expect(r.err).toContain("ECONNREFUSED");
  });

  it("no log line carries a DATABASE_URL-like or token-like string", async () => {
    const all: string[] = [];
    for (const argv of [...ALL_SUBCOMMANDS, ["apply", TESTER, "admin"], []]) {
      all.push(...(await run({ argv })).lines);
    }
    const text = all.join("\n");
    expect(text).not.toMatch(/postgres(ql)?:\/\//);
    expect(text).not.toMatch(/DATABASE_URL|TOKEN|Bearer/i);
  });

  it("a post-commit append failure gives exit 3 and the loud warning", async () => {
    const applied = await run({
      argv: ["apply", TESTER, "earned-citizen"],
      appendFails: true,
    });
    expect(applied.code).toBe(EXIT_NOT_LOGGED);
    expect(applied.calls).toEqual([`apply:${TESTER}:earned-citizen`]);
    expect(applied.err).toMatch(/APPLIED BUT NOT LOGGED/);
    const restored = await run({
      argv: ["restore", TESTER],
      appendFails: true,
    });
    expect(restored.code).toBe(EXIT_NOT_LOGGED);
    expect(restored.err).toMatch(/RESTORED BUT NOT LOGGED/);
  });

  it("a refusal whose line cannot be appended keeps its own exit code and says it is not logged", async () => {
    const r = await run({
      argv: ["show", TESTER],
      allowlist: "",
      appendFails: true,
    });
    expect(r.code).toBe(EXIT_REFUSED);
    expect(r.err).toMatch(/NOT LOGGED/);
  });

  it("the real file log appends one line per run, 0600", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tester-role-log-"));
    const file = path.join(dir, "runs.log");
    try {
      for (const line of ['{"a":1}', '{"a":2}']) {
        const log = fileRunLog(file);
        log.append(line);
        log.close();
      }
      expect(fs.readFileSync(file, "utf8")).toBe('{"a":1}\n{"a":2}\n');
      expect(fs.statSync(file).mode & 0o777).toBe(0o600);
      expect(() =>
        fileRunLog(path.join(dir, "absent-dir", "runs.log")),
      ).toThrow();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("tester-role: show", () => {
  it("prints the state, and no UUID-shaped string — not even the typed id", async () => {
    const r = await run({ argv: ["show", TESTER] });
    expect(r.code).toBe(EXIT_OK);
    expect(r.calls).toEqual([`show:${TESTER}`]);
    expect(r.out).not.toMatch(UUID_SHAPED);
    expect(r.err).not.toMatch(UUID_SHAPED);
    expect(r.out).toContain("role applied: earned-citizen");
    expect(r.out).toContain("xp: 100");
    expect(r.out).toContain("tenure grant: present, xp_awarded=12");
    expect(r.out).toContain("snapshot held: yes");
  });

  it("formatShow: the no-role, no-tenure, no-snapshot shape", () => {
    const text = formatShow({
      ...STATE,
      appliedRole: null,
      appliedAt: null,
      citizenshipEarnedAt: null,
      tenureGrant: null,
      snapshotSavedAt: null,
    });
    expect(text.split("\n")).toEqual([
      "role applied: none",
      "xp: 100",
      "is_citizen: true",
      "is_paid_citizen: false",
      "citizenship_earned_at: null",
      "citizenship_purchased_at: null",
      "tenure grant: absent",
      "snapshot held: no",
    ]);
  });

  it("refusal and apply messages never echo the tester id either", async () => {
    for (const h of [
      { argv: ["apply", TESTER, "brand-new"] },
      { argv: ["restore", TESTER] },
      { argv: ["show", TESTER], allowlist: `${OTHER}\n` },
      { argv: ["show", TESTER], show: { status: "no_such_player" } },
    ] as Harness[]) {
      const r = await run(h);
      expect(`${r.out}\n${r.err}`).not.toMatch(UUID_SHAPED);
    }
  });
});

// ── Static checks — the traps that would only show up on the box ────────────
describe("tester-role wiring (static)", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  const script = packageJson.scripts[TESTER_ROLE_NPM_SCRIPT];

  it("package.json's script points at the entry file", () => {
    expect(script).toBe(
      "node --loader ts-node/esm --experimental-specifier-resolution=node src/profile-server/testerRole.ts",
    );
    expect(
      fs.existsSync(path.join(REPO_ROOT, "src/profile-server/testerRole.ts")),
    ).toBe(true);
  });

  // The 0283 trap: Server.ts calls listen() at module load, so a one-shot command
  // importing it would fight the running container for the port. Scanned over the
  // whole comment-stripped file by quoted specifier (NameChangeDecideCommand.test.ts's
  // rule), so a multi-line import, a require or a `.js` respelling is caught too.
  it.each([
    ["src/profile-server/testerRole.ts", "./TesterRoleCommand"],
    ["src/profile-server/TesterRoleCommand.ts", "./TesterRoles"],
    ["src/profile-server/TesterRoleRepository.ts", "./TesterRoles"],
    ["src/profile-server/TesterRoles.ts", "../core/profile/Citizenship"],
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
    for (const forbidden of ["./Server", "./Routes", "./Telemetry"]) {
      expect(code).not.toMatch(quoted(forbidden));
    }
  });

  it("the container directory is the target of setup-profile.sh's tester-roles bind mount", () => {
    const setup = fs.readFileSync(
      path.join(REPO_ROOT, "setup-profile.sh"),
      "utf8",
    );
    const target = /^\s*- \.\/tester-roles:(\/\S+)$/m.exec(setup)?.[1];
    expect(target).toBe(TESTER_ROLE_DIR);
  });
});
