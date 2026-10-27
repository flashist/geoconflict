// Unit tests for the owner-run profile merge command (task 0503): arguments, guard
// order, the typed confirmation, output hygiene and the import surface, in
// src/profile-server/ProfileMergeCommand.ts, plus the pure rules in planMerge. A fake
// store records every call, so "no write" means `commit` was never called. The real
// repository over real Postgres is exercised by tests/integration/ProfileMerge.it.test.ts.

import fs from "fs";
import path from "path";
import {
  CONFIRM_WORD,
  EXIT_BAD_INPUT,
  EXIT_OK,
  EXIT_REFUSED,
  MERGE_NPM_SCRIPT,
  parseMergeArgs,
  runMergeProfiles,
} from "../../src/profile-server/ProfileMergeCommand";
import {
  planMerge,
  type CommitOutcome,
  type InspectOutcome,
  type MergeRecordState,
  type ProfileMergeStore,
} from "../../src/profile-server/ProfileMergeRepository";

const REPO_ROOT = path.resolve(__dirname, "../..");
const KEEP = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const SOURCE = "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f";
const SOURCE_2 = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const FINGERPRINT = "0123456789abcdef0123456789abcdef";
const NOW = new Date("2026-10-27T12:00:00.000Z");
const LONG_AGO = new Date("2026-09-01T12:00:00.000Z");
const UUID_SHAPED =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function state(
  playerId: string,
  overrides: Partial<MergeRecordState> = {},
): MergeRecordState {
  const base: MergeRecordState = {
    playerId,
    createdAt: LONG_AGO,
    lastLoginAt: LONG_AGO,
    xp: 0,
    isCitizen: false,
    isPaidCitizen: false,
    citizenshipEarnedAt: null,
    citizenshipPurchasedAt: null,
    displayName: null,
    latestNameStatus: null,
    hasPendingName: false,
    nameHistoryCount: 0,
    identityCount: 1,
    identityFirstCreatedAt: LONG_AGO,
    identityLastLoginAt: LONG_AGO,
    credits: [],
    rewarded: [],
    tenure: null,
    receipts: [],
    entitlements: [],
    intentCount: 0,
    unusedIntentCount: 0,
    messageCount: 0,
    cosmetics: [],
    hasTesterSnapshot: false,
  };
  const merged = { ...base, ...overrides };
  if (overrides.xp === undefined) {
    merged.xp =
      merged.credits.reduce((t, r) => t + r.xpAwarded, 0) +
      merged.rewarded.reduce((t, r) => t + r.xpAwarded, 0) +
      (merged.tenure?.xpAwarded ?? 0);
  }
  return merged;
}

function credit(gameId: string, xpAwarded = 10) {
  return { gameId, xpAwarded, at: LONG_AGO };
}

function inspected(
  into: MergeRecordState,
  sources: MergeRecordState[],
  fingerprint = FINGERPRINT,
): InspectOutcome {
  return {
    status: "inspected",
    states: [into, ...sources],
    plan: planMerge(into, sources, NOW),
    sightings: [],
    fingerprint,
  };
}

const PLAIN: InspectOutcome = inspected(
  state(KEEP, { displayName: "Keeper" }),
  [state(SOURCE, { credits: [credit("g1")] })],
);

interface Harness {
  argv: string[];
  interactive?: boolean;
  answer?: string;
  inspect?: InspectOutcome;
  commit?: CommitOutcome;
  throws?: Error;
}

async function run(h: Harness) {
  const calls: string[] = [];
  const prompts: string[] = [];
  const out: string[] = [];
  const err: string[] = [];
  const store: ProfileMergeStore = {
    inspect: async (request) => {
      calls.push(`inspect:${request.sources.length}`);
      if (h.throws !== undefined) {
        throw h.throws;
      }
      return h.inspect ?? PLAIN;
    },
    commit: async (request) => {
      calls.push(`commit:${request.expectedFingerprint}:${request.operator}`);
      return (
        h.commit ?? {
          status: "merged",
          plan: (PLAIN as Extract<InspectOutcome, { status: "inspected" }>)
            .plan,
          moved: [],
          keepXpAfter: 10,
        }
      );
    },
  };
  const code = await runMergeProfiles({
    argv: h.argv,
    operator: "owner",
    interactive: h.interactive ?? true,
    prompt: async (question) => {
      prompts.push(question);
      return h.answer ?? CONFIRM_WORD;
    },
    store,
    out: (line) => out.push(line),
    err: (line) => err.push(line),
    now: () => NOW,
  });
  return {
    code,
    calls,
    prompts,
    out: out.join("\n"),
    err: err.join("\n"),
    summary: out.filter((line) => line.startsWith("merge-profiles summary")),
  };
}

