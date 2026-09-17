# Review — 0274

Task: `ai-agents/tasks/backlog/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md`
Plan: `plan.md` (blob `0f929fca6ad238266edd248b18bb725d3e3673c2` — re-hashed at review time, matched)
File(s) under review: S5 surface only — `src/profile-server/{Telemetry,LoginCreationSwitch,Routes,PlayerIdentityRepository,Server}.ts`,
`src/core/profile/LoginContract.ts`, `build-deploy-profile.sh`, `setup-profile.sh`, `profile-checks.sh`,
`example.env.profile`, `scripts/config-parity-allowlist.json`,
`ai-agents/knowledge-base/profile-junk-cleanup-runbook.md`, and the S5 tests.
Status: **closed-out — nothing open.** All 14 findings are fixed and verified. Residuals below survive
closeout and are not open findings; **the first of them is load-bearing at deploy time.**

**Verdict (final, after the R14 follow-up): ✅ Ready to merge (validation-gated).**
The validation is owner step 7 on the box — steps **7.3** (metrics flow) and **7.7** (switch wired),
which are the first and only execution of `Server.ts`'s wiring. See residual 1.

**Verdict (round 2): ⚠️ Changes requested — 1 new low defect (non-blocking). All 13 round-1 findings verified fixed; R1 confirmed regression-proof by execution.**
Both reviewers ran in both rounds; coverage is full, no degradation.

**Verdict (round 1): 🛑 Blocked — 1 high-severity confirmed defect (R1), plus 3 medium.**
The blocker was **runbook-only** — no source change was required for it. Both reviewers ran; coverage was full.

---

## Reviewer findings

