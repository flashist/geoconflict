# Postmortem — Profile Deploy Hardening (`task/profile-deploy-hardening`)

**Date:** 2026-06-19
**Branch:** `task/profile-deploy-hardening` (not merged)
**Status:** Stopped, not shipped. Declared a process failure by the task owner.
**Authors:** Claude (primary driver of the work being examined). Intended as a *shared* starting
point — the reviewing agent and the task owner are expected to add their perspectives below
(see §11). This is a living document, not a closed verdict.

> **Read this first.** This is a blameful-of-process, blameless-of-people postmortem. The work
> produced real value in its first 12 hours and then spent ~57 hours bouncing. The goal here is
> not to defend the artifact but to understand *why the loop never terminated*, so that when we
> return to this task we split it into bounded, separately-shippable pieces and never re-enter the
> same loop. Two prior artifacts already tried to stop the bounce and failed; this one must explain
> *why they failed* or it will be the third.

---

## 1. TL;DR

We set out to harden the profile-backend deploy pipeline (`setup-profile.sh`,
`build-deploy-profile.sh`, `scripts/check-docker-secret-boundary.sh`). The first ~12 hours found
and fixed genuine, shippable defects. Then the work entered an **unbounded adversarial-review loop**
that ran for ~57 more hours and ~19 more commits, producing increasingly hypothetical fixes against
a consumer **that does not exist yet** (the profile API is a `/health`-only skeleton; `pg` is not a
dependency). We twice wrote meta-artifacts to *stop* the loop — a retrospective and a 785-line
doctrine — and both became more surface for the loop to review. The loop only ended when the task
owner cleared the goal and called it.

**One-line root cause:** an adversarial oracle with no acceptance criteria, pointed at a monolithic
diff, hardening infrastructure for an absent consumer — a machine that, by construction, always has
one more finding.

---

## 2. What the task actually was

- **Owner of the pipeline's existence:** `ai-agents/tasks/done/s4-profile-04-backend-infra.md` (T4),
  Scope item 2 — create `setup-profile.sh` + `build-deploy-profile.sh` mirroring the telemetry
  scripts; box `docker-compose.yml`, nginx/TLS, swap, Postgres memory caps, layered `.env.secret`.
- **Owner of the deferred consumer:** `ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md` (T5),
  Scope item 5 "DB connection + readiness check" — the `/ready` endpoint and the `pg` repository
  that would *actually consume* `DATABASE_URL`. **This does not exist yet.**
- **This branch:** hardening of the T4 pipeline. There is **no task file** for it; it was governed
  by an after-the-fact doctrine doc (`docs/security/profile-deploy-scope.md`).

**The load-bearing fact for this whole postmortem:** the API that reads `DATABASE_URL`, that needs a
secret-free image, that the deploy gate is supposed to certify — **is a skeleton.** We spent days
making the deploy *prove* properties of a runtime artifact that has not been written. The doctrine
itself acknowledges this (it defers `/ready` to T5), yet the loop kept hardening the proxy.

---

## 3. The evidence (objective churn metrics)

| Metric | Value |
|---|---|
| Commits on branch (not on `dev`) | **34** |
| — substantive feature/hardening | 10 |
| — "Claude: review changes" fix-ups | 19 |
| — other review/doc commits | 3 |
| — meta/retrospective commits | 2 |
| Wall-clock span | 2026-06-14 22:06 → 2026-06-17 16:20 (~2d 18h) |
| Net diff | **6,769 insertions, 70 deletions, 15 files** |
| Script LOC added | setup-profile.sh +857, build-deploy +245, secret-boundary +330 |
| Test LOC | ~4,900 across 7 files |
| Script LOC (total, all three) | ~2,554 |
| **Test : script ratio** | **~1.9 : 1** |
| Doctrine + retrospective LOC | 785 + 345 = **1,130 lines of meta-prose** |
| Largest single artifact | `profileDeployClassSweep.test.ts` — 1,268 lines |
| The awk BuildKit lexer | **247 lines of awk** embedded in a bash function |
| `probe_database_url()` | **314 lines** validating libpq URI semantics |

### Timeline shape

1. **Productive sprint — first ~12h (10 commits, 2026-06-14 22:06 → 06-15 10:18).** Each commit
   names a concrete, real defect: password in argv, atomic rollback for late failures, mark stack
   touched before destructive recreate, fail-closed on `$var` copy sources. **This is the part that
   worked.** Classes A(F6/F7), C(F1/F3/F8), D(F4/F5) were substantially closed here.
2. **The bounce — next ~57h (22 commits, 06-15 11:01 → 06-17 16:20).** 19 identical "review changes"
   commits. Interspersed: a "stop constantly getting back with review" instruction commit (06-15
   16:22), a 345-line retrospective (06-16 09:26), and a "review problems instructions" commit
   (06-17 16:20). **The meta-commits did not stop the bounce — the bounce continued after each.**

---

## 4. What got built (current state)

Honest inventory so future-us doesn't re-derive it.

### Scripts
- **`setup-profile.sh` (1,517 lines, 11 functions).** Remote provisioning + deploy. Highlights:
  `urlencode`/`urldecode` (exact inverses, fail-closed on bad `%`), `rollback_deploy` (EXIT-trap
  LIFO undo), discrete-cred `probe_db_credentials`, and the 314-line `probe_database_url` (libpq URI
  parse: scheme, empty host, percent-encoded host/keys, multi-host, literal + resolution-based
  loopback rejection, IPv6 normalization, query-param credential keywords incl. case-variants,
  `SELECT 1` over the exact URL with password via stdin only).
- **`build-deploy-profile.sh` (473 lines, 4 functions).** Local build/scan/push by digest, `flock`
  serialization, atomic deploy-record write via `finalize_deploy`.