const DRY = ["dry-run", "--into", KEEP, "--from", SOURCE];
const COMMIT = [
  "commit",
  "--into",
  KEEP,
  "--from",
  SOURCE,
  "--expect",
  FINGERPRINT,
];

// ── Arguments ──────────────────────────────────────────────────────────────

describe("parseMergeArgs", () => {
  it("accepts a dry run with several sources, normalizing case", () => {
    expect(
      parseMergeArgs([
        "dry-run",
        "--into",
        KEEP.toUpperCase(),
        "--from",
        SOURCE,
        "--from",
        SOURCE_2,
      ]),
    ).toEqual({
      ok: true,
      args: {
        mode: "dry-run",
        into: KEEP,
        sources: [SOURCE, SOURCE_2],
        expect: null,
      },
    });
  });

  it("accepts a commit with --expect", () => {
    expect(parseMergeArgs(COMMIT)).toMatchObject({
      ok: true,
      args: { mode: "commit", expect: FINGERPRINT },
    });
  });

  it.each([
    [[], "No subcommand"],
    [["merge"], "Unknown subcommand"],
    [["dry-run", "--from", SOURCE], "--into is required"],
    [["dry-run", "--into", KEEP], "At least one --from"],
    [["dry-run", "--into", KEEP, "--from"], "needs a value"],
    [
      ["dry-run", "--into", KEEP, "--from", SOURCE, "--to", SOURCE_2],
      "Unknown argument",
    ],
    [
      ["dry-run", "--into", KEEP, "--from", SOURCE, "--from", SOURCE],
      "all be different",
    ],
    [["dry-run", "--into", KEEP, "--from", KEEP], "must not also be a --from"],
    [
      ["dry-run", "--into", KEEP, "--into", SOURCE, "--from", SOURCE_2],
      "more than once",
    ],
    [["dry-run", "--into", "yandex-1234567", "--from", SOURCE], "UUID"],
    [["dry-run", ...DRY.slice(1), "--expect", FINGERPRINT], "commit only"],
    [["commit", "--into", KEEP, "--from", SOURCE], "needs --expect"],
    [
      ["commit", "--into", KEEP, "--from", SOURCE, "--expect", "abc"],
      "32-character",
    ],
  ])("refuses %j (%s)", (argv, message) => {
    const parsed = parseMergeArgs(argv as string[]);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error).toContain(message);
      expect(parsed.error).not.toContain("yandex-1234567");
    }
  });

  it("refuses more than five sources", () => {
    const sources = Array.from(
      { length: 6 },
      (_, i) => `00000000-0000-4000-8000-00000000000${i}`,
    );
    const parsed = parseMergeArgs([
      "dry-run",
      "--into",
      KEEP,
      ...sources.flatMap((id) => ["--from", id]),
    ]);
    expect(parsed).toMatchObject({ ok: false });
  });
});

// ── Guard order ────────────────────────────────────────────────────────────

