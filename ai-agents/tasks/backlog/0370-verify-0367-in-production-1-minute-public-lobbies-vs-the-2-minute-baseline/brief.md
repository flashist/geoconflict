# Verify 0367 in production — 1-minute public lobbies vs the 2-minute baseline

## ID
0370

> ℹ️ **ID allocation, checked 2026-10-02 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest task folder and
> highest `## ID` on all three boards: `0369`. `0370` and `0371` allocated in this run, in that order.

## Sprint
Sprint 8

## Priority
1

> **Rank 1 is placement on the owner's standing build/verify-split rule (2026-09-29)**: a verify task that needs a
> deploy plus an owner check goes *"on top of the next sprint"* and must not block the current sprint's deploy.
> Applied to `0367` on 2026-10-02 at its close (owner ruling *"Close + file both tasks (Recommended)"*, live
> `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`), the same way
> it was applied to `0358` and `0363`. It was appended at rank 5 (ADR-035: append, never insert) and then moved to the
> top within the [Sprint 8 board](../../../sprints/plan-sprint-8.md)'s contiguous run of open rows; no closed row
> exists on that board, so none was renumbered. `0363` moved 1 → 2, `0358` 2 → 3, `0351` 3 → 4 and `0343` 4 → 5. See
> the board's 2026-10-02 `0370` addendum. ⛔ Not producer precedent for re-ranking. ⚠️ Rank 1 vs `0363` / `0358` is
> **not a merit call** — they are independent owner checks and do not compete; but this one has a **fixed date**
> (Step 1 runs on deploy day), which they do not.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **PARTLY EXECUTED BY THE OWNER (human).** The GameAnalytics numbers are owner-read (no agent has
GameAnalytics access). The Uptrace query is read-only and may be run for the owner by an agent session that has
access (standing rule: read-only checks are run, not handed over).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0363`](../../done/0363-verify-0356-in-production-the-telemetry-deploy-is-tagged-with-its-version/brief.md).)*

## Context

**Filed 2026-10-02 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live
via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`: *"Close + file both tasks (Recommended)"*;
and on the owner's standing build/verify-split rule (2026-09-29).** ⛔ Not producer precedent. The **build** task
closes when built and reviewed; this **verify** task goes at the top of the next sprint and **must not block** the
current sprint's deploy.

**What this verifies.** [`0367`](../../done/0367-cut-the-public-lobby-wait-from-2-minutes-to-1-minute/brief.md) (the
build task, closed 2026-10-02 `(agent-closed — not owner-verified)`) cut the public multiplayer lobby window from
2 minutes to 1 minute (`gameCreationRate()` 120 s → 60 s, production and preprod; dev unchanged). It is framed as a
**test**: with the same players online, a shorter lobby means a shorter wait and more matches per hour, but fewer
real people per match (AI fills the rest). This task reads the numbers that decide whether 1 minute stays.

**The decision rule — OWNER RULING Q1 (2026-10-01), recorded on `0367`:** **keep 1 minute if multiplayer matches per
day hold steady or rise AND the share of matches with only one real player does not jump noticeably.** Otherwise
revert. The owner sets the number for "noticeably" once the "before" numbers are in. **The window — OWNER RULING Q2
(2026-10-01):** the 7 days after the deploy vs the 7 days before it.

**Two more owner rulings, given 2026-10-02 at `0367`'s plan gate (recorded in its `plan.md` header):**
- **Plan Q1 — baseline timing:** the "before" numbers were read on 2026-10-02 **and** the same query is **re-run on
  deploy day** for the exact 7 days before the deploy. This task carries that re-run (Step 1).
- **Plan Q2 — when to read "after":** read the "after" lone-player number **on day 7 exactly**, plus a **snapshot on
  day 4**. **Uptrace retention is NOT changed.**

**Retention — note, the ruling stands.** `0367`'s plan feared Uptrace keeps server logs for only 7 days. The coder
measured ~14 days on 2026-10-02 (rows back to 2026-09-18), matching
[`0259`](../../done/0259-investigate-uptrace-retention-not-applied/brief.md)'s finding that Uptrace CE ignores the
configured 7 days and drops data on a fixed ~14-day horizon (follow-up
[`0263`](../0263-confirm-uptrace-ce-14-day-retention-hard-cap-or-configurable/brief.md) still open). The owner's Q2
ruling stands as given. ⚠️ **Why Step 1 still must run on deploy day:** by the day-7 "after" read, the oldest day of
the "before" window is ~15 days old and may already be gone. Re-check retention before relying on it either way — if
`0263` ever makes the 7-day setting bite, the timing is tighter still.

