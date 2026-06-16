# Retrospective: the profile-deploy review bounce — what the workflow got wrong, and how to fix it

> **Author:** Claude (implementer), as a technical post-mortem.
> **Date:** 2026-06-15.
> **Scope of evidence:** the ~15-round `/process-review` loop on the profile-backend deploy
> pipeline (`setup-profile.sh`, `build-deploy-profile.sh`, `scripts/check-docker-secret-boundary.sh`,
> `Dockerfile.profile`, `tests/scripts/*`), the governing doctrine
> [`docs/security/profile-deploy-scope.md`](../../docs/security/profile-deploy-scope.md), and this
> session's "comprehensive sweep" + adversarial self-review.
> **Audience:** the human owner and any future implementer/reviewer working this style of task.

---

## 1. Executive summary

A single, ~600-line hardening change to a set of bash deploy scripts consumed **fifteen-plus
review rounds**. Each round closed one finding and surfaced another — sometimes a new instance of
the same defect class, sometimes a *regression introduced by the previous fix*, sometimes a
genuinely new class. The loop was not bad luck; it was the **mechanical, predictable output of the
process we were running**.

The root causes are structural, not personal, and they compound:

1. We fixed **named instances**, not **defect classes**, on a surface that had **five live classes
   at once** — so one-class-per-round mathematically guarantees a finding every round.
2. Several "fixes" **broke adjacent contracts** (I caused at least one regression myself), turning
   the fix into the next finding.
3. Reviewer prescriptions (and later our own codified doctrine) carried **environment-blind
   instructions** that, applied verbatim, would have *broken production* — they were caught only by
   slow, manual reasoning, not by the process.
4. There was **no mandatory adversarial self-review before submission**, so the reviewer became the
   first adversary instead of the second.
5. **Docs drifted from code and from environmental reality**, and stale docs *manufacture* new
   rounds (a reviewer who reads stale doctrine flags compliant code).

The good news: every one of these has a concrete, mostly cheap counter-measure, and the most
powerful one — a **pre-submission adversarial self-review** — was demonstrated this session to catch
**6 real defects (including 2 production-breakers) that I had just written**, before any human or
external reviewer saw them. That single practice converts "review rounds" into "CI passes."

---

## 2. What actually happened (the shape of the loop)

The defects clustered into five classes (named A–E in the doctrine). The reviewer never invented
problems out of nothing — it walked a **multi-class surface** and reported the next untested point:

| Class | Theme | Findings across rounds |
|---|---|---|
| A | DB / `DATABASE_URL` authenticity (proxy vs real connection) | F6, F7, F9, F12 |
| B | Docker secret-boundary parser arms race | F2, F10, F11 |
| C | Rollback completeness & fail-loud | F1, F3, F8 |
| D | Concurrency / locking / record integrity | F4, F5 |
| E | Scope / future-API contract (reviewer visibility) | F9, F12 (+ meta) |