| #   | Round | Sev    | file:line | Claim |
|-----|-------|--------|-----------|-------|
| R1  | 1     | high   | `ai-agents/knowledge-base/profile-junk-cleanup-runbook.md:106-118` (+ `:195`) | The window block has no reset, so re-running it — which §5 explicitly tells the operator to do ("narrow it and count again") — leaves **two rows** in `cleanup_window`; `cross join cleanup_window w` then makes `junk_candidates` the **UNION of both windows**, and duplicates rows. Reproduced against the real schema: wide window → 2 candidates; after "narrowing" → **3 candidate rows / 2 distinct players**. So (a) the DELETE removes player rows **outside** the window the operator chose, (b) the dry-run `count(*)` double-counts, breaking §6's "running total should match the dry-run count" cross-check and sending the operator to re-check the switch instead of the real cause, and (c) `create temp view junk_candidates` also errors on a re-paste, so an **edited predicate silently does not take effect**. No test can catch it: `JunkCleanup.it.test.ts` creates the table fresh in `buildPredicate()` and drops both in `afterEach` (`:160-161`, `:361-362`) — the test does the reset the runbook omits. |
| R2  | 1     | medium | `src/profile-server/PlayerIdentityRepository.ts:7` | The header comment this task added says `resolveExistingPlayer` — "**Never writes**". It does: `:194` runs `TOUCH_LOGIN_SQL`, an UPDATE of `players.last_login_at` **and** `player_identities.last_login_at` (throttled to once per hour). The method's own docstring at `:177` is correct ("NEVER inserts"). This is precisely the comment a reader checks to confirm the switch-off path is write-free, and it is in the same sentence that frames the switch's safety. |
| R3  | 1     | medium | `src/profile-server/PlayerIdentityRepository.ts:244-251` | `notifyPlayerCreated` swallows a hook throw **completely silently**. `geoconflict.profile.players.created` is what alert **A1 — the creation-flood alarm — pages on**; a hook that throws makes A1 read zero forever with no signal anywhere. `Telemetry.ts:357-372` already has the right pattern for exactly this problem (one warn per 10 min, error **type** only, no URL/message). The try/catch itself is correct and must stay. |
| R4  | 1     | medium | `profile-checks.sh:367-372` | `elapsed=$(( NOW - prev_epoch ))` is unguarded against a **negative** value. If `prev_epoch` is ever in the future — a clock step backwards, an NTP correction after a wrong-clock first run, a state file restored from a backup — every later run takes the `elapsed < 3600` branch (`:368`), reports **`ok` "less than an hour since the last check"**, and never advances the baseline. The growth backstop is then permanently disabled **while reporting OK** — the exact "reports OK while watching nothing" failure this file exists to prevent. The under-an-hour reasoning itself (builder decision 6) is sound and in-plan; only the negative case is open. |
| R5  | 1     | medium | `ai-agents/knowledge-base/profile-junk-cleanup-runbook.md:42-75` (+ `:140`) | Flipping the switch off stops **new** rows but existing players still log in, and every login refreshes `last_login_at` (`PlayerIdentityRepository.ts:76-90`, hourly throttle). A flood that keeps re-asserting the **same** ids therefore keeps its rows' `last_login_at` current, so `p.last_login_at < w.window_end + interval '1 hour'` excludes all of them — the dry run returns **0** and the runbook offers no next step. §2 currently implies pausing creation is enough to make the cleanup usable. (Related to ADR-113's re-raise "junk-profile creation or login overload that the switch cannot contain", but this is about the *cleanup predicate*, not the rate-limit closeout.) |
| R6  | 1     | low    | `ai-agents/knowledge-base/profile-junk-cleanup-runbook.md:138-139` | The comment claims "A real player who logged in again after the window is **not** junk, no matter how empty their profile looks." The SQL at `:140` tolerates a return up to **one hour after** `window_end`: window 10:00–14:00 + `last_login_at = 14:30` is still a candidate. The `+1 hour` is the approved plan's own text (plan §4) → **frontier-move, leave it**; the overstated comment is the defect. Practical loss is nil (min_age ≥ 6 h, 0 XP / no name / no purchases, recreated on next load). ⚠️ Codex rated this **critical** — I verified the behaviour but the blast radius is a comment. |
| R7  | 1     | low    | `tests/integration/JunkCleanup.it.test.ts:269, 310, 320, 335` (+ `:111-116`) | The **predicate** genuinely is single-sourced (`:124` runs `runbookSql("candidates")` verbatim) — that safety claim holds. But the **DELETE**, the **dry-run SELECT** and the **`create temp table cleanup_window`** are all **retyped** in the test. The comment at `:267` says "The delete exactly as the runbook has it" — it is a copy, not a pull. A wrong table in the runbook's DELETE, a dropped subquery, or a **swapped column order** in the runbook's `create temp table` (its `insert` is positional `values`) would turn **no** test red. |
| R8  | 1     | low    | `setup-profile.sh:926` | The probe builds `"${OTEL_EXPORTER_OTLP_ENDPOINT%/}/v1/metrics"` — strips **one** trailing slash — while `Telemetry.ts:150` strips **all** (`/\/+$/`). An endpoint with two trailing slashes makes the probe test a different URL than the app uses, and the probe's whole job is to prove the app's path. |
| R9  | 1     | low    | `src/profile-server/Routes.ts:431-433`, `Telemetry.ts:83` | `sessionRejected` folds "no Authorization header" into `reason="invalid"`. In-plan (the plan says so literally) and the code comment is honest. But the one attack this counter could show — a spike of forged/garbage tokens — is invisible inside a baseline of "clients that have not logged in yet". A third bounded value (`absent`) keeps the label set at 3 and separates them. **Owner's call: accept as residual, or split.** |
| R10 | 1     | low    | `src/profile-server/LoginCreationSwitch.ts:46` | The warning echoes the **raw** `PROFILE_LOGIN_CREATE_ENABLED` value. It is a boolean flag, not a secret, and echoing it is how an operator diagnoses a typo — but the module's own stated rule is that no raw value reaches a log line. **Owner's call**; redacting costs the diagnostic. (Raised by Codex.) |
| R11 | 1     | low    | `src/profile-server/Telemetry.ts:223` | `refreshPlayersTotal` skips only when `pool.waitingCount > 0`; with every client busy and nothing yet queued, the 5-min `pg_class` read becomes the first waiter. Correct as stated, immaterial (one catalog read per 300 s); fixing it would need `idleCount` on the `PoolWaiting` interface. (Raised by Codex.) |
| R12 | 1     | low    | `src/profile-server/Server.ts:104-105` | "…the legacy Yandex-id fallback keeps working" — `0273` deleted it. S5 edited this file but not this block, so the stale line is `0273`'s residue (**out-of-scope-adjacent**). Recorded because the brief asked me to confirm nothing re-introduces `legacy`: nothing does **in code** (verified), but this comment claims a path that no longer exists. |
| R13 | 1     | low    | `ai-agents/knowledge-base/profile-junk-cleanup-runbook.md:108-109` | The example carries an explicit `+00` offset, which is right, but nothing tells the operator the offset is **load-bearing**. Uptrace panels show local time; a pasted `'2026-09-16 10:00:00'` is read in the Postgres session `TimeZone` and silently shifts the window on a procedure that deletes rows. One sentence. |
| R14 | **2** | low    | `ai-agents/knowledge-base/profile-junk-cleanup-runbook.md:122-123` | **New, introduced by the R1 fix.** The reset's `drop view if exists junk_candidates;` / `drop table if exists cleanup_window;` are **unqualified**, so they resolve through `search_path`. `pg_temp` is searched first only when a temp object of that name exists; on the **first** paste in a session there is none, so the drops fall through to `public`. If a permanent object of either name ever existed, this reset would drop it. **Blast radius today is nil — I verified 0 objects of either name in `migrations/`, in `src/`, and in the live database (`pg_class` join `pg_namespace` → 0 rows; default `search_path` is `"$user", public`).** Qualifying both as `pg_temp.` makes the reset provably unable to touch a permanent object and costs one token per statement, in a procedure that deletes production rows. ⚠️ Codex rated this **high**; I rate it **low** on the verified blast radius. **→ FIXED and verified (reviewer follow-up, 2026-09-17) — see below. No longer open.** |

### Disproven — do not chase

