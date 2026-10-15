// Unit tests for the operator's name-change walk-through command (task 0350):
// src/profile-server/NameChangeReviewCommand.ts, run on the profile box by
// `npm run name-change:review` (src/profile-server/reviewNameChanges.ts). A fake
// queue stands in for the database, a fake fetch for the decide route and a scripted
// list of answers for the terminal; fetchNextPending's SQL is exercised against real
// Postgres in tests/integration/NameChange.it.test.ts.

import fs from "fs";
import path from "path";
import {
  EXIT_BAD_INPUT,
  EXIT_OK,
  EXIT_REFUSED,
  PROFILE_API_SERVICE,
  PROFILE_COMPOSE_FILE,
  REASON_PLACEHOLDER,
  type DecideFetch,
} from "../../src/profile-server/NameChangeDecideCommand";
import {
  CHOICE_PROMPT,
  EXIT_INTERRUPTED,
  NEXT_PENDING_SQL,
  REASON_PROMPT,
  REVIEW_NPM_SCRIPT,
  fetchNextPending,
  reviewCommandLine,
  runNameChangeReview,
  type PendingReviewRequest,
} from "../../src/profile-server/NameChangeReviewCommand";

const REPO_ROOT = path.resolve(__dirname, "../..");
// Distinctive so a leak assertion cannot pass by accident.
const TOKEN = "internal-token-fixture-0350";
const PORT = 18080;
const NOW = new Date("2026-10-15T12:00:00Z");
const PLAYER_A = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const PLAYER_B = "1c7f9b63-4d2f-4e8b-8a21-3b5c7d9e1f20";
const PLAYER_C = "2d8a0c74-5e3a-4f9c-9b32-4c6d8e0f2a31";

type Row = Omit<PendingReviewRequest, "waitingTotal">;
type Answer = string | null | ((stop: { requested: boolean }) => string | null);
type Reply = { status: number; body?: unknown } | Error;

function row(
  historyId: string,
  playerId: string,
  requestedName: string,
  minutesAgo = 60,
): Row {
  return {
    historyId,
    playerId,
    requestedName,
    requestedAt: new Date(NOW.getTime() - minutesAgo * 60_000),
  };
}

/**
 * A scripted world: `queue` is the pending table (oldest first), `answers` is what
 * the operator types (exhausted = end of input), and `respond` is the decide route.
 * By default a 200 removes the decided request from the queue, as the route would.
 */
function harness(options: {
  queue: Row[];
  answers: Answer[];
  respond?: (
    body: { playerId: string; decision: string; expectedName: string },
    world: { queue: Row[]; stop: { requested: boolean } },
  ) => Reply;
  token?: string | undefined;
  isInteractive?: boolean;
}) {
  const queue = [...options.queue];
  const stop = { requested: false };
  const answers = [...options.answers];
  const prompts: string[] = [];
  const nextPendingCalls: string[][] = [];
  const posts: Array<{ url: string; init: Parameters<DecideFetch>[1] }> = [];
  const out: string[] = [];
  const err: string[] = [];
  const respond =
    options.respond ??
    ((body, world) => {
      world.queue.splice(
        world.queue.findIndex((r) => r.playerId === body.playerId),
        1,
      );
      return { status: 200, body: { status: "ok" } };
    });
  const fetch: DecideFetch = async (url, init) => {
    posts.push({ url, init });
    const reply = respond(JSON.parse(init.body), { queue, stop });
    if (reply instanceof Error) throw reply;
    return {
      status: reply.status,
      text: async () =>
        reply.body === undefined ? "" : JSON.stringify(reply.body),
    };
  };
  const run = () =>
    runNameChangeReview({
      isInteractive: options.isInteractive ?? true,
      token: "token" in options ? options.token : TOKEN,
      port: PORT,
      fetch,
      nextPending: async (excluded) => {
        nextPendingCalls.push([...excluded]);
        const left = queue.filter((r) => !excluded.includes(r.historyId));
        return left.length === 0
          ? null
          : { ...left[0], waitingTotal: left.length };
      },
      ask: async (prompt) => {
        prompts.push(prompt);
        const answer = answers.length === 0 ? null : answers.shift()!;
        return typeof answer === "function" ? answer(stop) : answer;
      },
      stop,
      out: (line) => out.push(line),
      err: (line) => err.push(line),
      now: () => NOW,
    });
  const bodies = () =>
    posts.map(
      (p) =>
        JSON.parse(p.init.body) as {
          playerId: string;
          decision: string;
          expectedName: string;
          reason?: string;
        },
    );
  return {
    run,
    queue,
    prompts,
    nextPendingCalls,
    posts,
    bodies,
    out,
    err,
    printed: () => [...out, ...err, ...prompts].join("\n"),
  };
}

