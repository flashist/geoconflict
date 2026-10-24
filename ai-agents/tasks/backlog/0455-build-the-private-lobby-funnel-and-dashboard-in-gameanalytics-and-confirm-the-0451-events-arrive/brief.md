# Build the private-lobby funnel and dashboard in GameAnalytics, and confirm the 0451 events arrive

## ID
0455

> ℹ️ **ID allocation, checked 2026-10-14 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0454` (folder names and `## ID` fields agree, base-10 arithmetic). `0455`: no task folder, no
> `## ID` hit, no `tasks/*/0455*` path in any branch's history; repo-wide only a substring of an unrelated git hash in
> `0064`'s worklog.

## Sprint
Sprint 9

> 📌 **2026-10-16 — was Sprint 8, now Sprint 9.** OWNER RULING typed live by the owner in a Claude Code session on 2026-10-16, relayed by that session to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"I think we need to move the 0455 task to the next sprint, because it requires few days of analytics after deploy."*; the relaying session resolved "next sprint" = Sprint 9. Moved to the [Sprint 9 board](../../../sprints/plan-sprint-9.md); the [Sprint 8](../../../sprints/done/plan-sprint-8.md) row stays as a `➡️ Moved` pointer. Not a close. This supersedes the 2026-10-14 placement ruling below (*"Sprint 8"*), which is kept as written.

> 📌 **OWNER RULING, 2026-10-14, given live via `AskUserQuestion` in the `fkit lead` session driving
> `fkit-sprint-ship-loop`**, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037);
> ⛔ **not producer precedent.** Question: *"When 0451 closes, a follow-up task gets filed: build the private-lobby
> funnel/dashboard in GameAnalytics (in your Chrome, with you) and check the events arrive. It only works after 0451 is
> deployed and a few days of data exist. Where should that task go?"* Verbatim selection: **"Sprint 8"** — option text:
> *"Keep it in this sprint, if 0451 will be deployed and have data before Sprint 8 ends."* This bends the standing
> build/verify-split rule (2026-09-29: the verify task goes to the top of the **next** sprint) **for this case only.**

## Priority
8

> 📌 **2026-10-16, later — was 3, now 8.** Moved down five on the [Sprint 9 board](../../../sprints/plan-sprint-9.md) by the OWNER-RULED order *"At the top (Recommended)"*, which put the five rows relocated from Sprint 8 above it. Not a merit change for this task. The note(s) below are kept as written (ADR-035).

> 📌 **2026-10-16 — was 49 (Sprint 8), now 3 (Sprint 9).** Rank is board-scoped: on the move to Sprint 9 this task was **appended** at 3, below `0343` (ADR-035 append rank). ~~⚠️ **The producer's placement — NOT owner-ruled, not a merit judgement.**~~ ✅ **Owner-confirmed 2026-10-16, later** — OWNER RULING given live via `AskUserQuestion` on 2026-10-16 in the same Claude Code session, relayed by it to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent: verbatim *"Keep slot 3 (Recommended)"*. The note below is Sprint 8 history, kept as written.

> ⚠️ **Priority 49 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit its rank barely matters:** it blocks nothing and is time-gated (only workable once `0451` is deployed to
> production and several days of data exist). Appended after the [Sprint 8](../../../sprints/done/plan-sprint-8.md) board's
> highest (48, `0454`), never inserted (ADR-035) — a position, not merit.

## Status
🔄 In progress — 2026-10-24, OWNER RULING, live `AskUserQuestion` in the lead session 2026-10-24, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Asked *"Change 0469 and 0455 from Backlog to In progress, since work has started on both?"* → verbatim **"Mark both In progress (Recommended)"** (option text: *"Changes only the label on the board and in both briefs. Both stay in Sprint 9."*). Status edit only: no move, no rank change.

*(Status until 2026-10-24, kept as history:)* ~~🔲 Backlog~~

## Owner
fkit-producer — ⚠️ **NEEDS THE OWNER'S BROWSER.** GameAnalytics is used through the owner's Chrome with the owner
logged in himself (like [`0418`](../../done/0418-recheck-in-gameanalytics-the-two-0397-status-events-missing-from-the-2026-10-08-read/brief.md)).
An agent session may do the clicking and reading only with the owner present and logged in. **Unlike `0418`, this task
does save things in GameAnalytics** (a funnel and a dashboard) — each one only after the owner says yes to it.