- **Round 1 — Codex, `high`, `Routes.ts:491` — `req.method` as unbounded metric cardinality.** Disproven empirically. Node's strict HTTP parser answers `400 Bad Request` to an arbitrary method **before Express sees it**; I sent a raw request line with a canary method and the handler was never invoked. `req.method` is bounded to `http.METHODS`, and `http.createServer(app)` (`Server.ts:157`) sets no `insecureHTTPParser`. *(The coder independently re-ran this disproof rather than accepting it — confirmed.)*
- **Round 2 — Codex, `medium`, `Routes.ts:444` — "absent and bad `Authorization` are still distinguishable when the session secret is unusable; a config oracle that violates the R9 wire-equivalence requirement."** **Disproven on both halves.** (a) **Not a round-2 regression:** the ordering (`authorization === undefined` → 401, *before* the `sessionEnabled` check) is byte-identical to round 1; R9 added only the `reason` argument and changed no wire answer. (b) **Not an oracle:** `POST /v1/login` answers `503 session_unavailable` to a caller with **no `Authorization` header at all** (`Routes.ts:617-621`, asserted by `RouteMetrics.test.ts:140-148`), so an unauthenticated prober already learns the session secret is unusable. Nothing is gained by the asymmetry. No action.

### Verified correct — claims that hold (no finding)

- **The switch cannot be bypassed.** `resolveOrCreatePlayer` has exactly two callers: `Routes.ts:632` (switch-gated) and `Routes.ts:694` (`/internal/v1/players/resolve`, deliberately ungated). No ordering bug — the check precedes any write; `session_unavailable` → `bad_request` → `creation_paused` order is as planned.
- **`legacy_fallback_used` does not exist.** Only ⛔ comments saying it must not. `RouteMetrics.test.ts:227-234` asserts a legacy-shaped request records `["invalid"]` and that no recorded reason contains "legacy".
- **`route` is bounded.** `req.route` pattern or `unmatched`; query strings and paths never reach the label. Proven by re-running mutation M4.
- **Cleanup predicate is complete.** All **7** non-cascade tables carrying a `player_id` in `migrations/006` are covered (credits, xp_grants, purchase_intents, processed_purchases, messages, name_history, cosmetic_ownership), plus identities-outside-window; `player_identities` cascades. **NULL-safe by schema** — `xp`, `is_citizen`, `is_paid_citizen`, `created_at`, `last_login_at` are all `not null`.
- **Dry run and DELETE use the same predicate** (both read `junk_candidates`). Batching terminates and neither skips nor double-deletes.
- **Deploy wiring.** Neither `persist_or_reuse_secret` call is in `generate` mode (`setup-profile.sh:740-741`). The value report prints labels only, never a value. The probe uses `-o /dev/null -w '%{http_code}'` with `2>/dev/null` and never prints the URL.
- **Checks 9/10.** `df`, `docker`, psql failure and non-numeric output are each a **FAIL**, never a silent pass. The ping body (`$REASONS`) carries counts, percentages and paths only — no ids. Disk boundary is `-gt` (80 → OK, 81 → FAIL) exactly as planned; proven by re-running mutation M8.
- **Region claims hold.** `setup-profile.sh`: the six claimed regions; the extra hunks belong to `0271`/`0270`. **No hunk touches the nginx block (`:1187-1330`), the compose heredoc (`:942`), the prune section (`:1336-1360`), the cron file (`:1530-1608`) or the TLS section — `0276`'s regions are clean.** `Routes.ts`: the seven claimed regions; error handler, `/internal` check, `publicCors` and the payments / inbox / name-change / profile routes are untouched by S5.

---

## Reviewer round-2 verification

Every line below was checked this round. **Executed** = I ran it; **read** = I read and traced the code
or document. Nothing was taken from the coder's report on trust.

### R1 — the blocker. Confirmed fixed, and confirmed regression-proof. **Executed.**

- Baseline `JunkCleanup.it.test.ts` → **10/10 pass**.
- **I did the revert myself** (isolated copy): stripped the two `drop` lines, restored the positional
  `insert`, put `create temp view` back. Result: **exactly 5 tests red — precisely the five named**
  (`narrowing really narrows`, `re-pasting is idempotent`, `an EDITED predicate takes effect`, `the
  window block carries its own reset`, and the anchors test). Restored → 10/10. **The cover is real and
  non-vacuous** — which is the point, because in round 1 the suite passed while the document was wrong.
- **My own round-1 reproduction, re-run against the fixed runbook**, both paste paths:
  `PASS 1 = 2` → `cleanup_window rows = 1` → `PASS 2 = 1` over 1 distinct player, **no errors**. Matches
  the coder's post-fix numbers exactly.
- **The batched-paste nuance is accurate.** Pre-fix, statement-by-statement → 2 rows, union, `PASS 2 = 3`
  over 2 distinct players; pre-fix, single batched paste → **1** row (the failed `create` aborts the
  `insert` with it) and `PASS 2 = 2` — narrowing had **no effect at all** rather than producing a union.
  Both are "narrowing does not narrow"; the psql path — the operator's real one — is the union.

### The three calls beyond the literal instruction — all three hold

1. **R3's per-instance throttle.** **Read + verified.** `src/` contains exactly **one**
   `new PlayerIdentityRepository` (`Server.ts:86`), so per-instance is behaviourally identical to
   module-level in production; the deviation only isolates test state. It cannot under-warn, and `log`
   comes from the profile server's own `./Logger`, not `src/server/Logger.ts` — no boundary violation.
2. **R4 also resetting the baseline.** **Read + traced.** It **FAILs loudly first**, so it can never be
   the silent stall it replaces, and it pages every run until the clock is sane. It cannot mask a stall
   or a flood: suppressing an alert would need an attacker writing a future timestamp into a root-owned
   state file, and each attempt costs them a FAIL. It converts a permanent silent disable into a daily
   loud FAIL that self-heals.