- **`scripts/check-docker-secret-boundary.sh` (564 lines, 4 functions).** Three defense layers for
  "secret in image": (1) static Dockerfile scan with the **247-line awk BuildKit lexer**
  (`scan_broad_copies`), (2) optional runtime source-stage filesystem scan, (3) **authoritative**
  per-layer byte scan via `docker save` + sha256 content match. Plus `.dockerignore` as a 0th layer.

### Tests (~4,900 lines, 7 files, ~174 cases)
`checkDockerSecretBoundary.test.ts` (893), `setupProfileFailClosed.test.ts` (999),
`setupProfileRollback.test.ts` (1,170), `profileDeployClassSweep.test.ts` (1,429),
`setupProfileDbProbe.test.ts` (111), `profileDeployRecordConcurrency.test.ts` (251),
`profileDeployRecord.test.ts` (61). Includes ~12–15 **meta-tests** that extract real bash/awk
functions by regex and run them in isolation, and ~12 **load-bearing proofs** that mutate a backup
copy of a script to assert a test goes RED.

### Docs
- `docs/security/profile-deploy-scope.md` (785 lines) — the doctrine (classes A–E, invariants
  I-A..I-H, residual register §10.2, meta-rules §11).
- `ai-agents/knowledge-base/review-loop-retrospective-2026-06-15.md` (345 lines) — the first retro.

### Residual register status (from doctrine §10.2)
- CLOSED: `A-sshpass`, `D-remote-script`, `D-R2`, `G-token-persist`.
- OPEN: `C-R3` (comment wording only), `B-pattern-drift` (secret-name patterns hand-copied across
  5 sites; `.envrc`/`.envlocal` covered nowhere).
- Internal tension noted by the doc itself: I-G listed OPEN in §11.4 while `G-token-persist` is
  CLOSED in §10.2; I-F "CLOSED in code, no green guard yet." These inconsistencies are themselves a
  symptom (the bookkeeping outgrew the thing it tracked).

---

## 5. What went right (keep this; it was real)

The first sprint was good engineering and the resulting properties are worth preserving:

1. **Password never in argv.** Discrete-cred and URL probes feed secrets via stdin/`PGPASSWORD`/
   `sshpass -f`/`--password-stdin`/0600 files only. (F7, `A-sshpass`.) **Keep — non-negotiable.**
2. **Digest-pinned deploy + rollback.** Push and deploy by `@sha256`, roll back to the prior digest.
   **Keep.**
3. **Fail-closed rollback that never refuses for lack of a record.** Rollback by digest, not by a
   passed-record gate. **Keep — this is correct and subtle.**
4. **Stack marked touched before the destructive recreate; volume never auto-deleted.** **Keep.**
5. **Authoritative per-layer byte scan** for image secrets (`--inspect-image`). This is the *real*
   oracle for the secret-boundary threat. **Keep.**
6. **Atomic, lock-serialized deploy-record write.** **Keep.**
7. **Build for the target architecture (`--platform linux/amd64`).** An Apple-Silicon (arm64) dev
   host must not push a digest the amd64 reg.ru box can't execute. (`build-deploy-profile.sh` —
   verbatim as §14 K7.) **Keep.**

Items 1–6 required none of the bounce — they were essentially done by commit `3568b08` (06-15
10:18). Item 7 (the platform pin) landed later, on 06-17 (commit `23dfd8a`), and was missing from
the first draft of this list until the reviewer's pass caught it — a small but apt reminder that
even the keeper inventory needed a second pair of eyes.

---

## 6. Root-cause analysis of the bounce

The findings below are ordered roughly by causal weight. Each is stated as a mechanism, not a
mood.

### RC1 — The oracle had no acceptance criteria, so it could not terminate
An adversarial reviewer's *job* is to find a problem; a sufficiently creative one always can,
especially against shell. "Run until both reviewers return clean" is **unsatisfiable** against an
oracle whose output space is "things that could conceivably go wrong." There was no pre-agreed
threat model and no "good enough" bar, so every round legitimately produced *a* finding, and every
finding reset the loop. **The termination condition was defined in terms of the adversary's silence,
which the adversary never has to grant.**

### RC2 — We hardened infrastructure for a consumer that doesn't exist
`probe_database_url` validates libpq URI semantics (multi-host split-after-decode, IPv6
normalization, case-sensitive keyword matching, octal/hex IP loopback obfuscation) for a
`DATABASE_URL` that **no code reads** — the API is a `/health` skeleton and `pg` isn't a dependency.
Most of rounds 4–10 refined validation of inputs that have no runtime consumer to be wrong for. The
threat ("operator supplies a malformed URL") is real *in T5*, not in T4. We brought T5's correctness
bar to a T4 artifact and then chased its edges. **Hardening should follow the consumer, not precede
it by a task boundary.**