## Context

**What this is, in plain terms.** [`0451`](../../done/0451-private-lobbies-add-the-missing-analytics-events-for-a-full-usage-funnel/brief.md)
added 16 analytics events so the owner can see, step by step, how players use private lobbies. The events exist in the
code; nobody has seen them in GameAnalytics yet, and no funnel or dashboard exists for them. This task does both, with
the owner: first check the events really arrive and look sane, then build the funnel and a small dashboard.

**The 16 events** (source of truth: [`analytics-event-reference.md`](../../../knowledge-base/analytics-event-reference.md)
§ *Private Lobby Events* — read it first; it lists exactly when each one fires and does not):
`PrivateLobby:Created`, `PrivateLobby:CreateFailed`, `PrivateLobby:InviteCopied:Link`, `PrivateLobby:InviteCopied:Code`,
`PrivateLobby:InviteCopyFailed`, `PrivateLobby:Start:Tapped`, `PrivateLobby:Start:Failed`,
`PrivateLobby:MatchStarted:Host`, `PrivateLobby:MatchStarted:Guest`, `PrivateLobby:MatchEnded`,
`PrivateLobby:Left:Host`, `PrivateLobby:Left:Guest`, `PrivateLobby:Joined:Link`, `PrivateLobby:Joined:Code`,
`PrivateLobby:JoinFailed:NotFound`, `PrivateLobby:JoinFailed:Error`.
Only two carry a value: `Start:Failed` (an HTTP status, `0` when a request threw) and `MatchEnded` (match seconds).

**The funnel, from the reference doc's funnel note** (in order):
1. Private tab — `UI:Tap:PrivateTab` (existing event, task `0412`)
2. Create — `PrivateLobby:Created` (attempts = `Created` + `CreateFailed`; non-citizens drop out at
   `LockedFeature:Tap:PrivateLobby` instead)
3. Invite copied — `PrivateLobby:InviteCopied:{Link|Code}`
4. Friend joined — `PrivateLobby:Joined:{Link|Code}`
5. Host Start — `PrivateLobby:Start:Tapped`
6. Private match started — `PrivateLobby:MatchStarted:Host` (= private matches)
7. Match ended — `PrivateLobby:MatchEnded`

Side counts, not funnel steps: `CreateFailed`, `InviteCopyFailed`, `JoinFailed:{NotFound|Error}`, `Start:Failed`,
`Left:{Host|Guest}`, and `MatchStarted:Guest` (= guest players, not matches).

**How to read the numbers — caveats recorded by `0451`, so the dashboard is not misread:**
- `InviteCopied` = "the host copied at least once in this opening of the window", not the number of copies.
- `Joined:*` = the join was **sent**, not confirmed connected.
- `Joined:Link` can come from players whose private row is hidden (an invite always opens the Join window), so it is
  not limited to the flag cohort.
- A wrong code counts as `JoinFailed:NotFound`; until [`0454`](../../done/0454-private-lobbies-show-lobby-not-found-when-a-player-enters-a-wrong-code/brief.md)
  ships, the player still sees a generic error for it. `0454` changes what the player sees, not this event.
- A tab close, a kick and a hash-change leave send no `Left`.

**The flag.** The owner states `private_lobbies_all` is `enabled` for everybody (recorded by `0428` as live since
about 17:09–17:12 MSK 2026-10-13). **Owner statement, not agent-verified** — no agent has read the Yandex console. It
does not change what this task does, only how much data arrives.

**GameAnalytics capabilities are NOT checked yet.** Nobody has confirmed what GameAnalytics offers for funnels (a
funnel feature, whether it takes design events as steps, whether it needs a paid plan) or for saved dashboards. The wiki
has no record of either being built before. **This task discovers that first**, and the build follows what the tool can
do. GameAnalytics showed a *"Demo mode"* banner on every earlier read (2026-09-29, 2026-10-05, 2026-10-08) — whether it
blocks saving is also unknown.

## What to build

Nothing in source. Work in GameAnalytics, in the owner's Chrome, with the owner.

1. **Check the timing gate first** (see *Notes*). If `0451` is not yet in a production game client, or fewer than
   several full days of data exist since that deploy, stop and say so — do not read early.
2. **Confirm the events arrive.** In Explore (Design events, Count), over the full days since the deploy (current day
   excluded, or say plainly that it was included): for each of the 16 events, seen yes/no and the count per day. Note
   the "Demo mode" banner if shown.
