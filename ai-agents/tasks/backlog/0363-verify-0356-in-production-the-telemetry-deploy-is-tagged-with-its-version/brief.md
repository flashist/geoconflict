# Verify 0356 in production — the telemetry deploy is tagged with its version name, everywhere it should be

## ID
0363

## Sprint
Sprint 8

## Priority
2

> 📌 **2026-10-02 — was 1, now 2.** Moved down one by the placement of verify task `0370` (for `0367`) at the top of
> Sprint 8, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling, relayed by `fkit-lead` to a
> spawned `fkit-producer` (ADR-021/037; ⛔ not producer precedent). Not a merit judgement; nothing else about this task
> changed. The note(s) below are kept as written (ADR-035).

> **Rank 1 is placement on the owner's standing build/verify-split rule (2026-09-29)**: a verify task that needs a
> deploy plus an owner check goes *"on top of the next sprint"* and must not block the current sprint's deploy.
> Applied to `0356` on 2026-10-01 by the lead's close instruction (relayed by `fkit-lead`, driving
> `/fkit-sprint-ship-loop`), the same way it was applied to `0358`. It was appended at rank 4 (ADR-035: append, never
> insert) and then moved to the top within the [Sprint 8 board](../../../sprints/plan-sprint-8.md)'s contiguous run of
> open rows; no closed row exists on that board, so none was renumbered. `0358` moved 1 → 2, `0351` 2 → 3 and `0343`
> 3 → 4. See the board's 2026-10-01 `0363` addendum. ⛔ Not producer precedent for re-ranking. ⚠️ Rank 1 vs `0358`
> (rank 2) is **not a merit call** — both are short, independent owner checks on different boxes (telemetry vs
> profile) and do not compete.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** An owner-run check right after the weekend telemetry deploy.
The deploy itself is the owner's; the checks after it are read-only.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0358`](../0358-verify-0355-in-production-the-profile-deploy-is-tagged-with-its-version/brief.md) and
[`0351`](../0351-verify-0035-on-the-dev-box-a-public-match-starts-and-each-map-file-downloads-once/brief.md).)*

## Context

**Filed 2026-10-01 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the owner's standing
build/verify-split rule (2026-09-29), applied at `0356`'s close by `fkit-lead` (driving `/fkit-sprint-ship-loop`).**
⛔ Not producer precedent. The **build** task closes on local proof; the **verify** task goes at the top of the next
sprint and **must not block** the current sprint's deploy. The requirement is `0356`'s own brief, verification step 5.

**What this verifies.** [`0356`](../../done/0356-tag-telemetry-server-deploys-with-a-version-like-the-game/brief.md)
(the **build** task, closed 2026-10-01 `(agent-closed — not owner-verified)`) gives every telemetry-server deploy a
version name, using the scheme ruled for the profile server in
[`0355`](../../done/0355-tag-profile-server-deploys-with-a-version-like-the-game/brief.md) and recorded in ADR-117:
**`<base>-telemetry.<N>`**, where `<base>` is `package.json`'s version with any `-dev.N` / `-staging.N` part removed,
and `<N>` is a counter per base — e.g. `0.0.155-telemetry.1`.

The telemetry box runs **only third-party images** (pinned versions, not changed by `0356`), so the name means
**"which commit of our telemetry setup scripts is live"**. It goes to **three places** (no registry, no image of ours):

- an **annotated git tag** `<name>` on the commit that was deployed, created and pushed **only after the remote setup
  succeeded** (a git tag means "deployed OK"). The tag step is **warn-only**: if it fails, the deploy still reports
  success and prints the exact `git push origin refs/tags/<name>` (or tells you never to force an existing tag);
- a **marker file on the box**, `/opt/uptrace/deployed-version` — exactly two lines, `version=…` and `commit=…`,
  written at the very end of a successful setup (a setup that dies midway leaves the **previous** marker, which is the
  truth);
- the **local deploy record** on the operator's machine (by default `~/.geoconflict/telemetry-deploy.log`), one block
  per attempt that reached the box, ending `validation_result=<ok|failed> git_tag=<outcome>`.

**Uptrace's own UI does not show this version** — Uptrace is a third-party image and is not rebuilt.

`0356` was proven **locally only**: the deploy-script harness (`ALL PASS`, 740 checks, stubbed git/ssh/scp/docker)
and the full `npm test` (186/186 suites). **No real telemetry deploy, no real git tag and no real marker on the box
has ever happened.** Only this check proves the real effect.

### Preconditions — this task cannot start until all of these hold

