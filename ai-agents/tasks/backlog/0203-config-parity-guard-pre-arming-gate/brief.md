# Pre-arming gate for the config parity guard — the ten items that must land before `--enforce` is wired

## ID
0203

## Sprint
Backlog — unscheduled. Filed on [`backlog.md`](../../../sprints/backlog.md), not on Sprint 4, because
no owner ruling scheduled it into a sprint and it cannot start until `0064`'s report-only run has
happened. See Notes for the board-choice reasoning.

## Priority
**Medium–low. Producer's rank, not an owner ruling.**

- **Not urgent.** Nothing is broken today. The guard ships **report-only**, exits zero, and cannot
  fail a deploy — every one of the ten items below is latent, test-quality, or reachable only once
  `--enforce` is armed. Two of the ten (R1, R12) have a **live mechanism** but **no live instance**
  in the tree, and one (R1) is an owner-acknowledged gap that ships knowingly.
- **But it blocks a capability the owner has said they want.** The standing ruling is *report-only
  for the weekend deploy, then wire enforcing*. This task is the whole of what stands between those
  two. Until it lands, the guard can only ever tell you; it can never stop you.
- Rank it above ordinary polish and below anything player-facing or live-money.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

Task [`0064`](../0064-deploy-time-config-parity-guard/brief.md) built the deploy-time config parity
guard in report-only mode. It passed a **two-round stateful review** — round 2 **CONVERGED, verdict:
ship report-only** — recorded in
[`0064`'s review ledger](../0064-deploy-time-config-parity-guard/review.md).

The reportable outcome of round 2 was **not a defect**. It was scheduling:

> *"The reportable change is scheduling, not correctness: arming `--enforce` is now 10 gate items,
> not 2."*

Round 1 ended with a 3-line pre-arming list (R1, R4, then wire `--enforce`). Round 2 added eight more
findings that are harmless under report-only and become real once the guard can fail a deploy. The
gate is now **ten items**.

**Owner ruling 2026-09-02: file the pre-arming gate as its own follow-up brief.** Reasoning accepted
as given: the gate is materially bigger than `0064`'s remaining scope implies, and keeping it inside
`0064` would turn a shippable unit into a long-running container.

**Nothing here re-opens a settled decision.** Every item below is carried verbatim in substance from
`0064`'s ledger, where each is stated with `file:line` evidence and, for most, an executed
reproduction. Two items already carry an owner ruling on *method* — do not re-decide those.

---

## The boundary with `0064` — read this before touching either task

| | `0064` — stays open | `0203` — this task |
|---|---|---|
| Weekend **report-only** production run (`0064` verification step 8) | ✅ `0064` | — |
| **Phase 2** scope: forwarded-but-empty (`0061` class) and http-on-bare-IP (`0063` class); `0064` verification steps 2 and 3 | ✅ `0064` | — |
| The **ten pre-arming items** below | — | ✅ `0203` |
| **Wiring `--enforce`** at the call sites — ruling R3's second half | ✅ `0064` | ❌ **explicitly NOT this task** |

`0064` stays **`🔄 In progress`**. This task does **not** arm the guard and must not wire `--enforce`
at any call site; that stays inside `0064` and happens **after** this task lands.

**Sequencing is hard, not a preference: all ten items land before `--enforce` is wired.** That is the
whole reason this brief exists.

---

## What to build

Ten items. Each is one line in `0064`'s round-2 pre-arming list; the detail below is the ledger's,
not a paraphrase.

Unless stated otherwise the surface is `scripts/check-config-parity.mjs`,
`scripts/config-parity-allowlist.json` and `tests/scripts/ConfigParity.test.ts`. **No application
code.**

### 1. R1 — HIGH — the client blind spot. Fix method already ruled.

`src/core/**` is hard-mapped to the game pipeline (`scripts/check-config-parity.mjs:69-74`,
`:494-518`), but `src/core/configuration/**` is bundled into the **browser** — 13 `src/client/**`
files import it. So a core environment read the browser needs is checked only against the deploy
heredoc, **never against webpack `DefinePlugin`**, and a genuinely broken client supply channel prints
green.

**Reproduced (ledger):** deleting the `STRIPE_PUBLISHABLE_KEY` `DefinePlugin` entry — read at
`src/core/configuration/DefaultConfig.ts:77,331`, reachable from `src/client/Main.ts:7` — still yields
`REQUIRED 0` and `--enforce` exit 0. Raised independently by **both** reviewers.

✅ **THE FIX METHOD IS OWNER-RULED (disposition D2) — DO NOT RE-DECIDE IT.** Classify
`src/core/configuration/**` reads against **both** channels: the deploy heredoc **and** webpack
`DefinePlugin`. The ruling settles *how*; ruling D1 settled *when* (before arming, not before the
report-only ship). The agreed method is also recorded in-source in the ⚠️ known-gap block at
`scripts/check-config-parity.mjs:79-95`, with a second pointer at `:551-554`.

⚠️ Do **not** substitute an import-graph walk for the directory heuristic — that is settled by ruling
R2 (`0064` `plan.md` Q1) and suppressed as re-litigation. R1 is *not* that argument: it names the
client↔core edge, which R2's drift test does not cover.

### 2. R4 — decide the two `--enforce` fail-closed edges. **UNDISPOSITIONED — needs an owner decision.**

`scripts/check-config-parity.mjs:671-677`, `:353-355`. The owner **explicitly declined** to rule on
this (disposition D7), so it arrives here open. Both edges must be decided before arming:

- **(a) A new unmapped `src/` directory hard-fails a deploy.** `dynamicReads` includes the "maps to no
  pipeline" case, so adding any new top-level directory under `src/` that reads the environment would
  hard-fail a deploy — with a message that **never names the one-line `DIR_PIPELINE` fix**. Should it
  hard-fail at all, and if so, must the message name the fix?
- **(b) Missing input vs missing checker is asymmetric.** `skips.length > 0` fails **closed** on a
  missing *input file*, while the call sites' `-f` guard **silently skips** a missing *checker*. Which
  way should each go?

Failing closed on `PARSE-FAILURE` / `DYNAMIC-READ` was called the right default by the reviewer; these
two edges are what that default does not settle.

### 3. R12 — MEDIUM — the heredoc drop-detector still drops `export KEY=`. **Lead with this one.**

`scripts/check-config-parity.mjs:125-126`, `:202-207`.

**The R9 fix does not close the invariant its own comment states.** `:122-124` says an assignment
"must never be silently dropped", but `HEREDOC_ASSIGN` requires `[A-Z_]` at **column 0** and
`HEREDOC_ASSIGN_INDENTED` requires `[ \t]+` then `[A-Z_]` — so **`export KEY=…` matches neither**, at
column 0 or indented, and **neither does a lowercase name**.

**Reproduced independently twice.** Reviewer-side: `export ORPHAN_KEY=${ORPHAN_KEY}` in the
`profile.env` heredoc with no hop-1 export prints **`REQUIRED 0 / INFO 0` — total silence**,
suppressing both the B2 *lands EMPTY* finding and the reverse INFO line; the identical fixture with
the plain spelling prints both. Codex-side reproduced the same on the real files.

That is **`0195`'s exact false negative, silently, inside the guard built to catch `0195`** — what the
checker's own comment at `:181-185` calls "the worst outcome available". **No live instance today**
(both heredoc bodies are flat and `export`-free).

**Direction recorded by the reviewer:** define the drop-detector **by inversion** — "a line the key
parser did not consume that still looks like an assignment" — **not** as a second hand-written
positive pattern. A third positive pattern has the same failure mode as the first two.

⚠️ **Carries an open question — see Open questions below. Do not resolve it inside the fix without an
answer.**

### 4. R13 — decide the `PARSE-FAILURE` blast radius and its false-positive edge.

`scripts/check-config-parity.mjs:186-192` → `:436-455`.

The R9 fix **traded a quiet false negative for a loud false positive, and no test pins the result.**
`PARSE-FAILURE` returns `keys: []`, so the caller discards the **whole** heredoc. Before the fix,
indenting one key at `deploy.sh:312` produced **1** false `REQUIRED`; after it, the same edit produces
the `PARSE-FAILURE` **plus ~21 false `REQUIRED`**, and drops game `INFO` from **6 to 0** — burying the
real dead-key signal. Profile side: **7** false B1 `REQUIRED`, and B2 silenced entirely.

Loud-over-quiet is the defensible trade and the reviewer is **not** asking for it back. Two things to
settle: pin the resulting behaviour with an assertion, and handle the mirror risk —
`HEREDOC_ASSIGN_INDENTED` fires on **any** indented `UPPERCASE=` line, not only a real key, so a
future heredoc whose body legitimately contains one is a **false hard `PARSE-FAILURE`**. Harmless
today; a deploy blocker once `--enforce` is wired.

### 5. R14 (second half) — decide cross-pipeline failure at both entry points.

`deploy.sh:61`, `build-deploy-profile.sh:70`. Both call sites now run `--pipeline=all` (the R3/D4
fix — correct, unchallenged). Consequence for arming: **a parse failure or a skip in an *unrelated*
pipeline becomes a deploy blocker at both sites** once `--enforce` is on. Decide whether that is
wanted, per-pipeline or globally.

⚠️ R14's **first half** is a printed-output decision put to the owner as **Q7** and **not answered** —
see Open questions.

### 6. R15 — comment and string awareness in the read scanner, or `--enforce` fails on prose.

`scripts/check-config-parity.mjs:114-118`, `:308-313`. The read scanner has **no comment or string
awareness**. **Reproduced:** a `.ts` file whose line 2 is the prose comment
`// legacy default = process.env, replaced in 2024` emits
`DYNAMIC-READ … the environment object is aliased or destructured`. **Under `--enforce` that is a hard
deploy failure caused by a sentence.** The symmetric case records a false *read*, which in the reverse
checks suppresses a real dead-config line.

**Two near-miss live instances already exist:** `src/server/Master.ts:146` and
`src/server/WorkerSupervisor.ts:74` both write `worker.process.env` inside comments, and escape only
because neither has a preceding `=` or a trailing `.NAME`.

Distinct mechanism from accepted residual R8 (`isNamedIn` over shell consumer files) — do not conflate
them.

### 7. R16 — reconcile the enforce footer with `failClosed`.

`scripts/check-config-parity.mjs:679-685` vs `:753-759`. **A second false contract of exactly R5's
class survived both rounds, in `render()` — the function edited in round 1.** The enforce footer tests
only `requiredTotal` and `parseFailures`; `failClosed` **also** fails on `dynamicReads` and `skips`.

**Reproduced:** `--enforce` on a fixture with only a `DYNAMIC-READ` prints
`enforce — no required findings` and **exits 1** — the output tells the reader the opposite of what
the process did. Zero impact today (`--enforce` is wired to nothing). **It must not survive arming**:
it is a stated false contract inside a task about stated false contracts.

### 8. R18 — parse the `DefinePlugin` **block**, not the file's raw text.

`scripts/check-config-parity.mjs:119`, `:240-252`. `parseDefinePlugin` scans the whole file's **raw
text**. **Reproduced:** adding `// legacy: "process.env.OLD_FAKE_KEY": JSON.stringify(x),` as a
**comment** to `webpack.config.js` makes the guard print `INFO 2 … OLD_FAKE_KEY, WEBSOCKET_URL`.

**The mirror case is worse:** a commented-out or string-embedded key counts as **supplied**, hiding a
genuinely missing substitution. Single-quoted, backtick and computed keys are missed silently
(prettier config makes single quotes unreachable today).

### 9. R19 — decide what a dynamic read should do to the reverse checks.

`scripts/check-config-parity.mjs:308-313`, `:462`, `:541`, `:587`. A dynamic or aliased read is
**announced** as `DYNAMIC-READ`, but its name **never enters `allReadNames`** — so all three reverse
checks call the corresponding key **dead**. **Reproduced:** a fixture with
`const { API_DOMAIN } = process.env;` emits the `DYNAMIC-READ` line **and** lists `API_DOMAIN` under
`substituted by DefinePlugin, no reader found`.

Not silent, so this is not R7's class — but it is a false "this is dead" line, which the checker's own
comment at `:586` argues "costs the reader's trust in every other line". **0 live instances.** The new
client reverse check widened where this can appear.

### 10. R21 — decide whether the scanner looks outside `src/`.

`scripts/check-config-parity.mjs:459-467`, `:143-157`. The game reverse (dead-config) check iterates
only `forwarded` (heredoc keys), so a key supplied **only** by `Dockerfile ENV` is never
reverse-checked.

⚠️ **Correction, carried so it is not re-introduced:** the Codex-side claim that `PUBLIC_ORIGIN`
(`Dockerfile:31`) is a live dead key is **REFUTED** — it is read at `scripts/upload-sourcemaps.js:31`.
What survives is sharper: **the scanner walks only `src/`, so build-tooling reads under `scripts/` are
invisible, and extending the reverse check naively would produce a *false* dead call on
`PUBLIC_ORIGIN`.** No live defect; a real asymmetry to reason about before arming.

---

## Verification steps

1. **Each of the ten items has an executable proof, not a claim.** For every item with a recorded
   reproduction (R1, R12, R13, R15, R16, R18, R19), re-run that exact reproduction and show it now
   behaves correctly. For the decision-only items (R4, R14 second half, R21), record the decision and
   the assertion that pins it.
2. **Every new test is mutation-proved falsifiable.** ⚠️ **This is not optional and not a formality —
   it is the standing bar on this code.** Round 1 shipped a vacuous assertion (R2); round 2 found two
   more one-sided ones (R17). Break the behaviour each new test names, watch it go red, revert. Report
   the mutation table. **An assertion pinning an absence is not evidence until something can make it
   fire.**
3. **R12 specifically: the silent case becomes loud.** `export KEY=` and a lowercase key in either
   heredoc body must be reported, not dropped. Prove the `0195`-shaped B2 finding is no longer
   suppressed — the fixture that printed `REQUIRED 0 / INFO 0` must now print the finding.
4. **No regression in the real-tree output.** The game and profile sections were **byte-identical**
   across rounds 1 and 2 (byte-compared against the verbatim output preserved at
   `0064`'s `worklog.md:57-71`). Any change to them is a finding to explain, not a diff to accept.
5. **`--enforce` still wired to nothing at the end of this task.** Re-verify no call site and no
   `package.json` script passes it. Arming is `0064`'s, after this lands.
6. **Full suite green.** `npm test`, `npm run lint`, `npx prettier --check` on touched files,
   `bash -n` on both deploy scripts, and `tests/scripts/profile-deploy-hardening.test.sh` — the last
   run **without editing the tracked harness** (`0201` may still be in flight; `0064`'s rounds used a
   scratch mirror repo root for exactly this).
7. **No value is ever printed.** Same bar as `0064` verification step 7 — variable names and verdicts
   only, never values, not truncated, not "starts with".

## Notes

- **Depends on:** [`0064`](../0064-deploy-time-config-parity-guard/brief.md) — the guard must exist and
  its report-only run must have happened. This task edits the code `0064` built.
- **Blocks:** `0064`'s remaining arming step (wiring `--enforce`, ruling R3's second half). **Hard
  sequencing: all ten items land first.**
- **Related:** `0061`, `0062`, `0063`, `0195` — the four instances of the silent-misconfig class the
  guard exists to catch. `0201` (shell-harness gating) touches
  `tests/scripts/profile-deploy-hardening.test.sh`; do not edit that file here.

- **Source of record.** Every item above is carried from
  [`0064`'s review ledger](../0064-deploy-time-config-parity-guard/review.md) — round-2 findings table
  and the closing *Carried into the pre-arming pass* list. **The ledger is authoritative** for the
  exact claims, evidence and reproductions; this brief restates them so the pass can be worked from
  one file, and it does not add, drop or soften any of them.

- **Two rulings already made — do not re-decide them.** (i) **R1's fix method** is owner-ruled
  disposition **D2**: classify `src/core/configuration/**` against both channels. (ii) **When R1 is
  fixed** is ruling **D1/Q1**: before arming, not before the report-only ship.

- **Optional fold-in, reviewer-suggested, not required.** Accepted residual **R10** (`sites` is one
  array shared across pipelines, so a game finding can cite a `profile-server/` file — cosmetic
  misdirection, reproduced) carries the re-raise note *"or fold into the R1 pre-arming pass, which
  touches this code anyway"*. Take it only if R1's fix already opens that code; do not widen scope for
  it.

- **Residuals that stay on `0064`'s ledger and are NOT in this task's ten:** R7 (non-`.ts` files
  invisible), R8 (`isNamedIn` matches comments), R10, R11 (trace-echo test narrower than its name),
  R9's `findIndex` sub-note (first-matching heredoc), R17 (two one-sided real-tree absence
  assertions) and R20 (allowlist path test does not require a citation). Each was accepted with a
  stated re-raise trigger. **Re-raise only on the stated trigger** — they are not scope here.

- **This is hardening, not a fix.** It corrects no configuration and closes no live defect. If it
  discovers a real misconfiguration in the tree, that is a new brief — do not let this task grow into
  fixing what it finds. Same rule `0064` carries.

- **Board choice — `backlog.md`, not `plan-sprint-4.md`.** `0064` sits in Sprint 4, but this task is
  not Sprint 4 work: no owner ruling scheduled it, it cannot start until `0064`'s weekend report-only
  run has happened, and Sprint 4's goal is the citizenship/monetization launch. Filing it into the
  active sprint would assert a sprint commitment nobody made. `backlog.md` is by its own charter *"the
  board every task brief lands on when no sprint was named for it"*. Promote it when the owner wants
  the guard armed. **Row appended, not inserted** (ADR-035).

- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact** — variable names only, never values. This task is *about* an
  environment full of credentials, so the risk of one landing in a worklog, a fixture, a log line or
  deploy output is unusually high.

## Open questions — both need the owner, neither is resolved here

1. **R12 / the `export` case — does Docker Compose's `env_file` tolerate an `export` prefix?**
   ⚠️ **The reviewer explicitly did NOT verify this, and it is not resolved in this brief.** It decides
   how bad R12 is:
   - If `env_file` **does** tolerate `export`, the silently-dropped case is a **working deploy the
     guard cannot see** — and R12 is **worse than medium**.
   - If it does **not**, the silent case is a broken deploy that would fail some other way.

   Either way R12 gets fixed in this pass; the answer sets its severity and how loudly the fix must
   announce itself. **Answer it before assigning R12 a final severity — do not assume either branch.**

2. **Q7 (R14 first half) — while R1 is unfixed, should the guard print its own caveat under the client
   line?** Put to the owner in `0064`'s round 2 and **not answered**; the reviewer's default was *ship
   as-is and fold R14 into the pre-arming pass*, which is why it is here. Every deploy now prints
   `pipeline: client / REQUIRED 0` with **no warning attached**; R1's caveat lives only in a source
   comment and in the ledger, where a deploy operator will not see it.
   - **Option A — print it (reviewer's recommendation).** One line under the client `REQUIRED` count,
     e.g. *"client forward check is INCOMPLETE while R1 is open — a green line here does not mean the
     browser channel is sound."* Cost: one line, no behaviour change, no risk to the byte-identical
     game output.
   - **Option B — leave the output as is.** Defensible: report-only ships to a small, informed
     audience, and R1 is fixed before arming anyway.

   ⚠️ **If R1 is fixed early in this pass, Q7 dissolves** — the caveat describes a gap that would no
   longer exist. Check R1's state before spending a decision on it.