### RC3 — The fix for over-engineering was always more engineering (the awk lexer)
The secret-boundary scanner's awk pass is the **third** layer behind `.dockerignore` and an
authoritative byte scan. Yet rounds 6–10 were almost entirely about making that awk pass a
**BuildKit-faithful shell lexer** — heredoc queues, `<<-` tab-strip, quoted delimiters,
continuation-join token-splitting (`COP\`<nl>`Y`). The marginal security value is ~nil: no real
Dockerfile does these things, and two deeper layers already catch a secret if one slips through.
**Every reviewer finding "the parser mis-handles construct N" was answered by teaching the parser
construct N, which created construct N+1.** We should have demoted the parser to a dumb fail-closed
advisory on round 6 and pointed every such finding at the byte scan (the real oracle). The doctrine
*says* to do exactly this (§7 "change the oracle, not the input") — and we kept patching the input
anyway.

### RC4 — One monolithic diff = one giant review surface with no lockable sub-parts
Everything lived on one branch. A class could be "closed" in prose but nothing could be *shipped and
removed from the review surface*. So a new finding **anywhere** in 6,769 lines re-opened the whole
"is it clean?" question. There was no way to say "the rollback logic is done, merged, and off the
table." **Reviewable scope never shrank, so the probability of `≥1` finding per round never dropped.**

### RC5 — The anti-loop artifacts became loop fuel
We wrote a 345-line retrospective (06-15) and a 785-line doctrine (06-16) specifically to end the
bounce. Both **added review surface and bookkeeping** (residual register, invariant tables, coupling
tests) that then needed maintaining and that drifted (the I-F/I-G inconsistencies in §5 above). The
doctrine's own §11 is titled around the bounce *outliving the doctrine*. **A process document cannot
impose a termination condition that the process's own incentives don't already supply.** Meta-work is
not free; here it had a worse ROI than shipping a smaller scope would have.

### RC6 — The test apparatus grew its own complexity (tests of tests)
~4,900 lines of test for ~2,550 lines of script (1.9:1). We had: false-greens in our own tests
(stub URL mismatches that passed for the wrong reason), then meta-tests to extract-and-run the real
functions, then load-bearing proofs that mutate a backup to confirm RED. Each layer was a *reasonable*
response to the layer below being untrustworthy — but the root cause was that we were testing
hypotheticals (RC2) with ever-more-elaborate harnesses instead of reducing what needed testing.

### RC7 — No triage between "real bug in shipping code" and "hypothetical edge in a layer-3 heuristic"
Findings were processed with uniform seriousness. A genuine rollback gap and "the advisory awk
parser fails-open on a `COPY` token split across a line-continuation that no human writes" both
blocked the "clean pass." **Severity × reachability × residual-defense was never used to gate
whether a finding had to be actioned at all.**

### RC8 — The Stop hook enforced the unsatisfiable condition
The session-scoped goal ("until there are no more points from both reviewers") was wired to a Stop
hook, mechanically preventing termination until RC1's impossible state held. Good intention
(don't stop early), wrong target (the adversary's silence). It converted "keep going until done"
into "keep going."

---

## 7. The deeper lesson

Two documents already diagnosed "fix the instance, not the class" and "sweep before you submit."
Both were *correct* and **neither stopped the loop.** Why?

Because the binding constraint was never *how* we fixed findings — it was that **the task had no
edge.** There was no scope cap, no round cap, no time box, no threat model, and no shippable
sub-unit. Given an unbounded surface, an unbounded oracle, and a termination condition defined by
the oracle, *any* fix discipline still loops. The doctrine optimized the inner loop (better fixes
per round) while the outer loop (rounds at all) was the problem.

**What would actually have stopped it, in order of leverage:**
1. **A written threat model + acceptance criteria, agreed *before* review.** "The deploy gate must:
   push by digest, fail closed on an unhealthy stack, keep secrets out of argv, and ensure the
   pushed image contains no file whose bytes match a local secret. Everything else is out of scope
   for T4." A finding outside that set is triaged *out*, not actioned.
2. **A round cap.** Max 2 review rounds per shippable unit. Round 2 produces a *written residual
   list*, not a round 3. Residuals become backlog items, not blockers.
3. **Shippable, separately-mergeable units** (see §8) so the review surface *shrinks* over time.
4. **Hardening follows the consumer.** DB-URL validation richness lands with T5, where a real `pg`
   client makes a malformed URL actually fail.
5. **The authoritative oracle wins; heuristics are advisory and capped.** The awk parser never gets
   a round-N+1 fix; the byte scan is the gate.

---

## 8. Recommended decomposition (when we return)

The task owner's instinct — "split into chunks that are deliverable and testable separately" — is
exactly right and is the single most important corrective. Proposed split. **Each chunk gets its own
threat model + acceptance criteria + max-2-round review, merges independently, and leaves the review
surface smaller.**

| # | Chunk | Scope | Acceptance criteria (define up front) | Review budget |
|---|---|---|---|---|
| **P1** | **Core deploy mechanics** | build → scan → push-by-digest → recreate → health-gate → digest rollback; EXIT-trap. *Mostly done at commit `3568b08`.* | Stack unhealthy ⇒ fail-closed + rollback to prior digest; rollback never refuses for lack of a record; volume never auto-deleted. | 1 round |
| **P2** | **Secret stays out of argv** | stdin/`PGPASSWORD`/`sshpass -f`/`--password-stdin`/0600 only, across all probe + SSH paths. | No secret in any argv in any path (the existing argv-safety matrix). | 1 round |
| **P3** | **Image secret boundary** | `.dockerignore` + **authoritative byte scan** as the gate. **Demote the awk lexer to a fixed, ~30-line fail-closed advisory** (reject `.`/`./`/`$var`/JSON-backslash sources; everything unmodeled ⇒ advisory warn, byte scan decides). | A local secret's bytes in any image layer ⇒ FAIL; `.env.example` ⇒ pass. Byte scan is the oracle; awk findings never block. | 1 round, **awk capped — no round-N+1 parser fixes** |
| **P4** | **Concurrency + record integrity** | local `flock`/`mkdir` mutex before first write; atomic record; remote lock before mutation. | N parallel writers ⇒ N contiguous blocks; lock unavailable ⇒ fail-closed, no write. | 1 round |
| **P5** | **Single-source the secret-name pattern set** (closes `B-pattern-drift`) | one canonical list consumed by `.dockerignore`/`.gitignore`/scanner; add `.envrc`/`.envlocal`; drift guard. | One source of truth; drift guard RED on divergence. | 1 round |
| **T5** | **DB-URL validation + `/ready`** | **Deferred to `s4-profile-05`.** `probe_database_url` richness lands *with the real `pg` consumer*, where a malformed URL actually fails a query. | Per T5 Acceptance: readiness ready ⇒ a real query over the API's actual connection succeeds. | owned by T5 |

**Disposition of the current 6,769 lines under this split:**
- **Keep, lightly:** P1, P2, P4 code (the good sprint) + their behavioral tests.
- **Radically simplify:** the 247-line awk lexer → small advisory (P3). Delete the heredoc-lexer
  fidelity tests and meta-tests that exist only to validate it.
- **Defer/move:** the 314-line `probe_database_url` and its ~20 edge-case tests → T5 (P-anything in
  T4 only needs "the URL is syntactically a postgres URL the box synthesized"). Most of rounds 4–10
  moves here.
- **Retire the meta-bookkeeping** (residual register §10.2, invariant tables, coupling tests) once
  each chunk ships behind its own bounded gate — a merged chunk needs no residual register.

---

## 9. Process changes to adopt next time

1. **Threat model + acceptance criteria are written and agreed before the first review.** No finding
   outside them is a blocker; it's a backlog candidate.
2. **Round cap = 2 per shippable unit.** Round 2 ends in a residual *list*, not a round 3.
3. **Ship small and often** so the review surface monotonically shrinks.
4. **Authoritative oracle gates; heuristics advise and are frozen.** A heuristic never earns a
   round-N+1 fix; if it's wrong too often, delete it and lean on the oracle.
5. **Triage by severity × reachability × residual-defense** before actioning any finding.
6. **No anti-loop meta-document substitutes for a scope edge.** If we feel the urge to write a
   doctrine to stop a loop, that's the signal to *cut scope and ship*, not to write prose.
7. **Don't bring a future task's correctness bar to the current task's artifact.** Hardening follows
   the consumer.
8. **Termination is defined by the acceptance criteria, never by the reviewer's silence.**

---

## 10. Cost / value reckoning (for honesty)

- **Value delivered that we'd keep:** ~10 commits / first 12h — the deploy mechanics, argv-safety,
  rollback, digest pinning, byte scan. Genuinely good.
- **Value of the next ~57h / 22 commits:** marginal. Mostly libpq-URI and awk-lexer edges for an
  absent consumer, plus 1,130 lines of meta-prose that didn't stop the loop.
- **Carrying cost incurred:** ~4,900 lines of test (much of it for hypotheticals), a 785-line
  doctrine with internal inconsistencies, and a branch too large to merge confidently.

This is not "nothing was achieved" — it's "a good 12-hour result was buried under a 57-hour loop."
The corrective is structural (scope edges + bounded review), not "try harder to satisfy the
reviewer."

---

## 11. For the joint postmortem — sections to fill in

*Placeholders. The reviewing agent and the task owner should add their views directly here.*

### 11.1 Reviewing agent — perspective (added 2026-06-19)

**Two reviewer-side mechanisms the postmortem doesn't already name (the rest is RC1/RC7/RC8).**

1. **The adversary is stateless and re-derives the whole surface every run.** Each
   `/codex:adversarial-review` starts cold: it re-reads the full diff with no memory that a finding
   was already raised and consciously triaged-out. An issue we decided not to action — e.g.
   "malformed `DATABASE_URL` has no T4 consumer" — returns as a fresh "high" next run, because
   nothing carried the disposition back into the reviewer's input. This is the mechanism the
   stopping protocol's triaged-out list (below) exists to defeat.
2. **The verbatim-return contract stripped triage on my side (the reviewer-side origin of RC7).**
   `/codex:adversarial-review` is review-only: I returned Codex's output verbatim with no
   severity-by-reachability gate, so a genuine rollback gap and a layer-3 advisory nit reached the
   owner as equal-looking blockers.

**Per-finding triage from the reviewer's seat (answers §11.1 Q2).** The table earns its space only
on rows that *move a finding off the blocker list* vs §8 — everything in §5/K1–K6 is real,
load-bearing, and already maps to P1/P2/P3/P4 with no triage change.

| Finding (shorthand) | Verdict | Disposition for the restart |
|---|---|---|
| Everything in §5 / K1–K6 (argv secrets, digest deploy+rollback, rollback-health, mark-before-recreate, byte-scan oracle, locked atomic record) | **Real, load-bearing** | Maps 1:1 to **P1/P2/P3/P4**. No triage change — see §5/§8/§14. |
| `--platform linux/amd64` pin | **Real, already shipped** | **Salvage, not fix.** Ships at `build-deploy-profile.sh:113` (commit `23dfd8a`, 06-17) but was **absent from §5 and §14**, so a post-reset restart would silently drop it. Recorded as keeper **K7** in §14. |
| All `probe_database_url` / libpq findings: `?host=` redirect, percent-encoded keys, multi-host authority, pre-recreate URL gate, proxy-vs-real (F9/F12) | **Hypothetical-for-T4 (RC2)** | **Triage OUT → T5.** No T4 code reads `DATABASE_URL` (grep `src/` = 0 hits); `pg` is present-but-extraneous in `node_modules`, not a declared dependency. Correct only once a real `pg` consumer exists. Most of rounds 4–10. |
| `PROFILE_INTERNAL_ALLOW_IPS`, `PROFILE_INTERNAL_TOKEN` persistence | **Hypothetical-for-T4 (RC2)** | **Triage OUT → T5 (endpoint) / T6 (game-server consumer).** The nginx `/internal/` allowlist and token are real deployed plumbing but the endpoint 404s until T5 and the crediting consumer is a T6 deferral. |
| awk lexer mishandles construct N (F2/F10/F11 + heredoc/continuation edges) | **Heuristic arms race (RC3)** | **Freeze.** Tiny fail-closed advisory; byte scan gates. Never a round-N+1 parser fix. |
| Remote-script pre-flock race; scan→push TOCTOU; partial mixed-config state; lost record on passed deploy | **Real-but-ultra-low-reachability (RC7)** | **Residual list, not blockers.** Each needs a specific concurrent/crash race; ship with a one-line written residual. (The record-write-failure case is closed-by-design — `build-deploy-profile.sh:253-258` deliberately warns-and-continues on a failed record append so the `rmdir` lock-release still runs; a hard abort there would strand the deploy lock.) |

**What "clean" would have required (answers §11.1 Q3).** Per chunk, "clean" = the chunk's written
acceptance criteria (§8) are green AND every finding outside that set is auto-classified
residual/out-of-scope, not a blocker. The actual T4 bar is the threat model in §11.3 — stated once
there. I never returned clean because I was never given *that* bar (RC1), so I kept answering the
unbounded question.

**First-hand confirmation of RC5.** I co-authored the §11 meta-rules and, the turn before this
postmortem, ran a workflow that *added* I-F/I-G/I-H and two residual rows — careful, adversarially
verified, and still more surface. Even rigorous verified meta-work kept enlarging the thing it was
meant to close.

**A reviewer-side stopping protocol for the restart (so I help instead of bounce).**
1. **Feed the chunk's acceptance criteria + threat model into the review prompt;** instruct the
   reviewer to label each finding `in-scope-blocker` / `out-of-scope-residual` / `nit` against them.
2. **One adversary per chunk, not a relay.** Alternating two models converges on the *union* of all
   findings, which only grows — convergence needs one adversary against fixed criteria.
3. **Maintain a checked-in `triaged-out` list, fed to (or post-filtered against) the stateless
   reviewer,** so a settled disposition can't return as a fresh blocker (this is the direct remedy
   for mechanism 1 above). Otherwise as §9.

### 11.2 Task owner — your perspective (please add)
- Is the §8 decomposition the right set of shippable units? Reorder / merge / split?
- Are P1/P2/P4 acceptable to merge roughly as-is, or do you want a fresh small branch per chunk?
- Confirm: is `probe_database_url` richness genuinely deferrable to T5, or is there a T4-time threat
  (operator override) you want a *minimal* version of now?

### 11.3 Open questions (either party)
- Do we keep the awk advisory at all, or is `.dockerignore` + byte scan sufficient (delete the awk
  pass entirely)?
- What is the actual, current threat model for the *T4* deploy? Write it in one paragraph here.
- Should the doctrine (`profile-deploy-scope.md`) be archived/superseded by per-chunk acceptance
  criteria, or kept as historical context?

**Reviewing agent's answers (2026-06-19):**
- **The awk advisory:** delete the 247-line COPY/ADD path-normalizing advisory awk. Either delete
  outright — `.dockerignore` + the per-layer byte scan (K5) is authoritative — or replace with a
  **~30-line frozen fail-closed advisory** flagging only the obvious (`COPY . `, `COPY $var`,
  `ADD <url>`); it never blocks (byte scan decides) and never earns a round-N+1 fix. Either way the
  247-line lexer and its heredoc-fidelity tests go.
- **The actual T4 threat model (one paragraph):** *The T4 deploy pipeline must (1) never bake a
  secret into the pushed image — no file whose bytes equal a local secret in any layer; (2) never
  expose a secret in argv on the dev host or the box — credentials travel by
  stdin/`PGPASSWORD`/`--password-stdin`/`sshpass -f`/0600 file only; (3) never leave the service
  unrecoverable — deploy and roll back by immutable `@sha256` digest, fail closed and roll back on
  an unhealthy stack, never auto-delete the data volume; (4) never corrupt state under concurrency —
  one fail-closed lock before the first write/mutation, atomic single-block record.* **Out of the T4
  threat model:** the validity of an operator-supplied `DATABASE_URL` (no T4 code reads it — T5's
  `pg` consumer owns it), the `/internal/` token/allowlist boundary (endpoint absent until T5,
  game-server consumer until T6), and adversarial Dockerfile lexer constructs (no such Dockerfile
  exists; the byte scan backstops any miss).
- **Doctrine disposition:** supersede — per-chunk criteria are law; keep `profile-deploy-scope.md`
  only as historical context (already the §12 disposition). The residual-register retirement is §8;
  don't re-argue it.

---

## 12. Resumption guide (state as of 2026-06-19)

- **Branch:** `task/profile-deploy-hardening`, **not merged**, clean working tree at the stopping
  point. `dev` is the merge target.
- **Do not re-enter the loop.** When picking this up, start from §8 (decompose), not from "re-run
  the reviewers."
- **First action on return:** write the one-paragraph T4 threat model + acceptance criteria
  (§11.3), then pick the smallest chunk (P1) and merge it. Shrink the surface before reviewing
  anything.
- **Key files:**
  - Scripts: `setup-profile.sh`, `build-deploy-profile.sh`, `scripts/check-docker-secret-boundary.sh`
  - Tests: `tests/scripts/*.test.ts` (7 files)
  - Doctrine: `docs/security/profile-deploy-scope.md` (treat as historical/context, not law)
  - Prior retro: `ai-agents/knowledge-base/review-loop-retrospective-2026-06-15.md`
  - Deferred consumer: `ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md` (T5, Scope item 5)
  - Pipeline origin: `ai-agents/tasks/done/s4-profile-04-backend-infra.md` (T4, Scope item 2)
- **Residuals to carry as backlog (not blockers):** `C-R3` (comment wording), `B-pattern-drift`
  (→ chunk P5).
- **Workflow constraints still in force:** never commit without explicit ask; never move task files
  between backlog/done/cancelled; secrets never in argv; `docker compose down -v` only as an echoed
  operator hint.

---

## 13. Appendix — the numbers, for the record

```
Commits (dev..branch):         34   (10 substantive, 19 "review changes", 3 review/doc, 2 meta)
Span:                          2026-06-14 22:06  →  2026-06-17 16:20  (~2d 18h)
Diff:                          6,769 insertions, 70 deletions, 15 files
Scripts (total LOC):           setup-profile 1517 | build-deploy 473 | secret-boundary 564 = 2554
  awk BuildKit lexer:          247 lines (inside scan_broad_copies)
  probe_database_url:          314 lines
Tests (LOC / cases):           ~4,900 / ~174   (test:script ≈ 1.9:1)
  largest:                     profileDeployClassSweep.test.ts — 1,429 lines
Meta-prose:                    doctrine 785 + retrospective 345 = 1,130 lines
Productive window:             first ~12h / 10 commits (P1/P2/P4 substantially done)
Bounce window:                 next ~57h / 22 commits (mostly RC2/RC3 edges + meta)
```

---

## 14. Appendix B — Salvaged keeper code (verbatim)

**Why this section exists.** This postmortem will be used *after the branch is reset*, by agents
that have **no access to the original code or commits**. A prose description of the §5 keepers is
not enough to reconstruct them faithfully — and re-implementing them from scratch under an
open-ended reviewer is the exact loop we're escaping. So the genuinely good, hard-to-reproduce
idioms are embedded here **verbatim**, copied from `task/profile-deploy-hardening` at the stopping
point (2026-06-17). These are the *only* parts worth carrying forward as-is.

> **Caveats for the future reader.**
> - This is the **§5 keep-list only**. It deliberately **omits** the parts §8 says to simplify or
>   defer: the 247-line awk BuildKit lexer in `scan_broad_copies`, and the 314-line
>   `probe_database_url` (DB-URL validation richness → moves to T5). Do **not** resurrect those from
>   git just because they existed.
> - Line numbers below are **hints to grep, not coordinates** — they will have drifted.
> - These run under `set -e` (`setup-profile.sh`, `build-deploy-profile.sh`) /
>   `set -euo pipefail` (`check-docker-secret-boundary.sh`). The `|| true` guards are load-bearing,
>   not noise — an unguarded non-zero in an EXIT trap aborts cleanup and leaks a lock.

### K1 — Secret never reaches argv (P2)
*The invariant: a password/token never appears in any process's argv (`ps`, `/proc/<pid>/cmdline`,
execve auditing, process collectors). Routed via stdin / `PGPASSWORD` / `--password-stdin` /
`sshpass -f` 0600 file only.*

Discrete-credential DB probe — password piped to a container `read`, never on `psql` argv
(`setup-profile.sh`, near `probe_db_credentials()`):
```bash
probe_db_credentials() {
    printf '%s\n' "$POSTGRES_PASSWORD" | docker compose exec -T postgres \
        sh -c 'IFS= read -r PGPASSWORD; export PGPASSWORD; exec psql -h postgres -U "$1" -d "$2" -tAc "select 1"' \
        _ "$POSTGRES_USER" "$POSTGRES_DB" >/dev/null 2>&1
}
```

Registry login — token on stdin (`build-deploy-profile.sh`):
```bash
echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin
```

SSH password fallback — `sshpass -f <0600 file>` (only the *path* is in argv), file created 0600
*before* the secret is written, removed by `finalize_deploy` (`build-deploy-profile.sh`):
```bash
    SSH_PASSWORD_FILE=$(mktemp)
    chmod 600 "$SSH_PASSWORD_FILE"
    printf '%s\n' "$SSH_PASSWORD" > "$SSH_PASSWORD_FILE"
    SCP_CMD=(sshpass -f "$SSH_PASSWORD_FILE" scp -o StrictHostKeyChecking=accept-new)
    SSH_CMD=(sshpass -f "$SSH_PASSWORD_FILE" ssh -o StrictHostKeyChecking=accept-new)
```

### K2 — Deploy & roll back by immutable @sha256 digest (P1)
*The invariant: the box deploys and rolls back by digest, never by mutable tag. The digest is
resolved from the exact image ID that was scanned, so a concurrent retag can't swap a different
image past the secret scan. Fail closed if no canonical digest resolves.*

Resolve the digest from the **scanned image ID** (not the tag), fail closed otherwise
(`build-deploy-profile.sh`):
```bash
PROFILE_DIGEST=$(docker inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "$BUILT_IMAGE_ID" \
    | grep -E "^${DOCKER_USERNAME}/${DOCKER_REPO}@sha256:[0-9a-f]{64}$" | head -1 || true)
if [ -z "$PROFILE_DIGEST" ]; then
    echo "Error: could not resolve a canonical registry digest for the built artifact ${BUILT_IMAGE_ID}."
    # ... refuse to deploy by mutable tag (registry-image-policy.md requires a digest) ...
fi
```

Rollback break-glass — decline to recreate a non-digest-pinned image, reading **no** record
(`setup-profile.sh`, in `rollback_deploy`):
```bash
prev_image=$(awk '$1 == "profile-api:" { in_svc = 1; next } in_svc && $1 == "image:" { print $2; exit }' "$PROFILE_DIR/docker-compose.yml" 2>/dev/null || true)
if printf '%s' "$prev_image" | grep -q '@sha256:'; then
    # recreate previous digest-pinned API; else HALT loud (never run a mutable image)
```

### K3 — Fail-closed rollback that never refuses for lack of a record (P1)
*The invariant (Class C): rollback restores config and recreates the stack only if the live stack
was already replaced (`STACK_RECREATED`); it reads NO deploy record, so it can never refuse "for
lack of a passed record" exactly when it's most needed; and it waits on the SAME healthy assertion
the forward path uses, so a started-but-unhealthy old image is reported a FAILURE, not a success.*
(`setup-profile.sh`, in `rollback_deploy`):
```bash
    if [ -f "$PROFILE_ENV_BAK" ] || [ -f "$COMPOSE_BAK" ]; then
        restore_previous_config
        # Only recreate if we already replaced the live stack; before that the previous
        # stack is still running, so restoring the config files is enough.
        if [ "$STACK_RECREATED" = "1" ]; then
            # ... digest-pin break-glass (K2) ...
            if printf '%s' "$prev_image" | grep -q '@sha256:'; then
                echo "Recreating the previous profile-api..."
                docker compose up -d postgres || true
                if docker compose up -d --force-recreate --no-deps profile-api; then
                    echo "   Recreated the previous profile-api; waiting for it to become healthy..."
                    local rb_elapsed=0
                    while [ "$rb_elapsed" -lt 120 ]; do
                        if all_services_running_healthy; then
                            break
                        # ... else sleep/elapse; on timeout report ROLLBACK FAILED with stack state + logs ...
```

### K4 — Mark the stack touched BEFORE the first destructive command; never auto-delete the volume (P1)
*The invariant: `STACK_RECREATED=1` is set before the first container-mutating command, so a
failure in EITHER the postgres converge OR the API recreate lets the EXIT rollback reconverge/stop
the stack. The data volume is never auto-deleted (`down -v` only ever an echoed operator hint).*
(`setup-profile.sh`):
```bash
docker compose pull profile-api
# Mark the live stack as touched BEFORE the FIRST container-mutating command.
STACK_RECREATED=1
docker compose up -d postgres
docker compose up -d --force-recreate --no-deps profile-api
```

### K5 — Authoritative per-layer byte scan for image secrets (P3 — this is the real oracle)
*The invariant: the gate observes the REAL bytes of every layer (`docker save` → per-layer tar →
sha256), so a secret that rode in under a renamed path, from a subdirectory, or was deleted in a
later layer is still caught. Fail closed if docker save fails, a layer blob is unreadable, or zero
layers are found. This — not the awk Dockerfile heuristic — is what P3 should keep.*

Build the wanted-set: hash every local secret/key in the repo tree, **uncapped**, pruning
`node_modules`/`.git` (`scripts/check-docker-secret-boundary.sh`):
```bash
    HASH_CMD="sha256sum"
    command -v sha256sum >/dev/null 2>&1 || HASH_CMD="shasum -a 256"
    local_secret_files=$(find "$ROOT_DIR" \
        -type d \( -name node_modules -o -name .git \) -prune -o \
        -type f \( -name ".env" -o -name ".env.*" -o -name "*.secret" -o -name "*.pem" \
        -o -name "id_rsa*" -o -name "id_ed25519*" -o -name "*.key" \) \
        ! -name "*.example" ! -name "*.sample" ! -name "*.template" -size +0c -print 2>/dev/null)
    local_hashes_file=""
    if [ -n "$local_secret_files" ]; then
        local_hashes_file=$(mktemp)
        printf '%s\n' "$local_secret_files" \
            | while IFS= read -r f; do [ -n "$f" ] && $HASH_CMD "$f"; done \
            | awk '{print $1}' | sort -u > "$local_hashes_file"
        [ -s "$local_hashes_file" ] || { rm -f "$local_hashes_file"; local_hashes_file=""; }
    fi
```

Scan every layer (fail closed on docker-save failure, unreadable blob, or zero layers):
```bash
    INSPECT_SAVE_DIR=$(mktemp -d)
    if ! docker save "$INSPECT_IMAGE" | tar -xf - -C "$INSPECT_SAVE_DIR" 2>/dev/null; then
        echo "Error: docker save failed for $INSPECT_IMAGE — the image secret oracle is"
        echo "       unavailable, so this gate FAILS CLOSED rather than reporting 'passed'."
        exit 1
    fi
    name_hits=""; content_hits=""; layers_scanned=0
    while IFS= read -r blob; do
        [ -f "$blob" ] || continue
        # tar -tf is the PRIMARY layer discriminator; a blob tar can't read may be JSON metadata
        # ({ or [) and is skipped — any OTHER unreadable blob FAILS CLOSED (don't skip a layer).
        if ! tar -tf "$blob" >/dev/null 2>&1; then
            first_char=$(head -c1 "$blob" 2>/dev/null || true)
            case "$first_char" in "{" | "[") continue ;; esac
            echo "Error: a layer blob ... is not readable as a tar. FAILING CLOSED."
            exit 1
        fi
        layers_scanned=$((layers_scanned + 1))
        INSPECT_LAYER_DIR=$(mktemp -d)
        tar -xf "$blob" -C "$INSPECT_LAYER_DIR" 2>/dev/null || true
        chmod -R u+rwX "$INSPECT_LAYER_DIR" 2>/dev/null || true
        # NAME scan (.env/.env.*/*.secret, excluding *.example/sample/template; prune node_modules)
        # CONTENT scan over ALL files (incl node_modules), UNCAPPED, only if we have local hashes:
        if [ -n "$local_hashes_file" ]; then
            ch=$(find "$INSPECT_LAYER_DIR" -type f -size +0c \
                -exec $HASH_CMD {} + 2>/dev/null \
                | awk 'FNR==NR { if ($1 != "") want[$1] = 1; next } ($1 in want) { print }' \
                    "$local_hashes_file" - \
                | sed "s|$INSPECT_LAYER_DIR||" || true)
            [ -n "$ch" ] && content_hits="${content_hits}${ch}