1. ⚠️ **`0356` is committed.** Until it is, the real `build-deploy-telemetry.sh` **refuses to run** — that is the
   owner-ruled refuse-on-uncommitted rule (owner ruling Q1 at `0356`'s plan gate, 2026-10-01) working. It checks the
   three files the telemetry deploy ships: `setup-telemetry.sh`, `build-deploy-telemetry.sh` and
   `scripts/deploy-version-tag.sh`. (Narrower than the profile deploy's check: uncommitted work under `src/` does
   **not** block a telemetry deploy.) The deploy also needs `git` and `node` on the operator's machine — it refuses
   without them.
2. The telemetry deploy has run in the **weekend slot**, per the
   [weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md).

⚠️ **A telemetry deploy restarts the Uptrace stack.** That is not new with `0356` — every telemetry deploy does it —
but pick a moment that does not cut into another task's live Uptrace measurement in the same slot.

⚠️ **This task does NOT block Sprint 7's deploy.** It runs *after* the deploy, by definition; nothing in Sprint 7 waits
on it.

## What to build

Nothing is built. The deploy is the owner's; everything after it is a **read-only** check.

**Step 1 — the deploy printed a name and succeeded.** From the `build-deploy-telemetry.sh` output of the weekend
deploy, record:
- the name it chose (the `Deployed version: <name> (git tag: <result>)` line at the end) — expected form
  `<base>-telemetry.<N>`, e.g. `0.0.155-telemetry.1`. ⚠️ The base is whatever `package.json` says at the deployed
  commit: if a game deploy bumps the version first in the same slot, the base will be the new number. That is correct,
  not a failure. A gap in `<N>` is also normal (a failed attempt that reached the box uses up its number; it is never
  reused).
- that the deploy succeeded, and what the `git tag:` result said (`pushed`, `push-failed` or `tag-failed`).

**Step 2 — the git tag exists on the remote at the deployed commit.** The **annotated** git tag `<that name>` exists
**on origin**, and it points at the commit the deploy captured. Read-only look-up; an agent session with repository
access may run it for the owner (standing rule: read-only checks are run, not handed over).

**Step 3 — the box marker and the local record agree.**
- On the box: `/opt/uptrace/deployed-version` reads exactly two lines, `version=<that name>` and `commit=<that commit>`
  — not `unknown` in either.
- In the local deploy record: the newest block shows the same `version=` and `commit=`, and ends
  `validation_result=ok git_tag=pushed` (or `git_tag=push-failed` / `tag-failed` if Step 1 said so).
- The marker, the record and the git tag all name the **same version and the same commit**. Reading the marker over
  SSH is read-only; an agent session with access may run it for the owner.

**Step 4 — Uptrace still answers (no regression).** The Uptrace UI loads and shows fresh data from after the deploy
(e.g. recent spans or metrics from the game server). A blank or erroring UI = fail.

## Verification steps

1. Step 1 recorded: the name, the date of the deploy, success yes/no, and the `git tag:` result.
2. Step 2 recorded: annotated git tag on origin yes/no; points at the deployed commit yes/no (short commit is fine).
3. Step 3 recorded: box marker `version=` / `commit=` match the Step 1 name and the tag's commit yes/no; local record
   newest block matches yes/no, and its `validation_result=` / `git_tag=` values.
4. Step 4 recorded: Uptrace UI loads with post-deploy data yes/no.
5. **If the git tag is missing but everything else passed:** run the printed `git push origin refs/tags/<name>` line
   (or create the annotated tag on the deployed commit by hand if it was never created — a git command, **never a
   redeploy**), re-check Step 2, and record that it was needed. A tag that already exists is **never forced**. This is
   the known, accepted "network needed" limit (ADR-117 Limit 3), not a defect.
6. **If any other check fails** (no name printed, marker missing or `unknown`, marker/record/tag naming different
   versions or commits, a name reused for a different commit, Uptrace not answering): file a **new defect** task with
   the readings — **do not reopen `0356` silently.** This task then closes with its result recorded as a failed
   verification, pointing at that defect.
7. No host, IP address, full URL, token or credential appears anywhere in the worklog — version names, commit hashes,
   file names and yes/no only.

## Notes

- **Depends on:** `0356` (build, closed 2026-10-01) — committed, then deployed in the weekend slot.
- **Blocks:** nothing. ⚠️ In particular it does **not** block Sprint 7's deploy.
- **Related:** [`0358`](../0358-verify-0355-in-production-the-profile-deploy-is-tagged-with-its-version/brief.md) (the
  same check for the profile server; independent — the two can run in the same slot in either order).
  [`0357`](../0357-game-server-telemetry-reports-its-real-version-not-a-fake-1-0-0/brief.md) (the game server's own
  fake `1.0.0` in telemetry) is separate — a `1.0.0` seen in Uptrace is not a failure of this task.
- **Known limits accepted by the owner at `0356` (not failures of this task):** the uncommitted-files check runs once
  and an edit after it ships unseen (`0355` R3); an unreachable remote only warns and numbering falls back to local
  tags + the record (ADR-117 Limit 3); numbers need not strictly increase (ADR-117 Limit 4); **no deploy lock** — two
  telemetry deploys at once could pick the same `<N>`, the second tag fails with a warning, and the box marker could
  name either; **no commit-exact upload**; the dirty check's own code lives in a file it checks (`0356` R2). The tag
  pins our scripts, **not** the operator's local telemetry settings values — two deploys of one version can apply
  different settings.
- **Privacy:** version names, commit hashes and yes/no only. Never paste a host, IP, full URL, token or credential into
  any artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask. (Pushing the version git tag is
  part of the owner's own deploy run, not an agent action.)
