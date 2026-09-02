# The deploy harness prints ✅ for assertions an early abort satisfies vacuously — close the false-green class

## ID
0202

## Sprint
Backlog

## Priority
**Low**

✅ **`Low` is an OWNER RULING of 2026-09-01 — no longer the producer's default.** Ruled that day via
`AskUserQuestion` in the `fkit lead` session and relayed through `fkit-sprint-ship-loop`. This brief was
*filed* as `Unscheduled` carrying an internal producer rank of "Low–Medium"; **that producer default is
superseded**, and the merit reasoning below is kept only as the pre-ruling record, not as the current
rank.

✅ **The Backlog board placement STANDS — owner-confirmed the same day** (same ruling, for both `0201`
and `0202`). That one **confirms** the producer's default rather than changing it.

**Neither the priority nor the board is an open question any longer.** The owner authorized filing this
brief on the same date.

🚨 **READ THE EVIDENCE SECTION BEFORE RANKING THIS.** The producer verified the filing claim against a
clean worktree and it **did not fully hold**. The defect is real but **smaller and differently shaped**
than the claim it was filed on. The owner may reasonably rank this Low, or cancel it. That judgement
needs the corrected facts, which are in *Context* — **not** the original framing.

**Pre-ruling record (superseded on priority by the owner's `Low` of 2026-09-01; the board choice it
states was confirmed): on merit the producer ranked this Low–Medium and filed it on the Backlog
board**, for two reasons:

1. **The weakness is latent, not realized.** No test in the harness is currently *fully* false-green
   (proven below). What exists is a hazard for the next test written, plus a misreading risk in the
   output of a failing run.
2. **A Sprint 4 row could only be appended at the bottom of that board**, reading as *lowest rank in the
   sprint* — a false signal. fkit's **ADR-035** (*a mid-board insertion is not the owner-ruled re-rank
   exception*) bars inserting above that board's closed rows, and a spawned producer has no owner channel
   to be granted a re-rank. The unranked Backlog board is the honest placement.

📎 **ADR-035 is cited by name, never linked, on purpose.** It is one of **fkit's own upstream ADRs**
(the `adr-0XX` series, in the fkit install share). This project's `ai-agents/knowledge-base/decisions/`
holds only the `adr-1XX` series, so a relative link into it would not resolve.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### What this task was filed as, and what is actually true

**Filed claim (2026-09-01):** *"Four tests passed while proving nothing — T3, T6, T7 and T9 still printed
✅. They assert only `rc != 0`."*

**Verified by the producer the same day**, by checking out `f2b9422` into a clean detached worktree with
no working-tree edits present and running
`bash tests/scripts/profile-deploy-hardening.test.sh` with the harness in its broken state. Two parts of
that claim are wrong, and the correction changes what should be built.

#### ❌ Correction 1 — those four tests do NOT assert only `rc != 0`

Every one of T3, T6, T7 and T9 **already carries a distinguishing-message assertion**, and **that
assertion is exactly what turned each block red**:

| Test | Its distinguishing assertion | Result in the broken run |
|---|---|---|
| T3 | `grep -q 'already running'` | ❌ *no lock-held message* |
| T6 | `grep -q "provisioned as role 'telemetry'"` | ❌ *no wrong-role message* |
| T7 | `grep -q 'PROFILE_DEPLOY_ALLOW_UNVERIFIED'` | ❌ *no override hint* |
| T9 | `grep -q 'unreachable or key rejected'` | ❌ *no unreachable message* |

➡️ **The fix direction the filing proposed — "assert on a distinguishing message rather than a bare
non-zero" — is already implemented in all four tests, and it worked.** Do not re-implement it. Do not
"add" assertions that are already there.

#### ❌ Correction 2 — no test block printed all-✅, and the class is broader than four tests

**No block was fully false-green.** Every `run_deploy`-based block contained at least one ❌, and the
harness exited `1` with `SOME FAILED`. What *did* print ✅ were **13 individual assertion lines across
seven tests** — including **T1, T2 and T5, which the filing did not name**.

#### ✅ What IS true — the real defect class

**Absence and negative assertions are unconditioned.** An abort *anywhere* earlier in the script — for a
reason entirely unrelated to the behaviour under test — satisfies them. Verbatim from the 2026-09-01
broken run, every ✅ below is vacuous:

