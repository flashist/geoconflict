# Geoconflict — Sprint 9

> ## 🔲 Backlog — 2026-10-16.

> 📌 **2026-10-16 — BOARD CREATED. NOT STARTED.** An **OWNER RULING given in the `fkit lead` session on 2026-10-16**,
> relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer
> precedent.** The owner was asked via `AskUserQuestion`: *"0469 is the check that the news shows correctly inside Yandex
> after Saturday's deploy. Your usual rule puts check tasks at the top of the NEXT sprint, but there's no Sprint 9 board
> yet, so it's on the Backlog board. The check happens on Saturday, inside Sprint 8. Where should it go?"* — and answered
> in their own words (free text, not a listed option), verbatim: ***"Create Sprint 9 board and move the task there"***.
> - No Sprint 9 board existed, so this one was created to receive verify task
>   [`0469`](../tasks/backlog/0469-verify-0426-live-the-2026-10-17-news-entries-show-in-yandex-russian-after-the-weekend-deploy/brief.md),
>   placed at rank 1 on the owner's standing build/verify-split rule (2026-09-29: a verify task goes at the top of the
>   next sprint). **The owner did not start this sprint.** The line-3 banner is `🔲 Backlog`;
>   [Sprint 8](plan-sprint-8.md) is still the active sprint (`🔄 In progress`), unchanged.
> - ⚠️ **NO THEME NAME — OPEN OWNER QUESTION.** The title is just *"Sprint 9"*. Naming it later changes only the H1
>   (keep `Sprint 9` as its own segment, e.g. `# Geoconflict — Sprint 9 — <name>`, so the identity still resolves) and
>   the `plan-index.md` row.
> - ⚠️ **NO GOAL, NO SCOPE YET** — the owner will plan Sprint 9's scope later. ~~No other task was pulled in.~~ *(spent 2026-10-16: `0343` moved in from [Sprint 8](plan-sprint-8.md) on owner ruling *"Move the task 0343 to the next sprint"*, rank 2.)*
> - ⚠️ **Timing oddity, stated not resolved:** `0469`'s check runs on deploy day (Saturday 2026-10-17), while Sprint 8 is
>   still the active sprint. The owner chose this placement knowing that (it was in the question). The task can be done
>   before Sprint 9 starts; that is not drift.

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 9 Goal

⚠️ **Not set — the owner has not stated one.** The producer has not invented one. The owner will plan Sprint 9's scope
later. What the board holds today, as a description, not a goal: ~~one owner-run verify task (`0469`) for `0426`'s news
entries.~~ *(2026-10-16, later: spent, not wrong)* ~~two rows~~ three rows *(2026-10-16, later)* — verify task `0469`, discussion brief `0343` (moved in from Sprint 8 on owner ruling *"Move the task 0343 to the next sprint"*), and GameAnalytics funnel task `0455` (moved in from Sprint 8 on owner ruling *"I think we need to move the 0455 task to the next sprint, because it requires few days of analytics after deploy."*).

---

## Status

