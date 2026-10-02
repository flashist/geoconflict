# Verify 0035 on the dev box — a public match starts, and each map file downloads once

## ID
0351

## Sprint
Sprint 8

## Priority
5

> 📌 **2026-10-02 (later) — was 4, now 5.** Moved down one by the OWNER-RULED move of `0373` (read the
> stale-login data, choose the fix) to rank 2, directly below `0370`, on the [Sprint 8 board](../../../sprints/plan-sprint-8.md).
> OWNER RULING given live via `AskUserQuestion`, verbatim *"Move to rank 2 (Recommended)"*, relayed by `fkit-lead` to a
> spawned `fkit-producer` (ADR-021/037; ⛔ not producer precedent). Not a merit judgement on this task; nothing else
> about it changed. The note(s) below are kept as written (ADR-035).

> 📌 **2026-10-02 — was 3, now 4.** Moved down one by the placement of verify task `0370` (for `0367`) at the top of
> Sprint 8, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling, relayed by `fkit-lead` to a
> spawned `fkit-producer` (ADR-021/037; ⛔ not producer precedent). Not a merit judgement; nothing else about this task
> changed. The note(s) below are kept as written (ADR-035).

> 📌 **2026-10-01 — was 2, now 3.** Moved down one by the placement of verify task `0363` (for `0356`) at the top of
> Sprint 8, on the owner's standing build/verify-split rule, relayed by `fkit-lead` to a spawned `fkit-producer`
> (ADR-021/037; ⛔ not producer precedent). Not a merit judgement; nothing else about this task changed. The
> note(s) below are kept as written (ADR-035).

> 📌 **2026-09-30 — was 1, now 2.** Moved down one by the placement of verify task `0358` (for `0355`) at the top of
> Sprint 8, on the owner's standing build/verify-split rule, relayed by `fkit-lead` to a spawned `fkit-producer`
> (ADR-021/037; ⛔ not producer precedent). Not a merit judgement — `0358` and this task are independent owner checks
> on different boxes; nothing else about this task changed. The note below is kept as written (ADR-035).

> **Rank 1 is OWNER-RULED placement** — the owner's standing rule (2026-09-29): a verify task that needs a deploy
> plus an owner check goes *"on top of the next sprint"* and must not block the current sprint's deploy; restated
> for this task on 2026-09-30 (*"File a verify task for Sprint 8"*). It was appended at rank 2 (ADR-035: append,
> never insert) and then moved to the top within the [Sprint 8 board](../../../sprints/plan-sprint-8.md)'s
> contiguous run of open rows by that ruling; no closed row exists on that board, so none was renumbered. See the
> board's 2026-09-30 addendum. ⛔ Not producer precedent for re-ranking.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human).** A live, read-only check in the owner's own browser against
the dev box. No agent can run it.

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0337`](../0337-verify-0331-in-production-the-sdk-query-parameter-survives-a-match-exit/brief.md).)*

## Context

**Filed 2026-09-30 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live
in the `fkit lead` session via `AskUserQuestion` on 2026-09-30, relayed by `fkit-lead`** (driving
`/fkit-sprint-ship-loop`). ⛔ Not producer precedent. The owner's answer: *"File a verify task for Sprint 8"*. It
applies the owner's standing build/verify-split rule (2026-09-29): the **build** task closes on local proof; the
**verify** task goes at the top of the next sprint and **must not block** the current sprint's deploy.

**What this verifies.** [`0035`](../../done/0035-worker-init-timeout-map-refetch/brief.md) (the **build** task,
closed 2026-09-30 `(agent-closed — not owner-verified)`) makes the page hand the game worker the map it already
downloaded, instead of the worker downloading the same map files a second time. The original symptom was on the
**dev box**: its certificate is not trusted, so the browser does not cache the map files, the worker's second
download was a full cold download, and the worker's start limit ran out — *"Не удалось запустить игру … Error:
Worker initialization timeout"*, and the match never started.

0035 was proven **locally only** — a simulated dev box (browser cache off, every map file held 17 s): preload took
51 s and the worker still started 0.13 s after preload finished; one request per map file per match start (0035
`worklog.md` § *Verify*). **Not proven:** the real dev-box network, a real Uptrace, and Compact-size nation
positions (unit tests and the reviewer's determinism check only). **Only this check on the real dev box proves the
real effect.**

**Precondition — this task cannot start until 0035's change is deployed to the dev box.** The owner deploys in the
regular weekend slot unless something is urgent
([weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md)). At filing, 0035's change
was **not committed and not deployed**. It ships together with `0347` and `0348` (same worker start path).

⚠️ **This task does NOT block Sprint 7's deploy.** It runs *after* the deploy, by definition; nothing in Sprint 7
waits on it.

## What to build

Nothing is built. This is an owner-run, **read-only** check on the dev box.

**Step 1 — precondition.** Confirm the build that contains 0035's change is live on the dev box (name the deploy
and date it).

**Step 2 — join a public match (owner, dev box, a normal browser window, DevTools open on the Network tab).**
- Load the start screen and let it settle. ⚠️ The page fetches every map's `manifest.json` at page load for the map
  list (twice, per 0035's verify) — that is **before** any match and is **not** what is counted here.
- **Clear the Network log**, then join a public match.
- Filter the Network list to the map folder of the map being played. Count the requests for `manifest.json`,
  `map.bin` and `map4x.bin` (or, for a Compact-size match, `map4x.bin` and `map16x.bin`) from the join until the
  match is running.
- **Expected:** the match starts (no *"Не удалось запустить игру"* popup), and **each map file is requested once**,
  not twice.
- Record: pass/fail, the map name, the per-file request counts, and roughly how long the start took.

**Step 3 — optional.** Repeat once on a second public match (a different map, if the rotation gives one).

**Step 4 — optional, informational (not pass/fail).** In Uptrace / GameAnalytics, whether any
`Worker:InitFailed` (with its `Worker:InitFailedCause:*`) appeared from the dev box during the check. Numbers only.

## Verification steps

1. The deploy that shipped 0035 to the dev box is named with its date.
2. At least one public match on the dev box **started** (no start-failure popup) — recorded yes/no.
3. For that match, the request count per map file after the join is recorded, counted from a cleared Network log.
   **Pass = each map file requested exactly once.**
4. Steps 3 and 4 are recorded or explicitly marked "not taken".
5. **If the match fails to start, or any map file is requested twice after the join:** file a **new defect** task
   with the readings — **do not reopen 0035 silently.** This task then closes with its result recorded as a failed
   verification, pointing at that defect.
6. No host, IP address, full URL, id or token appears anywhere in the worklog.

## Notes

- **Depends on:** `0035` (build, closed 2026-09-30) plus its deploy to the dev box.
- **Blocks:** nothing. ⚠️ In particular it does **not** block Sprint 7's deploy.
- **Related:** `0347` (rejoin after a failed start) and `0348` (real error, 15 s limit, stop the left-over worker) —
  the same reconnect run and the same deploy. `0352` (the public-lobby card stuck after leaving a started match) is
  a separate, pre-existing bug found during 0035's verify — if you see it during this check, it is **not** a
  failure of this task.
- **Privacy:** pass/fail, map names and counts only. Never paste a host, IP, full URL, id or token into any
  artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