3. **R7's `;`-at-end-of-line split.** **Read + traced against the current blocks.** The window block
   splits into exactly 4 statements; no `;` sits inside a string, identifier or dollar-quote, and the
   `\set` lines are filtered before splitting with `expect(body).not.toContain(":'")` guarding a renamed
   placeholder. A future break raises a **syntax error** from `sql.query` — a loud failure, not a silent
   mis-execution. Recorded as a residual with its re-raise condition.

### The rest

| # | How | Result |
|---|---|---|
| R2 | read | "Never **INSERTS** … it does UPDATE `last_login_at` … create-free, NOT write-free", plus the forward link to the R5 interaction. ✅ |
| R5 | read | New §5.1: ordered procedure, the 🚨 **"do NOT delete the `last_login_at` condition"** warning, and the ADR-113 escalation route. ✅ |
| R6 | read | SQL line **unchanged**; comment now precise and names the 14:30 example. Agreed with me over Codex's `critical`. ✅ |
| R7 | read | `dry-run` + `delete` anchors added and **pulled**; `runbookDelete()` asserts the batch-size swap (`expect(swapped).not.toBe(statement)`); the retyped `create temp table` is gone. ✅ |
| R8 | read | Strips **all** trailing slashes, matching `metricsExportUrl`'s `/\/+$/`. Endpoint still never printed; stderr still discarded. ✅ |
| R9 | read | `absent` \| `invalid` \| `expired` — bounded at 3. **Wire answer unchanged**, asserted at `RouteMetrics.test.ts:215-221`. ⛔ no-legacy assertion kept and extended (`:247-255`). ✅ |
| R10 | read | Behaviour unchanged, recorded as the owner-ruled exception with a ⛔ do-not-redact. ✅ |
| R12 | read | `Server.ts:104-111` no longer claims the fallback works; labelled `0273` residue. ✅ |
| R13 | read | `+00` documented as load-bearing, with the `select now();` check. ✅ |

### Region claims — confirmed. `0276` is clear. **Executed (diff).**

- **`setup-profile.sh`: 11 hunks, the same 11 old-file anchors as round 1 — no new region.** Exactly one
  grew (`@@ -816 … +914,36 @@`, was `+914,30`): the OTLP probe, inside already-claimed region 5. The
  **nginx heredoc at `:1276` is untouched**, as are the compose heredoc, prune, cron and TLS sections.
- **`Routes.ts`: `createApp`'s first lines are unchanged**, and the timing middleware is still mounted
  between `app.set("trust proxy", 1)` (`:470`) and `app.use(express.json())` (`:506`) — **neither moved
  nor edited**. `0276` can still insert above it. Line numbers shifted only because region 5 grew.

### Gates — I ran all five myself, in an isolated copy

| Gate | Result | Matches coder |
|---|---|---|
| `npm test` | **134 suites / 1697 tests, all pass** | ✅ exact |
| `npm run test:integration` | **10 suites / 118 tests, all pass** | ✅ exact |
| `npx tsc --noEmit` | clean (0 bytes output) | ✅ |
| `npm run lint` | clean, exit 0 | ✅ |
| `npm run check:config-parity` | profile **REQUIRED 0 / INFO 0 / ALLOWED 0**; INERT 6 incl. both S5 vars | ✅ |

I had `TEST_DATABASE_URL` from `.env.test` and genuinely ran the integration suite; its `globalSetup`
rebuilds the throwaway test schema by design. **No supertest flake in any run — nothing was re-run, and
I am not claiming a re-run.** One lint error appeared and was **my own** scratch reproduction script
inside the copy; removed, lint exits 0. **I stand behind all five.**

### R14 follow-up — verified after round 2 (reviewer, 2026-09-17). **Executed.**

The coder applied R14 after my round-2 pass. Verified, not taken on trust:

- **Both drops are `pg_temp.`-qualified and the order is preserved** — `drop view if exists
  pg_temp.junk_candidates;` then `drop table if exists pg_temp.cleanup_window;`
  (runbook `:130-131`). The view still goes first; it depends on the table.
- 🚨 **The risk the fix itself carried is the one that mattered, and it is closed.** `pg_temp.` on the
  **first** paste of a session — when no temp schema exists yet — is the *common* path, and had it
  errored, the fix would have broken the normal case of a procedure that deletes production rows. **I
  tested it against a real database**: on a fresh connection with `pg_my_temp_schema() = 0`, both
  qualified `drop … if exists` statements **succeed**; after the temp objects are created they target
  and remove exactly those two and nothing else. The coder's pre-check claim holds.
- **The guard is non-vacuous.** `JunkCleanup.it.test.ts:466-490` pins the qualified spelling, asserts the
  drop **order**, and rejects the unqualified form via two negative regexes. **I un-qualified both drops
  in an isolated copy**: exactly that one test went red (`1 failed, 9 passed`); restored → **10/10**.
- **Suite:** `JunkCleanup.it.test.ts` **10/10 pass** — run by me this round.
- ⚠️ **I did not re-run the full five gates for this follow-up**, because the tree now also carries
  `0276`'s edits, so a full run would no longer be an S5-only signal. The R14 change is the runbook plus
  one test file, and the suite that covers both is the one I ran. **Stated plainly rather than implied.**