| Status | Priority | Task | Brief |
|---|---|---|---|
| 🔲 Backlog | 1 *(top of the board, on the owner's standing build/verify-split rule (2026-09-29), *"verify task on top of the next sprint"*, applied on the 2026-10-16 OWNER RULING *"Create Sprint 9 board and move the task there"* (relayed by `fkit-lead`; ⛔ not producer precedent). First row on a new board, so no other row was renumbered (ADR-035).)* | **Verify `0426` live — the 2026-10-17 news entries show in Yandex (Russian) after the weekend game prod deploy** *(➡️ **MOVED IN FROM THE [Backlog board](backlog.md) 2026-10-16** on the owner ruling above. Owner executes inside Yandex Games, a producer records. Includes a check that the release tag contains the `0426` commit. The check runs on deploy day (Saturday 2026-10-17, or the actual shipped date if the deploy slips). Depends on `0426`, the owner's commit of it, and the weekend game prod deploy; blocks nothing.)* | [`0469-verify-0426-live-the-2026-10-17-news-entries-show-in-yandex-russian-after-the-weekend-deploy`](../tasks/backlog/0469-verify-0426-live-the-2026-10-17-news-entries-show-in-yandex-russian-after-the-weekend-deploy/brief.md) |
| 🔲 Backlog *(➡️ **MOVED IN FROM [Sprint 8](plan-sprint-8.md) 2026-10-16** — OWNER RULING typed live by the owner in a Claude Code session on 2026-10-16, relayed by that session to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move the task 0343 to the next sprint"*; the relaying session resolved "next sprint" = Sprint 9. Status copied verbatim from the Sprint 8 row, which is kept as a `➡️ Moved` pointer at its rank 6. Not a close.)* | 2 *(✅ **OWNER-CONFIRMED 2026-10-16, later** — OWNER RULINGS given live via `AskUserQuestion` on 2026-10-16 in the same Claude Code session, relayed by it to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent, verbatim *"Keep slot 2 (Recommended)"*. Before that: ~~⚠️ **Append rank (ADR-035), the producer's placement — NOT owner-ruled.**~~ Highest existing rank was 1 (`0469`), so no row renumbered. ~~The owner ranks this board.~~)* | **Discussion: eight parked features — paid-citizenship perks (paid map packs, nickname styling, map voting, premium replays, custom uploaded flags) and more (leaderboard rewards, coin economy, clans)** *(~~Title kept as filed; "for Sprint 8" is spent — it now sits here.~~ 📌 **Retitled 2026-10-16, later:** "for Sprint 8" dropped — OWNER RULINGS given live via `AskUserQuestion` on 2026-10-16 in the same Claude Code session, relayed by it to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent, verbatim *"Drop "for Sprint 8" (Recommended)"*; folder not renamed. A discussion agenda, **not** an implementation plan. Items A (paid map packs) and D (premium replays) are **POSTPONED INDEFINITELY** by the 2026-10-03 owner ruling *"Keep it, mark A and D on hold"* — not to be discussed or scoped until lifted. Twin: [`0342`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) on the [Backlog board](backlog.md). Depends on nothing.)* | [`0343-discussion-parked-features-tied-to-paid-citizenship`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) |
| 🔲 Backlog *(➡️ **MOVED IN FROM [Sprint 8](plan-sprint-8.md) 2026-10-16** — OWNER RULING typed live by the owner in a Claude Code session on 2026-10-16, relayed by that session to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"I think we need to move the 0455 task to the next sprint, because it requires few days of analytics after deploy."*; "next sprint" resolved = Sprint 9 by the relaying session. Status copied verbatim from the Sprint 8 row, which is kept as a `➡️ Moved` pointer at its rank 49. Not a close.)* | 3 *(✅ **OWNER-CONFIRMED 2026-10-16, later** — OWNER RULING given live via `AskUserQuestion` on 2026-10-16 in the same Claude Code session, relayed by it to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent, verbatim *"Keep slot 3 (Recommended)"*. Before that: ~~⚠️ **Append rank (ADR-035), the producer's placement — NOT owner-ruled.**~~ Highest existing rank was 2 (`0343`), so no row renumbered. **On merit its rank barely matters:** it blocks nothing and is time-gated.)* | **Build the private-lobby funnel and dashboard in GameAnalytics, and confirm the 0451 events arrive** *(Filed 2026-10-14 on Sprint 8; moved here 2026-10-16 because it needs several days of analytics after the deploy. Owner `fkit-producer`, **in the owner's Chrome with the owner logged in** (like `0418`); saves a funnel and a dashboard in GameAnalytics, each on the owner's yes. Confirm all 16 `PrivateLobby:*` events arrive with sane counts and no id-like values, then build the funnel and a small dashboard. ⚠️ **Time-gated:** needs `0451` committed, deployed to production (weekend slot) and several full days of data — the board may show it ready before that. Depends on `0451`; blocks nothing.)* | [`0455-build-the-private-lobby-funnel-and-dashboard-in-gameanalytics-and-confirm-the-0451-events-arrive`](../tasks/backlog/0455-build-the-private-lobby-funnel-and-dashboard-in-gameanalytics-and-confirm-the-0451-events-arrive/brief.md) |

---

## Notes

- 2026-10-16 — board created by a spawned `fkit-producer` on the owner ruling above, to receive `0469` (moved in from
  the [Backlog board](backlog.md) at rank 1). No theme name, no goal, not started. All three are the owner's to set.
- 2026-10-16, later — `0343` (discussion: eight parked features) moved in from [Sprint 8](plan-sprint-8.md) on an owner ruling typed live (*"Move the task 0343 to the next sprint"*, relayed; "next sprint" resolved = Sprint 9 by the relaying session), appended at rank 2 (ADR-035 append rank, the producer's placement — not owner-ruled). Status `🔲 Backlog`. Board still not started.
- 2026-10-16, later — OWNER RULINGS given live via `AskUserQuestion` on 2026-10-16 in the same Claude Code session, relayed by it to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent: rank 2 owner-confirmed (*"Keep slot 2 (Recommended)"*); "for Sprint 8" dropped from `0343`'s title (*"Drop "for Sprint 8" (Recommended)"*), folder not renamed.
- 2026-10-16, later — `0455` (GameAnalytics private-lobby funnel; confirm the `0451` events arrive) moved in from [Sprint 8](plan-sprint-8.md) on owner ruling *"I think we need to move the 0455 task to the next sprint, because it requires few days of analytics after deploy."*, appended at rank 3 (ADR-035 append rank, the producer's placement — **not owner-ruled**). Status `🔲 Backlog`. Still time-gated on `0451`'s production deploy + several full days of data.
- 2026-10-16, later — OWNER RULING given live via `AskUserQuestion` on 2026-10-16 in the same Claude Code session, relayed by it to a spawned `fkit-producer` (ADR-021/037); ⛔ not producer precedent: `0455`'s rank 3 owner-confirmed (*"Keep slot 3 (Recommended)"*).