/** Ctrl-C at a prompt: readline's SIGINT sets stop and ends the prompt. */
const ctrlC: Answer = (stop) => {
  stop.requested = true;
  return null;
};

// ── Refusals before anything happens ────────────────────────────────────────
describe("runNameChangeReview — refusals before anything is read or sent", () => {
  it("refuses without a terminal, naming -T, and touches nothing", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan")],
      answers: ["a", "y"],
      isInteractive: false,
    });
    expect(await h.run()).toBe(EXIT_BAD_INPUT);
    expect(h.err.join("\n")).toContain("WITHOUT -T");
    expect(h.err.join("\n")).toContain(reviewCommandLine());
    expect(h.err.join("\n")).toContain("Nothing was sent.");
    expect(h.nextPendingCalls).toHaveLength(0);
    expect(h.posts).toHaveLength(0);
    expect(h.prompts).toHaveLength(0);
  });

  it.each([
    ["missing", undefined, "is not set"],
    ["blank", "   ", "is not set"],
    ["with a line break", `${TOKEN}\n`, "cannot go in an HTTP header"],
  ])(
    "refuses a %s token, touches nothing, and never prints it",
    async (_label, token, text) => {
      const h = harness({
        queue: [row("1", PLAYER_A, "Ivan")],
        answers: ["a", "y"],
        token,
      });
      expect(await h.run()).toBe(EXIT_BAD_INPUT);
      expect(h.err.join("\n")).toContain(text);
      // Walk-through wording (review R2): nothing was pasted.
      expect(h.err.join("\n")).not.toContain("pasted");
      expect(h.nextPendingCalls).toHaveLength(0);
      expect(h.posts).toHaveLength(0);
      expect(h.printed()).not.toContain(TOKEN);
    },
  );
});

// ── Normal walk ─────────────────────────────────────────────────────────────
describe("runNameChangeReview — the walk", () => {
  it("an empty queue says so, exits 0 and sends nothing", async () => {
    const h = harness({ queue: [], answers: [] });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.out).toEqual(["No requests waiting."]);
    expect(h.posts).toHaveLength(0);
    expect(h.prompts).toHaveLength(0);
  });

  it("approve (a, then y) posts exactly one bound decision with the token", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan")],
      answers: ["a", "y"],
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.posts).toHaveLength(1);
    const [{ url, init }] = h.posts;
    expect(url).toBe(`http://127.0.0.1:${PORT}/internal/v1/name-change/decide`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(init.body)).toEqual({
      playerId: PLAYER_A,
      decision: "approve",
      expectedName: "Ivan",
    });
    expect(h.out.join("\n")).toContain("HTTP 200: approved");
    expect(h.out.join("\n")).toContain(
      "Approved 1, rejected 0, skipped 0. Still waiting: 0.",
    );
  });

  it("shows the card: position, waiting count, player, name and waiting time", async () => {
    const h = harness({
      queue: [
        row("1", PLAYER_A, "Ivan", 2 * 24 * 60 + 5 * 60),
        row("2", PLAYER_B, "Petr"),
      ],
      answers: ["q"],
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.out).toEqual(
      expect.arrayContaining([
        "Request 1 · 2 waiting",
        `Player:  ${PLAYER_A}`,
        "Name:    «Ivan»",
        "Waiting: 2 d 5 h",
      ]),
    );
    expect(h.prompts).toEqual([CHOICE_PROMPT]);
  });

  it("walks every request in order and counts what it did", async () => {
    const h = harness({
      queue: [
        row("1", PLAYER_A, "Ivan"),
        row("2", PLAYER_B, "Petr"),
        row("3", PLAYER_C, "Olga"),
      ],
      answers: ["a", "y", "r", "Not allowed here", "s"],
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.bodies().map((b) => [b.playerId, b.decision])).toEqual([
      [PLAYER_A, "approve"],
      [PLAYER_B, "reject"],
    ]);
    expect(h.out.join("\n")).toContain("No more requests to show.");
    expect(h.out.join("\n")).toContain(
      "Approved 1, rejected 1, skipped 1. Still waiting: 1.",
    );
  });
});