**The "before" numbers read on 2026-10-02** (`0367`'s `worklog.md`, § *Baseline*), 7 days 2026-09-25 → 2026-10-01
(UTC), all on the 2-minute window:
- **Lone-player share: 12.4 %** — 573 of 4 630 public matches with at least one real player had exactly one. (Out of
  all 5 069 public lobbies: 11.3 %.)
- Public matches with ≥ 1 real player: ≈ 661/day. Average real players per such match 7.31, median 6. Weekend dip
  (2026-09-26/27: ~5 real players vs ~8 on weekdays) — noted, not explained.
- These are the **reference**, not the comparison baseline. The comparison baseline is Step 1's deploy-day re-run.

### Preconditions — this task cannot start until all of these hold

1. `0367` is **committed**.
2. `0367` is **deployed** to the production game server, in the weekend slot (target 2026-10-03/04), per the
   [weekend-deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md). Record the deploy date.

⚠️ **Timing does not follow the sprint.** Step 1 is due **on deploy day**, and the day-4 and day-7 reads fall on fixed
dates after it — whether or not Sprint 8 has started by then. A missed Step 1 cannot be recovered once the "before"
days age out of Uptrace.

⚠️ **This task does NOT block Sprint 7's deploy.** It runs around and after the deploy; nothing in Sprint 7 waits on it.

## What to build

Nothing is built. Every step is a **read-only** reading of numbers.

**Windows (UTC).** Let **D** be the deploy day.
- **Before** = D − 7 days 00:00 → D 00:00 (the 7 full days before the deploy day).
- **After** = D + 1 00:00 → D + 8 00:00 (the 7 full days after the deploy day).
- The deploy day itself is **left out of both** — it is part 2-minute, part 1-minute. *(This boundary is the
  producer's reading of "7 days vs 7 days before"; the owner may move it — see* Notes*.)*
  📌 **2026-10-02 — now an OWNER RULING:** *"Yes, leave it out (Recommended)"* — the deploy day is excluded from both
  windows; *before* = the 7 full days before deploy day, *after* = the 7 full days after it. (OWNER RULING given 2026-10-02 via `AskUserQuestion` in the live `fkit lead` session, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.)

**Step 1 — on deploy day: re-run the "before" lone-player query.**

> 📌 **2026-10-02 — WHEN, by OWNER RULING:** *"Do it with the deploy (Recommended)"* (OWNER RULING given 2026-10-02 via `AskUserQuestion` in the live `fkit lead` session, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent). This step is
> run **at the weekend deploy (2026-10-03/04)** — read-only — **when the owner tells `fkit-lead` or a coder to run
> it**. It is **not** left for whenever this task starts (Sprint 8 may not have started by then). Nobody runs it
> unprompted. No new task: the result is recorded in this task's `worklog.md` as below. Query source:
> [`0367`'s `worklog.md`](../../done/0367-cut-the-public-lobby-wait-from-2-minutes-to-1-minute/worklog.md).
 Use the re-runnable query in `0367`'s `worklog.md`
(§ *Re-runnable query*), changing only the two dates to the **Before** window. Record the per-day table and the 7-day
totals in this task's `worklog.md`: public lobbies, public matches with ≥ 1 real player, exactly-one-real-player
matches, lone share, average and median real players.
- The query reads the telemetry box's ClickHouse read-only; credentials come from that container's own environment —
  **never pasted anywhere**. It depends on two server log strings (`sending start message` and the Worker's
  `creating Public … game with id`); if either was reworded since `0367`, fix the query with it and say so.

**Step 2 — on deploy day (or as soon after as possible): the owner reads the "before" GameAnalytics numbers.**
- **Main signal:** GameAnalytics → design events → `Game:Mode:Multiplayer`, daily count, **Before** window. ⚠️ It
  fires once **per client per match** and includes private lobbies — label it **"multiplayer match entries per
  day"**, not matches.
- **Context (not the decision rule):** `UI:ClickMultiplayer` → `Game:Mode:Multiplayer` conversion; `Match:Spawned`
  (seconds from game start to confirmed spawn); total `Ad:Interstitial` per day. See
  [`analytics-event-reference.md`](../../../knowledge-base/analytics-event-reference.md).

**Step 3 — the owner sets "noticeably".** With Steps 1–2 in hand, and **before** the day-4 snapshot, the owner states
the number for "the lone-player share does not jump noticeably" (OWNER RULING Q1 says it is set once the "before"
numbers are in). Record it. Setting it before seeing "after" data keeps the test honest.

**Step 4 — day 4 snapshot (D + 5 00:00): mid-test, informational.** Re-run the Step 1 query for the first 4 full days
of the **After** window; the owner reads the same GameAnalytics numbers for those days. Record. **This is not the
decision** — it is an early warning only (e.g. a large jump in lone-player share or failed starts the owner may want
to act on early; acting early is the owner's call).

**Step 5 — day 7 read (D + 8 00:00): the decision numbers.** Re-run the query for the full **After** window, and the
owner reads the GameAnalytics numbers for it. Record both, next to the Step 1–2 "before" numbers.

**Step 6 — apply the rule.** Keep 1 minute if multiplayer match entries per day hold steady or rise **and** the
lone-player share did not rise by more than the Step 3 number. Otherwise revert. **The owner rules keep or revert.**

**How to read the numbers (from `0367`'s baseline notes):**
- `public lobbies` roughly **doubles by construction** at 1 minute (≈ 720/day → ≈ 1 440/day). It is **not** a "people
  play more" signal. "Public matches with ≥ 1 real player" is the closer server-side signal — offered as context next
  to the ruled GameAnalytics number, not as a replacement for it.
- Lone share = exactly-one-real-player matches ÷ public matches with ≥ 1 real player (AI-only lobbies left out).
  Compare like with like: if "÷ all public lobbies" is used, use it for both windows.

**Watch items — context, not the decision rule:**
- **Slow devices get half the preload time.** A 1-minute lobby halves the time a slow device has to load the map before
  the match starts. Watch `Match:Spawned` and any rise in failed or late starts. This is the most plausible way the
  change could hurt.
- **Join ad vs end-of-match ad.** The join ad is shown only if at least 15 s remain (rule unchanged during the test,
  owner ruling Q3+Q4) — at 1 minute more joins land in the last 15 s, so join ads may drop, while more matches per hour
  may add end-of-match ads. ⚠️ `Ad:Interstitial` carries **no placement field**, so the two cannot be told apart —
  only the total per day is readable. Say so; do not invent a split.

## Verification steps

1. Deploy date **D** recorded, and that `0367` was the change deployed.
2. Step 1 recorded: the "before" per-day table and totals from the deploy-day query run, with the date it was run.
3. Step 2 recorded: "before" `Game:Mode:Multiplayer` entries per day (owner-read), plus whichever context numbers the
   owner read; anything not read is stated as not read, never estimated.
4. Step 3 recorded: the owner's "noticeably" number, dated, set before Step 4.
5. Step 4 recorded: day-4 snapshot, both sources, dated.
6. Step 5 recorded: day-7 numbers, both sources, side by side with the "before" numbers.
7. Step 6 recorded: the owner's keep/revert ruling, verbatim, with the date.
8. **If revert:** a new task is filed for the one-number change back to 120 s (next weekend game-server slot). **Do
   not reopen `0367` silently.** This task then closes with the result recorded.
9. **If a reading cannot be taken** (query fails, data aged out, a log string changed): say so plainly in the worklog,
   with what was tried. Do not substitute a proxy without labelling it as one.
10. No host, IP address, full URL, token or credential appears anywhere in the worklog — numbers, dates, event names
    and query text (with no credentials) only.

## Notes

- **Depends on:** `0367` (build, closed 2026-10-02) — committed, then deployed to the production game server in the
  weekend slot.
- **Blocks:** nothing. ⚠️ In particular it does **not** block Sprint 7's deploy. A revert, if ruled, is a new task.
- **Window boundary —** ~~producer's assumption, owner may change it:~~ the deploy day is excluded from both windows
  (see *What to build*). ~~If the owner prefers "the 7 × 24 h right before and right after the deploy moment", Step 1's
  query takes timestamps instead of dates — the query supports it.~~
  📌 **2026-10-02 — OWNER RULING** *"Yes, leave it out (Recommended)"*: deploy day excluded from both windows; the
  assumption is now the rule.
- **Step 1 timing — OWNER RULING 2026-10-02** *"Do it with the deploy (Recommended)"*: run at the weekend deploy
  (2026-10-03/04), read-only, when the owner tells `fkit-lead` or a coder to run it (see Step 1).
- **Retention:** observed ~14 days (2026-10-02), not the configured 7 — see *Context*. Uptrace retention is **not**
  changed, by owner ruling (plan Q2, 2026-10-02).
- **Related:** [`0263`](../0263-confirm-uptrace-ce-14-day-retention-hard-cap-or-configurable/brief.md) (Uptrace
  retention); [`0363`](../../done/0363-verify-0356-in-production-the-telemetry-deploy-is-tagged-with-its-version/brief.md)
  (⚠️ a telemetry deploy restarts the Uptrace stack — do not run it in the middle of a Step 1/4/5 query; restart does
  not delete stored data).
- **Privacy:** never paste a host, IP, full URL, token or credential into any artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- 📌 **2026-10-06 — OWNER RULING** *"Wait for day-4, decide by weekend (Recommended)"* (live via `AskUserQuestion` in
  the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent): after the interim look (lone 20.5 %), no
  revert now; if the **day-4** lone share (Step 4, 2026-10-08) is still over 15 %, the owner decides keep vs revert in
  time for the 2026-10-10/11 deploy. Steps above are not edited. Details: `worklog.md`, *2026-10-06 — OWNER RULING*.