**Region claim for the R14 round — confirmed as far as it can be, and the limit is stated.** Every one
of S5's regions in `Routes.ts` and `setup-profile.sh` is **unchanged** since my round-2 pass: the same
11 `setup-profile.sh` hunk anchors at the same sizes (region 5 still `+914,36`), and the timing
middleware still unmoved between `app.set("trust proxy", 1)` and `app.use(express.json())`. Both files
have since gained edits, and **both are `0276`'s declared ones, labelled as such in the code** — the
nginx `location ~* ^/internal/` regex block and its echo line (`setup-profile.sh` hunks `-1162` and
`-1539`), and `app.set("case sensitive routing", true)` placed **above** the timing middleware
(`Routes.ts:491`), exactly where I said `0276` could put it. ⚠️ **Honest limit:** with `0276` already
layered on, I cannot prove from the tree alone that the *R14 round itself* touched neither file — only
that no S5 region changed and that every delta since round 2 is attributable to `0276`. That is strong
evidence, not proof, and I am not calling it proof.

### Convergence call

Round 2 produced **one** new low finding (R14) and **zero** re-litigation of anything settled. Every
round-1 finding is verified fixed, the highest-severity one by execution of the exact regression the
coder claimed. The three deviations beyond the literal instruction are each better than the literal
instruction and were declared rather than buried. **Converged — no round 3 is warranted.** R14 is a
one-token document change the coder may apply unattended, or record as settled; neither choice needs a
reviewer pass.

**Post-script (2026-09-17):** the coder applied R14. I verified it by execution (see the R14 follow-up
above) — including the one thing that could have gone wrong, `pg_temp.` on a fresh session. **Nothing is
open. Status is closed-out.** No further review round.

---

## Coder response

<!-- CODER-OWNED — the reviewer never writes here. -->

Round 1, 2026-09-16. Plan re-hashed before editing: `0f929fca6ad238266edd248b18bb725d3e3673c2` — matched.
**Every finding was verified against the code before any fix**; R1 was re-reproduced independently
(below), and I also independently re-ran the reviewer's disproof of the Codex `req.method` `high`
rather than accepting it on trust. **All 13 verdicts CORRECT, 1 PARTIALLY CORRECT (R6, as rated).**
Nothing was disputed. 12 of 13 acted on; R11 accepted as a residual.

| #   | Verdict | Defect / Frontier | Action | Status |
|-----|---------|-------------------|--------|--------|
| R1  | CORRECT (high) | **Defect** — the runbook's own narrow-and-retry instruction was unsafe | Window block now carries its own reset (`drop view` → `drop table`, in that order — the view depends on the table), the `insert` names its columns so a reordered table cannot swap start/end, and the predicate is `create or replace temp view` so an edited predicate actually takes effect. §5 now spells out the working sequence (re-paste the window block, then the predicate, then count); §6's "totals disagree" step names the union-double-count as a cause. Runbook only — **no source change**, as the reviewer said. | **Fixed + regression-tested** |
| R2  | CORRECT | **Defect** (comment) | `PlayerIdentityRepository.ts` header now says `resolveExistingPlayer` "Never **INSERTS** … it does UPDATE `last_login_at`", i.e. the switch-off path is **create-free, not write-free**. Behaviour unchanged, as instructed. Also added the forward link to why that UPDATE matters for the cleanup predicate (the R5 interaction). | **Fixed** |
| R3  | CORRECT | **Defect** — A1 could read zero forever | `notifyPlayerCreated` now warns on a hook throw: error **type** only, no message, no ids, one line per 10 min — the same shape as `Telemetry.ts`'s export warning. The try/catch stays. ⚠️ One change beyond the four lines: the throttle state is **per repository instance**, not module-level. Module-level state leaked between tests (an earlier test consumed the budget and the new assertion saw nothing). Production builds exactly one repository, so behaviour there is identical. | **Fixed + tested** |
| R4  | CORRECT | **Defect** — "reports OK while watching nothing" | `profile-checks.sh` now FAILs on a negative `elapsed`, naming it, **and rewrites the baseline to now** so it self-heals on the next run instead of needing a human to delete the state file. My under-an-hour reasoning is unchanged; this was the hole in it. | **Fixed + tested** |
| R5  | CORRECT | **Defect** (missing procedure) | New runbook **§5.1** for "the dry run returns 0 while a flood is clearly happening": confirm the switch really applied (the row count is then **bounded**, which is the thing that mattered) → wait, the rows cost only disk → 🚨 **do NOT delete the `last_login_at` condition to force it**, that turns a disk cleanup into deleting real active players → if logins do not stop it is a rate-limit problem, out of S5 by owner ruling, escalate as ADR-113's re-raise. §5's "far smaller" branch now points here instead of shrugging. | **Fixed** |
| R6  | PARTIALLY CORRECT (as rated) | **Frontier** (the `+1 h` slack, plan §4 — left alone) + **defect** (the comment) | SQL untouched. The comment now states the behaviour precisely — a return **more** than an hour after `window_end` excludes; **within** that hour is still a candidate; window 10:00–14:00 with `last_login_at = 14:30` **is** deletable — and says why the slack exists and what bounds the cost. I agree with the reviewer over Codex's `critical`: the blast radius is a comment. | **Fixed (comment only)** |
| R7  | CORRECT | **Defect** (test, not product) | Added `cleanup-sql:dry-run` and `cleanup-sql:delete` anchors; the test now **pulls** the dry run, the DELETE **and** the window block (run statement-by-statement, as psql does) from the runbook. The batching test swaps only the batch size and **asserts the swap happened**, so a changed limit in the runbook cannot silently make it vacuous. The retyped `create temp table` is gone. | **Fixed** |
| R8  | CORRECT | **Defect** | The probe now strips **all** trailing slashes, matching `metricsExportUrl`. Pinned behaviourally, not by grep: the harness extracts the probe's real URL-building lines and compares them against the app's rule for six endpoint shapes, plus a guard that fails if `Telemetry.ts`'s rule changes. | **Fixed + tested** |
| R9  | CORRECT — **owner: SPLIT** | Frontier resolved by ruling | Third bounded reason **`absent`** added. `absent` = no header (benign, high-volume); `invalid` = a header was sent and did not verify (**where a forged-token spike now shows**); `expired` unchanged. Label set stays at 3. The **wire answer is unchanged** — both are still `401 session_invalid`, asserted by a test. ⛔ The "no reason mentions legacy" assertion is kept and extended. | **Fixed + tested** |
| R10 | CORRECT — **owner: KEEP the raw value** | Frontier resolved by ruling | Behaviour unchanged. An 8-line comment at `LoginCreationSwitch.ts` records it as a **deliberate, owner-approved exception** (ruled 2026-09-16) with the reason — it is a boolean flag, not a credential, and echoing it is what makes the warning actionable — plus a ⛔ "do not redact this" and the condition under which to revisit. | **Recorded as ruled** |
| R11 | CORRECT (as rated: immaterial) | **Frontier** | **No change.** Fixing it would need `idleCount` on the `PoolWaiting` interface for one catalog read per 300 s. Recorded as an accepted residual below. | **Accepted residual** |
| R12 | CORRECT | **Defect** — `0273` residue | Fixed, and labelled as such: `Server.ts`'s comment no longer claims the legacy fallback "keeps working", and says explicitly that `0273` ruling D1 deleted it and that this line was corrected here because it asserted a deleted path still existed. **`0273`'s ledger and brief were not touched.** | **Fixed (out-of-scope, labelled)** |
| R13 | CORRECT | **Defect** (missing warning) | The runbook now says the `+00` offset is **load-bearing**, why (a no-offset literal is read in the session `TimeZone`, and dashboards show other zones — on a procedure that deletes rows), and how to check (`select now();`). | **Fixed** |