// ── Approve asks y/N first (owner ruling 2026-10-15) ────────────────────────
describe("runNameChangeReview — approve confirm", () => {
  it("names the request in the confirm question", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan")],
      answers: ["a", "y"],
    });
    await h.run();
    expect(h.prompts[1]).toBe("Approve «Ivan»? y/N > ");
  });

  it("accepts Y as well as y", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan")],
      answers: ["a", "Y"],
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.posts).toHaveLength(1);
  });

  it.each([
    ["n", "n"],
    ["Enter", ""],
    ["yes", "yes"],
    ["other input", "a"],
  ])(
    "%s at the confirm sends nothing and asks the choice again",
    async (_label, answer) => {
      const h = harness({
        queue: [row("1", PLAYER_A, "Ivan")],
        answers: ["a", answer, "q"],
      });
      expect(await h.run()).toBe(EXIT_OK);
      expect(h.posts).toHaveLength(0);
      expect(h.out.join("\n")).toContain("Not approved. Nothing was sent.");
      expect(h.prompts).toEqual([
        CHOICE_PROMPT,
        "Approve «Ivan»? y/N > ",
        CHOICE_PROMPT,
      ]);
    },
  );

  it("end of input (Ctrl-D) at the confirm sends nothing, exits 0 with the summary", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan")],
      answers: ["a", null],
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.posts).toHaveLength(0);
    expect(h.out.join("\n")).toContain(
      "Approved 0, rejected 0, skipped 0. Still waiting: 1.",
    );
  });

  it("Ctrl-C at the confirm sends nothing, exits 130 with the summary", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan")],
      answers: ["a", ctrlC],
    });
    expect(await h.run()).toBe(EXIT_INTERRUPTED);
    expect(h.posts).toHaveLength(0);
    expect(h.out.join("\n")).toContain("Stopped (Ctrl-C).");
    expect(h.out.join("\n")).toContain("Still waiting: 1.");
  });
});