The telltale signature of a broken loop: **F2/F10/F11 are three points on one curve** (a hand-rolled
awk Dockerfile parser that passed anything it didn't recognize); **F6/F7/F9/F12 are four points on
another** (a deploy gate that certified a *proxy* — discrete-credential `psql` + a dependency-free
`/health` — never the literal `DATABASE_URL`). We were not converging; we were enumerating.

The loop only broke when we stopped patching the cited line and instead (a) wrote down the *whole
threat model* (the doctrine), (b) **changed the oracle** rather than the input (validate the real
artifact), (c) closed *every* class in one submission, and (d) ran an **adversarial self-review over
the whole diff** before declaring done.

---

## 3. Findings — the problems, with evidence

### F-1. We fixed instances, not classes, on a multi-class surface
**Observation.** Each round changed the one failing *input* and pinned it with a test, never the
*oracle*. With five classes live simultaneously, fixing one per round leaves ≥4 open — so the next
review always has something to report.
**Evidence.** The F2→F10→F11 and F6→F7→F9→F12 progressions; the doctrine's own §1 diagnosis
("every fix patched the named instance, not the class").
**Why it happens.** `/process-review` is framed around *a* finding. The path of least resistance is
to satisfy that finding. Nothing in the loop forces "now enumerate and close the rest of this class,
then sweep the other classes."
**Impact.** Round count ≈ number of open instances. Guaranteed bounce.

### F-2. Fixes introduced regressions — the loop was partly self-inflicted
**Observation.** A fix for the cited line broke a downstream contract, which became the *next*
finding.
**Evidence (the clearest case).** In an earlier round I "stopped synthesizing `DATABASE_URL`" to
satisfy a finding. But T5 (`s4-profile-05-backend-db-api.md`) and the box's config contract expect
`DATABASE_URL` to be present; removing it was the regression the reviewer then flagged. I had
changed a deploy-provided interface without grepping its consumers.
**This session, same family.** My *first cut* of the sweep shipped three real defects (see the
case studies in §6): a fail-open on docker failure, an `awk -v` crash, and a stale-lock bug. First
cuts have bugs; without a self-adversary they become review rounds.
**Why it happens.** Local reasoning ("make the cited symptom go away") without tracing the change's
blast radius across contracts, consumers, and environments.
**Impact.** The implementer becomes a *source* of findings, not just a fixer of them.

### F-3. Environment-blind prescriptions, nearly applied verbatim
**Observation.** Reviewer notes — and, dangerously, our own *codified doctrine* — contained
instructions that were correct in the abstract but **wrong for the actual execution environment**,
and would have broken production if followed literally.
**Evidence (two production-breakers this session):**
- The doctrine's Class D text said *"add a fail-closed `command -v flock` check symmetric with the
  remote one."* But `build-deploy-profile.sh` runs on the **macOS dev host, which has no `flock`** —
  a literal `command -v flock || exit 1` would abort **every** local deploy. (Fixed by using a
  portable `mkdir` mutex; doctrine since corrected.)
- The Class B plan listed a whole-filesystem name scan for `*.pem`/`id_rsa*`. The `node:24-slim`
  base image ships CA bundles and dependency test certs, so that scan would **false-positive and
  fail every deploy**. (Fixed: name scan stays conservative; key material is caught by content hash.)
**Why it happens.** Reviewers (human or automated) reason from a generic mental model; they don't
run the code on every target. The implementer can absorb the prescription without re-checking the
environment.
**Impact.** Near-misses that would have *broken deploys* — the opposite of hardening. These were
caught only by careful manual reasoning, i.e., by luck-of-diligence, not by the process.

### F-4. No mandatory pre-submission adversarial self-review
**Observation.** For most of the loop, the *first* adversarial pass over a submission was the
external reviewer's. So every latent defect cost a full round-trip.
**Evidence.** When this session finally ran a 6-lens adversarial review **before** asking for human
review, it confirmed **6 real defects** (2 high-severity production-breakers) that I had just
written — and refuted several false alarms. Those 6 would otherwise have been 6 more review rounds.
**Why it happens.** Self-review is optional and easy to skip under "it looks done."
**Impact.** The reviewer is doing work that a self-adversary could have done in-process, at a
fraction of the wall-clock and human attention.

### F-5. Claims about runtime behavior were made before being proven
**Observation.** Assertions about shell/parser/concurrency behavior were sometimes wrong until
actually executed. Bash is a minefield (`set -e` semantics, word-splitting, `awk -v` limits,
quoting, command-substitution exit codes).
**Evidence.** A UTF-8 sign-extension bug in the `urlencode` helper (caught only by a round-trip
test); a `set -e` abort on a conditional emit; the `awk -v` newline crash this session (macOS awk
rejects multi-line `-v` values — invisible to inspection, fatal at runtime).
**Why it happens.** Reasoning about shell semantics *feels* reliable but isn't; the failure modes
are environment- and version-specific.
**Impact.** "Looks correct" ships bugs. Each one is a potential round.

### F-6. Citations by line number; docs/tests that rot
**Observation.** Reviews cited line numbers that drifted between rounds; line-anchored tests broke
on unrelated edits; the doctrine itself drifted from the code.
**Evidence.** The doctrine had to adopt a hard rule ("anchor by grep string, never line number")
after repeated breakage. This session, the doctrine's appendix listed *already-completed* work as
"still open," and its Class D text prescribed `flock` after the code had moved to `mkdir` — i.e.,
the doc would have caused the reviewer to flag *compliant* code.
**Why it happens.** Line numbers are not stable identifiers; docs aren't coupled to the artifacts
they describe.
**Impact.** Stale references and stale docs **manufacture** review rounds independent of any real
defect.

### F-7. No up-front "definition of done" / acceptance contract
**Observation.** Each round *discovered* a new acceptance criterion. There was never an agreed,
testable, complete acceptance matrix at the start.
**Evidence.** The doctrine — which is essentially "the acceptance matrix + threat model we should
have written first" — was produced retroactively, ~round 9+. Once it existed, convergence followed.
**Why it happens.** We started "fixing the reported thing" instead of "scoping the whole problem."
**Impact.** The target moved every round because it was never pinned.

### F-8. Scope boundaries weren't reviewer-visible
**Observation.** F9/F12 kept resurfacing partly because "what THIS change guarantees vs. what is
deferred to T5" was not written where the reviewer reads it.
**Evidence.** The reviewer repeatedly flagged the DB-readiness gap; the correct disposition
("real now: the exact-`DATABASE_URL` gate; deferred: the `/ready` endpoint → T5") existed only in my
head until it was made a first-class artifact (the scope block + quoted T5 citation).
**Why it happens.** Out-of-scope-but-correct findings have no home, so they get re-actioned or
re-argued every round.
**Impact.** Legitimate triage ("correct, out of scope, owned by T5") looks like hand-waving unless
it's written down with a resolvable citation.

### F-9. The economics — and who carried the cost
**Observation.** Fifteen-plus full review cycles for a few hundred lines of bash is a poor ratio of
outcome to wall-clock, tokens, and **human attention**.
**Evidence.** The owner had to personally intervene — *twice* — to name the meta-problem ("we keep
bouncing; think about how to stop it") and to choose scope. The process did not surface or fix its
own dysfunction; a human had to.
**Impact.** The most expensive resource (human judgment) was spent unjamming a loop the process
should have prevented.

### F-10. Even the self-adversary needs a verifier (don't trade one noise source for another)
**Observation.** The adversarial self-review this session raised more findings than were real
(e.g., one lens raised 3, only 1 held up).
**Evidence.** The review workflow's per-lens tallies: `B: 3 raised, 2 confirmed`, `X: 3 raised, 1
confirmed`. Without a refutation stage, a self-review just relocates the bounce inward.
**Why it matters.** A self-review that emits unverified findings creates make-work. It must pair
*find* with *adversarially verify* (default-to-refuted) and act only on confirmed items.

---

## 4. What worked (build on these, don't discard them)

- **Writing the threat model down (the doctrine).** Shared, durable state that both sides can cite.
  Its existence is what finally enabled convergence.
- **"Change the oracle, not the input."** Validating the *real artifact* (a live `SELECT 1` over the
  exact `DATABASE_URL`; a content scan of the built image filesystem) instead of a proxy is what
  actually closed Classes A and B for good.
- **Behavioral tests that run the real code under stubs.** Extracting the real bash function and
  executing it (round-trip encoders, EXIT-trap rollback, concurrent record writers, stubbed-`docker`
  image scans) caught bugs that inspection missed.
- **Grep-anchored tests.** Survive line drift; the matrix doesn't rot when files move.
- **Regression-pinning every fixed defect.** Each closed finding got a guard test, so it can't
  silently return.
- **Close-the-class + sweep-all-classes in one submission.** The cadence that ends the loop.
- **The adversarial self-review with a verification stage.** The highest-leverage practice
  discovered — it caught production-breakers pre-review.

---

## 5. Recommendations

Ordered by leverage (impact ÷ cost). Each maps to the findings it addresses.

### R-1. Make a pre-submission adversarial self-review **mandatory** *(addresses F-1, F-2, F-4, F-5)*
Before requesting any human/external review of a non-trivial change, run the reviewer's own lenses
over the **whole diff**, then **adversarially verify each finding** (default-to-refuted) and fix only
confirmed ones. This session's 6-lens → verify pattern is a working template; for smaller changes a
single-pass self-review checklist suffices. **This is the single most important change** — it moves
defect discovery from "round N+1" to "before submission."
*Make it concrete:* a reusable "review my own diff" routine (the multi-agent workflow, or a
checklist for small diffs) that the implementer must run and whose output is attached to the PR.

### R-2. Scope the whole problem first: a threat-model / acceptance matrix up front *(F-1, F-7)*
For any hardening/security/reliability task, **before writing code**, enumerate the defect classes
and a complete, testable acceptance matrix. Treat the job as "close all classes," not "fix the
reported item." The doctrine should be an *input*, written first — not a retroactive artifact.
*Trigger:* the moment a task is recognized as "hardening a fragile surface," produce the matrix.

### R-3. An explicit environment matrix + a portability lens *(F-3, F-5)*
Maintain a short, living list of every place the code runs — here: **macOS dev host**, **Linux
VPS**, **Debian (`node:24-slim`) container** — with their tool/version differences (no `flock` on
macOS; `shasum` vs `sha256sum`; BSD vs GNU `find`/`awk`; `awk -v` newline limits). Every command in
a deploy/CI script must be checked against **all** of them. Add a "portability" lens to the
self-review.
*Rule of thumb:* before adopting any reviewer prescription that names a tool (`flock`, `sha256sum`,
a GNU flag), verify the tool exists and behaves identically on every target.

### R-4. Evaluate the reviewer's *fix* separately from the reviewer's *finding* *(F-3, F-8)*
`CLAUDE.md` already says reviewer notes are fallible inputs. Extend it explicitly: a finding can be
**correct** while its **recommended fix is wrong, environment-blind, or out of scope**. Always split:
"Is the problem real?" (verify against code) **and** "Is the proposed remedy correct *here*?"
(verify against environment + contracts + scope). Apply neither blindly.

### R-5. "Prove, don't hand-wave" — behavioral tests for any runtime claim *(F-5)*
No assertion about shell/parser/concurrency behavior ships unbacked by an extracted-and-executed
test. Bash especially: `set -e` interactions, quoting/word-splitting, `awk` portability,
command-substitution exit codes, EXIT-trap cleanup ordering. If you can't test it, you don't know it.

### R-6. Couple docs to code; keep the contract accurate *(F-6, F-8)*
- A **doc/code-coupling test** that fails if the validation surface changes without the scope doc
  being touched.
- A **scope-boundary artifact** the reviewer reads: "guaranteed now vs deferred to <owner>," with
  **resolvable quoted citations** (never a fabricated numeric "#N").
- Treat doc drift as a P1 defect: a doctrine that lists done work as "open," or prescribes a tool the
  code no longer uses, will manufacture the next round.

### R-7. Anchor everything by stable string, never line number *(F-6)*
Reviews cite unique grep strings or symbol names; tests locate targets with `firstIndex(/regex/)`.
Already adopted here — make it a standing rule for the repo, both for review citations and tests.

### R-8. Regression-pin every fixed defect *(F-1, F-2)*
Every closed finding gets a guard test that fails if the class reopens. Prefer a test that locks the
*class* (e.g., "no recovery action is silenced") over one that locks the single instance.

### R-9. Build in a "stop the bounce" escalation *(F-1, F-9)*
After **2–3 rounds on the same file/surface**, automatically switch modes: stop fixing the cited
line, write/refresh the threat-model matrix, and do a full-class sweep + self-review in one
submission. Don't wait for a human to notice the loop and force the reset — the process should detect
"N rounds, same surface" and escalate itself.

### R-10. Pair every self-review finder with a verifier *(F-10)*
Self-review must not become a new noise source. Always run a *refute-by-default* verification stage
and act only on confirmed findings; log what was raised-but-refuted so the signal/noise ratio is
visible.

---

## 6. Case studies — the four near-misses this round (why self-review matters)

These were all in **my own first cut** of the "final" sweep, found by the pre-submission adversarial
review, fixed before any human saw them. They are concrete proof that R-1 + R-3 + R-5 pay for
themselves.

1. **Fail-open on `docker run` failure (Class B, high).** The image scans used
   `docker run … || true`. A *docker* failure (daemon down, image missing, OOM) yielded empty output
   → the gate reported "passed." A security gate that fails *open* when its oracle is unavailable is
   worse than no gate. *Fix:* each scan is now fatal-on-docker-failure (fail closed). *Lesson:* `||
   true` on an oracle is almost always wrong (F-4, the fail-closed principle).

2. **`awk -v` newline crash (Class B, high).** The content scan passed the local secret hashes via
   `awk -v H="$multiline"`. macOS `awk` **rejects** embedded newlines in `-v` values — so the scan
   *crashed whenever ≥2 local secret files existed*, which is the normal case. Invisible to
   inspection; fatal at runtime. *Fix:* two-file `awk` (`FNR==NR`). *Lesson:* F-3 (environment) +
   F-5 (prove it).

3. **Stale-lock on record-write failure (Class D, high).** An unguarded write in the
   `finalize_deploy` EXIT trap could abort under `set -e` *before* the lock release — leaving a stale
   `mkdir` lock that blocks **every** future deploy. *Fix:* guarded writes; the lock release always
   runs. *Lesson:* F-5 (`set -e` + trap semantics) + regression-pinned (R-8).

4. **The `flock`/macOS and `*.pem` false-positive near-misses (Class D/B).** Covered in F-3 — the
   doctrine's literal prescription would have broken every local deploy and failed every image scan.
   Caught by manual environment reasoning *before* coding; now also corrected in the doctrine itself.

If the only adversary had been the external reviewer, these are **four more rounds** — two of them on
defects that break production, not merely fail a lint.

---

## 7. A proposed playbook for "harden a fragile surface" tasks

Synthesizing the above into a repeatable sequence:

1. **Recognize the task type.** "Harden / make robust / fix repeatedly-flagged X" → use this playbook.
2. **Write the threat-model + acceptance matrix first** (R-2). Enumerate classes; define testable
   "done" per class. This is the contract.
3. **Record the environment matrix** (R-3). Every target, every tool-version difference.
4. **Implement by changing the oracle, not the input** (validate the real artifact). Close the whole
   class, not the one instance.
5. **Prove every runtime claim with a behavioral test** (R-5); regression-pin every fix (R-8).
6. **Run the pre-submission adversarial self-review** over the whole diff, with a verification stage
   (R-1, R-10). Fix confirmed findings; document refuted ones.
7. **Make the scope boundary reviewer-visible** with quoted citations (R-6, R-8); anchor by string
   (R-7).
8. **Submit once, closing all classes + sweeping the rest.** If a real new class appears, return to
   step 2 — but a true new class, not the next instance of an old one.
9. **Escalate if bouncing** (R-9): 2–3 rounds on the same surface → stop, re-derive the matrix, sweep.

---

## 8. Metrics worth watching

- **Rounds-per-surface.** >2 rounds on the same file ⇒ trigger R-9.
- **Regression rate.** Findings that are *regressions from a prior fix* (F-2). Target zero; each one
  is a self-inflicted round.
- **Self-review catch rate.** Defects caught pre-submission vs. in review. Higher is better; it's the
  direct measure of R-1's value.
- **Doc-drift incidents.** Times the doc described code/environment incorrectly (F-6). Target zero.
- **Human interventions to unjam the loop** (F-9). The process should need none.

---

## 9. One-paragraph takeaway

The bounce was an emergent property of a process that fixed symptoms one at a time on a multi-class
surface, let local fixes break adjacent contracts, absorbed environment-blind prescriptions without
re-checking the environment, and had no mandatory self-adversary before review. The cure is to
**front-load the threat model**, **change the oracle not the input**, **check every command against a
written environment matrix**, **prove runtime behavior with tests**, **couple docs to code**, and —
above all — **be your own adversary before you ask someone else to be.** The single session where we
actually did this caught four production-affecting bugs that the previous fifteen rounds' worth of
process would have leaked into yet more rounds.