describe("runMergeProfiles — guard order and writes", () => {
  it("bad arguments: exit 2, the store is never touched", async () => {
    const r = await run({ argv: ["commit", "--into", KEEP] });
    expect(r.code).toBe(EXIT_BAD_INPUT);
    expect(r.calls).toEqual([]);
    expect(r.summary).toHaveLength(1);
  });

  it("a dry run inspects only, prints a fingerprint, never commits, never prompts", async () => {
    const r = await run({ argv: DRY });
    expect(r.code).toBe(EXIT_OK);
    expect(r.calls).toEqual(["inspect:1"]);
    expect(r.prompts).toEqual([]);
    expect(r.out).toContain(`Fingerprint: ${FINGERPRINT}`);
    expect(r.out).toContain("DRY RUN");
  });

  it("commit without a terminal: refused before the database", async () => {
    const r = await run({ argv: COMMIT, interactive: false });
    expect(r.code).toBe(EXIT_REFUSED);
    expect(r.calls).toEqual([]);
    expect(r.err).toContain("WITHOUT -T");
  });

  it("commit with a stale fingerprint: refused before the prompt, no write", async () => {
    const r = await run({
      argv: COMMIT,
      inspect: inspected(
        state(KEEP),
        [state(SOURCE, { credits: [credit("g1")] })],
        "f".repeat(32),
      ),
    });
    expect(r.code).toBe(EXIT_REFUSED);
    expect(r.prompts).toEqual([]);
    expect(r.calls).toEqual(["inspect:1"]);
  });

  it.each(["", "merge", "MERGE please", "yes"])(
    "commit answered %j instead of MERGE: refused, no write",
    async (answer) => {
      const r = await run({ argv: COMMIT, answer });
      expect(r.code).toBe(EXIT_REFUSED);
      expect(r.prompts).toHaveLength(1);
      expect(r.calls).toEqual(["inspect:1"]);
    },
  );

  it("commit + --expect + typed MERGE: exactly one write, with the operator", async () => {
    const r = await run({ argv: COMMIT });
    expect(r.code).toBe(EXIT_OK);
    expect(r.calls).toEqual(["inspect:1", `commit:${FINGERPRINT}:owner`]);
    expect(r.out).toContain("MERGED");
    expect(r.out).toContain("24 hours");
  });

  it("a refusal found by the dry run: exit 1, no fingerprint", async () => {
    const r = await run({
      argv: DRY,
      inspect: inspected(state(KEEP), [
        state(SOURCE, { credits: [credit("g1")], hasTesterSnapshot: true }),
      ]),
    });
    expect(r.code).toBe(EXIT_REFUSED);
    expect(r.out).not.toContain("Fingerprint:");
    expect(r.err).toContain("tester role");
  });

  it("nothing to move: the dry run says so and prints no fingerprint; a commit refuses", async () => {
    const empty = inspected(state(KEEP), [state(SOURCE, { identityCount: 0 })]);
    const dry = await run({ argv: DRY, inspect: empty });
    expect(dry.code).toBe(EXIT_OK);
    expect(dry.out).toContain("NOTHING TO MOVE");
    expect(dry.out).not.toContain("Fingerprint:");
    const real = await run({ argv: COMMIT, inspect: empty });
    expect(real.code).toBe(EXIT_REFUSED);
    expect(real.calls).toEqual(["inspect:1"]);
  });

  it.each([
    [{ status: "fingerprint_mismatch" } as CommitOutcome, "fingerprint"],
    [
      { status: "invariant_failed", failures: ["x"] } as CommitOutcome,
      "rolled back",
    ],
  ])("a commit the store refuses (%j): exit 1", async (commit, text) => {
    const r = await run({ argv: COMMIT, commit });
    expect(r.code).toBe(EXIT_REFUSED);
    expect(r.err).toContain(text);
  });

  it("a database error: exit 1, reported, never thrown", async () => {
    const r = await run({ argv: DRY, throws: new Error("connection refused") });
    expect(r.code).toBe(EXIT_REFUSED);
    expect(r.err).toContain("database error");
    expect(r.summary[0]).toContain('"reason":"db_error"');
  });

  it("stdout and the summary line carry no UUID-shaped text", async () => {
    const chain = inspected(
      state(KEEP, {
        displayName: "Keeper",
        tenure: { xpAwarded: 5, grantedAt: LONG_AGO },
      }),
      [
        state(SOURCE, {
          credits: [credit("g1"), credit("g2")],
          tenure: { xpAwarded: 9, grantedAt: LONG_AGO },
        }),
        state(SOURCE_2, {
          credits: [credit("g2")],
          displayName: "Other",
          lastLoginAt: NOW,
        }),
      ],
    );
    for (const h of [
      {
        argv: ["dry-run", "--into", KEEP, "--from", SOURCE, "--from", SOURCE_2],
        inspect: chain,
      },
      { argv: COMMIT },
      { argv: ["dry-run", "--into", "not-a-uuid", "--from", SOURCE] },
    ] as Harness[]) {
      const r = await run(h);
      expect(r.out).not.toMatch(UUID_SHAPED);
      expect(r.summary).toHaveLength(1);
    }
  });
});

// ── The rules ──────────────────────────────────────────────────────────────