// ── Names ───────────────────────────────────────────────────────────────────
describe("runNameChangeReview — names", () => {
  // Raw C0/C1 controls, bidi controls and isolates, line/paragraph separators.
  const hasRawControl = (line: string) =>
    [...line].some((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return (
        code < 0x20 ||
        (code >= 0x7f && code <= 0x9f) ||
        (code >= 0x202a && code <= 0x202e) ||
        (code >= 0x2066 && code <= 0x2069) ||
        [0x200e, 0x200f, 0x2028, 0x2029].includes(code)
      );
    });

  it("shows a Cyrillic name as letters, and posts it exactly", async () => {
    const name = "Иван_Петров";
    const h = harness({
      queue: [row("1", PLAYER_A, name)],
      answers: ["a", "y"],
    });
    await h.run();
    expect(h.out).toContain(`Name:    «${name}»`);
    expect(h.printed()).not.toContain("\\u");
    expect(h.printed()).not.toContain("⟨U+");
    expect(h.printed()).not.toContain("hidden or unusual characters");
    expect(h.bodies()[0].expectedName).toBe(name);
  });

  it("shows a no-break space as a code with a warning, and posts the real character", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Iv\u00A0an")],
      answers: ["a", "y"],
    });
    await h.run();
    expect(h.out).toContain("Name:    «Iv⟨U+00A0⟩an»");
    expect(h.out.join("\n")).toContain("hidden or unusual characters");
    expect(h.prompts[1]).toBe("Approve «Iv⟨U+00A0⟩an»? y/N > ");
    expect(h.bodies()[0].expectedName).toBe("Iv\u00A0an");
  });

  it("a hostile name cannot reach the terminal raw or fake a line", async () => {
    const name = "a\u001b[2J\u202Eb\nFAKE<c\u0007";
    const h = harness({
      queue: [row("1", PLAYER_A, name)],
      answers: ["a", "y"],
    });
    await h.run();
    for (const line of [...h.out, ...h.err, ...h.prompts]) {
      expect(hasRawControl(line)).toBe(false);
      expect(line).not.toContain("\n");
    }
    expect(h.out).toContain(
      "Name:    «a⟨U+001B⟩[2J⟨U+202E⟩b⟨U+000A⟩FAKE⟨U+003C⟩c⟨U+0007⟩»",
    );
    expect(h.out.some((line) => line.startsWith("FAKE"))).toBe(false);
    // What is posted is still the real name, byte for byte.
    expect(h.bodies()[0].expectedName).toBe(name);
  });

  it("warns only for a name the match's rude-name filter would hide", async () => {
    const warning = "rude-name filter would hide this name";
    const flagged = harness({
      queue: [row("1", PLAYER_A, "bitch")],
      answers: ["q"],
    });
    await flagged.run();
    expect(flagged.out.join("\n")).toContain(warning);
    const clean = harness({
      queue: [row("1", PLAYER_A, "Ivan")],
      answers: ["q"],
    });
    await clean.run();
    expect(clean.out.join("\n")).not.toContain(warning);
  });
});

// ── Reject ──────────────────────────────────────────────────────────────────
describe("runNameChangeReview — reject", () => {
  it("an empty reason goes back to the choice and sends nothing", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan")],
      answers: ["r", "", "r", "   ", "q"],
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.posts).toHaveLength(0);
    expect(h.prompts).toEqual([
      CHOICE_PROMPT,
      REASON_PROMPT,
      CHOICE_PROMPT,
      REASON_PROMPT,
      CHOICE_PROMPT,
    ]);
  });

  it("a too-long reason or the placeholder asks again and sends nothing", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan")],
      answers: ["r", "x".repeat(501), REASON_PLACEHOLDER, null],
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.posts).toHaveLength(0);
    expect(h.out.join("\n")).toContain("501 characters long; the limit is 500");
    expect(h.out.join("\n")).toContain("That is the placeholder");
    expect(h.prompts).toEqual([
      CHOICE_PROMPT,
      REASON_PROMPT,
      REASON_PROMPT,
      REASON_PROMPT,
    ]);
  });

  it("a valid Cyrillic reason (500 characters is allowed) is posted exactly", async () => {
    const reason = "Имя нарушает правила";
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan"), row("2", PLAYER_B, "Petr")],
      answers: ["r", reason, "r", "я".repeat(500)],
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.bodies()).toEqual([
      { playerId: PLAYER_A, decision: "reject", expectedName: "Ivan", reason },
      {
        playerId: PLAYER_B,
        decision: "reject",
        expectedName: "Petr",
        reason: "я".repeat(500),
      },
    ]);
    expect(h.out.join("\n")).toContain("HTTP 200: rejected");
  });
});