"
        fi
        rm -rf "$INSPECT_LAYER_DIR"; INSPECT_LAYER_DIR=""
    done < <(find "$INSPECT_SAVE_DIR" -type f \( -name 'layer.tar' -o -path '*/blobs/sha256/*' \))
    if [ "$layers_scanned" -eq 0 ]; then
        echo "Error: found no layer blobs ... FAILING CLOSED (unexpected docker save format?)."
        exit 1
    fi
    # any name_hits / git_hits / content_hits => print + exit 1
```

The image scan is invoked on the **scanned image ID** (not the tag) before push
(`build-deploy-profile.sh`):
```bash
bash scripts/check-docker-secret-boundary.sh --inspect-image "$BUILT_IMAGE_ID"
```

### K6 — Lock before first write + atomic, single-block deploy record (P4)
*The invariant: one fail-closed lock spans the deploy before any record byte is written — `flock`
on the Linux box, atomic `mkdir` mutex on the macOS dev host. The record body is accumulated in a
0600 temp; the single `validation_result=… digest=…` line is appended to that same temp and the
WHOLE block is appended to the shared record in one operation under the lock — so a body can never
land without its result, and concurrent deploys can't interleave blocks.*

Remote box — `flock`, fail closed if unavailable (`setup-profile.sh`, near the top):
```bash
if ! command -v flock >/dev/null 2>&1; then
    apt-get update -y >/dev/null 2>&1 && apt-get install -y util-linux >/dev/null 2>&1 || true