3. **Sanity-check the counts.** Flag, without investigating, anything that breaks the funnel's logic — for example
   `MatchStarted:Host` above `Start:Tapped`, `MatchEnded` above `MatchStarted:Host`, or `Created` near zero while
   `UI:Tap:PrivateTab` is large. Each flag goes to the owner; a coder investigation is the owner's call.
4. **Check no id-like value arrived.** Only `Start:Failed` (HTTP status codes such as 403, or 0) and `MatchEnded`
   (seconds) should carry values; any other event should carry none. Any event name or value that looks like a lobby
   code, link, game id, player id or name is a privacy defect — report it to the owner at once.
5. **Find out what GameAnalytics can do** for funnels and dashboards, and tell the owner in plain words before building.
6. **Build the funnel** (steps 1–7 above) in whatever form GameAnalytics supports — with the owner's yes before saving.
   If GameAnalytics cannot build a real funnel from design events, say so and offer the nearest thing (for example a
   dashboard of per-step daily counts side by side); the owner decides.
7. **Build a small dashboard** — with the owner's yes before saving: the funnel (or its stand-in), the side counts
   above, and `Start:Failed` split by value if GameAnalytics allows it.
8. **Record** what was built (names as shown in GameAnalytics, what each panel shows) so a later session can find it.

⛔ **Never copy a GameAnalytics user id, session id, token or URL** into chat, a worklog, a brief or any tool. Event
names, counts, dates, times and the names of saved funnels/dashboards only.

## Verification steps

1. `worklog.md` records: the production deploy that carried `0451` (date and game client version), the read window
   (first and last full day, UTC), the read time, the GameAnalytics settings used, and whether the "Demo mode" banner
   was shown.
2. A table of all 16 events: seen yes/no and count per day. A one-line result: all 16 seen / some missing (named).
3. The sanity check of step 3 recorded, with every flag put to the owner and the owner's answer recorded in the owner's
   words (or recorded as still open).
4. The value check of step 4 recorded: which events carried values, the value ranges seen, and "no id-like value" — or
   the privacy defect reported.
5. What GameAnalytics offers for funnels and dashboards, in plain words, as found.
6. The funnel and dashboard exist in GameAnalytics under the recorded names, **the owner has seen them**, and each save
   was the owner's yes (recorded). Or, if the tool could not do it, what was built instead and the owner's ruling.
7. **No secrets:** no id, token, session, URL or response body in any artifact.

## Notes

- **Depends on:** 0451
- **Blocks:** nothing
- **Time-gated — the real gate, which the line above cannot express:** `0451` is closed but **only built, not
  deployed**. This task needs `0451` **committed (owner's call), deployed to production** (the owner deploys in weekend
  slots unless urgent, ruling 2026-09-29 — the earliest is 2026-10-17/18), **and several full days of data after it**.
  Until then the board may show this task as ready; it is not. If the deploy slips so that the data window would fall
  after Sprint 8 ends, that is the owner's call (the placement ruling above was *"if 0451 will be deployed and have
  data before Sprint 8 ends"*). 📌 **2026-10-16: the owner made that call — moved to Sprint 9** (*"… it requires few days of analytics after deploy."*). The gate itself is unchanged: `0451` committed, deployed to production, then several full days of data.
- **Not in `0426`'s wait set** *(history — `0426` is closed, and since 2026-10-16 this task is on Sprint 9)*. `0426`'s Timing rule waits on Sprint 8 tasks that **ship code** in the final Sprint 8
  deploy. This task ships no code, so `0426` does not wait on it.
- **Related:** [`0418`](../../done/0418-recheck-in-gameanalytics-the-two-0397-status-events-missing-from-the-2026-10-08-read/brief.md)
  (the model: a GameAnalytics read in the owner's Chrome),
  [`0454`](../../done/0454-private-lobbies-show-lobby-not-found-when-a-player-enters-a-wrong-code/brief.md) (changes what a player
  sees for a wrong code; if it ships in a different deploy than `0451`, note which deploys fall in the read window).
- **One task, not two:** "confirm the events arrive" and "build the funnel" are one session on the same data in the same
  tool, and the funnel is meaningless until the events are confirmed — the check is the funnel's first step, not a
  separately shippable unit. The owner's ruling also named one follow-up task.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