// ── Skip, quit, bad input ───────────────────────────────────────────────────
describe("runNameChangeReview — skip, quit and other input", () => {
  it("skip remembers the history row id, never posts it, and counts it", async () => {
    const h = harness({
      queue: [row("11", PLAYER_A, "Ivan"), row("12", PLAYER_B, "Petr")],
      answers: ["s", "s"],
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.nextPendingCalls).toEqual([[], ["11"], ["11", "12"], []]);
    expect(h.posts).toHaveLength(0);
    expect(h.out.join("\n")).toContain(
      "Approved 0, rejected 0, skipped 2. Still waiting: 2.",
    );
  });

  it.each([
    ["q", "q"],
    ["Q", "Q"],
    ["end of input (Ctrl-D)", null],
  ])(
    "%s ends the run with exit 0 and the summary, sending nothing more",
    async (_label, answer) => {
      const h = harness({
        queue: [row("1", PLAYER_A, "Ivan"), row("2", PLAYER_B, "Petr")],
        answers: ["a", "y", answer],
      });
      expect(await h.run()).toBe(EXIT_OK);
      expect(h.posts).toHaveLength(1);
      expect(h.out.join("\n")).toContain(
        "Approved 1, rejected 0, skipped 0. Still waiting: 1.",
      );
    },
  );

  it("unknown input asks again and sends nothing", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan")],
      answers: ["approve", "", "x", "q"],
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.posts).toHaveLength(0);
    expect(h.out.filter((l) => l === "Type a, r, s or q.")).toHaveLength(3);
  });

  it("the summary says so when the queue cannot be read for it", async () => {
    let reads = 0;
    const h = harness({ queue: [row("1", PLAYER_A, "Ivan")], answers: ["q"] });
    const result = await runNameChangeReview({
      isInteractive: true,
      token: TOKEN,
      port: PORT,
      fetch: async () => {
        throw new Error("not called");
      },
      nextPending: async () => {
        reads += 1;
        if (reads > 1) throw new Error("connection lost");
        return { ...row("1", PLAYER_A, "Ivan"), waitingTotal: 1 };
      },
      ask: async () => "q",
      stop: { requested: false },
      out: (line) => h.out.push(line),
      err: (line) => h.err.push(line),
      now: () => NOW,
    });
    expect(result).toBe(EXIT_OK);
    expect(h.out.join("\n")).toContain("Still waiting: unknown");
  });

  it("a database error while reading the queue stops with exit 1, sending nothing", async () => {
    const err: string[] = [];
    const result = await runNameChangeReview({
      isInteractive: true,
      token: TOKEN,
      port: PORT,
      fetch: async () => {
        throw new Error("not called");
      },
      nextPending: async () => {
        throw new Error("connect ECONNREFUSED\u001b[2J");
      },
      ask: async () => "a",
      stop: { requested: false },
      out: () => undefined,
      err: (line) => err.push(line),
      now: () => NOW,
    });
    expect(result).toBe(EXIT_REFUSED);
    expect(err.join("\n")).toContain("Could not read the waiting requests");
    expect(err.join("\n")).not.toContain("\u001b");
  });
});