fi
if ! command -v flock >/dev/null 2>&1; then
    echo "Error: flock (util-linux) is required to serialize deploys and could not be installed."
    exit 1
fi
exec 9>/var/lock/profile-deploy.lock
if ! flock -n 9; then
    echo "Error: another profile deploy is already running on this box"
    exit 1
fi
```

Local host — atomic `mkdir` mutex acquired BEFORE the record trap + first write
(`build-deploy-profile.sh`):
```bash
if ! mkdir "$DEPLOY_LOCK" 2>/dev/null; then
    echo "Error: another profile deploy is already running (lock: $DEPLOY_LOCK)."
    exit 1
fi
DEPLOY_LOCK_HELD=1
trap finalize_deploy EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
DEPLOY_RECORD_TMP=$(mktemp)
chmod 600 "$DEPLOY_RECORD_TMP"
{
    echo "----"
    echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "env=profile"
    echo "host=${PROFILE_SERVER_HOST}"
    echo "tag=${PROFILE_IMAGE}"
    echo "digest=${PROFILE_DIGEST}"
    echo "commit=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
    echo "operator=$(whoami 2>/dev/null || echo unknown)"
} | tee "$DEPLOY_RECORD_TMP"
```

`finalize_deploy` — single EXIT writer; appends result to the temp, then the whole block atomically
under the lock; every cleanup `|| true`-guarded so a failure can't leak the lock
(`build-deploy-profile.sh`):
```bash
finalize_deploy() {
    [ "$DEPLOY_FINALIZED" = "1" ] && return 0
    DEPLOY_FINALIZED=1
    [ -n "$LOCAL_TMPENV" ] && rm -f "$LOCAL_TMPENV" || true
    [ -n "$SSH_PASSWORD_FILE" ] && rm -f "$SSH_PASSWORD_FILE" || true
    # ... remove remote staged env/script (best-effort) ...
    if [ -n "$DEPLOY_RECORD_TMP" ] && [ -f "$DEPLOY_RECORD_TMP" ] && [ -n "${DEPLOY_RECORD:-}" ]; then
        echo "validation_result=${DEPLOY_OUTCOME:-failed} digest=${PROFILE_DIGEST:-unknown}" >> "$DEPLOY_RECORD_TMP" \
            && cat "$DEPLOY_RECORD_TMP" >> "$DEPLOY_RECORD" \
            || echo "Warning: could not write the deploy record to $DEPLOY_RECORD" >&2
    fi
    [ -n "$DEPLOY_RECORD_TMP" ] && rm -f "$DEPLOY_RECORD_TMP" || true
    [ "$DEPLOY_LOCK_HELD" = "1" ] && rmdir "$DEPLOY_LOCK" 2>/dev/null || true
}
```

### K7 — Build for the target architecture (P1/build)
*The invariant: the image is built for the architecture the reg.ru VPS runs (`linux/amd64`), so an
Apple-Silicon (arm64) dev host can never push a digest the box can't execute — which fails a first
deploy outright or health-fails a redeploy into rollback. This shipped (commit `23dfd8a`, 06-17) but
was never folded into §5, so it is recorded here too — without it the post-reset restart silently
drops back to host-arch builds.* (`build-deploy-profile.sh`):
```bash
docker buildx build --platform linux/amd64 --load -f "$DOCKERFILE" -t "$PROFILE_IMAGE" .
```

### What is intentionally NOT salvaged here
- The **247-line awk BuildKit lexer** (`scan_broad_copies`) — P3 replaces it with a ~30-line
  fail-closed advisory; K5 (the byte scan) is the real oracle.
- The **314-line `probe_database_url`** and its ~20 edge-case tests — deferred to **T5**, where a
  real `pg` client makes a malformed URL actually fail a query.
- The **785-line doctrine** and **residual register** — historical context, not law (§11.3).

If a future reader wants those anyway, they are recoverable only from git history of
`task/profile-deploy-hardening` (if that ref still exists) — they are deliberately not embedded.