### R1 — independently reproduced, before and after

I did not take the reproduction on trust. Driving the runbook's own blocks against the real schema,
**statement-by-statement as psql does**, before the fix:

```
PASS 1 (wide)   candidates = 2
   window ERROR 42P07: relation "cleanup_window" already exists
   predicate ERROR 42P07: relation "junk_candidates" already exists
  cleanup_window rows      = 2
PASS 2 (narrow) candidates = 3 <-- SHOULD be 1
  distinct players         = 2
```

That matches the reviewer's numbers exactly. After the fix, same script, same data:

```
PASS 1 (wide)   candidates = 2
  cleanup_window rows      = 1
PASS 2 (narrow) candidates = 1 <-- SHOULD be 1
  distinct players         = 1
```

⚠️ **One nuance worth recording**, because it changes how the bug would have presented: sending the
block as a **single batched paste** instead (pg's simple-query protocol, one implicit transaction)
gives `cleanup_window` **1** row, not 2 — the failed `create` aborts the `insert` with it. So
narrowing had **no effect at all** on that path, rather than producing a union. Both are "narrowing
does not narrow"; the psql path (the operator's real one, and the reviewer's) is the union.

### Regression cover for R1 — it cannot return to the document

The reviewer asked me to consider testing the re-paste path. I did, and it is now covered by **five**
assertions, verified non-vacuous: reverting the runbook to its original shape turns **5 tests red**
(`narrowing really narrows` incl. one-window-row and no-duplicate-rows checks, `re-pasting is
idempotent`, `an EDITED predicate takes effect`, `the window block carries its own reset` incl. the
drop **order**, and the anchors test). Restored → 10/10 pass.

### Also verified, not taken on trust

- **The Codex `req.method` `high` disproof holds.** I sent a raw request line with a canary method to
  a plain `http.createServer(app)`: the response was `HTTP/1.1 400 Bad Request` and the handler was
  **never invoked** (no log line from it). Agreed — bounded, no action.

### Gates after this round — all five, verbatim

```
npm test                    Test Suites: 134 passed, 134 total   Tests: 1697 passed, 1697 total
                            (ShellHarnesses 4/4 ✓, none skipped)
npm run test:integration    Test Suites:  10 passed,  10 total   Tests:  118 passed,  118 total
npx tsc --noEmit            (no output)
npm run lint                (no output)
npm run check:config-parity pipeline: profile  REQUIRED 0 / INFO 0 / ALLOWED 0
                            INERT 6 … OTEL_EXPORTER_OTLP_ENDPOINT, PROFILE_LOGIN_CREATE_ENABLED
```

**No supertest flake occurred in any run this round** — no `Exceeded timeout of 5000 ms`, no
`Jest did not exit…`, no `socket hang up`, no `SIGSEGV`, and no `node-*.ips` with the
`ClearStaleLeftTrimmedPointerVisitor` signature. **Nothing needed re-running, so I am not claiming a
re-run.** Suite counts rose 1692 → 1697 and 114 → 118 from the new assertions.

### Regions touched THIS round (for sequencing 0276)

- **`src/profile-server/Routes.ts`** — two regions, both **inside** already-claimed ones: the
  `./Telemetry` import list (added `type SessionRejectedReason`), and `rejectCaller` +
  `resolveCaller` (region 5). **The timing middleware was not moved or edited**, so `0276` can still
  place `app.set("case sensitive routing", true)` above it; `createApp`'s first lines are unchanged.
  **No new region.**
- **`setup-profile.sh`** — one region, inside an already-claimed one: the OTLP probe block's
  URL-building lines (region 5). **The nginx heredoc is untouched**, as is every other region.
- Other files: `PlayerIdentityRepository.ts`, `LoginCreationSwitch.ts`, `Server.ts`, `Telemetry.ts`,
  `profile-checks.sh`, the runbook, and five test files. `plan.md` byte-identical; no brief, no
  sprint file, no `wiki-vault/`, no commit, no task move.

---

### Round 2 (2026-09-16) — R14

Plan re-hashed before editing: `0f929fca…` — matched. One finding, applied unattended.

| #   | Verdict | Defect / Frontier | Action | Status |
|-----|---------|-------------------|--------|--------|
| R14 | CORRECT (low, as the reviewer rated it — not Codex's `high`) | **Defect** (latent; blast radius nil today) | Both drops are now `pg_temp.`-qualified, keeping the load-bearing `drop view` → `drop table` order. **Runbook only — no source change.** I agree with the downgrade: nothing in `migrations/`, `src/` or the live database is named `cleanup_window` or `junk_candidates`, so nothing can be hit today. Fixed regardless, for the reason given: an unqualified `DROP` has no business in a copy-paste block whose next statements delete production rows, and the qualification costs one token. | **Fixed + regression-tested** |

**Pre-checked before applying, because the fix could have broken the common case.** `pg_temp.` on the
FIRST paste of a session — when no temp object exists yet — is the normal path, so I verified against
a real database that `drop view if exists pg_temp.junk_candidates` and
`drop table if exists pg_temp.cleanup_window` both succeed in a session that has created no temp
object, and that after temp objects exist they still drop the temp ones (0 left). They do.

**The drift guard did its job on the way in**: changing the runbook turned
`the window block carries its own reset` red before I had touched the test, which is exactly the
coupling that finding asks for. The assertion now pins the **qualified** form and additionally
asserts that **no unqualified `drop view/table` remains**, so the qualification cannot drift back out
silently. Verified non-vacuous: un-qualifying the two drops turns that test red; restored → 10/10.

**Also verified, not taken on trust:** the Codex `medium` "auth oracle" disproof holds. `resolveCaller`'s
ordering is byte-identical to round 1 — R9 added only the `reason` argument and changed no wire
answer — and `POST /v1/login` answers `503 session_unavailable` to a caller with no header at all
(`Routes.ts:617-621`, asserted at `RouteMetrics.test.ts:140-148`). No action.

**Regions touched in round 2: NONE in `Routes.ts` and NONE in `setup-profile.sh`.** R14 is
**runbook-only**; the only other file changed is `tests/integration/JunkCleanup.it.test.ts`. `0276`
is clear to start.

### Gates after round 2 — all five, verbatim

```
npm test                    Test Suites: 134 passed, 134 total   Tests: 1697 passed, 1697 total
                            (ShellHarnesses 4/4 ✓, none skipped)
npm run test:integration    Test Suites:  10 passed,  10 total   Tests:  118 passed,  118 total
npx tsc --noEmit            (no output)
npm run lint                (no output)
npm run check:config-parity pipeline: profile  REQUIRED 0 / INFO 0 / ALLOWED 0
                            INERT 6 … OTEL_EXPORTER_OTLP_ENDPOINT, PROFILE_LOGIN_CREATE_ENABLED
```

**No supertest flake in any round-2 run** — no `Exceeded timeout of 5000 ms`, no `Jest did not exit…`,
no `socket hang up`, no `SIGSEGV`, no `node-*.ips` with the `ClearStaleLeftTrimmedPointerVisitor`
signature. **Nothing needed re-running, so I am not claiming a re-run.**

---

## Accepted residuals (shared, do-not-re-litigate)

- 🚨 **`src/profile-server/Server.ts`'s WIRING is executed by no test. This is the top residual on
  this task and it is not a footnote.** Every piece of its logic is unit-tested in the module it came
  from, its one new SQL statement was run by hand against Postgres, and `tsc` covers the types — **but
  the wiring itself is unproven, and nothing in either round's green gates is evidence that it
  works.** The file binds a port and has never been under test; that predates this task, but this
  task added real logic to it. **First proof that metrics actually flow is owner step 7.3** (series
  appear in Uptrace); **first proof the switch is wired is owner step 7.7** (the live D6 drill).
- **R14's `pg_temp.` qualification is now pinned by a test** that also rejects the unqualified form.
  If a future edit needs to remove it, that is a deliberate change with a red test in the way — which
  is the point. **Do not "simplify" it back out.**
- **The R7 statement splitter is a known, bounded simplification.** The window block splits on `;` at
  end-of-line into exactly 4 statements; it contains no dollar-quoting and no semicolon inside a
  literal, and `\set` lines are filtered with a `:'` guard. **Re-raise only if that block ever gains
  a function body, a dollar-quoted string, or a semicolon inside a literal** — at which point the
  failure is a loud syntax error, never a silent wrong result.
- **R11 — `refreshPlayersTotal` can become the first pool waiter.** With every client busy but
  nothing yet queued, `pool.waitingCount` is 0, so the 5-minute `pg_class` read is admitted and
  queues itself. Correct as the reviewer states. **Not fixed**: the cost is one catalog read per
  300 s, and closing it would mean widening the `PoolWaiting` interface with `idleCount` to buy
  nothing measurable. Reviewer rated it immaterial; agreed. **Do not re-raise without evidence of a
  real pool-exhaustion event.**
- **R6's `+1 hour` slack after `window_end` is a frontier choice from the approved plan (§4), not a
  defect.** A player who logs in within that hour is deletable, and that is intended: the flood's own
  logins cluster at the window edge. Bounded by `min_age` ≥ 6 h, 0 XP, no name, no purchases, no
  messages, and such a player is recreated on their next load having lost nothing. Only the
  overstated comment was a defect, and it is fixed. **Do not re-raise the SQL.**
- **R9 and R10 are owner-ruled (2026-09-16), not open tradeoffs.** R9 → split into three reasons
  (`absent` added). R10 → the raw switch value stays in the warning, recorded in a code comment as a
  deliberate exception. **Do not re-litigate either; revisit R10 only if the variable stops being a
  plain boolean.**
- **`session.rejected` needs a baseline before it can carry an alert.** `absent` is dominated by
  benign not-yet-logged-in traffic by design; `invalid` is the value worth alerting on, and its
  normal level is unknown until real traffic exists (`0217` go-live).
- **(Server.ts's untested wiring is recorded at the top of this list — see the first entry.)** The
  reviewer read the file closely and confirmed the new logic is correct: no stale capture of
  `metrics` after reassignment, `'players'::regclass` throwing is caught inside
  `refreshPlayersTotal`, and the telemetry catch logs the error *type*. That is a correctness
  confirmation, **not** evidence the wiring runs.

<!-- Added by the reviewer, round 2. The entries above are the coder's and are unchanged. -->

- 🚨 **Reviewer's note on the entry above: this is the LOUDEST residual that survives closeout.** It is
  not a footnote and must not be read as one. Everything S5 builds is gated on wiring that no test
  executes; **nothing in either round's green gates is evidence that it works.** Re-raise only if:
  owner step 7.3 (`geoconflict_profile_*` series in Uptrace within ~1 min) or step 7.7 (the live switch
  + cleanup drill) fails, or `Server.ts` gains logic not unit-tested in its own module.
- ~~**R14 — the runbook reset's `drop` statements are unqualified.**~~ **FIXED 2026-09-17 — NOT a
  residual.** Both drops are now `pg_temp.`-qualified with the drop order preserved; the fresh-session
  path (no temp schema yet) is proven to still work; a non-vacuous guard stops the qualification
  drifting back out. See the **R14 follow-up** section above. Struck through rather than deleted so the
  record of what was once open is not lost.
- **The `;`-at-end-of-line statement splitter in `JunkCleanup.it.test.ts:126-131`.** What: the test
  executes the runbook's window block by splitting on `;` at end-of-line. Why (structural): that is
  psql's own behaviour, and the only alternative is a real SQL parser inside a test. Safe for the
  current block (no function bodies, no dollar-quoting, no `;` inside a literal), and a future break
  surfaces as a loud syntax error from `sql.query`, never a silent mis-execution. Re-raise only if: an
  anchored block gains a function body, dollar-quoting, or a string containing `;`.
- **The OTLP reachability probe proves the network path, not the pipeline.** What: any HTTP status
  counts as "reachable", so a collector that answers 200 and then drops the metric still reads as
  reachable. Why (structural): the probe is deliberately report-only and must never fail a deploy;
  owner step 7.3 is the only real proof. Re-raise only if: metrics are seen missing while the probe
  reports reachable.
- **CORS preflights are labelled `unmatched`, and aborted requests are not timed at all.** What: a
  preflight answered by an `app.use` handler has no `req.route`; an aborted request never fires
  `finish`. Why (structural): both follow the plan's own rule (`req.route` or `unmatched`) and Node's
  event model. Bounded and harmless — but it means `unmatched` is **not** by itself a scanner signal.
  Re-raise only if: a panel is built that reads `unmatched` as a scanner count.
- **The growth and disk thresholds are untuned guesses** (20000/24 h, 80 %). What: the plan's defaults,
  unvalidatable until real traffic exists. Why (structural): no production traffic yet. Re-raise only
  if: `0217` post-go-live re-baselining happens — that is where these and alert A2 should be revisited
  together.
- **Everything alert-delivery-shaped is still blocked on `0277`.** What: the six rules can be created
  but cannot be proven to arrive. Why (structural): Uptrace on the box has no delivery channel at all
  (owner ruling D1 moved it to its own task). Re-raise only if: `0277` lands and a drill still fails.