// ── Server answers ──────────────────────────────────────────────────────────
describe("runNameChangeReview — what the decide route answers", () => {
  it("409 name_mismatch: says the name changed, does not skip, and decides the NEW name fresh", async () => {
    let first = true;
    const h = harness({
      queue: [
        row("1", PLAYER_A, "OldName", 120),
        row("2", PLAYER_B, "Petr", 60),
      ],
      answers: ["a", "y", "a", "y", "a", "y"],
      respond: (body, world) => {
        if (first) {
          first = false;
          // The player withdrew and asked again: a new row, a new name.
          world.queue.splice(0, 1);
          world.queue.push(row("3", PLAYER_A, "NewName\u202E", 0));
          return {
            status: 409,
            body: { error: "name_mismatch", pending_name: "NewName\u202E" },
          };
        }
        world.queue.splice(
          world.queue.findIndex((r) => r.playerId === body.playerId),
          1,
        );
        return { status: 200, body: { status: "ok" } };
      },
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.err.join("\n")).toContain(
      "HTTP 409 name_mismatch: the player changed the name after it was shown. Nothing was changed. The new name comes up as its own card.",
    );
    // Walk-through wording (review R2): no \uXXXX codes, no "this command".
    expect(h.err.join("\n")).not.toContain("\\u");
    expect(h.err.join("\n")).not.toContain("this command");
    // Not added to the skip set.
    expect(h.nextPendingCalls.every((ids) => ids.length === 0)).toBe(true);
    expect(h.out).toContain("Name:    «NewName⟨U+202E⟩»");
    expect(h.bodies().map((b) => b.expectedName)).toEqual([
      "OldName",
      "Petr",
      "NewName\u202E",
    ]);
  });

  // Review 0350 R2 (owner ruling 2026-10-15): nothing here was pasted, so no line
  // may tell the operator to copy or paste. The decide command's own wording is
  // unchanged (NameChangeDecideCommand.test.ts, unmodified).
  it.each([
    [
      "409 name_mismatch (Cyrillic)",
      { status: 409, body: { error: "name_mismatch", pending_name: "Пётр" } },
      "the player changed the name after it was shown",
    ],
    [
      "400",
      { status: 400, body: { error: "bad_request" } },
      "Check the profile-api logs.",
    ],
    [
      "401",
      { status: 401, body: { error: "unauthorized" } },
      "Run the walk-through on the profile box, in the profile-api container.",
    ],
  ] as Array<[string, Reply, string]>)(
    "%s is worded for the walk-through: no copy-or-paste advice, no \\u codes",
    async (_label, reply, text) => {
      const h = harness({
        queue: [row("1", PLAYER_A, "Ivan")],
        answers: ["a", "y", "q"],
        respond: (_body, world) => {
          world.queue.splice(0, 1);
          return reply;
        },
      });
      await h.run();
      const printed = h.printed();
      expect(printed).toContain(text);
      for (const pasteWording of ["Copy the command", "pasted", "Telegram"]) {
        expect(printed).not.toContain(pasteWording);
      }
      expect(printed).not.toContain("\\u");
    },
  );

  it("404 (withdrawn or decided elsewhere) prints and continues", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan"), row("2", PLAYER_B, "Petr")],
      answers: ["a", "y", "a", "y"],
      respond: (body, world) => {
        world.queue.splice(
          world.queue.findIndex((r) => r.playerId === body.playerId),
          1,
        );
        return body.playerId === PLAYER_A
          ? { status: 404, body: { error: "no_pending" } }
          : { status: 200, body: { status: "ok" } };
      },
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.err.join("\n")).toContain("HTTP 404 no_pending");
    expect(h.posts).toHaveLength(2);
    expect(h.out.join("\n")).toContain("Approved 1, rejected 0, skipped 0.");
  });

  it("409 name_taken prints, continues, and shows the same request again", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan")],
      answers: ["a", "y", "s"],
      respond: () => ({ status: 409, body: { error: "name_taken" } }),
    });
    expect(await h.run()).toBe(EXIT_OK);
    expect(h.err.join("\n")).toContain("HTTP 409 name_taken");
    expect(h.out.filter((l) => l === "Name:    «Ivan»")).toHaveLength(2);
    expect(h.out.join("\n")).toContain("skipped 1. Still waiting: 1.");
  });

  it.each([
    ["500", { status: 500, body: { error: "internal_error" } }, "HTTP 500"],
    ["401", { status: 401, body: { error: "unauthorized" } }, "HTTP 401"],
    [
      "503",
      { status: 503, body: { error: "name_change_unavailable" } },
      "HTTP 503",
    ],
    ["400", { status: 400, body: { error: "bad_request" } }, "HTTP 400"],
    [
      "an unexpected answer",
      { status: 418, body: { error: "teapot" } },
      "unexpected answer",
    ],
    [
      "no answer",
      new Error(`connect ECONNREFUSED (Bearer ${TOKEN})`),
      "may or may not have been applied",
    ],
  ] as Array<[string, Reply, string]>)(
    "%s stops the run with exit 1 and reads nothing more",
    async (_label, reply, text) => {
      const h = harness({
        queue: [row("1", PLAYER_A, "Ivan"), row("2", PLAYER_B, "Petr")],
        answers: ["a", "y", "a", "y"],
        respond: () => reply,
      });
      expect(await h.run()).toBe(EXIT_REFUSED);
      expect(h.err.join("\n")).toContain(text);
      expect(h.err[h.err.length - 1]).toBe("Stopped.");
      expect(h.posts).toHaveLength(1);
      expect(h.nextPendingCalls).toHaveLength(1);
      expect(h.printed()).not.toContain(TOKEN);
    },
  );

  it("the token never appears in any output, whatever the outcome", async () => {
    const replies: Reply[] = [
      { status: 200, body: { status: "ok" } },
      { status: 404, body: { error: "no_pending" } },
      { status: 409, body: { error: "name_taken" } },
      { status: 409, body: { error: "name_mismatch", pending_name: "Other" } },
      { status: 500, body: { error: "internal_error" } },
      { status: 401 },
      new Error(
        `Headers.append: "Bearer ${TOKEN}" is an invalid header value.`,
      ),
    ];
    for (const reply of replies) {
      const h = harness({
        queue: [row("1", PLAYER_A, "Ivan")],
        answers: ["a", "y", "q"],
        respond: (_body, world) => {
          world.queue.splice(0, 1);
          return reply;
        },
      });
      await h.run();
      expect(h.printed()).not.toContain(TOKEN);
    }
  });
});

