# Pre-arming gate for the config parity guard — the ten items that must land before `--enforce` is wired

## ID
0203

## Sprint
Sprint 4

⚠️ **The field above is the bare token `Sprint 4` on purpose** — `dashboard.sh`'s drift rule compares
it against the board's identity, and a decorated value is reported as drift. **Do not decorate it.**

🔴 **PULLED IN 2026-09-12 on an OWNER RULING, given live in session and relayed through the lead
session** — accepting the producer's "invisible gate" reasoning: this task gates a Sprint 4 task
(`0064`'s arming), and a gate invisible on the Sprint 4 board is how a gate gets skipped — the same
reasoning as `0238`. ⚠️ **The owner ruled the BOARD, not the rank** — unranked on Sprint 4 (Priority `—`);
the `Medium–low` below is still the producer's. Status unchanged. The Backlog-board row now reads
`➡️ Moved` and is kept, not deleted.

~~Backlog — unscheduled. Filed on [`backlog.md`](../../../sprints/backlog.md), not on Sprint 4, because
no owner ruling scheduled it into a sprint and it cannot start until `0064`'s report-only run has
happened. See Notes for the board-choice reasoning.~~ *(struck 2026-09-12, kept not deleted; the
"cannot start until `0064`'s report-only run has happened" part is still true.)* 📌 *(2026-09-14: that
part is now WAIVED by owner ruling — see `## Status` and `## Notes`.)*

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
✅ Done (agent-closed — not owner-verified) — **closed 2026-09-24 by a spawned `fkit-producer` (close step of `/fkit-sprint-ship-loop`, fkit-lead driver), no owner present (ADR-033 §5).** Run 2 built the owner-approved `plan-run2.md` (R4a message, R4b pins, R13, item 11 + R19, R21, item 12 per-pipeline tagging); stateful review round 3 `closed-out`; driver re-verify 2026-09-24 green. ⚠️ **`--enforce` is wired nowhere — arming is [`0298`](../../backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md)'s; nothing here is verified in production.** · earlier: 🔄 In progress — driven by `fkit-sprint-ship-loop` from 2026-09-24 (plan step). Earlier: 🚧 Blocked — no owner decision pending; a local build of the ruled pre-arming items remains (incl. per-pipeline tagging, owner-ruled 2026-09-23). Marker left for the ship loop to set `🔄 In progress` when the build starts · earlier: this run (R12, R1+R10 incl. reverse case, R15, R18, R16, plus review fixes R2/R3) built + reviewed 2026-09-14, review round 2 closed out, Codex full, npm test 122/1305; ~~open pending OWNER decisions on the remaining pre-arming items (R4, R13, R14 second half, R19, R21, item 11) and the brief's open questions~~ **📌 2026-09-23: NO owner decision is pending any more.** Every pre-arming decision is RULED (R4a, R4b and R14 second half by the owner; R13, item 11, R19 and R21 as the architect's call, owner-approved), and both open questions are closed. **What remains is the local build of the ruled items, which can be done without a deploy.** Marker kept `🚧 Blocked` as instructed; setting `🔄 In progress` when the build starts is a free planning act · earlier: 🔄 In progress — driven from the lead session (/fkit-sprint-ship-loop), started 2026-09-14 · scope this run: the no-decision fixes R12, R1, R15, R16, R18 only · ⚠️ this start PRECEDES `0064`'s weekend report-only production run, which `## Notes` records as a dependency (*"its report-only run must have happened"*; `0064` is still 🔄 In progress) — the driver relayed the start as owner-ruled; ~~whether that dependency was waived knowingly is not recorded~~ *(struck 2026-09-14, kept not deleted — answered by the ruling that follows)* · 📌 **OWNER RULING 2026-09-14, given live in the lead session (`AskUserQuestion`) and relayed by `fkit-lead`: the ordering dependency on `0064`'s weekend report-only run is WAIVED.** Asked *"0203's brief said it should wait for the guard's (0064) weekend report run. It's already building (it switches nothing on). Is that OK?"*, the owner answered *"Yes, build now"*. ⇒ the weekend report-only run uses the improved checker. Build running on `plan.md`, owner-approved 2026-09-14 (R1 option A — `server-only` / `runtime-supplied` allowlist labels; R10 folded in). Not producer precedent for waiving any other dependency. Status token unchanged


🔓 **RULING 3 LIFTED FOR THIS TASK, 2026-09-23 — SPRINT 4 RESCOPE, OWNER RULING (Q3 = (b), AGAINST the producer's recommendation).** Given live in the `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021). ⛔ **Not producer precedent.** The option as put: *"S4: lift ruling 3 and take the 6 decisions now."* The producer had recommended (a), moving this task to Sprint 5 with ruling 3 kept.
- **This task STAYS in Sprint 4, and its six pending decisions are taken NOW, BEFORE the Saturday 2026-09-26 window.** This **lifts the runbook's ruling 3** (*"`0203`'s six pending decisions are deferred until after the deploy"*) for this task, the same day the owner had re-kept it. The re-confirmation bullets below are kept, not deleted: they were true when written.
- **The lead walks the owner through the decisions next.** The producer takes none of them. The un-ruled prep list is [`decision-prep-2026-09-23.md`](decision-prep-2026-09-23.md).
- **This task's consumer moved.** Wiring `--enforce` is no longer `0064`'s: it is [`0298`](../../backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md) (Sprint 5), split out of `0064` the same day (rescope Q2 = (a)). **Hard sequencing is unchanged: every item here lands before `0298` wires `--enforce`.**
- 🚨 **Sprint 4 closes AT THE DEPLOY** (owner ruling, Q7 = (b)). Whatever of this task is unfinished then rolls to Sprint 5, and `0298`'s arming keeps waiting on it. Code in progress must sit **on a branch, out of the working tree, at runbook W12**, because `./build-deploy.sh prod` commits and ships the tree as it stands. (This task changes nothing at runtime: the guard stays report-only until `0298` arms it.)
- ⛔ `## Status` marker untouched; no mover invoked.

📌 **2026-09-23, later — DECISIONS TAKEN (Sprint 4 rescope, after the ruling-3 lift).** Each is an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. Record: [`decision-prep-2026-09-23.md`](decision-prep-2026-09-23.md).
- ✅ **RULED — R4a:** *"Stop, show the fix"*. Under `--enforce`, an unmapped new `src/` folder stops the deploy, and the message names the one-line `DIR_PIPELINE` fix.
- ✅ **RULED — R4b:** a missing guard script **stops the deploy**, the same as a missing input. The same stop applies to a scanner parse failure and a computed/spread `DefinePlugin` key. ⚠️ **Authority, precisely:** the owner first answered *"We're not doing the deploy today. You can fix it"* (delegating to the lead's recommendation). Asked by the lead to confirm *"a missing guard script STOPS the deploy (my recommendation)?"*, the owner answered ***"Yes, stop the deploy"***. The call-site `-f` change is [`0298`](../../backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md)'s, as part of the `--enforce` wiring.
- ✅ **RULED — R14 (second half):** *"Only its own deploy"*. Each deploy blocks only on its own settings (game + browser for `deploy.sh`, profile for `build-deploy-profile.sh`). Other pipelines' findings print loudly but don't block. Shared code (`core/configuration`) is still checked for both. Implemented by the arming in [`0298`](../../backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md).
- ~~🔀 **ROUTED, NOT RULED — R13, item 11, R19, R21:** the owner chose *"Architect decides, I approve"*. `fkit-lead` is consulting `fkit-architect`. **Each stays open until the architect's call and the owner's yes/no are recorded.**~~ *(Superseded later the same day, below.)*
- ✅ **RULED 2026-09-23 — R13: option 2.** architect's call (`fkit-architect`, read-only consult, 2026-09-23), **owner-approved** live via `AskUserQuestion` in the `fkit lead` session on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021); ⛔ not producer precedent. Report the unreadable heredoc line as `PARSE-FAILURE`, **but still check every line that parsed** (`parseHeredocKeys`, `scripts/check-config-parity.mjs:483-487`; callers `:836-837`, `:886-887`). **Option 3 is rejected as unneeded:** since the R12 fix, detection works by inversion (`:136-142`), so the *"legitimate indented UPPERCASE= line"* risk is stale. The other failure cases (anchor not found, never closed, empty block) still return no keys. **Tests:** one game fixture and one profile fixture (`PARSE-FAILURE` + exactly one extra `REQUIRED`, `INFO` unchanged, B2 still fires), proved by mutation. Size: small.
- ✅ **RULED 2026-09-23 — item 11 + R19, together**, as two halves of one rule: *"every use of `process.env` is either a listable read or is announced"*. architect's call (`fkit-architect`, read-only consult, 2026-09-23), **owner-approved** live via `AskUserQuestion` in the `fkit lead` session on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021); ⛔ not producer precedent.
  - **Item 11:** replace `ENV_ALIAS` (`:129`) with detection by inversion. After comments and strings are masked, any `process.env` that is not a plain dot read, a quoted bracket read, or a fully written-out destructuring is a `DYNAMIC-READ`, and the message names the fix (*"rewrite as plain `process.env.NAME` reads"*). Member access (`worker.process.env`) is excluded. **Do NOT widen to a bare `process`**: it would falsely stop on `src/profile-server/Server.ts:203` and `src/client/GoogleAdElement.ts:100`. `const { env } = process` and `process["env"]` stay a documented limit, with a pinning test.
  - **R19: option 1 plus a lighter option 2.** A written-out destructuring (`{ A, B: b, C = "x" } = process.env`) counts as normal reads and is not announced. `...rest` and computed keys stay `DYNAMIC-READ`. While any `DYNAMIC-READ` is present, print one `INFO` caveat line (*"INFO may include keys read through the DYNAMIC-READ above"*). **This REMOVES a false deploy stop that exists today.**
  - **Tests:** the two recorded reproductions; the other silent shapes (`Object.keys(process.env)`, `{...process.env}`, `f(process.env)`, `(process.env)`, `return process.env`, `x ?? process.env`, `if (process.env)`); the member-access exclusion; the `const { env } = process` pin; destructured names no longer reported dead; rest/computed still `DYNAMIC-READ`; the caveat only when a `DYNAMIC-READ` is present. Size: medium, shared between the two items.
- ✅ **RULED 2026-09-23 — R21: option 2.** architect's call (`fkit-architect`, read-only consult, 2026-09-23), **owner-approved** live via `AskUserQuestion` in the `fkit lead` session on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021); ⛔ not producer precedent. **Keep `src/` only**, document it as a known limit, and add a pinning test: a fixture read outside `src/` is not seen, and the mutation points the walk at the repo root. **Re-raise when a file outside `src/` first reads a deploy-forwarded setting.** The limit note must also name `webpack.config.js`'s build-machine reads (`:36-43`, `:164`, `:173-175`, `:337`, `:341`, `:345`) as **unchecked**, because they are a different path from deploy forwarding. Size: small.
- ✅ **RULED 2026-09-23 — the conflict between R4a and R14 (second half) is resolved, refining both rulings.** architect's call (`fkit-architect`, read-only consult, 2026-09-23), **owner-approved** live via `AskUserQuestion` in the `fkit lead` session on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021); ⛔ not producer precedent. **Failures that cannot be traced to a pipeline stop EVERY deploy**: an unmapped `src/` folder, broken allowlist JSON, a missing guard script. **Everything else stops only its own deploy.** ⇒ `DYNAMIC-READ` and scanner parse failures must be **tagged with their file's pipeline(s)** so they can block per deploy. Today they are one global list (`:686-697`, `:804`, `:1024`). The arming that enforces this is [`0298`](../../backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md). *(This refines the R4a and R14 bullets above, which are kept as written.)*
- 📌 **Architect's answers to the open points (2026-09-23):** (1) **A "dead" line can NOT fail a deploy under `--enforce`.** It is `INFO`, and `failsClosed` (`:1042-1049`) covers `REQUIRED` / `PARSE-FAILURE` / `DYNAMIC-READ` / `SKIP` only. (2) **Stale facts in this record, marked, not deleted:** R13 option 3's rationale (also brief §4); item 11 option 1's *"per R4's ruling"*, because `failsClosed` already fails on any `DYNAMIC-READ` (`:1046`); and *"0064's step"*, which should read `0298`.
- ✅ **RULED 2026-09-23 — `0203` BUILDS THE PER-PIPELINE TAGGING.** OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on 2026-09-23, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021); ⛔ not producer precedent. `DYNAMIC-READ`, scanner parse failures, and **any other finding that must be tagged for per-deploy blocking** carry their file's pipeline(s), which replaces today's single global list (`scripts/check-config-parity.mjs:686-697`, `:804`, `:1024`). [`0298`](../../backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md) **only consumes** the tags when arming. Reason given with the option: it is plain local code, which fits Sprint 4's "built locally" goal. This is scope item 12 below.
- ✅ **⇒ All pre-arming decisions are ruled, and `0203` can now be built locally.** Hard sequencing is unchanged: it all lands before [`0298`](../../backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md) wires `--enforce`.
- ⏹️ **CLOSED without a ruling:** open question 1 (R12 / `export`) as moot, and Q7 (R14 first half) as already settled. See *Open questions* below.
- ⛔ `## Status` marker untouched; no mover invoked.
## Owner
fkit-coder

## Context

Task [`0064`](../../done/0064-deploy-time-config-parity-guard/brief.md) built the deploy-time config parity
guard in report-only mode. It passed a **two-round stateful review** — round 2 **CONVERGED, verdict:
ship report-only** — recorded in
[`0064`'s review ledger](../../done/0064-deploy-time-config-parity-guard/review.md).

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

📌 **2026-09-14: an eleventh item was added — §11, `0203` review R4, on an owner ruling.** "Ten" in the
title and below is kept as filed; read it as eleven.

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
today; a deploy blocker once `--enforce` is wired. *(⚠️ **STALE 2026-09-23, per the architect:** since the R12 fix, detection is by inversion (`:136-142`), so this mirror risk no longer exists. R13 is ruled as option 2; see `## Status`. Kept, not deleted.)*

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

📌 **Note added 2026-09-14 by a spawned `fkit-producer` — owner ruling on `0260` review R2 ("Producer
adds a note"), given live in the lead session and relayed by `fkit-sprint-ship-loop`.** The worked example
above is **gone since [`0260`](../../done/0260-verify-client-source-map-upload-runs-for-prod-builds/brief.md)**:
it removed `scripts/upload-sourcemaps.js` and the `PUBLIC_ORIGIN` `ENV` from the `Dockerfile`, so the
file, the key and both line refs no longer exist. The text above is kept as filed. **The point still
holds:** the scanner walks only `src/` and is blind to reads under `scripts/` — it just has no live
example today.

### 11. `0203` review R4 — whole-object uses of `process.env` are silent: no `DYNAMIC-READ`. **Added 2026-09-14.**

📌 **Added by a spawned `fkit-producer` on an owner ruling on `0203`'s own review R4 — *"Add to 0203's
pre-arming list"* — given live in the lead session and relayed by `fkit-sprint-ship-loop`.** ⚠️ **Not the
same R4 as item 2** (that is `0064`'s ledger R4). **Not fixed in the run that found it; not an accepted
residual.** Source: this folder's `review.md`, finding R4.

`ENV_ALIAS` in `scripts/check-config-parity.mjs` (`:129` in the working tree on 2026-09-14; the
ledger cites `:128`) only matches when `=` comes right before `process.env`. So a whole-object use in
any other shape is neither enumerated nor announced. **Reproduced:** `const env = (process.env);
env.ZZ_PAREN` and `Object.keys(process.env)` both give `dynamicReads: []`. By reading the pattern, the
same holds for passing `process.env` to a function, a spread, and a `return`. **0 live instances**
(every env read under `src/` was listed; none has this shape). **Pre-existing** — not introduced by
`0203`. **Not covered by item 9 (R19)**, which is about a read that *is* announced being called dead.

Decide and pin: either these shapes emit `DYNAMIC-READ` (and then follow item 9's ruling), or the
blind spot is documented as a known limit — with a test either way.

---

### 12. Per-pipeline tagging of findings. **Added 2026-09-23, owner ruling (see `## Status`).**

Tag every finding that must block per deploy with the pipeline(s) of the file it came from. That covers `DYNAMIC-READ`, scanner `PARSE-FAILURE`, and anything else that is today collected into one global list (`:686-697`, `:804`, `:1024`). Findings that cannot be traced to a pipeline (an unmapped `src/` folder, broken allowlist JSON, a missing guard script) are marked **global**: they stop every deploy (R4a/R14 conflict resolution, 2026-09-23). Report-only output must stay readable, and `--enforce` stays wired to nothing. **Consuming the tags per deploy is [`0298`](../../backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md)'s, not this task's.**

## Verification steps

1. **Each of the ten items has an executable proof, not a claim.** For every item with a recorded
   reproduction (R1, R12, R13, R15, R16, R18, R19), re-run that exact reproduction and show it now
   behaves correctly. For the decision-only items (R4, R14 second half, R21), record the decision and
   the assertion that pins it.
   📌 *(added 2026-09-14)* Item 11 (`0203` review R4) also needs an executable proof: re-run the two
   recorded reproductions (`(process.env)` alias, `Object.keys(process.env)`) and show the ruled
   behaviour.
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
   `package.json` script passes it. Arming is ~~`0064`'s~~ `0298`'s (split 2026-09-23), after this lands.
6. **Full suite green.** `npm test`, `npm run lint`, `npx prettier --check` on touched files,
   `bash -n` on both deploy scripts, and `tests/scripts/profile-deploy-hardening.test.sh` — the last
   run **without editing the tracked harness** (`0201` may still be in flight; `0064`'s rounds used a
   scratch mirror repo root for exactly this).
7. **No value is ever printed.** Same bar as `0064` verification step 7 — variable names and verdicts
   only, never values, not truncated, not "starts with".
8. **Per-pipeline tagging (item 12):** fixtures show a `DYNAMIC-READ` and a `PARSE-FAILURE` in a game-only file tagged `game` (not `profile`), a profile-only one tagged `profile`, a shared-code (`core/configuration`) one tagged with both game and browser, and the untraceable cases tagged global. Mutation-proved, per step 2.
9. **The 2026-09-23 rulings are each pinned by the tests named in `## Status`** (R13, item 11 + R19, R21, R4a).

## Notes

- **Depends on:** [`0064`](../../done/0064-deploy-time-config-parity-guard/brief.md) — the guard must exist and
  its report-only run must have happened. This task edits the code `0064` built.
  📌 **Ordering WAIVED 2026-09-14 — OWNER RULING, given live in the lead session (`AskUserQuestion`)
  and relayed by `fkit-lead`:** *"Yes, build now"*. The line above is kept, not deleted: only its
  *"report-only run must have happened"* half is waived — the guard exists, and this task still edits
  `0064`'s code. The weekend report-only run uses the improved checker. Not producer precedent.
- **Blocks:** `0064`'s remaining arming step (wiring `--enforce`, ruling R3's second half). **Hard
  sequencing: all ten items land first.**
  📌 **2026-09-23 (owner ruling, rescope Q2 = (a)): that arming step is now [`0298`](../../backlog/0298-config-parity-guard-first-real-report-only-production-run-then-arm-enforce/brief.md)**, split out of `0064`. It is the same block with a new home.
  📌 *(2026-09-14: this line already states the block the ruling below leans on — kept as written.)*
- **NOT a gate on XP go-live — OWNER RULING 2026-09-14, given live in the lead session
  (`AskUserQuestion`) and relayed by `fkit-lead`.** Asked whether this task should stay on `0217`'s
  *"must be done before XP goes live"* list, the owner answered, verbatim: *"Take it off the list"*.
  ⇒ `0217`'s weekend go-live does **not** wait on this task. Its remaining items (R4, R13, R14 second
  half, R19, R21, item 11, and the Open questions below) are gated on **`0064`'s arming step** instead:
  they must all land **before `--enforce` is wired**, and nowhere earlier. Grounding relayed with the
  question: both deploy call sites run the guard `--report-only || true` and nothing passes
  `--enforce`, so none of them makes the weekend deploy safer. A coder **decision pack** (2026-09-14)
  exists with options and a recommendation for R4 (a/b), R13, R14, R19, R21, item 11 and Q1 — the lead
  session holds it; it is not reproduced here. `## Status` unchanged. Not producer precedent.
- 🔓 **LIFTED 2026-09-23 — see `## Status` (rescope Q3 = (b)): the six decisions are taken NOW, before the window.** The bullet below is kept as history, and it was true when written.
- **📌 THE SIX PENDING DECISIONS ARE DEFERRED UNTIL AFTER THE DEPLOY WINDOW — OWNER RE-CONFIRMED
  2026-09-22.** Given live in the `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead`
  to a spawned `fkit-producer` holding **no owner channel** (ADR-021). ⛔ **Not producer precedent.**
  This restates the deploy window's **ruling 3**
  ([weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) §
  *The three owner rulings that set the spine*) — it is not a second, separate ruling.
  **The owner's recorded reasoning, same as before:** the **deploy unblocks eight rows and had a
  date**; **this task unblocks one task's `--enforce` wiring** (`0064`'s) **and has no deadline**.
  ⇒ the deploy goes first.
  - 🚨 **THE DEFERRAL SURVIVES THE SLIPPED SLOT.** The owner **also confirmed on 2026-09-22 that the
    original weekend slot SLIPPED — the window has NOT happened — and named NO replacement date.**
    ⛔ The deferral is *"after the window"*, **not** *"after a date"*, so it still holds while the
    window is undated. ⛔ **Do not read the slip as releasing these six decisions early**, and ⛔ **do
    not write a window date into this brief.**
  - ⛔ **This bullet changes NOTHING else.** The `## Status` marker was **not** touched, no mover skill
    was invoked, the six items are unchanged, and the hard sequencing above (all ten items land before
    `--enforce` is wired) stands exactly as written.
  - 📌 **2026-09-23 — OWNER RE-CONFIRMED RULING 3** (live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`, ADR-021): the decisions wait until after the deploy window (Saturday 2026-09-26). A producer-prepared, **un-ruled** decision list is saved at [`decision-prep-2026-09-23.md`](decision-prep-2026-09-23.md). `## Status` untouched.
- **Related:** `0061`, `0062`, `0063`, `0195` — the four instances of the silent-misconfig class the
  guard exists to catch. `0201` (shell-harness gating) touches
  `tests/scripts/profile-deploy-hardening.test.sh`; do not edit that file here.

- **Source of record.** Every item above is carried from
  [`0064`'s review ledger](../../done/0064-deploy-time-config-parity-guard/review.md) — round-2 findings table
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

- **Board choice — ~~`backlog.md`, not `plan-sprint-4.md`~~. 📌 SUPERSEDED 2026-09-12 — pulled into Sprint 4
  on an OWNER RULING, given live in session and relayed through the lead session (see `## Sprint`); the
  original reasoning is kept below as written.** `0064` sits in Sprint 4, but this task is
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

> ⏹️ **BOTH CLOSED 2026-09-23, without an owner ruling**, on the owner's instruction relayed by `fkit-lead` in the `fkit lead` session (`AskUserQuestion`, 2026-09-23; ⛔ not producer precedent). The heading above is kept as written.
> - **Question 1 (R12 / `export`) — CLOSED AS MOOT.** Local evidence only (Docker 28.5.1 / Compose 2.40.0): Compose `env_file` accepts `export`, while `docker run --env-file` rejects it. R12 is already fixed, and the guard now fails loudly and names the key, so the answer no longer sets R12's severity. **The servers' Docker versions were never checked: this closure is 'moot', not 'answered'.**
> - **Question 2 (Q7, R14 first half) — CLOSED AS ALREADY SETTLED.** Option A (print the caveat) shipped. Then this task's R1 fix closed the client blind spot and removed the caveat line (`worklog.md` line 21; `plan.md` line 29), so the question dissolved as the text below predicted.

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
