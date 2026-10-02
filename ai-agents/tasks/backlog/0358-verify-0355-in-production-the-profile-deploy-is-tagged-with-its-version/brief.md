# Verify 0355 in production — the profile deploy is tagged with its version name, everywhere it should be

## ID
0358

## Sprint
Sprint 8

## Priority
3

> 📌 **2026-10-02 — was 2, now 3.** Moved down one by the placement of verify task `0370` (for `0367`) at the top of
> Sprint 8, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling, relayed by `fkit-lead` to a
> spawned `fkit-producer` (ADR-021/037; ⛔ not producer precedent). Not a merit judgement; nothing else about this task
> changed. The note(s) below are kept as written (ADR-035).

> 📌 **2026-10-01 — was 1, now 2.** Moved down one by the placement of verify task `0363` (for `0356`) at the top of
> Sprint 8, on the owner's standing build/verify-split rule, relayed by `fkit-lead` to a spawned `fkit-producer`
> (ADR-021/037; ⛔ not producer precedent). Not a merit judgement — `0363` and this task are independent owner checks on different boxes; nothing else about this task changed. The
> note(s) below are kept as written (ADR-035).

> **Rank 1 is OWNER-RULED placement** — the owner's standing build/verify-split rule (2026-09-29): a verify task that
> needs a deploy plus an owner check goes *"on top of the next sprint"* and must not block the current sprint's
> deploy. Applied to `0355` on 2026-09-30 by the lead's close instruction (relayed by `fkit-lead`, driving
> `/fkit-sprint-ship-loop`). It was appended at rank 3 (ADR-035: append, never insert) and then moved to the top within
> the [Sprint 8 board](../../../sprints/plan-sprint-8.md)'s contiguous run of open rows; no closed row exists on that
> board, so none was renumbered. `0351` moved 1 → 2 and `0343` moved 2 → 3. See the board's 2026-09-30 `0358` addendum.
> ⛔ Not producer precedent for re-ranking. ⚠️ Rank 1 vs `0351` (rank 2) is **not a merit call** — the two are short,
> independent owner checks on different boxes and do not compete.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** An owner-run check right after the weekend profile deploy. The
deploy itself is the owner's; the checks after it are read-only.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0337`](../0337-verify-0331-in-production-the-sdk-query-parameter-survives-a-match-exit/brief.md) and
[`0351`](../0351-verify-0035-on-the-dev-box-a-public-match-starts-and-each-map-file-downloads-once/brief.md).)*

## Context

**Filed 2026-09-30 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the owner's standing
build/verify-split rule (2026-09-29), applied at `0355`'s close by `fkit-lead` (driving `/fkit-sprint-ship-loop`).**
⛔ Not producer precedent. The **build** task closes on local proof; the **verify** task goes at the top of the next
sprint and **must not block** the current sprint's deploy.

**What this verifies.** [`0355`](../../done/0355-tag-profile-server-deploys-with-a-version-like-the-game/brief.md)
(the **build** task, closed 2026-09-30 `(agent-closed — not owner-verified)`) gives every profile-server deploy a
version name, the way the game server already has one. Owner-ruled shape: **`<base>-profile.<N>`**, where `<base>` is
`package.json`'s version with any `-dev.N` / `-staging.N` part removed, and `<N>` is a counter per base — e.g.
`0.0.155-profile.3`. The name goes to four places:

- the **registry**: the image is pushed under `:<name>` **before** the deploy, after checking the name is free —
  a name is never overwritten (a name in the registry means "built and pushed as attempt N");
- **inside the image**: the running server reports it on `/health` and as telemetry `service.version`;
- an **annotated git tag** `<name>`, created and pushed **only after a successful deploy** (a git tag means
  "deployed OK");
- the local **deploy record** on the operator's machine.

The deploy still goes by `@sha256` digest; the name is a label, not the trust anchor.

0355 was proven **locally only**: the deploy-script harness (615 checks, a fake registry, stubbed git) and a local
image run where `/health` answered `{"status":"ok","version":"0.0.155-profile.99","commit":"0355localcheck"}`. **No
real registry name, no real git tag, and no real deploy has ever happened.** Only this check proves the real effect.

### Preconditions — this task cannot start until all of these hold

1. ⚠️ **`0355` is committed.** Until it is, the real `build-deploy-profile.sh` **refuses to run** — that is the
   owner-ruled refuse-on-uncommitted rule working. It checks every file the profile image ships: `package.json`,
   `package-lock.json`, `tsconfig.json`, **all of `src/`**, `migrations/`, `Dockerfile.profile`, the profile setup,
   backup and check scripts, `build-deploy-profile.sh` and `scripts/deploy-version-tag.sh`. So **any** uncommitted
   change under `src/` — game-server work included — also blocks the deploy.
2. The profile deploy has run in the **weekend slot** (next: 2026-10-03/04), per the
   [weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md).

### 🚨 Ordering — read before the deploy, not after