// ── Ctrl-C ──────────────────────────────────────────────────────────────────
describe("runNameChangeReview — Ctrl-C", () => {
  it("while a decision is being sent: it finishes, its result prints, then the run stops (130)", async () => {
    const h = harness({
      queue: [row("1", PLAYER_A, "Ivan"), row("2", PLAYER_B, "Petr")],
      answers: ["a", "y", "a", "y"],
      respond: (body, world) => {
        world.stop.requested = true;
        world.queue.splice(
          world.queue.findIndex((r) => r.playerId === body.playerId),
          1,
        );
        return { status: 200, body: { status: "ok" } };
      },
    });
    expect(await h.run()).toBe(EXIT_INTERRUPTED);
    expect(h.posts).toHaveLength(1);
    expect(h.out.join("\n")).toContain("HTTP 200: approved");
    expect(h.out.join("\n")).toContain("Stopped (Ctrl-C).");
    expect(h.out.join("\n")).toContain(
      "Approved 1, rejected 0, skipped 0. Still waiting: 1.",
    );
    // No second card was shown.
    expect(h.out.some((l) => l.startsWith("Request 2"))).toBe(false);
  });

  // Review 0350 R1: a stopping answer wins over the Ctrl-C — exit 1, no summary
  // (the runbook says so; this pins it).
  it.each([
    ["a 500", { status: 500, body: { error: "internal_error" } }],
    ["no answer", new Error("connect ECONNREFUSED")],
  ] as Array<[string, Reply]>)(
    "while a decision is being sent that gets %s: the error stop wins (exit 1, no summary)",
    async (_label, reply) => {
      const h = harness({
        queue: [row("1", PLAYER_A, "Ivan"), row("2", PLAYER_B, "Petr")],
        answers: ["a", "y", "a", "y"],
        respond: (_body, world) => {
          world.stop.requested = true;
          return reply;
        },
      });
      expect(await h.run()).toBe(EXIT_REFUSED);
      expect(h.posts).toHaveLength(1);
      expect(h.err[h.err.length - 1]).toBe("Stopped.");
      expect(h.out.join("\n")).not.toContain("Stopped (Ctrl-C).");
      expect(h.out.join("\n")).not.toContain("Approved ");
      expect(h.nextPendingCalls).toHaveLength(1);
    },
  );

  it.each([
    ["the choice", [ctrlC]],
    ["the reason", ["r", ctrlC]],
  ] as Array<[string, Answer[]]>)(
    "at %s prompt: nothing is sent, exit 130",
    async (_label, answers) => {
      const h = harness({ queue: [row("1", PLAYER_A, "Ivan")], answers });
      expect(await h.run()).toBe(EXIT_INTERRUPTED);
      expect(h.posts).toHaveLength(0);
      expect(h.out.join("\n")).toContain("Stopped (Ctrl-C).");
    },
  );
});