| Test | Vacuously-green assertion | Why it is vacuous |
|---|---|---|
| T1 | `password never appears in docker/ssh/scp/sshpass argv` | No `.argv` file was ever written |
| T1 | `sshpass never used the vulnerable -p form` | `sshpass` was never invoked |
| T2 | `deploy failed closed (rc=1)` | It failed at a precondition, not at the injected fault |
| T3 | `second deploy failed closed (rc=1)` | Same — never reached the mutex |
| T3 | `no record byte written (0==0)` | The record file was never created at all |
| T3 | `no SCP under held lock` | No SCP ever ran, lock or no lock |
| T5 | `lock released despite append failure` | The lock directory was never created |
| T6 | `wrong-role deploy aborted (rc=1)` | Never reached the role check |
| T6 | `aborted before any SCP / secret-staging` | No SCP ever ran |
| T7 | `unverified deploy aborted (rc=1)` | Never reached the preflight |
| T7 | `no SCP when target unverifiable` | No SCP ever ran |
| T9 | `unreachable deploy aborted (rc=1)` | Never reached the reachability probe |
| T9 | `no SCP when unreachable` | No SCP ever ran |

**The shape:** `rc != 0`, `[ ! -f "$WORK/scp.called" ]`, `before = after` on a byte count, and
`[ ! -d "$WORK/lock.d" ]` are all **assertions that something did NOT happen** — and *nothing happened at
all*, so they all held.

For contrast, the five **Structural** checks at the end of the harness printed ✅ **legitimately**: they
`grep` and `awk` repository files directly and never call `run_deploy`, so the fixture defect could not
reach them. They are not part of this task.

### Why this is still worth doing — and the honest limit on that argument

**The argument for:** an absence assertion that cannot distinguish *"the guard worked"* from *"nothing
ran"* is not testing the guard. The next test written in this harness with only absence-shaped
assertions would be **fully** false-green, and would report ✅ forever while proving nothing. Thirteen
green lines inside a failing run is also a real misreading hazard for whoever reads that output next.

⚠️ **The honest limit, stated so nobody oversells this task:** the harness **did** go red, it **did**
exit non-zero, and the distinguishing greps **did** catch the breakage. **The false-greens did not hide
this defect from anyone who ran the harness. What hid it was that nobody ran it** — which is task `0201`,
not this one. **The stronger of the two sibling tasks is `0201`.**

📌 **The `0196` parallel, weighed rather than asserted.** This brief was filed with the argument that
*"a test that passes for the wrong reason is worse than no test — the same fabricated-confidence shape
`0196` removed, where `none recorded` was read as `ready`."* The direction of that parallel holds: both
are a green signal standing in for an unmade check. **But the two are not equal in severity.** `0196`'s
defect was **realized** — the board actively read as ready. This one is **latent**: the overall verdict
was correct, and only sub-lines lied. Record the parallel; do not inflate it.

## What to build

### Phase 1 — confirm the current state before changing anything

1. **Reproduce the vacuous-green list yourself**, at the same commit and in the same way (clean detached
   worktree, harness in its broken state — e.g. temporarily remove the `profile-backup.sh` fixture line
   from `run_deploy`). **Do not take the table above on trust; it is a producer's reading and it exists to
   be re-checked.** Report any line where you disagree.
2. **Enumerate every absence/negative assertion in the harness** — including any added by `0195` (test
   `T10`, whose `payments secret never appears in argv` check is the same shape) — and classify each as
   *already guarded* or *vacuous under an early abort*. **A complete list is the deliverable of this
   phase.**
3. **Report honestly if a given assertion turns out to be fine.** A ruled-out line is a finding.

### Phase 2 — close the class at its root, not assertion by assertion

4. **Prefer one shared guard over thirteen local patches.** The root cause is that `run_deploy` can
   return "failed" for a reason no test intended, and every downstream absence assertion then reads that
   as success. The candidate shape — **a candidate, not a decision** — is for `run_deploy` to assert that
   the run actually reached the logic under test (for example, that the deploy got past its precondition
   block, checked via a stage marker in `out.log`), and to **fail loudly and identifiably** when it did
   not. Bring the chosen shape to the plan gate.
5. **Make a harness-level precondition failure unmistakable in the output.** Whatever the mechanism, a
   reader must be able to tell *"the deploy never started"* from *"the guard under test worked"* without
   reading the script.
6. ⚠️ **Do not weaken or delete an existing assertion to make this tidy.** The distinguishing greps in
   T3/T6/T7/T9 are the ones that caught the real defect. **A harness "fixed" by removing the assertions
   that work is a deleted test, not a repaired one.**
7. ⚠️ **Do not extend this into a rewrite of the harness.** The scope is the false-green class. New
   coverage, restructuring, or test-apparatus sprawl is out — the profile-deploy postmortem's RC6
   explicitly warns against apparatus sprawl here.