- **The first tagged profile deploy must be the same weekend-slot deploy that first ships `0309`'s log line**
  ([`0309`](../../done/0309-record-which-yandex-hmac-construction-matches-real-purchases/brief.md)).
- **No second profile deploy before [`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) §1 has
  read that line.** Container logs are lost when the container is recreated, and every profile deploy recreates it.
- **A tagging fault is fixed with a git command, never with a redeploy.** If the git tag step fails or warns, the
  deploy prints the exact `git tag -a … && git push origin refs/tags/…` line to run by hand. Redeploying to "fix" a
  tag would burn a new version name **and** recreate the container — losing `0309`'s log line.

⚠️ **This task does NOT block Sprint 7's deploy.** It runs *after* the deploy, by definition; nothing in Sprint 7
waits on it.

## What to build

Nothing is built. The deploy is the owner's; everything after it is a **read-only** check.

**Step 1 — the deploy printed a name and succeeded.** From the `build-deploy-profile.sh` output of the weekend
deploy, record:
- the name it chose (the `Deployed version: <name> (git tag: <result>)` line at the end) — expected form
  `<base>-profile.<N>`, e.g. `0.0.155-profile.1`. ⚠️ The base is whatever `package.json` says at deploy time: if a
  game deploy bumps the version first in the same slot, the base will be the new number, not `0.0.155`. That is
  correct, not a failure.
- that the deploy succeeded, and what the `git tag:` result said.

**Step 2 — `/health` reports the name.** Request the profile server's `/health`. **Expected:**
`{"status":"ok","version":"<that name>","commit":"<a commit hash>"}`, with `version` exactly the Step 1 name and
`commit` the deployed commit. `version: "unknown"` = fail.

**Step 3 — the git tag and the registry name exist.**
- The **annotated** git tag `<that name>` exists **on origin**, and it points at the deployed commit (the same commit
  `/health` reports).
- The registry holds `:<that name>`, and it resolves to the digest the deploy used (the deploy record carries the
  digest).
- These are read-only look-ups; an agent session with repository and registry access may run them for the owner
  (standing rule: read-only checks are run, not handed over).

**Step 4 — telemetry, only if observable.** In Uptrace, the profile server's metrics carry `service.version` =
`<that name>` — not `1.0.0`, not `unknown`. If the profile server's telemetry is not reachable or not visible, mark
this step **"not observable"** — that is not a failure.

## Verification steps

1. Step 1 recorded: the name, the date of the deploy, success yes/no, and the `git tag:` result.
2. Step 2 recorded: `/health`'s `version` equals the Step 1 name; its `commit` recorded (short form is fine).
3. Step 3 recorded: annotated git tag on origin yes/no, and it points at the deployed commit yes/no; registry name
   present yes/no, and it matches the deployed digest yes/no.
4. Step 4 recorded, or explicitly marked "not observable".
5. **If the git tag is missing but everything else passed:** run the printed `git tag -a … && git push …` line
   (a git command — **never a redeploy**), re-check Step 3, and record that it was needed. This is the known,
   accepted "network needed" limit (Limit 3), not a defect.
6. **If any other check fails** (wrong or `unknown` version on `/health`, registry name missing or on a different
   digest, a name reused): file a **new defect** task with the readings — **do not reopen `0355` silently.** This
   task then closes with its result recorded as a failed verification, pointing at that defect.
7. The `0297` §1 ordering above was respected: no second profile deploy happened before `0309`'s log line was read.
8. No host, IP address, full URL, registry path, token or credential appears anywhere in the worklog — version
   names, commit hashes and yes/no only.

## Notes

- **Depends on:** `0355` (build, closed 2026-09-30) — committed, then deployed in the weekend slot.
- **Blocks:** nothing. ⚠️ In particular it does **not** block Sprint 7's deploy.
- **Related:** `0309` (its log line ships in the same deploy) and `0297` §1 (reads that line — see Ordering).
  [`0356`](../../done/0356-tag-telemetry-server-deploys-with-a-version-like-the-game/brief.md) (telemetry tagging) reuses
  0355's helper and will need its own verify. [`0357`](../0357-game-server-telemetry-reports-its-real-version-not-a-fake-1-0-0/brief.md)
  (the game server's own fake `1.0.0`) is separate — a `1.0.0` on **game-server** telemetry is not a failure of this
  task.
- **Known limits accepted by the owner at `0355` (not failures of this task):** the uncommitted-files check is not a
  proof that the image equals the commit (R3); two profile deploys at once can overwrite a registry label, silently in
  one order (Limit 1); a name pushed but never deployed is skipped, never reused, so a gap in `<N>` is normal
  (Limit 2); the git-tag step needs network and only warns (Limit 3).
- **Privacy:** version names, commit hashes and yes/no only. Never paste a host, IP, full URL, registry path, token or
  credential into any artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask. (Pushing the version git tag is
  part of the owner's own deploy run, not an agent action.)