describe("planMerge", () => {
  it("the chain: each game once, the largest tenure row once, the name never moves onto a named record", () => {
    const plan = planMerge(
      state(KEEP, {
        credits: [credit("g1"), credit("g2")],
        tenure: { xpAwarded: 20, grantedAt: LONG_AGO },
        displayName: "Keeper",
      }),
      [
        state(SOURCE, {
          credits: [credit("g2"), credit("g3")],
          rewarded: [credit("g3")],
          tenure: { xpAwarded: 30, grantedAt: LONG_AGO },
          displayName: "Source",
        }),
        state(SOURCE_2, {
          credits: [credit("g3"), credit("g4")],
          tenure: { xpAwarded: 25, grantedAt: LONG_AGO },
        }),
      ],
      NOW,
    );
    expect(plan.refusals).toEqual([]);
    const [first, second] = plan.sources;
    expect(first).toMatchObject({
      movedGames: ["g3"],
      duplicateGames: 1,
      tenure: "swap",
      tenureXpAfter: 20,
      name: "reserved",
      xpAfter: 10 + 20,
    });
    // g3 came from the first source, so the second's g3 is a duplicate.
    expect(second).toMatchObject({
      movedGames: ["g4"],
      duplicateGames: 1,
      tenure: "stay",
      xpAfter: 10 + 25,
    });
    expect(plan.keep.xpAfter).toBe(4 * 10 + 10 + 30);
    expect(plan.keep.highestXpBefore).toBe(10 + 10 + 10 + 30);
  });

  it("names: the first source's name moves onto an unnamed record, a later one stays reserved", () => {
    const plan = planMerge(
      state(KEEP),
      [
        state(SOURCE, { displayName: "First" }),
        state(SOURCE_2, { displayName: "Second" }),
      ],
      NOW,
    );
    expect(plan.sources.map((s) => s.name)).toEqual(["move", "reserved"]);
    expect(plan.keep.nameAfter).toBe("First");
  });

  it("the earliest earned date wins; a threshold crossing with none stamps now", () => {
    const earned = new Date("2026-08-01T00:00:00.000Z");
    expect(
      planMerge(
        state(KEEP, {
          isCitizen: true,
          citizenshipEarnedAt: new Date("2026-09-01T00:00:00.000Z"),
        }),
        [state(SOURCE, { isCitizen: true, citizenshipEarnedAt: earned })],
        NOW,
      ).keep.earnedAtAfter,
    ).toEqual(earned);
    const crossing = planMerge(
      state(KEEP, {
        credits: Array.from({ length: 6 }, (_, i) => credit(`k${i}`)),
      }),
      [
        state(SOURCE, {
          credits: Array.from({ length: 5 }, (_, i) => credit(`s${i}`)),
        }),
      ],
      NOW,
    );
    expect(crossing.keep).toMatchObject({
      stampsEarnedNow: true,
      isCitizenAfter: true,
      xpAfter: 110,
    });
  });

  it.each([
    [
      "paid_flags_mismatch",
      {
        isCitizen: true,
        isPaidCitizen: true,
        citizenshipPurchasedAt: LONG_AGO,
      },
    ],
    ["xp_rule_broken", { xp: 7 }],
    ["tester_snapshot", { hasTesterSnapshot: true }],
    ["pending_name", { hasPendingName: true }],
  ])("refuses %s on a source", (code, overrides) => {
    const plan = planMerge(
      state(KEEP),
      [
        state(SOURCE, {
          credits: [credit("g1")],
          ...overrides,
        } as Partial<MergeRecordState>),
      ],
      NOW,
    );
    expect(plan.refusals.map((r) => r.code)).toContain(code);
  });

  it("warns about a source active in the last 24 hours", () => {
    const plan = planMerge(
      state(KEEP),
      [state(SOURCE, { credits: [credit("g1")], lastLoginAt: NOW })],
      NOW,
    );
    expect(plan.warnings.join(" ")).toContain("last 24 hours");
  });
});

// ── Static checks — the traps that would only show up on the box ────────────

describe("merge-profiles wiring (static)", () => {
  const read = (file: string) =>
    fs
      .readFileSync(path.join(REPO_ROOT, file), "utf8")
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, ""))
      .filter((line) => !/^\s*\*/.test(line))
      .join("\n");
  const quoted = (specifier: string) =>
    new RegExp(`["']${specifier.replace(/[.]/g, "\\.")}(\\.[jt]s)?["']`);

  it("package.json's script points at the entry file", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(packageJson.scripts[MERGE_NPM_SCRIPT]).toBe(
      "node --loader ts-node/esm --experimental-specifier-resolution=node src/profile-server/mergeProfiles.ts",
    );
  });

  // The 0283 trap: Server.ts calls listen() at module load.
  it.each([
    ["src/profile-server/mergeProfiles.ts", "./ProfileMergeCommand"],
    ["src/profile-server/ProfileMergeCommand.ts", "./ProfileMergeRepository"],
    ["src/profile-server/ProfileMergeRepository.ts", "./PaymentsRepository"],
    ["src/profile-server/PaymentsRepository.ts", "./InboxRepository"],
    ["src/profile-server/InboxRepository.ts", "pg"],
  ])("%s never references ./Server, ./Routes or ./Telemetry", (file, known) => {
    const code = read(file);
    expect(code).toMatch(quoted(known));
    for (const forbidden of ["./Server", "./Routes", "./Telemetry"]) {
      expect(code).not.toMatch(quoted(forbidden));
    }
  });

  it("no route reaches the merge code: Routes.ts and Server.ts never import it", () => {
    for (const file of [
      "src/profile-server/Routes.ts",
      "src/profile-server/Server.ts",
    ]) {
      const code = read(file);
      expect(code).not.toMatch(/ProfileMerge|mergeProfiles/);
    }
  });
});