## Verification steps

1. **The Phase 1 enumeration exists**, covers every absence/negative assertion including `0195`'s `T10`,
   and states for each whether it was vacuous. Disagreements with the table in *Context* are reported,
   not silently resolved.
2. **The regression test for the fix is the original defect.** With the `profile-backup.sh` fixture line
   removed from `run_deploy`, **no assertion line prints a vacuous ✅** — the run must be legible as *"the
   deploy never started"*. Paste the before/after output. ⚠️ **This is the only verification that proves
   the class is closed;** a code diff alone does not.
3. **With the fixture present, the harness is fully green again** — `ALL PASS`, exit `0`, with the same
   assertions passing that pass today. **Show both runs.**
4. **No existing assertion was removed or weakened.** `git diff` reviewed specifically for this, and any
   assertion that changed is called out individually with its reason.
5. **`npm test` still passes with unchanged suite/test counts** — this task touches no TypeScript, so any
   change there is unexpected and must be explained.
6. The harness still needs **no Docker daemon, no network and no VPS** (it stubs `docker`, `git`, `ssh`,
   `scp`, `sshpass` and `getent` on `PATH`). If the fix introduces any external dependency, that is a
   regression to surface, not to absorb.
7. 🔒 **No credential values anywhere** — the harness deliberately handles synthetic secret strings; keep
   every real value out of the diff, the worklog and any pasted output. Name variables and filenames only.

## Notes

- **Depends on:** `0195` landing on `dev` first — it was in review on 2026-09-01 and modifies this exact
  harness file (it adds test `T10`, whose argv-absence assertion is in this task's scope, and the
  `run_deploy` fixture repair this task's verification depends on being present), so starting before
  `0195` lands would both conflict in `tests/scripts/profile-deploy-hardening.test.sh` and enumerate an
  incomplete assertion set; nothing else gates it.
- **Blocks:** nothing formally. There is a **sequencing preference** — doing this before `0201` means any
  gate `0201` installs is gating a harness whose assertions mean what they say — but neither task
  technically blocks the other and either may ship first.
- **Related:** `0201` (the sibling brief — *nothing runs these harnesses*; **it is the stronger of the
  two**, and the one that actually explains why this rot went unseen), `0195` (its build found the
  breakage while doing unrelated work; the one-line fixture repair ships **there**, not here, owner-ruled
  2026-09-01), and `0196` (the fabricated-confidence parallel — weighed in *Context*, and **weaker than
  the filing claimed**; that folder is finished output — **reference it, do not edit it**).
- ⚠️ **This task must not repair the fixture.** That one-line repair belongs to `0195` by owner ruling.
  If it has not landed when this task opens, that is the dependency above — wait, do not duplicate it.
- ✅ **RULED 2026-09-01 — keep at `Low`; the task STANDS and was NOT cancelled.** Owner ruling via
  `AskUserQuestion` in the `fkit lead` session, relayed through `fkit-sprint-ship-loop`. **No open
  questions remain on this brief.**
  - 🔎 **The question as it was put (pre-ruling record — kept, not deleted):** *is this worth doing at
    all?* Given the corrected evidence (the harness went red, exited non-zero, and the defect was caught
    by assertions that already exist), a defensible ruling was **"Low, or cancel — `0201` is the real
    fix"**. The producer filed it because a latent false-green class in a credential-carrying deploy
    guard is cheap to close and expensive to discover later, but **did not claim the owner must agree.**
  - **Outcome — the `Low` half of that choice.** Cancel was on the table and was not taken. The
    counter-argument stays on the record as *why the rank is `Low` rather than higher*, not as a reason
    to drop the task: this is test infrastructure with no user-visible benefit, and the defect is latent
    rather than realized. Priority is unchanged — see the ruling recorded under `## Priority`.
- 📌 **SEQUENCING RULED 2026-09-02, owner ruling given live in session: `0201` GOES FIRST, this task
  second — and this task stays `Low`.** Both briefs record a **preference** for `0202` first (the
  *Blocks* bullet above states it: a gate `0201` installs is worth more over assertions that mean what
  they say). **The owner ruled against that preference**, and the `Low` rank of 2026-09-01 stands and
  was **not re-litigated**. The preference bullet is left above unedited as the pre-ruling record;
  **this ruling supersedes it.** ✋ **Recorded specifically so the point is not raised a third time** —
  the ordering question is closed, not open.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **No secrets in any artifact.** Variable names, container names and ports only — never a value.