// ── The query ───────────────────────────────────────────────────────────────
describe("fetchNextPending", () => {
  const sql = NEXT_PENDING_SQL.replace(/\s+/g, " ");

  it("reads pending only, oldest first with the id tie-break, one row, excluded ids as $1", () => {
    expect(sql).toContain("FROM player_name_history");
    expect(sql).toContain("moderation_status = 'pending'");
    expect(sql).toContain("NOT (id = ANY($1::bigint[]))");
    expect(sql).toContain("ORDER BY changed_at, id");
    expect(sql).toContain("LIMIT 1");
    expect(sql).toContain("count(*) OVER ()");
  });

  it("never selects a Yandex id and never joins players", () => {
    expect(sql.toLowerCase()).not.toContain("yandex");
    expect(sql.toLowerCase()).not.toContain("join");
    expect(sql).not.toMatch(/\bplayers\b/);
  });

  it("passes the excluded ids as one array parameter and maps the row", async () => {
    const query = jest.fn(async () => ({
      rows: [
        {
          id: "42",
          player_id: PLAYER_A,
          new_display_name: "Иван",
          changed_at: "2026-10-15T10:00:00Z",
          total: 3,
        },
      ],
    }));
    const result = await fetchNextPending({ query } as never, ["5", "7"]);
    expect(query).toHaveBeenCalledWith(NEXT_PENDING_SQL, [["5", "7"]]);
    expect(result).toEqual({
      historyId: "42",
      playerId: PLAYER_A,
      requestedName: "Иван",
      requestedAt: new Date("2026-10-15T10:00:00Z"),
      waitingTotal: 3,
    });
  });

  it("returns null when nothing is left", async () => {
    const query = jest.fn(async () => ({ rows: [] }));
    expect(await fetchNextPending({ query } as never, [])).toBeNull();
    expect(query).toHaveBeenCalledWith(NEXT_PENDING_SQL, [[]]);
  });
});

// ── Static checks — the traps that would only show up on the box ────────────
describe("review command wiring (static)", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  const script = packageJson.scripts[REVIEW_NPM_SCRIPT];
  const entry = (script ?? "")
    .split(" ")
    .find((part) => /^src\/.*\.ts$/.test(part));
  const LOGIC = "src/profile-server/NameChangeReviewCommand.ts";

  const codeOf = (file: string) =>
    fs
      .readFileSync(path.join(REPO_ROOT, file), "utf8")
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, ""))
      .filter((line) => !/^\s*\*/.test(line))
      .join("\n");
  const quoted = (specifier: string) =>
    new RegExp(`["']${specifier.replace(/[.]/g, "\\.")}(\\.[jt]s)?["']`);

  it("package.json's script points at an existing entry file", () => {
    expect(script).toBeDefined();
    expect(entry).toBe("src/profile-server/reviewNameChanges.ts");
    expect(fs.existsSync(path.join(REPO_ROOT, entry ?? ""))).toBe(true);
  });

  // The 0283 trap: Server.ts calls listen() at module load, so a one-shot command
  // importing it would fight the running container for the port.
  it.each([
    ["src/profile-server/reviewNameChanges.ts", "./NameChangeReviewCommand"],
    [LOGIC, "./NameChangeDecideCommand"],
  ])("%s never references ./Server, ./Routes or ./Telemetry", (file, known) => {
    const code = codeOf(file);
    // Not vacuous: the scan finds this file's own real import.
    expect(code).toMatch(quoted(known));
    for (const forbidden of ["./Server", "./Routes", "./Telemetry"]) {
      expect(code).not.toMatch(quoted(forbidden));
    }
  });

  it("the logic module takes the pool injected: no ./Db, and pg as a type only", () => {
    const code = codeOf(LOGIC);
    expect(code).not.toMatch(quoted("./Db"));
    expect(code).toMatch(/import type \{ Pool \} from "pg";/);
    expect(code).not.toMatch(/import \{[^}]*\} from "pg"/);
  });

  it("the runbook names the command, without -T", () => {
    const runbook = fs.readFileSync(
      path.join(
        REPO_ROOT,
        "ai-agents/knowledge-base/name-change-digest-runbook.md",
      ),
      "utf8",
    );
    const line = reviewCommandLine().replace(
      PROFILE_COMPOSE_FILE,
      "<profile dir>/docker-compose.yml",
    );
    expect(runbook).toContain(line);
    expect(reviewCommandLine()).not.toContain("-T");
    expect(reviewCommandLine()).toContain(` exec ${PROFILE_API_SERVICE} `);
  });
});
