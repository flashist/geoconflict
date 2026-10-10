# Geoconflict — Sprint 8 — Paid Citizenship Perks and More Content

> ## 🔲 Backlog — 2026-09-29.

> 📌 **2026-09-29 — BOARD CREATED. NOT STARTED.** An **OWNER RULING given live in the `fkit lead` session on
> 2026-09-29**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent.** The ruling: split the 11 brief-less [Sprint 6](done/plan-sprint-6.md) rows into
> discussion briefs, and *"is the task related to the paid citizenship? If yes, put this brief into Sprint 8. If
> no — put it into Backlog."*
> - No Sprint 8 board existed, so this one was created to receive the "yes" brief,
>   [`0343`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md). **The owner did
>   not start this sprint.** The line-3 banner is `🔲 Backlog`; [Sprint 6](done/plan-sprint-6.md) is still the active
>   sprint and [Sprint 7](done/plan-sprint-7.md) is still `🔲 Backlog`.
> - ~~⚠️ **NO THEME NAME — OPEN OWNER QUESTION.** The title is just *"Sprint 8"*. Naming it later changes only the H1
>   (keep `Sprint 8` as its own segment, e.g. `# Geoconflict — Sprint 8 — <name>`, so the identity still resolves)
>   and the `plan-index.md` row.~~ ✅ **NAMED 2026-09-29 — OWNER RULING D** (live in the `fkit lead` session, relayed by
>   `fkit-lead`; ⛔ not producer precedent), exact wording: *"Paid Citizenship Perks and More Content"*. Only the H1 and
>   the `plan-index.md` row changed; the identity is still `Sprint 8` and the line-3 banner is still `🔲 Backlog`.
> - ⚠️ **NO GOAL YET** — see *Sprint 8 Goal* below.

> See [plan-index.md](plan-index.md) for strategic logic, experiments policy, and full priority table.

---

## Sprint 8 Goal

⚠️ **Not set — the owner has not stated one.** The producer has not invented one. What the board holds today, as a
description, not a goal: one discussion brief (`0343`) covering eight parked ideas carried from Sprint 6 on
2026-09-29 — five tied to paid citizenship (paid campaign map packs, nickname styling, map voting for citizens,
premium replay access, custom uploaded flags) and three more placed here by owner ruling C (leaderboard rewards,
coin economy, clans). The name (ruling D) is not a goal.

⛔ **2026-10-03 — two of the eight are ON HOLD:** *paid campaign map packs* (item A) and *premium replay access* (item D) are **POSTPONED INDEFINITELY** (new maps and match archive are on hold). OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent — verbatim *"Keep it, mark A and D on hold"*. `0343` stays on this board; its row, rank and status are unchanged. The sentence above is kept as written.

---

## Status

| Status | Priority | Task | Brief |
|---|---|---|---|
| ✅ Done (agent-closed — not owner-verified) | 1 *(append rank 5, then moved to the top — placement on the owner's standing build/verify-split rule (2026-09-29), *"verify task on top of the next sprint"*, applied at `0367`'s close on 2026-10-02 on the OWNER RULING *"Close + file both tasks (Recommended)"* (live `AskUserQuestion`, relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`); ⛔ not producer precedent. Not a merit rank against `0363` / `0358` — independent owner checks; but this one has a **fixed date** (Step 1 runs on deploy day). See the 2026-10-02 `0370` addendum below.)* | **Verify 0367 in production — 1-minute public lobbies vs the 2-minute baseline** *(🆕 **FILED 2026-10-02** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the owner's close ruling and standing build/verify-split rule, relayed by `fkit-lead`: `0367` closes on build + review, this is its verify. Read-only: re-run the lone-player query **on deploy day** for the 7 days before (plan ruling Q1, 2026-10-02); owner reads GameAnalytics `Game:Mode:Multiplayer` entries/day; snapshot on day 4, decision numbers on day 7 (plan ruling Q2; Uptrace retention not changed — observed ~14 days, not 7). Keep if matches/day hold or rise and the lone-player share does not jump noticeably (ruling Q1, 2026-10-01); reference 12.4 % for 2026-09-25..10-01. Watch: slow devices get half the preload time; join-ad vs end-of-match ad shift is not separable (`Ad:Interstitial` has no placement field). ⚠️ **Preconditions: `0367` committed and deployed** (game-server weekend slot). ⚠️ **Step 1 is date-bound to the deploy, not to Sprint 8 starting.** ⚠️ **Does not block Sprint 7's deploy.**)* *(📌 **2026-10-10 — Step 6 OWNER RULING *"Keep 1 minute"*** (live `AskUserQuestion`, relayed by `fkit-lead`): 1-minute lobbies stay, **overriding the 15 % lone-player line** (6-day 17.7 % vs 11.8 % Before; entries/day +30 %); no revert task. See the [worklog](../tasks/done/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/worklog.md).)* *(📌 **2026-10-10 — CLOSED `✅ Done (agent-closed — not owner-verified)`** on the OWNER RULING typed in the `fkit lead` session, relayed by `fkit-lead`: *"you can close the task, but add one task to Backlog, to recheck the numbers after a while"*; ⛔ not producer precedent. ⚠️ **Step 5 (day-7 read) NOT run** — verification step 6 not met; carried by recheck task [`0435`](../tasks/backlog/0435-recheck-the-1-minute-public-lobby-numbers-some-time-later/brief.md) on the [Backlog board](backlog.md). See the 2026-10-10 `0370` close addendum below.)* | [`0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline`](../tasks/done/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md) |
| ➡️ Moved to [Sprint 7](done/plan-sprint-7.md) — priority 36 *(2026-10-04 — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Pull into Sprint 7 (Recommended)"*. The status this row carried (~~🔲 Backlog~~) was copied verbatim to Sprint 7, appended at 36 (append rank, the producer's placement — not owner-ruled; on merit directly above `0340`). This row's rank 2 is kept, not renumbered, and no other row here moved (ADR-035). See the 2026-10-04 `0373` addendum directly below this table.)* | 2 *(was ~~6~~ — ✅ **OWNER-RULED placement, 2026-10-02**: moved from append rank 6 to rank 2, directly below `0370`, on the OWNER RULING verbatim *"Move to rank 2 (Recommended)"* (live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent). `0363` 2 → 3, `0358` 3 → 4, `0351` 4 → 5, `0343` 5 → 6 (all open; no closed row on this board). The owner-confirmation flag in the struck text that follows is resolved. See the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that (superseded, kept struck): ~~append rank — ⚠️ **NOT the owner-approved placement** — flagged for owner confirmation. The owner approved this task for *"the top of the next sprint"* (2026-10-02, relayed by `fkit-lead`; ⛔ not producer precedent). `0370` keeps rank 1 by its earlier ruling. **On merit this belongs directly below `0370`** (rank 2), because it is the next step on the chain blocking `0340`; it was appended, not inserted (ADR-035), since rank 2 would renumber four open rows and a spawned producer does not re-rank. **Read as top group, directly below `0370`, whatever this number says**, until the owner confirms the exact rank. ⏳ Cannot start before `0372` + `0366` are deployed and 5–7 days of data incl. a weekend evening exist.~~ ⏳ Still cannot start before `0372` + `0366` are deployed and 5–7 days of data incl. a weekend evening exist.)* | **Read the stale-login data and choose the fix** *(🆕 **FILED 2026-10-02** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given via `AskUserQuestion` in the live `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. Reads `0366`'s server age brackets and [`0372`](../tasks/done/0372-client-diagnostics-for-stale-login-signatures/brief.md)'s client events against a prediction table written up front; the owner chooses one fix, the expected stale share after it, and the S2-exit "good enough" threshold (OWNER RULING *"Decide it with the data (Recommended)"*). Owner-participation task. See the 2026-10-02 `0373` addendum below this table.)* | [`0373-read-the-stale-login-data-and-choose-the-fix`](../tasks/done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 3 *(was ~~2~~ — moved down one by the OWNER-RULED move of `0373` to rank 2, directly below `0370`, 2026-10-02 — verbatim *"Move to rank 2 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent; see the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that: was ~~1~~ — moved down one by the placement of verify task `0370` (for `0367`) at the top, 2026-10-02, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling *"Close + file both tasks (Recommended)"*, relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-02 `0370` addendum below. Before that: append rank 4, then moved to the top — placement on the owner's standing build/verify-split rule (2026-09-29), *"verify task on top of the next sprint"*, applied at `0356`'s close on 2026-10-01 by `fkit-lead` (driving `/fkit-sprint-ship-loop`); ⛔ not producer precedent. Not a merit rank against `0358` — both are short, independent owner checks on different boxes. See the 2026-10-01 `0363` addendum below.)* | **Verify 0356 in production — the telemetry deploy is tagged with its version name, everywhere it should be** *(🆕 **FILED 2026-10-01** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the owner's standing build/verify-split rule, relayed by `fkit-lead`: `0356` closes on local proof (build), this is its verify. Owner-run after the weekend telemetry deploy: the deploy printed a `<base>-telemetry.<N>` name and succeeded; the annotated git tag is on origin at the deployed commit; the box marker `/opt/uptrace/deployed-version` and the local deploy record show the same version and commit; Uptrace still answers. ⚠️ **Preconditions: `0356` committed** (until then the telemetry deploy refuses to run — owner ruling Q1) **and deployed.** ⚠️ **Does not block Sprint 7's deploy.**)* | [`0363-verify-0356-in-production-the-telemetry-deploy-is-tagged-with-its-version`](../tasks/done/0363-verify-0356-in-production-the-telemetry-deploy-is-tagged-with-its-version/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 4 *(was ~~3~~ — moved down one by the OWNER-RULED move of `0373` to rank 2, directly below `0370`, 2026-10-02 — verbatim *"Move to rank 2 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent; see the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that: was ~~2~~ — moved down one by the placement of verify task `0370` (for `0367`) at the top, 2026-10-02, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling *"Close + file both tasks (Recommended)"*, relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-02 `0370` addendum below. Before that: was ~~1~~ — moved down one by the placement of verify task `0363` (for `0356`) at the top, 2026-10-01, on the owner's standing build/verify-split rule relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-01 `0363` addendum below. Before that: append rank 3, then moved to the top — placement on the owner's standing build/verify-split rule (2026-09-29), *"verify task on top of the next sprint"*, applied at `0355`'s close on 2026-09-30 by `fkit-lead` (driving `/fkit-sprint-ship-loop`); ⛔ not producer precedent. Not a merit rank against `0351` — both are short, independent owner checks. See the 2026-09-30 `0358` addendum below.)* | **Verify 0355 in production — the profile deploy is tagged with its version name, everywhere it should be** *(🆕 **FILED 2026-09-30** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the owner's standing build/verify-split rule, relayed by `fkit-lead`: `0355` closes on local proof (build), this is its verify. Owner-run after the weekend profile deploy (next slot 2026-10-03/04): the deploy printed a `<base>-profile.<N>` name and succeeded; `/health` reports that name; the annotated git tag is on origin at the deployed commit and the registry holds the name; telemetry `service.version` shows it if observable. ⚠️ **Preconditions: `0355` committed** (until then the profile deploy refuses to run) **and deployed.** 🚨 **The first tagged profile deploy must be the one that first ships `0309`'s log line; no second profile deploy before `0297` §1 reads it; a tagging fault is fixed with a git command, never a redeploy.** ⚠️ **Does not block Sprint 7's deploy.**)* | [`0358-verify-0355-in-production-the-profile-deploy-is-tagged-with-its-version`](../tasks/done/0358-verify-0355-in-production-the-profile-deploy-is-tagged-with-its-version/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 5 *(was ~~4~~ — moved down one by the OWNER-RULED move of `0373` to rank 2, directly below `0370`, 2026-10-02 — verbatim *"Move to rank 2 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent; see the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that: was ~~3~~ — moved down one by the placement of verify task `0370` (for `0367`) at the top, 2026-10-02, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling *"Close + file both tasks (Recommended)"*, relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-02 `0370` addendum below. Before that: was ~~2~~ — moved down one by the placement of verify task `0363` (for `0356`) at the top, 2026-10-01, on the owner's standing build/verify-split rule relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-01 `0363` addendum below. Before that: was ~~1~~ — moved down one by the placement of verify task `0358` at the top, 2026-09-30, on the owner's standing build/verify-split rule relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-09-30 `0358` addendum below. Before that: was ~~2~~, append rank — owner-ruled placement 2026-09-30: the standing build/verify-split rule, *"verify task on top of the next sprint"*, applied to `0035` (*"File a verify task for Sprint 8"*); OWNER RULING relayed by `fkit-lead`, ⛔ not producer precedent. See the 2026-09-30 addendum below.)* | **Verify 0035 on the dev box — a public match starts, and each map file downloads once** *(🆕 **FILED 2026-09-30** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`: `0035` closes on local proof (build), this is its verify. Owner-run, read-only: join a public match on the dev box → it starts, and each map file is requested once after the join, not twice. ⚠️ **Precondition: `0035` deployed to the dev box** (weekend deploy slot). ⚠️ **Does not block Sprint 7's deploy.**)* | [`0351-verify-0035-on-the-dev-box-a-public-match-starts-and-each-map-file-downloads-once`](../tasks/done/0351-verify-0035-on-the-dev-box-a-public-match-starts-and-each-map-file-downloads-once/brief.md) |
| 🔲 Backlog | 6 *(was ~~5~~ — moved down one by the OWNER-RULED move of `0373` to rank 2, directly below `0370`, 2026-10-02 — verbatim *"Move to rank 2 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent; see the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that: was ~~4~~ — moved down one by the placement of verify task `0370` (for `0367`) at the top, 2026-10-02, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling *"Close + file both tasks (Recommended)"*, relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-02 `0370` addendum below. Before that: was ~~3~~ — moved down one by the placement of verify task `0363` (for `0356`) at the top, 2026-10-01, on the owner's standing build/verify-split rule relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-01 `0363` addendum below. Before that: was ~~2~~ — moved down one by the placement of verify task `0358` at the top, 2026-09-30; see the 2026-09-30 `0358` addendum below. Before that: was ~~1~~ — moved down one by the OWNER-RULED placement of `0351` at the top, 2026-09-30; relayed by `fkit-lead`, ⛔ not producer precedent; see the 2026-09-30 addendum below. First row of a new board — a position, not a merit rank; the owner ranks this board)* | **Discussion: eight parked features for Sprint 8 — paid-citizenship perks (paid map packs, nickname styling, map voting, premium replays, custom uploaded flags) and more (leaderboard rewards, coin economy, clans)** *(📌 **Retitled later on 2026-09-29:** was *"five parked features tied to paid citizenship …"* — **OWNER RULING C** (relayed by `fkit-lead`), verbatim *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that to the Sprint 8."*, moved Sprint 5 plan Tasks 10, 11, 12 in from `0342`; see the ruling C addendum below. The text that follows is kept as written. 🆕 **FILED 2026-09-29** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. A discussion agenda, **not** an implementation plan. Replaces Sprint 6's brief-less rows for plan Task 2 (Paid Campaign Map Packs) and Sprint 5 plan Tasks 8a, 14, 13, 15; their prose is copied verbatim into the brief. Twin: [`0342`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) on the [Backlog board](backlog.md). See the 2026-09-29 addendum below.)* | [`0343-discussion-parked-features-tied-to-paid-citizenship`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 7 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0370`**, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"* and `0370` already holds rank 1. Not placed there: ranks 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done), and moving this row above them would renumber them — ADR-035 forbids that *"not even under an owner ruling"*; a spawned producer also never re-ranks. Appended instead (the reversible branch). See the 2026-10-04 `0390` addendum below.)* | **Verify 0377 live — an abandoned private lobby ends after 30 minutes, and an occupied one does not** *(🆕 **FILED 2026-10-04** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at `0377`'s close, on the owner's standing build/verify-split rule (2026-09-29), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent. After the game-server deploy: an abandoned test private lobby is gone 30 min after the last person left, the server log shows `private lobby ended, no client connected` with `anyClientJoined`, and an occupied lobby is NOT ended. Read-only agent log check, or owner-run. Does **not** block Sprint 7's deploy.)* | [`0390-verify-0377-live-an-abandoned-private-lobby-ends-after-30-minutes-and-an-occupied-one-does-not`](../tasks/done/0390-verify-0377-live-an-abandoned-private-lobby-ends-after-30-minutes-and-an-occupied-one-does-not/brief.md) |
| ➡️ Moved to [Sprint 7](done/plan-sprint-7.md) — priority 44 *(2026-10-05 — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move to Sprint 7 (Recommended)"* — its first read is needed before the 10/11 Oct slot, a Sprint 7 deploy. The status this row carried (~~🔲 Backlog~~) was copied verbatim to Sprint 7, appended at 44 (ADR-035 append rank — a position, not a merit rank). This row's rank 8 is kept, not renumbered, and no other row here moved (ADR-035). Same day, by OWNER RULING *"Rename and fix links"*, its folder was renamed to `0392-read-the-post-0391-login-numbers-before-the-0340-deploy` (`git mv`, backlog → backlog; not a mover) and every link repointed. See the 2026-10-05 *`0392` move* addendum directly below this table.)* | 8 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0370`**, because the owner placed it at the top of this sprint (*"Fix: Sprint 7, check: Sprint 8 (Recommended)"*, 2026-10-05, the 2026-09-29 build/verify rule) and `0370` holds rank 1 by an earlier ruling; it also has the most work waiting behind it (`0340` and six more). Not placed there: "top" conflicts with ADR-035 — ranks 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done), and a new row always appends. Read it as top group. See the 2026-10-05 `0392` addendum below.)* | **Verify 0391 live — stale login share at most 5% over 7 days (the S2-exit re-check)** *(🆕 **FILED 2026-10-05** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given live 2026-10-05 via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. Threshold, verbatim: *"At most 5% (Recommended)"*. ~~After `0391`'s profile deploy, read the server stale share over 7 days; **pass = ≤5%**.~~ Read-only — owner, or an agent with the owner's approval for read-only SSH. ~~On pass `0340` may start, but **still needs the owner's explicit OK to enforce** ([ADR-121](../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md) Decision 4).~~ 📌 **RE-SCOPED 2026-10-05 (OWNER RULINGS relayed by `fkit-lead`, ⛔ not producer precedent; [ADR-122](../knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md))**: no 7-day window, no ≤5% bar, gates nothing on its own. After `0391`'s profile deploy (**Tue 6 Oct**), read stale share, `ok`, `id_mismatch`, `bad_payload` over whatever data exists **whenever the owner needs them** — first before the 10/11 Oct slot (`0340`'s deploy), again before each later deploy that reads `verified` — and record the owner's call each time. `0340` may start now; its deploy still needs the owner's explicit OK to enforce. ⚠️ First read is needed before a Sprint 7 deploy while this row is on Sprint 8 — move put to the owner, **not** done. Does **not** block [Sprint 7](done/plan-sprint-7.md)'s deploy.)* | [`0392-read-the-post-0391-login-numbers-before-the-0340-deploy`](../tasks/done/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) |
| ➡️ Moved to [Sprint 7](done/plan-sprint-7.md) — priority 45 *(2026-10-05 — OWNER RULING given live 2026-10-05 via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move to Sprint 7 (Recommended)"* — its deploy is the 10/11 Oct slot, during Sprint 7. The status this row carried (~~🔲 Backlog~~) was copied verbatim to Sprint 7, appended at 45 (ADR-035 append rank — a position, not a merit rank). This row's rank 9 is kept, not renumbered, and no other row here moved (ADR-035). See the 2026-10-05 *`0395` move* addendum directly below this table.)* | 9 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0370`**, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"*, `0370` already holds rank 1, and this task has a fixed date (the 10/11 Oct profile slot at the earliest). Not placed there: ranks 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done) — ADR-035 forbids renumbering them *"not even under an owner ruling"*; a spawned producer never re-ranks. Appended instead. See the 2026-10-05 `0395` addendum below.)* | **Verify 0340 live — deploy S3a and confirm verified logins in production** *(🆕 **FILED 2026-10-05** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS at `0340`'s plan gate (live `AskUserQuestion`, relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent): Q1 *"Split it (Recommended)"* — `0340` closes on build + review, this task carries the deploy, live check and ADR-113 note; Q2 *"I'll check once (Rec)"*. Gate: `0391` live, the owner's by-eye look at the post-`0391` numbers (`0392`, ADR-122), and a separate explicit owner approval to enforce. Profile server alone (not with `0250` S3b), 10/11 Oct at the earliest, outside 02:00–03:15 UTC; delta check; read-only watch; owner's ~2-minute DevTools check reporting only `vfy: true/false` (token never pasted); ⛔ one-way rollback — target the `0391` image, never pre-S2; then `fkit-architect` applies the ADR-113 note; runbook rollback-target line updated. Depends on `0340` and `0392`. ⚠️ **Does not block Sprint 7's deploy**; no Sprint 7 task was made to depend on it.)* | [`0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production`](../tasks/done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) |
| ➡️ Moved to [Sprint 7](done/plan-sprint-7.md) — priority 49 *(2026-10-06 — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move both to Sprint 7 (Recommended)"* — moved together with `0398`; the option text read *"The whole citizenship deploy-and-check chain sits on one board. Sprint 7 gets bigger, and some of it may still run past the sprint's end."* The status this row carried (~~🔲 Backlog~~) was copied verbatim to Sprint 7, appended at 49 (ADR-035 append rank — a position, not a merit rank). This row's rank 10 is kept, not renumbered, and no other row here moved (ADR-035). See the 2026-10-06 *`0396` + `0398` move* addendum directly below this table.)* | 10 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0370`**, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"* and `0370` already holds rank 1. Not placed there: ranks 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done) — ADR-035 forbids renumbering them *"not even under an owner ruling"*; a spawned producer never re-ranks. Appended instead. Read it as top group. See the 2026-10-06 `0396` addendum below.)* | **Verify 0250 S3b live — deploy the verified owner view and confirm it in production** *(🆕 **FILED 2026-10-06** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at [`0250`](../tasks/done/0250-authenticated-profile-read-for-paid-entitlement/brief.md)'s close, on the owner's standing build/verify-split rule (2026-09-29) as applied by `0250`'s owner-approved `plan-s3b.md` § 6 (2026-10-06), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent. Gates in order: `0340` deployed in its own earlier slot → [`0395`](../tasks/done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) confirms `vfy: true` live → the owner's ADR-122 look at the post-`0391` numbers → a weekend slot (earliest: after 10/11 Oct). Then a DevTools check: a verified paid test account's `GET /v1/profile` shows `is_paid_citizen: true`; a `vfy:false` session shows the S1 view — true/false only, never a token. Depends on `0250` (build) and `0395`. ⚠️ Open: Sprint 7 vs 8 placement; which test sessions exist.)* | [`0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production`](../tasks/done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md) |
| ➡️ Moved to [Sprint 7](done/plan-sprint-7.md) — priority 50 *(2026-10-06 — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move both to Sprint 7 (Recommended)"* — moved together with `0396`; the option text read *"The whole citizenship deploy-and-check chain sits on one board. Sprint 7 gets bigger, and some of it may still run past the sprint's end."* The status this row carried (~~🔲 Backlog~~) was copied verbatim to Sprint 7, appended at 50 (ADR-035 append rank — a position, not a merit rank). This row's rank 11 is kept, not renumbered, and no other row here moved (ADR-035). See the 2026-10-06 *`0396` + `0398` move* addendum directly below this table.)* | 11 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0396`**, because it cannot start until `0396` has confirmed the verified owner view live, and the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"*. Appending lands it directly below `0396` already; ADR-035, nothing renumbered. See the 2026-10-06 `0398` addendum below.)* | **Verify 0248 live — paid citizens see no interstitial ads in production** *(🆕 **FILED 2026-10-06** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at [`0248`](../tasks/done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md)'s close, on the owner's standing build/verify-split rule (2026-09-29), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent. Gates: [`0396`](../tasks/done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md) passed → [`0397`](../tasks/done/0397-show-players-whether-their-session-is-verified/brief.md) live or in the same deploy (owner ruling R3) → `0248` committed (owner's ask only) → a weekend slot. Owner's live checks: a verified paid account sees no interstitial at the six placements and `Ad:InterstitialSuppressed:PaidCitizen` fires; a non-paid and an earned-only account still get ads requested; `citizenship_ui` flipped off ⇒ ads return on a fresh session. Yes/no and counts only, never a token. Depends on `0248`, `0396`, `0397`. ⚠️ Open: Sprint 7 vs 8 placement; which test accounts exist; whether a production flag flip is acceptable.)* | [`0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production`](../tasks/done/0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md) |
| ➡️ Moved to [Sprint 7](done/plan-sprint-7.md) — priority 51 *(2026-10-06 — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move it to Sprint 7 (Recommended)"* — option text *"The whole chain really is on one board. It goes to the end of Sprint 7, at rank 51."* The status this row carried (~~🔲 Backlog~~) was copied verbatim to Sprint 7, appended at 51 (ADR-035 append rank — a position, not a merit rank). This row's rank 12 is kept, not renumbered, and no other row here moved (ADR-035). See the 2026-10-06 *`0396` + `0398` move* addendum directly below this table (its `0400` follow-up line).)* | 12 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0396`** (beside `0398`), because it cannot start until `0396` has confirmed the verified owner view live, and the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"*. "Top" conflicts with ADR-035: ranks 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done), and a new row always appends; ~~appending lands it directly below `0398`, in the right group.~~ *(📌 2026-10-06, later: `0396` and `0398` moved to [Sprint 7](done/plan-sprint-7.md) (49, 50) and this task followed at 51, directly below `0398` there; the placement words in this cell describe the Sprint 8 board and are history.)* Nothing renumbered. See the 2026-10-06 `0400` addendum below.)* | **Verify 0397 live: the session-status line shows the right state in production** *(🆕 **FILED 2026-10-06** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at [`0397`](../tasks/done/0397-show-players-whether-their-session-is-verified/brief.md)'s close, on the owner's standing build/verify-split rule (2026-09-29), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent. Gates: [`0395`](../tasks/done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) passed → [`0396`](../tasks/done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md) passed or same slot, server first (owner ruling Q4) → `0397` committed (owner's ask only) → a weekend slot. Owner's live checks on a real build: "Checking…" briefly, never a login button to a logged-in player; verified paid citizen sees "✓ Verified…"; unverified citizen sees the neutral not-confirmed text, no button; unverified non-citizen sees nothing new; forced read failure shows "couldn't load" + Restart (reloads only on the start screen; "Still not working" after a restart that didn't help); RU text; `citizenship_ui` off hides everything; the three `Citizenship:Status:*` events arrive in GameAnalytics. Yes/no and counts only, never a token. Run with [`0398`](../tasks/done/0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md) in the same slot. Depends on `0397`, `0395`, `0396`. ⚠️ Open: Sprint 7 vs 8 placement; which test accounts exist; how to get an unverified session in production; whether a production flag flip is acceptable.)* | [`0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production`](../tasks/done/0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md) |
| ➡️ Moved to [Sprint 7](done/plan-sprint-7.md) — priority 48 *(2026-10-06 — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move it to Sprint 7"* — the deploy may land inside Sprint 7 (same reasoning as `0396`/`0398`/`0400`). The status this row carried (~~🔲 Backlog~~) was copied verbatim to Sprint 7, appended at 48 (ADR-035 append rank — a position, not a merit rank). This row's rank 13 is kept, not renumbered, and no other row here moved (ADR-035). See the 2026-10-06 *`0401` move* addendum directly below this table.)* | 13 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0398`**, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"*, and `0301` deploys together with `0248`, whose live check is `0398`. "Top" conflicts with ADR-035: ranks 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done), and a new row always appends; appending lands it directly below `0400`, in the same group of verify rows. Nothing renumbered. See the 2026-10-06 `0401` addendum below.)* | **Verify 0301 live — the citizenship explainer popup works in production** *(🆕 **FILED 2026-10-06** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at [`0301`](../tasks/done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md)'s close, on the owner's standing build/verify-split rule (2026-09-29), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent. First the local look `0301` skipped (plan § 6 step 11: layout, ru/en, no raw keys, in `npm run dev`). Gates: that look passed → `0248`'s gates ([`0396`](../tasks/done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md) passed; [`0397`](../tasks/done/0397-show-players-whether-their-session-is-verified/brief.md) live or same deploy) → `0301` committed (owner's ask only) → a weekend slot. Owner's live checks: a real purchase from the popup, card switches without a reload; guest login from the popup inside Yandex; the popup inside the real Yandex iframe; the locked Create Lobby tap for a non-citizen tester opens this popup. Yes/no and event names only, never a token. Run with [`0398`](../tasks/done/0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md) in the same slot. Depends on `0301`, `0248`, `0396`, `0397`. ⚠️ Open: Sprint 7 vs 8 placement; whether a real purchase is acceptable and on which account; which tester account; who runs the local look.)* | [`0401-verify-0301-live-the-citizenship-explainer-popup-works-in-production`](../tasks/done/0401-verify-0301-live-the-citizenship-explainer-popup-works-in-production/brief.md) |
| ➡️ Moved to [Sprint 7](done/plan-sprint-7.md) — priority 53 *(2026-10-07 — OWNER RULING typed directly by the owner in the `fkit lead` session on 2026-10-07 (the owner's own message, not an `AskUserQuestion` answer), relayed verbatim by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move the refresh popup task to the Sprint 7"*. The status this row carried (~~🔲 Backlog~~) was copied verbatim to Sprint 7, appended at 53 (ADR-035 append rank — a position, not a merit rank; the owner named no placement). This row's rank 14 is kept, not renumbered, and no other row here moved (ADR-035). See the 2026-10-07 *`0404` move* addendum directly below this table.)* | 14 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0390`**, because the open rows above it are verify tasks and a discussion (the owner's standing rule puts verify tasks on top of a sprint), and this is a small build task whose main payoff is measurement-gated. Rows 8–13 are all `➡️ Moved`, so append and merit land in the same place. See the 2026-10-07 `0404` addendum below.)* | **"Please refresh the game" popup after about 24 hours — on the start screen only, never in a match** *(🆕 **FILED 2026-10-07** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed verbatim by `fkit-lead`; ⛔ not producer precedent. The exit for `0332` review finding R2 (a login pass older than 24 h makes the player read as unverified at join). Owner: *"show a popup that forces player to restart the game/refresh the page after certain time of playing (right now it's about 24h) … shouldn't break active matches, probably should be shown only on the main screen."* Reuses/extends `StaleBuildModal`. ~~⚠️ Open owner questions: exact threshold (producer recommends 23 h), force vs ask, RU/EN wording, everyone vs logged-in only.~~ 📌 **OWNER RULINGS 2026-10-07** via `AskUserQuestion` in the `fkit lead` session, relayed verbatim by `fkit-lead` to a spawned `fkit-producer` (no owner channel; ⛔ not producer precedent): *"23 hours (Recommended)"* · *"Force refresh (Recommended)"* (no close button) · *"Everyone (Recommended)"*. ⚠️ Still open: RU/EN wording — coder drafts at plan time, owner approves; does not block starting the plan. ⚠️ Whether a refresh yields a *verified* pass is unproven (ADR-121: Yandex may return the same signed data for the whole visit).)* | [`0404-refresh-the-game-popup-after-about-24-hours-start-screen-only`](../tasks/done/0404-refresh-the-game-popup-after-about-24-hours-start-screen-only/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 15 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs in the top group**, with the other verify tasks, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"*. Not placed there: ranks 2–4 and 8–14 are closed rows, and moving this row above them would renumber them — ADR-035 forbids that *"not even under an owner ruling"*; a spawned producer also never re-ranks. Appended after the highest rank (14, `0404`) instead — the reversible branch. See the 2026-10-07 `0405` addendum below.)* | **Verify 0332 live — read the two identity counters and confirm no session token reaches the logs** *(🆕 **FILED 2026-10-07** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at [`0332`](../tasks/done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md)'s close, on the owner's standing build/verify-split rule (2026-09-29) and the owner's close ruling (*"Close it (Recommended)"*, 2026-10-07, live `AskUserQuestion`), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent. After the weekend deploy (profile server first, then game image): read `geoconflict.profile.resolve.vouch{outcome}` (**per resolve, not per player**) and `geoconflict.server.match.identity{state}` (per player, at match start); compare the match-start verified share with the login share (ADR-124 re-raise trigger 2); search both servers' logs for any session token — expect none. Partly owner-executed (deploys); counter reads and log search are read-only, under the owner's read-only SSH / Uptrace approval — confirm it covers this task. Does **not** block Sprint 7's deploy.)* *(📌 **2026-10-10 — CLOSED `✅ Done (agent-closed — not owner-verified)`** on OWNER RULINGS (live `AskUserQuestion`, relayed by `fkit-lead`): *"Not 'much worse', leave it (Recommended)"* — ADR-124 trigger 2 recorded as not hit (match-start not verified 4.7 % vs login 2.45 %), no task; *"No complaints, close it (Recommended)"*. 0 token hits in ~3.0M log lines; `expired` 0 of 14,266 resolves. See the 2026-10-10 `0405`/`0406` close addendum below.)* | [`0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs`](../tasks/done/0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 16 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs in the top group**, with the other verify tasks, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"*. Not placed there: ranks 2–4 and 8–14 are closed rows, and moving this row above them would renumber them — ADR-035 forbids that *"not even under an owner ruling"*; a spawned producer also never re-ranks. Appended after the highest rank (15, `0405`) instead — the reversible branch. See the 2026-10-07 `0406` addendum below.)* | **Verify 0404 live — read the long-session refresh events and the after-refresh login split** *(🆕 **FILED 2026-10-07** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at [`0404`](../tasks/done/0404-refresh-the-game-popup-after-about-24-hours-start-screen-only/brief.md)'s close, on the owner's standing build/verify-split rule (2026-09-29), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent. After the weekend deploy (game image, client-only): read the six `Session:LongSessionRefresh:*` events (`Due` / `Shown` / `Waited` / `DeferredByDialog` / `PreemptedByStaleBuild` / `Refresh`) and the `Profile:Login:SignatureAge:AfterRefreshPopup:*` split — **do refreshed players come back verified?** (unproven; ADR-121 same-signed-data caveat); check `0332`'s `geoconflict.profile.resolve.vouch{outcome="expired"}` share falls (per resolve, not per player; cite [`0405`](../tasks/done/0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md) if it already read it). ⚠️ No event can appear until a page has been open **23 h** after the deploy — read after a few days. Partly owner-executed (deploy); agent reads under the owner's read-only approval — confirm it covers this task. Blocks nothing.)* *(📌 **2026-10-10 — CLOSED `✅ Done (agent-closed — not owner-verified)`** on OWNER RULING *"Close it as is"* (live `AskUserQuestion`, relayed by `fkit-lead`): the popup fires (`Due` 42, `Shown` 3, `PreemptedByStaleBuild` 11). ⚠️ **The main question — do refreshed players come back verified? — is NOT verified: no data** (0 `Refresh`, 0 `AfterRefreshPopup`). Open question recorded, no task: 3 shown, 0 presses. See the 2026-10-10 `0405`/`0406` close addendum below.)* | [`0406-verify-0404-live-read-the-long-session-refresh-events-and-the-after-refresh-login-split`](../tasks/done/0406-verify-0404-live-read-the-long-session-refresh-events-and-the-after-refresh-login-split/brief.md) |
| 🔲 Backlog | 17 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit its rank barely matters:** it blocks nothing and is time-gated (read once several days of data exist after the 2026-10-08 deploy). Appended after the highest rank (16, `0406`) — ADR-035, a position, not merit. See the 2026-10-08 `0418` addendum below.)* | **Recheck in GameAnalytics the two 0397 status events missing from the 2026-10-08 read** *(🆕 **FILED 2026-10-08** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING typed live in the `fkit lead` session 2026-10-08, relayed by `fkit-lead`, verbatim *"No need for the investigation, brief a task to the Sprint 8 to recheck the numbers in GameAnalytics."*; ⛔ not producer precedent. `Citizenship:Status:Unverified` and `Citizenship:Status:Restart` were not present in [`0400`](../tasks/done/0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md)'s check-8 read (2026-10-08, ~11:39Z; `ReadFailed` = 95, so the family reports). Re-read only, **no investigation**: per-day seen yes/no + counts over several days after game `0.0.157`; if still absent, the next step goes to the owner. Read-only; GameAnalytics via the owner's Chrome, owner logged in; no ids or tokens. Blocks nothing.)* | [`0418-recheck-in-gameanalytics-the-two-0397-status-events-missing-from-the-2026-10-08-read`](../tasks/backlog/0418-recheck-in-gameanalytics-the-two-0397-status-events-missing-from-the-2026-10-08-read/brief.md) |
| 🔲 Backlog | 18 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs at the very top of this board, beside `0370`**, because the OWNER RULED *"top of Sprint 8"* (2026-10-08) on his standing build/verify-split rule. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`), and ADR-035 never renumbers them, *"not even under an owner ruling"* — a new row always appends. Appended after the highest (17, `0418`). **Read it as the top group.** See the 2026-10-08 `0420` addendum below.)* | **Verify Sprint 7's popup, start-screen and private-lobby fixes live — one checklist for 0416, 0408, 0409, 0407, 0417, 0412, 0413** *(🆕 **FILED 2026-10-08** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session at the end of the Sprint 7 ship loop, relayed by `fkit-lead`; ⛔ not producer precedent. One owner-run checklist in the Yandex Games shell, no real purchase: private-lobby Start works with no 403 and the log's create line carries `, creator: …` (`0416`); paid-only sub-heading (`0408`); Buy button on the earned verified account — look only, never tap (`0409`); paid thank-you line (`0407`); wider popup, dark scrollbar (`0417`); Приватная tab (`0412`); join window hint (`0413`; its error-window copy is **not checked live** — owner ruling 2026-10-08). Two passes possible: `0416`/`0407`–`0409` cleared for a same-day deploy (*"might"*), `0412`/`0413`/`0417` weekend slot. Pass/fail + who/when per item. `0382` excluded — that is `0383`. Blocks nothing; does not block Sprint 7's deploy.)* | [`0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist`](../tasks/backlog/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md) |
| ⛔ Cancelled (agent-closed — not owner-verified) (2026-10-09) — Merged into 0420 by owner ruling 2026-10-09 ('Fold into 0420') | 19 *(append rank — ⚠️ **Priority 19 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0420`, in the top group**, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task at the top of the next sprint, and `0420` checks the same popup with the same test accounts. Not inserted higher: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`), and ADR-035 never renumbers them — a new row always appends. Appended after the highest (18, `0420`), which is directly below `0420`. **Read it as the top group.** See the 2026-10-09 `0422` addendum below.)* | **Verify 0421 live: the shorter citizenship popup on a real phone inside Yandex Games** *(🆕 **FILED 2026-10-09** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at `0421`'s close, on the owner-approved `0421` plan (*"the verify task is filed at close"*) and the standing build/verify-split rule; ⛔ not producer precedent. OWNER-executed, ru, real phone, portrait (landscape optional, *not run* allowed), game `0.0.161`: (a) non-citizen — Buy visible without scrolling, text matches `0421`'s approved table; (b) earned test account — no "Получите бесплатно" line, paid-Buy button visible, ⛔ **never tap Buy**; (c) paid account — no free line, no Buy button. Pass/fail/not run per step; no ids. No size target (owner ruling 2026-10-08), so a "Buy not visible" result is a question for the owner, not a failure. Its checks are now `0420` item 8. Depends on `0421`; blocks nothing.)* | [`0422-verify-0421-live-the-shorter-citizenship-popup-on-a-real-phone-inside-yandex-games`](../tasks/cancelled/0422-verify-0421-live-the-shorter-citizenship-popup-on-a-real-phone-inside-yandex-games/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 20 *(append rank — ⚠️ **Priority 20 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0420`**, because the owner found these tooltips while running `0420`'s checklist and believes they break a Yandex Games rule — a compliance fix for the game's only storefront. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`, `0422`), and ADR-035 never renumbers them — a new row always appends. Appended after the highest (19, `0422`). See the 2026-10-09 `0415`/`0423` addendum below.)* | **No native browser tooltips anywhere in the UI — `o-button` / `o-modal` stop carrying a `title` attribute, and every other `title` tooltip in the client goes** *(➡️ **PULLED FROM THE [Backlog board](backlog.md) 2026-10-09** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live via `AskUserQuestion` in the coordinating Claude Code session, verbatim **"Move 0415 into Sprint 8 (Recommended)"**; ⛔ not producer precedent. Seen live on `0.0.161` (owner screenshots 2026-10-09): the join window's "Присоединиться к лобби" button (`JoinPrivateLobbyModal.ts:176`) and the single-player window's "Начать игру" button (`SinglePlayerModal.ts:398`, owner: *"Confirmed: the START button also have the same tooltip"*); on `0.0.157` the host window showed "Приватное лобби". Owner: generic hints are *"forbidden by Yandex.Games rules"*. Whole task, unchanged scope: §1 the two shared components, §2 every other `title`; plan-gate point for icon-only controls (owner confirms each). Same `Modal.ts` file as `0423` — whichever lands second rebases. Client-only, both templates. Live check filed at close. Weekend slot unless the owner says otherwise. Depends on nothing; blocks nothing.)* | [`0415-no-native-browser-tooltips-anywhere-in-the-ui`](../tasks/done/0415-no-native-browser-tooltips-anywhere-in-the-ui/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 21 *(append rank — ⚠️ **Priority 21 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0415`**, because it is low-priority visual polish (nothing broken, no platform rule), while `0415` is a Yandex-rules fix in the same file. 21 is already directly below `0415`. See the 2026-10-09 `0415`/`0423` addendum below.)* | **Dark thin scrollbar in every game window (shared `o-modal` first), matching the citizenship popup** *(🆕 **FILED 2026-10-09** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live via `AskUserQuestion` in the coordinating Claude Code session, verbatim **"Brief a small task, Sprint 8 (Recommended)"**; ⛔ not producer precedent. Seen live on `0.0.161`: the "Одиночная игра" window shows the light default scrollbar. Cause: the dark scrollbar lives in `styles.css`, which does not reach into the shadow-DOM `o-modal` (`Modal.ts`, two scrolling areas). Fix once in the shared component where possible; coder inventories other scrolling windows. Reference look `0417` (no `scrollbar-color` — it turns the rules off in Chromium). Chromium-based only, Firefox not. `0419`'s seven small popups stay with `0419` (assumption, flagged). Same `Modal.ts` as `0415` — whichever lands second rebases. Live check folded into `0429` (owner ruling 2026-10-09, verbatim **"Add a line to 0429 (Recommended)"**). Depends on nothing; blocks nothing.)* | [`0423-dark-thin-scrollbar-in-every-game-window`](../tasks/done/0423-dark-thin-scrollbar-in-every-game-window/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 22 *(append rank — ⚠️ **Priority 22 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs at the very top of this board, directly beside `0420`**, because it unblocks live checks that cannot run today (`0420`'s earned-account items, possibly `0376`) and the owner asked for it *"as one of the first things"*. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`, `0422`), and ADR-035 never renumbers them — a new row always appends. Appended after the highest (21, `0423`). An owner re-rank can lift it only to 20 (top of the open run `0415`, `0423`; `0422`'s cancelled row at 19 is a wall). **Read it as the top group.** See the 2026-10-09 `0425` addendum below.)* | **SSH-only tester roles: apply a fixed test role (non-citizen, earned, paid, …) to an allowlisted tester record, and restore it** *(🆕 **FILED 2026-10-09** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST typed by the owner in the coordinating Claude Code session plus three OWNER RULINGS given live via `AskUserQuestion` there; ⛔ not producer precedent. Why: since the 2026-10-08 incident (`0424`) there is no earned-citizen test account. One operator command on the profile box, SSH only (`0312` shape): `apply <tester> <role>` (exactly two inputs), `restore <tester>`, read-only `show <tester>`. Box-only, owner-edited tester allowlist (one entry; fail closed). Roles fixed in code: non-citizen, almost a citizen (99 XP), earned, paid (flag only — **no fake purchase record**), brand-new (0 XP, tenure gift reset). Copy-from-a-real-player mode **left out** (owner ruling). Save before first apply, exact restore (owner ruling). Touches only the tester's rows; every run logged on the box. Each production run needs the owner's in-session OK; first live run filed at close. Architect consult suggested at plan. Depends on nothing; blocks `0420` (earned items), `0376` (only if it needs an earned host).)* | [`0425-ssh-only-tester-roles-apply-a-fixed-test-role-to-an-allowlisted-tester-and-restore-it`](../tasks/done/0425-ssh-only-tester-roles-apply-a-fixed-test-role-to-an-allowlisted-tester-and-restore-it/brief.md) |
| 🔲 Backlog | 23 *(append rank — ⚠️ **Priority 23 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs last on this board, directly below `0425`**, because by design it runs after every other Sprint 8 build task and ships in the final Sprint 8 deploy. 23 already sits there. **Rank barely matters — the brief's Timing rule governs when it starts.** See the 2026-10-09 `0426` addendum below.)* | **Update the news window: tell players everything that shipped since 2026-06-06 (end of Sprint 8, before its final deploy)** *(🆕 **FILED 2026-10-09** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST typed by the owner in the coordinating Claude Code session; ⛔ not producer precedent. The newest news entry is `2026-06-06-game-update` (shipped in `0.0.136`); 25 prod deploys since (`0.0.137`–`0.0.161`) told players nothing. New entry (or a few — coder proposes) in `resources/announcements.json`, en + ru in sync, Russian first; player-visible changes only, live for everyone at deploy time (owner gives `citizenship_ui` / `private_lobbies_all` values); no game name (`0311` test). ⛔ Owner approves the exact text + included/excluded list before the file is edited; recorded in the worklog. **Timing:** starts after the last Sprint 8 build task is built, ships in the final Sprint 8 deploy, never ahead of a feature it names. `resources/changelog.md` is an unused upstream sample — out of scope. Live look filed at close. Depends on `0415`, `0423` and any later Sprint 8 build task in that deploy; blocks nothing.)* | [`0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06`](../tasks/backlog/0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/brief.md) |
| 🔄 In progress *(2026-10-09 — moved in from [Sprint 7](done/plan-sprint-7.md), where it read ~~🚧 Blocked~~ on the G3/G4 deferral. That deferral is LIFTED by OWNER RULING 2026-10-09 (live `AskUserQuestion`, *"Yes, un-pause in Sprint 8 (Recommended)"*, relayed to a spawned `fkit-producer` with no owner channel; ⛔ not producer precedent). `🔄 In progress`, not `🔲 Backlog`: all of G1–G4 is built and deployed (2026-09-26), G1 is verified, and what is left is owner-side setup and live drills — not a build for the sprint loop to re-plan. **Left:** B3 (the two outside uptime monitors, alerting to Telegram + email); confirm B2's daily check alerts to Telegram (it exists and emailed the owner on 2026-09-25 — Telegram not confirmed); drills B7–B10 (watch each alert arrive); and B6/V2, only partial — the 2026-09-26 prune removed the Postgres image tag the compose file names, fix direction not decided. The 2026-09-13 hold-open ruling still stands: no close until the alerts are seen arriving.)* | 24 *(append rank — ⚠️ **Priority 24 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0370`, at the top of this board**, because it carries a dated fuse: the profile box's certificate renewal starts real attempts around 2026-10-21 and the certificate expires 2026-11-20 (both dates reported, never verified from the repo), and until these alarms are on and tested a failed renewal is silent. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`, `0422`), and ADR-035 never renumbers them. See the 2026-10-09 `0219` addendum below.)* | **P4 — Operability on the profile box: log rotation, image prune, an outside uptime check, and a reader for `last-backup.json`** *(➡️ **MOVED IN FROM [SPRINT 7](done/plan-sprint-7.md) ON 2026-10-09** — OWNER RULING typed by the owner in the coordinating session, verbatim *"Move the task to Sprint 8"*, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner-participation task: the owner sets up the outside monitors and runs the drills on the box. Effort small; consequence high — the "outage nobody noticed for three weeks" class. Depends on `0215` and `0241`, both ✅ Done. Parent epic `0213` — not touched by this move. Full history: the brief and the [Sprint 7](done/plan-sprint-7.md) row.)* | [`0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness`](../tasks/backlog/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) |
| 🔲 Backlog *(2026-10-09 — moved in from [Sprint 7](done/plan-sprint-7.md) with the status it carried there, unchanged. Open; waits only on `0219` — the epic's only unmet completion criterion is item 8, `0219`'s P4 work; item 9 is partly met by the earlier owner ruling Q2.)* | 25 *(append rank — ⚠️ **Priority 25 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0219`**, because the epic closes when `0219` closes. 25 already sits there. See the 2026-10-09 `0219` / `0213` addendum below.)* | **EPIC — Profile backend + S3: wipe and rebuild onto the existing box and bucket (P0–P7)** *(➡️ **MOVED IN FROM [SPRINT 7](done/plan-sprint-7.md) ON 2026-10-09** — OWNER RULING typed by the owner in the coordinating session, verbatim *"Move it to the Sprint 8"*, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Tracking epic, no build of its own. Child phases are closed except `0219` (P4), directly above. Full history: the brief and the [Sprint 7](done/plan-sprint-7.md) row.)* | [`0213-profile-backend-clean-slate-rebuild`](../tasks/backlog/0213-profile-backend-clean-slate-rebuild/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 26 *(append rank — ⚠️ **Priority 26 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs at the very top of this board, directly beside `0370`**, because the owner asked for it *"the first thing"*: every full test run on the owner's Mac risks another crash and slows every other task's checks. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`, `0422`), and ADR-035 never renumbers them — a new row always appends. Appended after the highest (25, `0213`). **Read it as the top group.** See the 2026-10-09 `0427` addendum below.)* | **Project-wide lock so only one full jest run happens at a time, plus `--detectOpenHandles --forceExit` on the unit run** *(🆕 **FILED 2026-10-09** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST typed by the owner in the coordinating Claude Code session plus two OWNER RULINGS given live via `AskUserQuestion` there; ⛔ not producer precedent. Why: Mac kernel panics 2026-10-06 and 2026-10-08 during full runs, and a session lost to CPU overload 2026-10-09 with a forgotten background full run; `maxWorkers: 1` is per run, so parallel agents still stack full runs. One lock shared by `npm test`, `test:coverage`, `test:integration`, in git's shared dir (all worktrees); holds pid + start time; dead holder → taken over. A second full run **waits its turn with a clear message** naming holder and start time, then starts by itself (Ruling 1). Targeted runs and `--watch` not locked. `--detectOpenHandles --forceExit` on unit + coverage runs only (Ruling 2); integration keeps `0197`'s no-`--forceExit` rule. Trade-offs accepted: slower runs, `--forceExit` can hide a unit-suite handle leak, `npx jest` bypasses the lock (CLAUDE.md: always use npm scripts). Cause of the panics still unproven. Depends on nothing; blocks nothing. ✅ **CLOSED 2026-10-09** by a spawned `fkit-producer` on the OWNER RULING *"Commit, then close task"* (relayed; ⛔ not producer precedent); work committed in `1926f4c`. Proof: 15/15 lock tests, a real-lock-path check with a stub runner, lint/tsc clean, one full `npm test` through the wrapper — exit 0, 74 s, 216/216 suites, 4400 passed, 1 skipped (Docker-probed harness, Docker down — skipped, not passed). ⚠️ **Not done:** the owner's own two-terminal check (second full run waits, then starts) — the waiting behaviour is proven only by the automated tests and the stub check; 74 s vs the 292 s baseline is **not like-for-like**. ⚠️ No-git fallback differs from the brief's default: a lock file, not an unlocked run (coder's choice, in the worklog).)* | [`0427-project-wide-lock-so-only-one-full-jest-run-happens-at-a-time`](../tasks/done/0427-project-wide-lock-so-only-one-full-jest-run-happens-at-a-time/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 27 *(append rank — ⚠️ **Priority 27 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0370`, at the top of this board**, because the owner's build/verify rule puts a verify task at the top of the next sprint, and what is left of it is small. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`, `0422`), and ADR-035 never renumbers them. See the 2026-10-09 private-lobby release addendum below.)* | **Verify private lobbies in production — a real citizen hosts inside the Yandex Games page, a friend joins, the match starts and ends** *(➡️ **MOVED IN FROM THE [BACKLOG BOARD](backlog.md) ON 2026-10-09** — OWNER RULING typed by the owner in the coordinating Claude Code session on 2026-10-09 (the owner's own message), verbatim *"1. Yes move to the Sprint 8 and brief a dedicated task for the Sprint 8 to turn the private lobbies on for everybody."*, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Release-gate item 2 in `0354`. **Mostly passed live 2026-10-09** (game `0.0.161`, run as `0420` item 1 + `0383`): a paid citizen tester hosted inside Yandex Games on the computer; a **non-tester, non-citizen** second account on a phone joined by the Yandex invite link; the match started for both; no `403`, no "Не удалось начать игру"; server log counts: 1 create line with the creator, 0 "creator not a citizen" refusals; tester sees three tabs, non-tester two. 📌 **2026-10-10 — CLOSED `(agent-closed — not owner-verified)`**, OWNER RULING verbatim **"Gate item 2 passed, close both (Recommended)"**; ⛔ not producer precedent. Second run, `0.0.161`: `0353` host-window check pass; `0389` (a) code as `XXXX XXXX` pass; a non-citizen **non-tester** on an iPhone joined inside Yandex by the invite link; match started; the host played to the win screen, the friend quit back to the start screen; console (owner's screenshot): `citizenship_ui` = `enabled`, `private_lobbies` and `private_lobbies_all` not set; log: 2 create lines with the creator, 0 refusals, `start_game` 1 × 200 / 0 × 403. **Not run:** `0389` (b) lowercase code typing — OWNER RULING *"skip tester"* (typed), carried by `0428` step 4b. See the worklog and the 2026-10-10 close addendum below. Observation, not a fail: re-opening the same link after leaving put the friend back into the running match with a fast-forward catch-up. Owner-executed. Blocks `0428`.)* | [`0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins`](../tasks/done/0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 28 *(append rank — ⚠️ **Priority 28 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0376`, near the top of this board**, because it is the one gate item whose answer nobody can predict, and a reproduced race needs a fix, a build and a deploy before `0428` — starting early keeps it off the critical path. 28 already sits there. See the 2026-10-09 private-lobby release addendum below.)* | `handleJoinLobby()` leaves a stale `gameStop` across three awaits — two fast `join-lobby` events can interleave *(➡️ **MOVED IN FROM THE [BACKLOG BOARD](backlog.md) ON 2026-10-09** — OWNER RULING typed by the owner in the coordinating Claude Code session on 2026-10-09 (the owner's own message), verbatim *"1. Yes move to the Sprint 8 and brief a dedicated task for the Sprint 8 to turn the private lobbies on for everybody."*, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Release-gate item 3 in `0354`: an **investigation first**; by the 2026-10-03 rulings (*"Only if it's proven"*, *"No, needs a real repro"*) it is fixed only if actually reproduced, and **drops off the gate if not**. No new evidence 2026-10-09. Owner `fkit-coder`. Full history: the brief and the Backlog board row. Blocks `0428` unless it ends as *not reproduced*.)* | [`0228-handlejoinlobby-stale-gamestop-race`](../tasks/done/0228-handlejoinlobby-stale-gamestop-race/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 29 *(append rank — ⚠️ **Priority 29 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0376`, in the top group with `0370`**, because it is a short owner live check and its remaining steps can run in the same session as `0376`'s leftovers. Not inserted there: closed rows sit below the top, and ADR-035 never renumbers them. See the 2026-10-09 private-lobby release addendum below.)* | **Verify `0380` in production — ~~the Yandex invite copies the code~~, and old `#join=` links are ignored** *(➡️ **MOVED IN FROM THE [BACKLOG BOARD](backlog.md) ON 2026-10-09** — OWNER RULING typed by the owner in the coordinating Claude Code session on 2026-10-09 (the owner's own message), verbatim *"1. Yes move to the Sprint 8 and brief a dedicated task for the Sprint 8 to turn the private lobbies on for everybody."*, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Release-gate item 6 in `0354` (with `0383`, passed 2026-10-09). **Step 1 (pasted text is the code only) and step 6 (mobile repeat) are superseded by `0382`** — the invite now copies a Yandex Games link via the SDK, proven live by `0383` on `yandex.ru` and `yandex.com`; the paste-button question is answered (no paste button, `0420`). 📌 **2026-10-10 — CLOSED `(agent-closed — not owner-verified)`**, same OWNER RULING as `0376` (**"Gate item 2 passed, close both (Recommended)"**; ⛔ not producer precedent). Step 2 (code shown) **pass**. **Not run:** step 3 (code join — moved to `0428` step 4b by *"skip tester"*); step 4 (old `#join=` link) by OWNER RULING, typed, *"We didn't have private lobbies with private links before, so no links existed before"* — the Yandex build ignoring `#join=` stays **unproven live**; step 5 (standalone). See the worklog and the 2026-10-10 close addendum below. Old text struck in the brief, not deleted. Owner-executed. Blocks `0428`.)* | [`0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored`](../tasks/done/0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored/brief.md) |
| 🔲 Backlog | 30 *(append rank — ⚠️ **Priority 30 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0381`**, because it is the last step of the private-lobby release chain and cannot start before `0376`, `0228` and `0381` finish. 30 already sits there. See the 2026-10-09 private-lobby release addendum below.)* | **Turn private lobbies on for everyone — set the `private_lobbies_all` everyone-flag in the Yandex Games console** *(🆕 **FILED 2026-10-09** by a spawned `fkit-producer` — OWNER RULING typed by the owner in the coordinating Claude Code session on 2026-10-09 (the owner's own message), verbatim *"1. Yes move to the Sprint 8 and brief a dedicated task for the Sprint 8 to turn the private lobbies on for everybody."*, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner-run console step, no build, no deploy: record `private_lobbies_all`, `citizenship_ui` and the old `private_lobbies` **before and after**; set `private_lobbies_all` = `enabled` with no condition; **live check right after** (reload first — flags are read once per page load): a non-tester sees the Приватная tab, a non-citizen can join (by code), Create stays citizen-only (explainer opens; the server's citizens-only start check is independent of the flag), read-only server-log counts with the owner's OK. **Rollback:** delete the flag; players lose the tab on next page load. Needs `citizenship_ui` on for everyone, or the flag does nothing. Records the accepted forged-citizen-id risk (`0332` Q4). **For `0426`:** its news may name private lobbies only if this flag is on before that deploy. Open questions: must `0390` (live check of gate item 4, `0377`) pass first *(📌 2026-10-10: `0390` has **passed** — closed `✅ Done (agent-closed — not owner-verified)`; see the 2026-10-10 `0390` close addendum above)*; flip timing vs the final deploy. Depends on `0376`, `0228`, `0381`, and `0433` (`0228`'s live check — OWNER RULING 2026-10-10, verbatim **"File it, before 0428 (Recommended)"**; ⛔ not producer precedent); *(📌 2026-10-10, later: `0376` and `0381` are **closed** `✅ Done (agent-closed — not owner-verified)` — OWNER RULING **"Gate item 2 passed, close both (Recommended)"**; ⛔ not producer precedent. `0428` now waits only on `0433` (`0228` committed + deployed + its live check). Its step 4b now also carries `0389`'s lowercase code-typing check and `0381` step 3 (a non-citizen joins by typing the code in lowercase) — OWNER RULING *"skip tester"* (typed). Status unchanged. See the 2026-10-10 `0376`/`0381` close addendum above.)* gate items 1, 4, 5 (`0354`, `0377`, `0301`) are closed — all three agent-closed, not owner-verified.)* | [`0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console`](../tasks/backlog/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md) |
| 🔲 Backlog | 31 *(append rank — ⚠️ **Priority 31 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0428`** — exactly where it sits — because the owner ruled "Bottom of Sprint 8" and it can only run after the deploy that carries `0415`. See the 2026-10-09 `0429` addendum below.)* | **Verify `0415` live — no native browser tooltips inside the Yandex Games iframe** *(🆕 **FILED 2026-10-09 at `0415`'s close** by a spawned `fkit-producer` — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` (ADR-021/037), verbatim **"Bottom of Sprint 8"**; ⛔ not producer precedent. **Executed by the owner (human)** with a real mouse hover — screenshots cannot show native tooltips. Short version of `0415`'s step 3: start-screen buttons, host and join windows, the join window's "Присоединиться к лобби" button, the single-player window's "Начать игру" button, one in-game panel. **+ one `0423` line** (OWNER RULING 2026-10-09, live `AskUserQuestion` in the `fkit lead` session, verbatim **"Add a line to 0429 (Recommended)"**; ⛔ not producer precedent): game windows show the dark thin scrollbar, not the light default. Weekend slot unless the owner says otherwise. Depends on `0415` and `0423` committed and deployed; blocks nothing.)* | [`0429-verify-0415-live-no-native-browser-tooltips-inside-the-yandex-games-iframe`](../tasks/backlog/0429-verify-0415-live-no-native-browser-tooltips-inside-the-yandex-games-iframe/brief.md) |
| 🔲 Backlog | 32 *(append rank — ⚠️ **Priority 32 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs at the very top of this board, directly beside `0420`**, because it unblocks `0420`'s earned-account items (and possibly `0376`) and the owner ruled its deploy urgent. Not inserted there: closed rows sit below the top, and ADR-035 never renumbers them. **Read it as the top group.** See the 2026-10-09 `0425` close addendum below.)* | **Verify `0425` live — deploy tester roles to the profile box, apply "earned citizen" to the tester, and restore it** *(🆕 **FILED 2026-10-09 at `0425`'s close** by a spawned `fkit-producer` — OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` (ADR-021/037), verbatim **"Close + file both (Recommended)"** and, on deploy timing, **"Urgent: after review passes"** — a **mid-week profile deploy**, an exception to the weekend-slot rule for this deploy only; ⛔ not producer precedent. **Executed by the owner (human)**; every production write needs the owner's OK in-session. Steps, per `profile-tester-roles-runbook.md`: deploy (new image, migration `008`, new compose mount); create the allowlist (only if absent); find the tester's internal id (recommended devtools way); `show` → `apply <id> earned-citizen` → `show` → reload and confirm the earned view; later `restore` + `show`; re-run the full backup dry-run where MinIO can be pulled (only the drill's SQL path was proven). Warnings: no real purchase while a role is on; apply between matches. Depends on `0425` committed; unblocks `0420` (earned items), possibly `0376`.)* | [`0430-verify-0425-live-deploy-tester-roles-and-apply-earned-citizen-to-the-tester`](../tasks/backlog/0430-verify-0425-live-deploy-tester-roles-and-apply-earned-citizen-to-the-tester/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 33 *(append rank — ⚠️ **Priority 33 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit its rank barely matters:** a small test-only fix that blocks nothing, though `npm run test:integration` stays red on `dev` until it lands. Appended after the highest (32, `0430`). See the 2026-10-09 `0425` close addendum below.)* | **Update `Routes.it.test.ts` to expect the `verified` field the resolve route now returns** *(🆕 **FILED 2026-10-09 at `0425`'s close** by a spawned `fkit-producer` — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` (ADR-021/037), verbatim **"File a small fix task (Recommended)"**; ⛔ not producer precedent. Two tests (~`:318`, ~`:367`) fail on `dev` before `0425` (proven on a clean `HEAD` worktree); ~~likely since `0340` / commit `71efd10` — traced from logs, not bisected~~ — ⚠️ corrected 2026-10-10: since commit `077c9e3`, task `0332` (ADR-124), confirmed by blame and `git log -S`. Test-only; no deploy. Owner `fkit-coder`. Depends on nothing; blocks nothing.)* | [`0431-update-routes-it-test-to-expect-the-verified-field-on-resolve`](../tasks/done/0431-update-routes-it-test-to-expect-the-verified-field-on-resolve/brief.md) |
| 🔲 Backlog | 34 *(append rank — ⚠️ **Priority 34 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly above `0428`** (rank 30), because `0428` now waits for it. The owner ruled "the bottom of Sprint 8"; appended after the highest (33, `0431`) — ADR-035 never renumbers rows. See the 2026-10-10 `0228` close addendum below.)* | **Verify `0228` live — a quick leave, a double Join, or closing the window during a lobby join all take effect** *(🆕 **FILED 2026-10-10 at `0228`'s close** by a spawned `fkit-producer` — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` (ADR-021/037), verbatim **"File it, before 0428 (Recommended)"**; ⛔ not producer precedent. **Executed by the owner (human)** inside the Yandex Games page, ideally a phone on a weak connection, after 5+ minutes on the start screen (the cosmetics file's 5-minute cache — otherwise the window is too small to hit): (a) public lobby card, click again to leave quickly — not pulled into the match; (b) host a private lobby, the other account double-taps Join — listed once, stays connected; (c) Join then close the window right away — not left in the host's list; (d) normal join/leave, Solo and Tutorial still start. Also covers `0228`'s unproven points (browser proof older than the R1 fix; no phone / Yandex page / Tutorial / Solo; production's same-player kick). Weekend slot unless the owner says otherwise. Depends on `0228` committed and deployed; **blocks `0428`**.)* | [`0433-verify-0228-live-quick-leave-double-join-and-close-during-a-lobby-join`](../tasks/backlog/0433-verify-0228-live-quick-leave-double-join-and-close-during-a-lobby-join/brief.md) |

> 🆕 **Addendum — 2026-10-10, newest (above all others): verify task `0370` (for `0367`, 1-minute public lobbies) closed (agent-closed). ⚠️ Step 5 (the day-7 read) was NOT run. One recheck task filed on the Backlog board: `0435`. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULING typed by the owner in the `fkit lead` session on 2026-10-10** (the owner's own message,
> not an `AskUserQuestion` answer), relayed verbatim by `fkit-lead` to a spawned `fkit-producer` holding **no owner
> channel** (ADR-021/037). ⛔ **Not producer precedent.** Verbatim: *"Regarding 0370 - you can close the task, but add
> one task to Backlog, to recheck the numbers after a while (no specific date, whenever we got back to the task)"*.
>
> **OUTCOME.**
> - [`0370`](../tasks/done/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md)
>   closed `✅ Done (agent-closed — not owner-verified)` (rank 1). Step 6 OWNER RULING (2026-10-10) **"Keep 1 minute"**
>   stands: 1-minute public lobbies stay, **overriding the 15 % lone-player line** (6-day lone share 17.7 % vs 11.8 %
>   Before; match entries/day +30 %). No revert task.
> - ⚠️ **NOT RUN:** Step 5, the day-7 read (After window 2026-10-04 → 2026-10-11), both sources — the owner closed the
>   task first; `fkit-lead` cancelled the scheduled night read. **Verification step 6 is not met.**
> - **Filed:** [`0435`](../tasks/backlog/0435-recheck-the-1-minute-public-lobby-numbers-some-time-later/brief.md) on the
>   [Backlog board](backlog.md), unscheduled, no date (*"whenever we got back to the task"*): re-run `0370`'s Step 1 query
>   for a recent 7 days, read GameAnalytics `Game:Mode:Multiplayer`, compare with `0370`'s recorded Before and After
>   numbers, and put keep/revert to the owner again. Depends on nothing; blocks nothing.
> - The Before window's raw server rows age out of Uptrace about now (~14-day retention); `0370`'s worklog holds the
>   recorded Before numbers, which is what `0435` compares against.
> - Details in `0370`'s `worklog.md` (2026-10-10 CLOSED entry). No row was renumbered (ADR-035).
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched; nothing committed or pushed; nothing under
> `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-10, newest (above all others): verify tasks `0376` (gate item 2) and `0381` (gate item 6, the `0380` part) closed (agent-closed). Gate item 2 PASSED by owner statement. ⚠️ `0381` closes with steps 3, 4, 5 NOT RUN, by owner rulings. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-10** (the owner's
> own selection), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent.** Verbatim: **"Gate item 2 passed, close both (Recommended)"** — option text *"Producer
> records everything and closes 0376 and 0381 (agent-closed). 0428 then waits only on 0433 (0228's live check after its
> deploy)."* Two further rulings, **typed** by the owner in the same session: **"skip tester"** (the lowercase
> code-typing check moves to `0428` step 4b) and, on `0381` step 4, *"We didn't have private lobbies with private links
> before, so no links existed before"*.
>
> **OUTCOME.**
> - [`0376`](../tasks/done/0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md) closed `✅ Done (agent-closed — not owner-verified)` (rank 27). Second run 2026-10-10,
>   ~15:07–15:27 UTC, game `0.0.161`. Host: paid citizen tester, computer, Chrome, inside Yandex Games. Friend:
>   non-citizen, **non-tester**, iPhone, inside Yandex Games, joined by the Yandex invite link. Step 2 + `0353`
>   host-window check **pass**; `0389` (a) **pass**; steps 3, 4, 5 **pass** (host played to the win screen; the friend
>   quit to the start screen). Console (owner's screenshot): `citizenship_ui` = `enabled`, `private_lobbies` and
>   `private_lobbies_all` not set; conditions not visible. Log (read-only, owner-approved): 2 create lines with the
>   creator (26 s apart, unexplained), 0 refusals, `start_game` 1 × 200 / 0 × 403. Step 1 cited from `0420` item 6.
>   ⚠️ **NOT RUN:** `0389` (b) lowercase code typing — carried by `0428` step 4b.
> - [`0381`](../tasks/done/0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored/brief.md) closed `✅ Done (agent-closed — not owner-verified)` (rank 29). Step 2 (code shown)
>   **pass**. ⚠️ **NOT RUN:** step 3 (code join — moved to `0428` step 4b); step 4 (old `#join=` link — owner ruling
>   above; **the Yandex build ignoring `#join=` stays unproven live**); step 5 (standalone).
> - [`0428`](../tasks/backlog/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md): status
>   **unchanged** (`🔲 Backlog`). Of its dependencies, only [`0433`](../tasks/backlog/0433-verify-0228-live-quick-leave-double-join-and-close-during-a-lobby-join/brief.md)
>   is left (`0228` committed + deployed + its live check). Its step 4b now also carries `0389`'s lowercase
>   code-typing check and `0381` step 3. Notes added to its row and brief.
> - Details in each task's `worklog.md` (2026-10-10 entry). No row was renumbered (ADR-035).
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched; nothing committed or pushed; nothing under
> `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-10, newest (above all others): verify task `0390` (for `0377`) closed (agent-closed) as a PASS on cases 1 and 3 and "no collateral". One follow-up filed on the Backlog board: `0434`. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-10** (the owner's
> own selection), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent.** Verbatim: **"Close 0390 + file task for (A) (Recommended)"** — option text *"Producer
> closes 0390 (agent-closed) with these results, and files a small backlog task: the host window should stop polling
> once its lobby is gone. (B) is noted only."*
>
> **OUTCOME.**
> - [`0390`](../tasks/done/0390-verify-0377-live-an-abandoned-private-lobby-ends-after-30-minutes-and-an-occupied-one-does-not/brief.md) closed `✅ Done (agent-closed — not owner-verified)` (rank 7). Game `0.0.161`
>   (live since 2026-10-09). The owner did the clicks in the Yandex Games page with a paid citizen tester account;
>   `fkit-lead` read the game container's log read-only over SSH in the owner's session, each command owner-approved
>   (a spawned coder's attempt had been refused by the permission filter and was not worked around).
>   - **Case 1 (abandoned after a join): PASS** — `private lobby ended, no client connected` about 30 min after the host
>     left, `anyClientJoined: true`, `idleMs: 1800139`.
>   - **Case 3 (occupied): PASS** — no idle-end line; the lobby lasted until the pre-existing 3-hour cap ended it
>     (expected, outside this check). ⚠️ The hidden tab's connection dropped and rejoined every 2–3 min from about
>     36 min in (likely Chrome throttling, not confirmed); each rejoin reset the idle clock, so it stayed occupied.
>   - **No collateral (step 5): PASS** — over about 6 hours of log, the only idle-end line was case 1's.
>   - ⚠️ **NOT RUN:** case 2 (never joined — unit tests only) and step 2 (join the ended lobby — what a player sees is
>     not recorded).
> - **Side finding (A) → filed** as [`0434`](../tasks/backlog/0434-private-lobby-host-window-keeps-polling-a-lobby-that-no-longer-exists/brief.md)
>   on the [Backlog board](backlog.md), owner `fkit-coder`, low priority: after case 3's lobby ended, its host window kept
>   polling it once a second, 404 every time, for 2 h 44 min+. **Side finding (B)** (hidden-tab reconnect churn):
>   **noted only, no task** (owner ruling).
> - [`0428`](../tasks/backlog/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md) depended on
>   `0390`; that dependency has now passed. `0428`'s status is **unchanged** (`🔲 Backlog`; it still waits on its other
>   dependencies). Notes added to its row and brief.
> - Details in `0390`'s `worklog.md` (2026-10-10 entry). No row was renumbered (ADR-035).
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched; nothing committed or pushed; nothing under
> `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-10, newest (above all others): verify task `0351` (for `0035`) closed (agent-closed) as a PASS. No follow-up task filed. ⚠️ The worker's own download was NOT observed. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-10** (the owner's
> own selection), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent.** Verbatim: **"Close it, that's enough (Recommended)"** — option text *"Record a pass with
> the worker-download gap stated plainly; producer closes 0351 (agent-closed)."*
>
> **OUTCOME.**
> - [`0351`](../tasks/done/0351-verify-0035-on-the-dev-box-a-public-match-starts-and-each-map-file-downloads-once/brief.md) closed `✅ Done (agent-closed — not owner-verified)` (rank 5). Check run
>   2026-10-10 ~08:49 UTC by `fkit-lead` in the owner's Chrome, owner present; read-only apart from joining one public
>   dev match. Dev box on `0.0.155-dev.1` (deploy 2026-10-03, `c60fd05`; `0035`'s `9cb8ee4` is an ancestor). Map World,
>   Normal, Team: **the match started**, `Worker:InitSuccess` 1 s after start; after the join the page requested
>   `manifest.json`, `map.bin`, `map4x.bin` **once each**.
>   - ⚠️ **NOT OBSERVED — the original bug's own path:** the method (page Resource Timing) sees only the page's
>     requests, not the game worker's. Evidence the worker did not download again is indirect (fast `InitSuccess`).
>   - ⚠️ **Producer-added, not put to the owner:** the owner's Chrome trusted the dev box certificate, whereas the
>     original failure needed an untrusted one (no browser cache). A worker re-download could have been served from
>     cache, so the fast `InitSuccess` is weaker evidence than it looks.
>   - Second match and the `Worker:InitFailed` read (Steps 3–4): **not taken.**
> - Details in the task's `worklog.md` (2026-10-10 entry). No row was renumbered (ADR-035).
> - 📌 **Correction (2026-10-10, later, relayed by `fkit-lead`):** "trusted" above was wrong — only that no warning page
>   appeared is known, most likely a remembered click-through exception, which is **not** trust: the connection still
>   carries a certificate error, so Chrome most likely did not cache (fits the full `map.bin` transfer). The
>   producer-added gap therefore **probably does not apply** — ⚠️ unverified (the "Not secure" state was not checked).
>   The worker-request gap stands. Text above kept as written; details in the worklog's correction entry.
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched; nothing committed or pushed; nothing under
> `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-10, newest (above all others): verify tasks `0405` and `0406` closed (agent-closed). No follow-up task filed. ⚠️ `0406`'s main question is NOT answered. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-10** (the owner's
> own selections), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent.** Verbatim:
> - `0405`, ADR-124 trigger 2: **"Not 'much worse', leave it (Recommended)"** — option text *"Record that trigger 2 was
>   not hit; no task."*
> - `0405`, close / verification 6: **"No complaints, close it (Recommended)"** — option text *"Producer closes 0405 as
>   Done (agent-closed — not owner-verified) with these numbers."*
> - `0406`: **"Close it as is"** — option text *"Accept 'popup fires, no sign of a problem'; record the open question
>   about the 0 presses."*
>
> **OUTCOME.**
> - [`0405`](../tasks/done/0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md) closed `✅ Done (agent-closed — not owner-verified)` (rank 15). Window 2026-10-08 06:56:30 →
>   2026-10-10 08:00 UTC. `vouch` over 14,266 resolves: `verified` 94.75 %, `absent` 3.54 %, `unverified_session`
>   1.71 %, every other outcome 0 (`no_secret`, `other_platform`, `expired` included). Match-start verified share 95.3 %
>   (5,676 / 5,958) vs login 97.55 % — **ADR-124 trigger 2 recorded as NOT hit, by owner ruling**; no task. **0 token hits
>   in ~3.0M log lines.** Owner: no new complaints or error spike tied to joins.
>   - ⚠️ **Coverage limits:** game container logs only from 2026-10-09 07:41 UTC (earlier via Uptrace only); host nginx
>     logs not searched; the window had no weekend evening.
> - [`0406`](../tasks/done/0406-verify-0404-live-read-the-long-session-refresh-events-and-the-after-refresh-login-split/brief.md) closed `✅ Done (agent-closed — not owner-verified)` (rank 16). GameAnalytics, 26 Sep – 10 Oct
>   (read by `fkit-lead` through the owner's Chrome, read-only; the page again showed "Demo mode" text): `Due` 42,
>   `PreemptedByStaleBuild` 11, `Shown` 3; `Refresh`, `Waited`, `DeferredByDialog` 0. **The popup fires.**
>   - ⚠️ **NOT VERIFIED — the main question** (*do refreshed players come back verified?*): **no data** — 0 presses, so no
>     `AfterRefreshPopup` login value. The `expired`-share fall is not shown either (0 of 14,266, but `0332` and `0404`
>     shipped together and two game deploys forced reloads).
>   - **Open question, recorded, no task (owner did not ask for one):** 3 `Shown`, 0 `Refresh`, though the popup has no
>     close button — tabs closed, or `Refresh` lost before the reload (same shape as `0418`'s missing
>     `Citizenship:Status:Restart`). Also unchecked: 1 `Due` on 8 Oct, before 23 h could have passed.
> - Details in each task's `worklog.md` (2026-10-10 entries). No row was renumbered (ADR-035).
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched; nothing committed or pushed; nothing under
> `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-10, newest (above all others): `0431` closed (agent-closed). No follow-up task filed. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-10** (the owner's
> own selections, during the `/fkit-sprint-ship-loop` run on this board), relayed by `fkit-lead` to a spawned
> `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.** Verbatim: **"Drive 0431 too
> (Recommended)"**; plan **"Approve plan (Recommended)"**.
>
> **OUTCOME.**
> - [`0431`](../tasks/done/0431-update-routes-it-test-to-expect-the-verified-field-on-resolve/brief.md) closed `✅ Done
>   (agent-closed — not owner-verified)` (rank 33, row above). The owner did not verify done-ness.
>   - **Change:** `tests/integration/Routes.it.test.ts` only (+5/−1) — `verified: false` added to the two exact `toEqual`
>     resolve bodies, plus one comment clause. No source change. Test-only; no deploy; no verify task.
>   - **Tests:** a build run and an independent verify run of `npm run test:integration` against the local test DB: 13/13
>     suites, 178/178 tests, 0 failed, 0 skipped (178 includes `0425`'s uncommitted `TesterRole.it.test.ts`). Lint clean.
>     The "before" figure (176/178) comes from `0425`'s worklog — **not re-measured**.
>   - **Review:** stateful, 1 round, no findings; ledger `review.md` Status `closed-out`. Coverage: reasoning-only second
>     opinion; Codex ran.
>   - **Cause corrected:** not `0340` / `71efd10` as filed, but commit `077c9e3`, task `0332` (ADR-124) — by blame,
>     `git log -S` and the `71efd10` diff. Corrected in the brief and the row (struck, dated note), not deleted.
>   - **Not committed.**
> - No row was renumbered (ADR-035).
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched; nothing committed or pushed; nothing under
> `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-10, newest (above all others): `0228` closed (agent-closed); its live check `0433` filed and APPENDED at rank 34 — the bottom of the board — and `0428` now waits for it. Read the authority before the outcome.**
>
> **AUTHORITY.** Two **OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-10** (the
> owner's own selections, during the `/fkit-sprint-ship-loop` run on this board), relayed by `fkit-lead` to a spawned
> `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent** — not for closing, filing,
> placing, or adding a dependency. Verbatim: close **"Close it (Recommended)"**; verify task **"File it, before 0428
> (Recommended)"** — option text: *"Owner-run live check, at the bottom of Sprint 8, and 0428 waits for it, since 0228 is
> a private-lobby gate item."* Earlier in the run the owner ruled that the slowed-network repro counts as a real repro
> (*"Yes, it counts"*).
>
> **OUTCOME.**
> - [`0228`](../tasks/done/0228-handlejoinlobby-stale-gamestop-race/brief.md) closed `✅ Done (agent-closed — not
>   owner-verified)` (rank 28, row above). The owner did not verify done-ness.
>   - **Phase 1 REPRODUCED 9/9** (dev build, Slow 3G via CDP, real clicks, 310 s idle on the start screen): S1 public-card
>     leave dropped and the player pulled into the match; S2 double-tap Join listed the joiner twice; S3 Escape during
>     the join left the joiner listed.
>   - **Phase 2:** new `src/client/LobbyJoinSequence.ts` (the latest join wins; a leave cancels a join still being set
>     up); `Main.ts` (`gameStop` read-only getter, `runJoin` wrapper, the generation mint still immediately before
>     `joinLobby`); `HostLobbyOpen.ts` comments; tests `tests/client/LobbyJoinSequence.test.ts`, and
>     `tests/client/HostLobbyOpen.test.ts`'s harness now drives the real module. After-fix browser re-run 9/9 clean
>     (before the review fixes).
>   - **Review:** 3 rounds; R1, R2, R3 (all low) fixed by owner rulings (*"Fix both now"*, *"Fix the test now"*); ledger
>     `review.md` Status `closed-out`. Coverage: reasoning-only second opinion; Codex ran each round.
>   - **Tests:** last full `npm test` green — 222 suites, 4529 passed, 1 skipped (the Docker harness; Docker was down).
>     Afterwards the driver ran that harness alone with Docker up: `docker secret boundary harness` passed. Lint and
>     `tsc` clean.
>   - **NOT proven:** (1) the browser proof predates the R1 fix (R1 wrapped the join code in `runJoin` — same logic,
>     unit-tested only; the owner chose no browser re-run); (2) no real phone, no Yandex iframe, no Tutorial or Solo
>     start; (3) production's duplicate-`persistentID` kick untraced (moot on the fixed path, which sends one join).
>     **Not committed, not deployed.**
>   - Side finding filed as [`0432`](../tasks/backlog/0432-stopped-transport-leaks-eventbus-listeners-and-connecting-sockets-after-a-join-over/brief.md)
>     (a stopped `Transport` leak), on the [Backlog board](backlog.md).
> - [`0433`](../tasks/backlog/0433-verify-0228-live-quick-leave-double-join-and-close-during-a-lobby-join/brief.md) filed,
>   `🔲 Backlog`, owner seat `fkit-producer`, **executed by the owner (human)**. ⚠️ Priority 34 is append rank, NOT a
>   merit ranking — flagged for owner confirmation. **On merit this belongs directly above `0428`**, because `0428` waits
>   for it. Depends on `0228` committed and deployed (weekend slot unless the owner says otherwise).
> - [`0428`](../tasks/backlog/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md): `0433`
>   added to *Depends on* (brief and row). Gate item 3 is now: code done, waiting on `0228`'s commit + deploy and on
>   `0433` passing.
> - No row was renumbered (ADR-035).
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched; nothing committed or pushed; nothing under
> `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-09, newest (above all others): `0425` closed (agent-closed); verify task `0430` and fix task `0431` filed and APPENDED at ranks 32 and 33 — the bottom of the board. Read the authority before the outcome.**
>
> **AUTHORITY.** Three **OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-09** (the
> owner's own selections, during the `/fkit-sprint-ship-loop` run on this board), relayed by `fkit-lead` to a spawned
> `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent** — not for closing, filing,
> placing, or deploy timing. Verbatim: close **"Close + file both (Recommended)"** (the owner was told the two unproven
> items below first); deploy timing **"Urgent: after review passes"**; the old failing test **"File a small fix task
> (Recommended)"**.
>
> **OUTCOME.**
> - [`0425`](../tasks/done/0425-ssh-only-tester-roles-apply-a-fixed-test-role-to-an-allowlisted-tester-and-restore-it/brief.md) closed `✅ Done (agent-closed — not owner-verified)` (rank 22, row above). The
>   owner did not verify done-ness. **Not proven:** (1) nothing ran on the box — deploy, migration `008`, compose mount,
>   the allowlist, the id lookup; (2) the full `tests/profile-backup-dryrun.sh` did not run to the end (Docker Hub refused
>   the `minio/minio` image) — only the restore drill's SQL path was proven, against a throwaway Postgres.
> - [`0430`](../tasks/backlog/0430-verify-0425-live-deploy-tester-roles-and-apply-earned-citizen-to-the-tester/brief.md) filed, `🔲 Backlog`, owner seat `fkit-producer`, **executed by the owner
>   (human)**. ⚠️ Priority 32 is append rank, NOT a merit ranking — flagged for owner confirmation. **On merit this belongs
>   at the very top of this board, directly beside `0420`**, because it unblocks `0420`'s earned-account items and the
>   owner ruled its deploy urgent. **Mid-week profile deploy** by the ruling above — an exception for this deploy only, not
>   a change to the weekend-slot rule. Depends on `0425` committed.
> - [`0431`](../tasks/done/0431-update-routes-it-test-to-expect-the-verified-field-on-resolve/brief.md) filed, `🔲 Backlog`, owner `fkit-coder`. ⚠️ Priority 33 is append rank, NOT a
>   merit ranking — flagged for owner confirmation. **On merit its rank barely matters** (test-only, blocks nothing).
>   Pre-existing on `dev` before `0425`; likely since `0340` / `71efd10`, not bisected.
> - No row was renumbered (ADR-035).
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched; nothing committed or pushed; nothing under
> `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-09, newest (above all others): verify task `0429` (live check of `0415`, no native tooltips) filed at `0415`'s close and APPENDED at rank 31 — the bottom of the board, as the owner ruled. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-09** (the owner's
> own selection, during the `/fkit-sprint-ship-loop` run on this board), relayed by `fkit-lead` to a spawned `fkit-producer`
> holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent** — neither for filing a verify task nor for
> placing one. On the standing build/verify-split rule (2026-09-29), the owner chose where `0415`'s open live check goes,
> verbatim **"Bottom of Sprint 8"**; the other option offered, *"Backlog board, flagged for Sprint 9"*, was not chosen.
>
> **OUTCOME.**
> - [`0415`](../tasks/done/0415-no-native-browser-tooltips-anywhere-in-the-ui/brief.md) closed `✅ Done (agent-closed — not
>   owner-verified)` (rank 20, row above).
> - [`0429`](../tasks/backlog/0429-verify-0415-live-no-native-browser-tooltips-inside-the-yandex-games-iframe/brief.md) filed,
>   `🔲 Backlog`, owner seat `fkit-producer`, **executed by the owner (human)**. ⚠️ Priority 31 is append rank, NOT a merit
>   ranking — flagged for owner confirmation. **On merit this belongs directly below `0428`** — where it sits — because the
>   owner ruled the bottom of the board and it can only run after `0415`'s deploy. No row was renumbered (ADR-035).
> - **Why a human:** a native tooltip cannot be screenshotted (the browser draws it outside the page; headless Chromium
>   draws none), so only a real hover inside the Yandex Games iframe proves the live result.
> - **Depends on** `0415` committed and deployed (weekend slot unless the owner says otherwise). Blocks nothing.

> ➡️ **Addendum — 2026-10-09, newest (above all others): private-lobby release — gate tasks `0376`, `0228`, `0381` MOVED IN from the [Backlog board](backlog.md) and APPENDED at ranks 27, 28, 29, and NEW task `0428` (turn the everyone-flag on) filed and APPENDED at rank 30 — NONE ranked on merit. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING typed by the owner in the coordinating Claude Code session on 2026-10-09** (the owner's
> own message), relayed to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer
> precedent** — not for moving rows, filing, or ranking. The owner had asked *"are private lobbies ready to be enabled for
> all users via feature flag?"*; the answer was the six-item release gate in `0354`'s brief (OWNER RULING 2026-10-03), with
> items 1, 4, 5 done and items 2 (`0376`), 3 (`0228`) and 6 (`0381`; `0383` passed today) open. Owner, verbatim:
> *"1. Yes move to the Sprint 8 and brief a dedicated task for the Sprint 8 to turn the private lobbies on for everybody."*
>
> **OUTCOME.**
> - **[`0376`](../tasks/done/0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md)
>   appended at 27**, `🔲 Backlog` carried unchanged. ⚠️ Priority 27 is append rank, NOT a merit ranking — flagged for owner
>   confirmation. **On merit this belongs directly below `0370`, at the top of this board**, because the build/verify rule
>   puts verify tasks at the top of the next sprint and little is left of it. Its brief now carries a dated note with
>   2026-10-09's live evidence (what passed, what did not run), so nobody repeats passed checks.
> - **[`0228`](../tasks/done/0228-handlejoinlobby-stale-gamestop-race/brief.md) appended at 28**, `🔲 Backlog` carried
>   unchanged. ⚠️ Priority 28 is append rank, NOT a merit ranking — flagged for owner confirmation. **On merit this belongs
>   directly below `0376`, near the top of this board**, because its outcome is the one nobody can predict and a reproduced
>   race needs a build and deploy before the flip. No new evidence; drops off the gate if not reproduced.
> - **[`0381`](../tasks/done/0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored/brief.md)
>   appended at 29**, `🔲 Backlog` carried unchanged. ⚠️ Priority 29 is append rank, NOT a merit ranking — flagged for owner
>   confirmation. **On merit this belongs directly below `0376`, in the top group with `0370`**, because it is a short owner
>   check that can share `0376`'s session. Its brief now marks steps 1 and 6 (and verification step 2) **superseded by
>   `0382`**, the paste-button question **answered**, and steps 2–5 **remaining** (step 4, the old `#join=` link, is the
>   main one) — old text struck, not deleted.
> - **[`0428`](../tasks/backlog/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md) filed and
>   appended at 30**, `🔲 Backlog`, owner `fkit-producer` (executed by the owner in the console). ⚠️ Priority 30 is append
>   rank, NOT a merit ranking — flagged for owner confirmation. **On merit this belongs directly below `0381`**, because it
>   is the last step of the release chain. 30 already sits there. Depends on `0376`, `0228`, `0381`.
> - The three Backlog-board rows now read `➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority N`; each brief's `## Sprint`
>   and `## Priority` were updated.
> - ⚠️ **Flagged — gate items 1, 4, 5 are closed, but all three are agent-closed, not owner-verified.** Items 1 (`0354`) and
>   5 (`0301`) have live evidence from `0420`'s 2026-10-09 run; item 4 (`0377`) is **built only** — its live check `0390`
>   (rank 7) has not run. Whether `0390` must pass before the flip is returned as an open question in `0428`.
> - A one-line pointer was added to [`0426`](../tasks/backlog/0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/brief.md)'s
>   Notes: its news may name private lobbies only if `0428` has run before its deploy.
>
> - 📌 **LATER 2026-10-09 — the three open questions ANSWERED.** Three OWNER RULINGS given live via `AskUserQuestion` in the
>   coordinating Claude Code session, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not
>   producer precedent. (1) *"Must 0390 pass before private lobbies go on for everyone?"* → **"Yes, 0390 must pass first
>   (Recommended)"** — `0390` added to `0428`'s *Depends on*, `0428` to `0390`'s *Blocks*; gate item 4 now needs `0390`'s
>   live pass, not just `0377` built. (2) *"Turn private lobbies on before or after the final Sprint 8 deploy?"* → **"Before
>   the final deploy (Recommended)"** — `0428` flips as soon as the gate is clear; `0426` may announce it, provided `0428`
>   has actually run by its text gate. (3) *"Keep 0389's two code checks in 0376's live test?"* → **"Keep them in 0376
>   (Recommended)"** — remaining steps in `0376`; the friend needs the tester marker to see Join until the switch is on.
>   No row moved or renumbered; the `0428` row's "open questions" text above is history.
>
> ⛔ **WHAT DID NOT HAPPEN.** No existing row on this board moved or was renumbered; no line-3 banner was touched; no task
> folder moved; no mover skill was run; no console flag was changed; no source file was touched; nothing was committed or
> pushed; nothing under `ai-agents/wiki-vault/` was touched.

> 🆕 **Addendum — 2026-10-09, newest (above all others): NEW task `0427` (one full jest run at a time + `--detectOpenHandles --forceExit` on the unit run) filed on an OWNER REQUEST and APPENDED at rank 26 — NOT ranked on merit. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER REQUEST typed by the owner in the coordinating Claude Code session on 2026-10-09** (the owner's own message), plus **two OWNER RULINGS given live
> via `AskUserQuestion` there**, relayed to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent** — neither for filing nor for ranking.
> - Request, verbatim: *"Brief a task and add it to Sprint 8, and start working on this task - we should implement this fix for JEST the first thing (it's frustrating that
>   the crashes keep happening). I still want to use the "jest --detectOpenHandles --forceExit" thing, just in case."*
> - Ruling 1 (second full run waits): *"Can you do #2, but with clear message that it's waiting for its turn?"*
> - Ruling 2 (where the flags go): *"Normal tests only (Recommended)"* — unit + coverage runs; integration keeps `0197`'s no-`--forceExit` rule.
>
> **OUTCOME.**
> - **[`0427`](../tasks/done/0427-project-wide-lock-so-only-one-full-jest-run-happens-at-a-time/brief.md) appended at 26**, `🔲 Backlog`, owner `fkit-coder`. ⚠️ Priority 26 is append rank, NOT a merit ranking —
>   flagged for owner confirmation. **On merit this belongs at the very top of this board, directly beside `0370`**, because the owner asked for it *"the first thing"*
>   and every full test run risks another crash. Not inserted there: closed rows sit below the top, and ADR-035 never renumbers them. **Read it as the top group.**
> - The coordinating session is implementing it in parallel with this filing; it, not this producer, flips the status to `🔄 In progress`.
> - ⚠️ **Flagged:** `--forceExit` on the unit run can hide a real handle leak there (owner-accepted); `--detectOpenHandles` may disable the documented
>   `npm test -- --maxWorkers=N` override (Jest says it implies `--runInBand`) — the brief makes the coder verify it; the panics' cause remains unproven (`0399`).
>
> ⛔ **WHAT DID NOT HAPPEN.** No existing row on this board moved or was renumbered; no line-3 banner was touched; no task folder moved; no mover skill was run;
> no source file was touched; nothing was committed or pushed; nothing under `ai-agents/wiki-vault/` was touched.

> ➡️ **Addendum — 2026-10-09, newest (above all others): `0219` and its epic `0213` MOVED IN from [Sprint 7](done/plan-sprint-7.md) and APPENDED at ranks 24 and 25 — NOT ranked on merit — with `0219`'s G3/G4 deferral LIFTED. Read the authority before the outcome.**
>
> **AUTHORITY.** Three **OWNER RULINGS given 2026-10-09 in the coordinating session**, relayed to a spawned `fkit-producer`
> holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent** — not for moving rows, not for ranking.
> - **Move `0219`**, typed by the owner (his own message, after a plain explanation of the task's four parts), verbatim:
>   *"Move the task to Sprint 8"*.
> - **Move `0213`**, typed by the owner (his own message, after a plain explanation that the epic's only unmet criterion
>   is item 8 = `0219`'s P4 work, with item 9 partly met by the earlier owner ruling Q2), verbatim: *"Move it to the
>   Sprint 8"*.
> - **Un-pause**, live via `AskUserQuestion` — *"In Sprint 8, should 0219's two paused alarms (server-down alarm,
>   backups-stopped alarm) be switched on? That means un-pausing them…"* → **"Yes, un-pause in Sprint 8 (Recommended)"**
>   (option text: *"The pause is lifted. 0219 becomes real Sprint 8 work: switch on both alarms and test them."*). This
>   **supersedes the 2026-09-19 G3/G4 deferral and its 2026-10-02 re-affirmation, as to G3/G4 only.**
>
> **OUTCOME.**
> - **[`0219`](../tasks/backlog/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) appended at
>   24**, `🔄 In progress`. ⚠️ Priority 24 is append rank, NOT a merit ranking — flagged for owner confirmation. **On merit
>   this belongs directly below `0370`, at the top of this board**, because it carries a dated fuse: the profile box's
>   certificate renewal starts real attempts around 2026-10-21 and the certificate expires 2026-11-20 (both dates reported
>   by an earlier producer, never verified from the repo), and until these alarms are on and tested a failed renewal is
>   silent. Not inserted there: closed rows sit below the top, and ADR-035 never renumbers them.
> - **Status token `🔄 In progress`** (was `🚧 Blocked` on Sprint 7 on the deferral, now lifted): the code for all four
>   parts is built and was deployed on 2026-09-26; what is left is owner-side setup and live drills, not a build. `🔲
>   Backlog` would make the sprint loop re-plan finished code.
> - 🚨 **Timing risk, flagged:** this board's line-3 banner is still `🔲 Backlog` (not started). If Sprint 8 does not start
>   before ~2026-10-21, the alarms will not be on when real renewal attempts begin. The rows here can be worked whenever the
>   owner chooses — the banner does not stop that — but nothing schedules it either.
> - Sprint 7's row is now `➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 24`, rank 6 kept there.
> - **[`0213`](../tasks/backlog/0213-profile-backend-clean-slate-rebuild/brief.md) appended at 25**, directly below `0219`,
>   `🔲 Backlog` carried unchanged (open; waits only on `0219`). ⚠️ Priority 25 is append rank, NOT a merit ranking — flagged
>   for owner confirmation. **On merit this belongs directly below `0219`**, because the epic closes when `0219` closes. 25
>   already sits there. Sprint 7's row is now `➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 25`, rank 14 kept there.
>
> ⛔ **WHAT DID NOT HAPPEN.** No row on this board moved or was renumbered; no line-3 banner was touched; no task folder moved; no mover skill was run; nothing was committed or pushed;
> nothing under `ai-agents/wiki-vault/` was touched.

> 🆕 **Addendum — 2026-10-09, final of the day: NEW task `0426` (catch-up news-window entry) filed on an OWNER REQUEST and APPENDED at rank 23 — NOT ranked on merit. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER REQUEST typed by the owner in the coordinating Claude Code session on 2026-10-09** (the owner's
> own message), relayed to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent** —
> neither for filing nor for ranking. Verbatim: *"Brief a task for the Sprint 8 to update the announcements notes: it's been a
> while since the last update, we need to tell about all updates since the last one. I think this should be done at the end of
> the Sprint 8, before the final deploy, to include all changes"*.
>
> **OUTCOME.**
> - **[`0426`](../tasks/backlog/0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/brief.md) filed**, `🔲 Backlog`, owner `fkit-coder`, **append rank 23 — a position,
>   not a merit rank.** ⚠️ Priority 23 is append rank, NOT a merit ranking — flagged for owner confirmation. **On merit this
>   belongs last on this board, directly below `0425`**, because by design it runs after every other Sprint 8 build task and
>   ships in the final Sprint 8 deploy. 23 already sits there. Rank barely matters: the brief's **Timing** rule governs.
> - **One brief, not a split:** the change list, the en + ru text and the file edit are one owner-approved unit that is only
>   worth shipping together. The live look in production is a separate verify step, **filed at close** per the owner's
>   build/verify-split rule (2026-09-29).
> - **Dependencies:** depends on [`0415`](../tasks/done/0415-no-native-browser-tooltips-anywhere-in-the-ui/brief.md),
>   [`0423`](../tasks/done/0423-dark-thin-scrollbar-in-every-game-window/brief.md) and any Sprint 8 build task filed later
>   that rides the final deploy (the coder re-checks this board at start). Not on `0425` (box-side tool, invisible to
>   players). Blocks nothing. Related: `0126`, `0311`, `0012`, `0304`.
> - **Checked on filing:** the last entry shipped in `0.0.136` (2026-06-06); 25 prod deploys since, `0.0.137` (2026-08-22)
>   to `0.0.161` (2026-10-09). `resources/changelog.md` is the upstream sample and nothing in `src/` reads it — **out of
>   scope**, recorded in the brief.
>
> ⛔ **WHAT DID NOT HAPPEN.** No row moved or was renumbered; no line-3 banner was touched; no mover skill was run; nothing was
> committed or pushed; nothing under `ai-agents/wiki-vault/` was touched.

> 🆕 **Addendum — 2026-10-09, latest of the day, newest (above all others): NEW task `0425` (SSH-only tester roles) filed on an OWNER REQUEST and APPENDED at rank 22 — NOT ranked on merit. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER REQUEST typed by the owner in the coordinating Claude Code session on 2026-10-09** (the owner's
> own message), plus **three OWNER RULINGS given live via `AskUserQuestion` in that session the same day** (the owner's own
> selections), relayed to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent** —
> neither for filing nor for ranking. Request, verbatim: *"Brief it to the Sprint 8, ideally to be done as one of the first
> things because it unblocks other things."* Rulings: copy-from-a-real-player mode **"Leave it out (Recommended)"**; first
> roles **"non-citizen / earned / paid"**, **"almost a citizen (99 XP)"**, **"brand-new player"** (all chosen); restore
> **"Yes, save and restore (Recommended)"**. Full wording in the brief.
>
> **OUTCOME.**
> - **[`0425`](../tasks/done/0425-ssh-only-tester-roles-apply-a-fixed-test-role-to-an-allowlisted-tester-and-restore-it/brief.md) filed**, `🔲 Backlog`, owner `fkit-coder`
>   (architect consult suggested at the plan step), **append rank 22 — a position, not a merit rank.** ⚠️ Priority 22 is
>   append rank, NOT a merit ranking — flagged for owner confirmation. **On merit this belongs at the very top of this board,
>   directly beside `0420`**, because it unblocks live checks that cannot run today and the owner asked for it *"as one of
>   the first things"*. Not inserted there: closed rows sit below the top, and ADR-035 never renumbers them. **The producer
>   did not re-rank** (no owner channel). An owner re-rank can lift it only to **20** — the top of the contiguous open run
>   `0415` (20), `0423` (21); `0422`'s cancelled row at 19 is a wall.
>   ✅ **CONFIRMED 2026-10-09 — OWNER RULING *"Leave it at 22"*** (the owner's own selection, live via
>   `AskUserQuestion` in the coordinating Claude Code session, relayed to a spawned `fkit-producer`; ⛔ not producer
>   precedent). Question: *"Move 0425 up to rank 20?"* Option text: *"Number stays; the board notes already say to treat
>   it as part of the top group."* Rank 22 stands; no row moved.
> - **One brief, not a split:** the command, the allowlist guard, the fixed roles and save/restore are only useful and only
>   testable together (an `apply` without the guard or without `restore` must not ship). The first live run is a separate
>   verify step, **filed at close** per the owner's build/verify-split rule (2026-09-29).
> - **Dependencies:** depends on nothing. Blocks [`0420`](../tasks/backlog/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)
>   (items 3a, 8b, earned part of 4) and [`0376`](../tasks/done/0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md)
>   only if its host must be earned (its brief allows *"earned or paid"*). Related: `0424`, `0253`, `0401`, `0312` (the
>   operator-command precedent).
> - ⚠️ **Not the same "tester" as `0302`/`0354`.** That one is a client-side browser flag; this task's allowlist is
>   server-side and box-only, and must not read it. Recorded in the brief.
> - **Each production run of the command is a production write and needs the owner's OK in-session.**

> 🆕 **Addendum — 2026-10-09, latest, newest (above all others): `0415` (no native tooltips) PULLED IN from the Backlog board at append rank 20, and NEW task `0423` (dark thin scrollbar in every game window) filed at append rank 21 — both on OWNER RULINGS, neither ranked on merit. Read the authority before the outcome.**
>
> **AUTHORITY.** Two **OWNER RULINGS given live via `AskUserQuestion` in the coordinating Claude Code session on
> 2026-10-09** (the owner's own selections), relayed to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021/037). ⛔ **Not producer precedent** — neither for pulling a task into a sprint nor for ranking.
> - **Ruling 1 (tooltips).** While running `0420` on game `0.0.161`, the owner reported native tooltips on the join
>   window's "Присоединиться к лобби" button (*"There are no tooltip over the buttons on the PRIVATE tab, but there are
>   tooltips when I hover over the button in the popup"*) and on the single-player window's "Начать игру" button
>   (*"Confirmed: the START button also have the same tooltip"*), and asked for a Sprint 8 task. The producer stopped
>   instead of filing a duplicate: [`0415`](../tasks/done/0415-no-native-browser-tooltips-anywhere-in-the-ui/brief.md)
>   (filed 2026-10-08 on the Backlog board) already covers both. Question *"How should it get into Sprint 8?"* — owner
>   chose **"Move 0415 into Sprint 8 (Recommended)"**.
> - **Ruling 2 (scrollbar).** The owner's screenshot of the "Одиночная игра" window shows the light default scrollbar.
>   Question *"What should I do with it?"* — owner chose **"Brief a small task, Sprint 8 (Recommended)"** (*"dark thin
>   scrollbar in all game windows, done once in the shared window part. Appended to Sprint 8."*).
>
> **OUTCOME.**
> - **`0415` pulled in, whole and unchanged in scope** (§1 shared components, §2 every other `title`). It sits at
>   `🔲 Backlog`, **append rank 20 — a position, not a merit rank.** ⚠️ Priority 20 is append rank, NOT a merit
>   ranking — flagged for owner confirmation. **On merit this belongs directly below `0420`**, because it is a
>   Yandex-rules compliance fix the owner found while running `0420`. ADR-035: closed rows sit below the top, so a pulled
>   row appends like a new one. All three pull edits are done: this row; the
>   [Backlog board](backlog.md) row now reads `➡️ Moved to [Sprint 8](plan-sprint-8.md) — priority 20` (kept, not
>   deleted); and the brief's `## Sprint` is `Sprint 8`, `## Priority` is `20`. Today's evidence (both buttons, owner
>   quotes) and re-checked line numbers were added to its Context. The `o-modal` window-title tooltip was seen once
>   (host window, `0.0.157`); the other windows are still for the coder to check.
> - **[`0423`](../tasks/done/0423-dark-thin-scrollbar-in-every-game-window/brief.md) filed**, `🔲 Backlog`, owner
>   `fkit-coder`, **append rank 21 — a position, not a merit rank.** ⚠️ Priority 21 is append rank, NOT a merit
>   ranking — flagged for owner confirmation. **On merit this belongs directly below `0415`**, because it is
>   low-priority polish in the same file. It is already there. Reference look `0417`; Chromium-based only.
> - Both tasks edit `src/client/components/baseComponents/Modal.ts`. Neither depends on the other — whichever lands
>   second rebases. Both briefs record this.
> - ❓ **Assumption flagged for the owner (recorded in `0423`'s Notes):** the seven small standalone popups in
>   [`0419`](../tasks/backlog/0419-other-small-standalone-popups-use-more-width-on-larger-screens/brief.md) (Backlog
>   board) keep their scrollbar item in `0419`, not in `0423`. None of them scrolls today.
>   ✅ **ANSWERED 2026-10-09 — OWNER RULING *"Keep them in 0419 (Recommended)"*** (the owner's own selection, live via
>   `AskUserQuestion` in the coordinating Claude Code session, relayed to a spawned `fkit-producer`; ⛔ not producer
>   precedent): *"0423 stays small and fixes what you saw. 0419 reuses 0423's shared piece later. No overlap."* The
>   assumption stands. `0423`'s Notes record the answer, and `0419`'s Notes gained a one-line cross-reference.
> - Live checks for both are **filed at close**, not now (build/verify-split rule, 2026-09-29).
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no existing row moved, renumbered or
> re-statused; `0420`, `0417` and `0419` briefs not edited; nothing committed or pushed; nothing under
> `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-09, newest (above all others): verify task `0422` (live check of `0421`'s shorter citizenship popup) filed at `0421`'s close and APPENDED at rank 19 — NOT ranked on merit. Read the authority before the outcome.**
>
> **AUTHORITY.** The owner-approved `0421` plan, recorded in `0421`'s brief (*Notes → Live check*): the live check on a
> real phone inside Yandex Games becomes a verify task **filed at close**, and does not block the deploy — the owner's
> standing build/verify-split rule (2026-09-29, *"verify task on top of the next sprint"*). Filed by a spawned
> `fkit-producer` holding **no owner channel** (ADR-021/037), asked to close `0421` by the coordinating session.
> ⛔ **Not producer precedent.**
>
> **OUTCOME.**
> - [`0422`](../tasks/cancelled/0422-verify-0421-live-the-shorter-citizenship-popup-on-a-real-phone-inside-yandex-games/brief.md)
>   filed, `🔲 Backlog`, **append rank 19 — a position, not a merit rank.** ⚠️ Priority 19 is append rank, NOT a merit
>   ranking — flagged for owner confirmation. **On merit this belongs directly below `0420`, in the top group**, because
>   the build/verify-split rule puts verify tasks at the top of the next sprint and `0420` checks the same popup with the
>   same accounts. ADR-035: closed rows sit below the top, so a new row appends; 19 is already directly below `0420`.
> - Owner-run, real phone, ru, portrait (landscape optional): non-citizen Buy visible without scrolling and text as
>   approved; earned account shows no free line and the paid-Buy button (⛔ never tapped); paid account shows neither.
> - ✏️ Same day, by OWNER RULING *"Update 0420 after build (Recommended)"* (2026-10-08, recorded in `0421`'s brief):
>   [`0420`](../tasks/backlog/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)
>   items 2 and 5 now describe the `0421` popup; old wording kept struck through. Item 3 unchanged (its quoted text did
>   not change).
> - ❓ **Open owner question:** keep `0422` separate, or fold it into `0420` (one checklist, one sitting)? Not folded —
>   `0420`'s scope is an owner ruling. Recorded in `0422`'s *Notes*.
>   ✅ **ANSWERED 2026-10-09 — OWNER RULING *"Fold into 0420 (Recommended)"*** (the owner's own selection, live via
>   `AskUserQuestion` in the coordinating session, relayed to a spawned `fkit-producer`; ⛔ not producer precedent).
>   `0422`'s checks were added to [`0420`](../tasks/backlog/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md) as **item 8**, and `0422`
>   was cancelled via `/fkit-task-cancelled` with the agent-closed marker. Its row keeps rank 19 — nothing renumbered.
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved, renumbered or
> re-statused; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-08, newest (above all others): verify checklist `0420` (live checks for `0416`, `0408`, `0409`, `0407`, `0417`, `0412`, `0413`) filed on an OWNER RULING and APPENDED at rank 18 — NOT at the top. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-08** (end of
> the `/fkit-sprint-ship-loop` run on Sprint 7), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner
> channel** (ADR-021/037). ⛔ **Not producer precedent.** The ruling: **one** verify task — a single live-check
> checklist — **at the top of Sprint 8**, per the owner's standing build/verify-split rule (2026-09-29); `0382` not
> included (its live check is `0383`).
>
> **OUTCOME.**
> - [`0420`](../tasks/backlog/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)
>   filed, `🔲 Backlog`, **append rank 18 — a position, not a merit rank.**
> - ⚠️ **The "top" placement was NOT carried out literally**, and the owner should know why: closed rows sit below the
>   top of this board (`0373` ➡️, `0363` ✅, `0358` ✅, `0392`–`0404` ➡️), and ADR-035 never renumbers a closed row,
>   *"not even under an owner ruling"* — so a new row always appends. **Read it as the top group** (as `0396`/`0398`
>   were). An owner re-rank could lift it at most to rank 15 (top of the open run `0405`/`0406`/`0418`).
>   ✅ **Confirmed 2026-10-08 — OWNER RULING "Keep rank 18"** (the owner's own selection, live via `AskUserQuestion` in
>   the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent): no re-rank; read it as the top group.
> - ✅ **Item 7 (B), `0413`'s error-window copy — OWNER RULING 2026-10-08, "Mark 'not checked live'"** (same channel; ⛔
>   not producer precedent): there is no safe way to bring up the error window in production, so it is recorded **not
>   checked live**; the Yandex SDK copy path stays unproven until an error window appears on its own (it may be checked
>   then; the copied text is never pasted anywhere). No open questions remain on `0420`.
> - Deploy timing recorded on the brief: `0416`, `0407`, `0408`, `0409` cleared for a same-day deploy (owner, *"might"*);
>   `0412`, `0413`, `0417` in the weekend slot — so the checklist may run in two passes.
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved, renumbered or
> re-statused; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched; `0376`'s brief not edited.

> 🆕 **Addendum — 2026-10-08, re-check task `0418` (for `0400` check 8) filed on an OWNER RULING and APPENDED at rank 17 — NOT ranked on merit. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING typed live by the owner in the `fkit lead` session on 2026-10-08**, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> Owner, verbatim: *"1. No need for the investigation, brief a task to the Sprint 8 to recheck the numbers in GameAnalytics."*
>
> **OUTCOME.**
> - [`0418`](../tasks/backlog/0418-recheck-in-gameanalytics-the-two-0397-status-events-missing-from-the-2026-10-08-read/brief.md)
>   filed, `🔲 Backlog`, **append rank 17 — a position, not a merit rank** (ADR-035: appended after the highest, 16,
>   `0406`; never inserted). ⚠️ Flagged for owner confirmation: on merit its rank barely matters — it blocks nothing and
>   is time-gated.
> - It re-reads `Citizenship:Status:Unverified` and `Citizenship:Status:Restart` in GameAnalytics over several days;
>   no investigation (owner ruling).
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved or renumbered; nothing
> committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-07, latest of the day, newest (above all others): verify task `0406` (for `0404`) filed and APPENDED at rank 16 — NOT at the top. Read the authority before the outcome.**
>
> **AUTHORITY.** The owner's **standing build/verify-split rule (2026-09-29)** — a build task whose proof needs a deploy
> closes on build, and its verify task is filed on the next sprint and must not block the current sprint's deploy —
> applied at `0404`'s close by a spawned `fkit-producer` holding **no owner channel** (ADR-021/037), routed by `fkit-lead`
> driving `/fkit-sprint-ship-loop` on Sprint 7. ⛔ **Not producer precedent.** No new owner ruling was given for this filing.
>
> **OUTCOME.**
> - [`0406`](../tasks/done/0406-verify-0404-live-read-the-long-session-refresh-events-and-the-after-refresh-login-split/brief.md)
>   filed, `🔲 Backlog`, **append rank 16 — not a merit rank**; ⚠️ flagged for owner confirmation: on merit it belongs in
>   the top group with the other verify tasks, but ranks 2–4 and 8–14 are closed rows, which ADR-035 forbids
>   renumbering.
> - [`0404`](../tasks/done/0404-refresh-the-game-popup-after-about-24-hours-start-screen-only/brief.md) closed
>   `✅ Done (agent-closed — not owner-verified)` on the [Sprint 7](done/plan-sprint-7.md) board the same day.
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved or renumbered; nothing
> committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-07, latest, newest (above all others): task `0405` (verify `0332` live) added out of band at append rank 15. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULING given live 2026-10-07 via `AskUserQuestion`** in the `fkit lead` session, relayed
> verbatim by `fkit-lead` (driving `/fkit-sprint-ship-loop`, Sprint 7) to a spawned `fkit-producer` holding **no owner
> channel** (ADR-021/037). ⛔ **Not producer precedent.** Answer: *"Close it (Recommended)"* — option text *"A producer
> closes 0332 and files the 'verify it live' task for after the deploy. The high flaky-test rate gets noted in the
> close."* Placement follows the owner's standing build/verify-split rule (2026-09-29).
>
> **OUTCOME.**
> - [`0405`](../tasks/done/0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/brief.md)
>   filed, `🔲 Backlog`, **append rank 15 — not a merit rank**; ⚠️ flagged for owner confirmation: on merit it belongs in
>   the top group with the other verify tasks, but ranks 2–4 and 8–14 are closed rows, which ADR-035 forbids
>   renumbering.
> - [`0332`](../tasks/done/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md) closed
>   `✅ Done (agent-closed — not owner-verified)` on the [Sprint 7](done/plan-sprint-7.md) board the same day.
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved or renumbered; nothing
> committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> ➡️ **Addendum — 2026-10-07, later, newest (above all others): `0404` MOVED OUT to [Sprint 7](done/plan-sprint-7.md) at 53. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULING, 2026-10-07, typed directly by the owner in the `fkit lead` session** (the owner's own
> message, not an `AskUserQuestion` answer), relayed verbatim by `fkit-lead` to a spawned `fkit-producer` holding **no
> owner channel** (ADR-021/037). ⛔ **Not producer precedent.** Verbatim: *"Move the refresh popup task to the Sprint 7"*.
> This supersedes the placement in the owner's earlier answer (*"brief it to the next sprint"*, addendum below).
>
> **OUTCOME.**
> - [`0404`](../tasks/done/0404-refresh-the-game-popup-after-about-24-hours-start-screen-only/brief.md) row here is now
>   `➡️ Moved` with a pointer to Sprint 7, priority 53. Its rank 14 and its Task cell are kept as history — not deleted,
>   not renumbered (ADR-035). Status carried to Sprint 7 verbatim: `🔲 Backlog`.
> - The brief's `## Sprint` / `## Priority` now read Sprint 7 / 53; the old values (Sprint 8 / 14) are struck, kept as
>   history. Its folder did not move (it stays in `tasks/backlog/`), so no link changed.
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved or renumbered; no mover
> run; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-07, newest (above all others): task `0404` added out of band. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULING given live 2026-10-07 via `AskUserQuestion`** in the `fkit lead` session (free-text answer to
> `0332` review finding R2), relayed verbatim by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021/037). ⛔ **Not producer precedent.** Verbatim: *"I think this task is related to my idea, that we need to show a popup
> that forces player to restart the game/refresh the page after certain time of playing (right now it's about 24h). I think we
> need this task, brief it to the next sprint. The popup shouldn't break active matches, probably should be shown only on the
> main screen."*
>
> **OUTCOME.**
> - [`0404`](../tasks/done/0404-refresh-the-game-popup-after-about-24-hours-start-screen-only/brief.md) filed `🔲 Backlog`, owner `fkit-coder`, appended at rank **14**.
>   ⚠️ Priority 14 is append rank, NOT a merit ranking — flagged for owner confirmation.
>   **On merit this belongs directly below `0390`**, because the open rows above it are verify tasks and a discussion, and this
>   is a small build task; rows 8–13 are all `➡️ Moved`, so append and merit coincide.
> - Open owner questions live in the brief: exact threshold (producer recommends 23 h), force vs ask, RU/EN wording, everyone vs
>   logged-in only.
> - 📌 **2026-10-07, later:** moved to [Sprint 7](done/plan-sprint-7.md), priority 53, by OWNER RULING *"Move the refresh popup task to the Sprint 7"* (pointer only; the text above is history). See the addendum above this one.
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no existing row moved or renumbered; `0332`'s folder
> and the Sprint 7 board not touched; no mover run; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> ➡️ **Addendum — 2026-10-06, final, newest (above all others): `0396` and `0398` MOVED to [Sprint 7](done/plan-sprint-7.md); their placement question answered. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULING given live 2026-10-06 via `AskUserQuestion`** in the `fkit lead` session, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> Verbatim answer: *"Move both to Sprint 7 (Recommended)"*. Option text, verbatim: *"The whole citizenship
> deploy-and-check chain sits on one board. Sprint 7 gets bigger, and some of it may still run past the sprint's end."*
> Reasons put to the owner: `0401` (now on Sprint 7) hard-depends on `0396`; `0401` is checked in the same deploy as
> `0398`, because `0301` ships with `0248`; both briefs carried an open placement question.
>
> **OUTCOME.**
> - [`0396`](../tasks/done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md)
>   row above is now `➡️ Moved to Sprint 7 — priority 49` (rank 10 kept);
>   [`0398`](../tasks/done/0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md)
>   is now `➡️ Moved to Sprint 7 — priority 50` (rank 11 kept). On [Sprint 7](done/plan-sprint-7.md) both are **appended —
>   ADR-035 append rank, not a merit rank**, flagged there for owner confirmation. Each brief's `## Sprint` /
>   `## Priority` updated (old values struck) and its placement question marked answered.
> - ⚠️ **`0400` was NOT in this ruling and stays on this board** (rank 12, `🔲 Backlog`), although it hard-depends on
>   `0396` and runs in the same sitting as `0398`. So the chain is **not** fully on one board yet. Its own placement
>   question is still open — returned to `fkit-lead` for the owner, not decided here.
> - The `0400` row above still says *"on merit directly below `0396` (beside `0398`)"* — that now names rows on another
>   board. Left as written (history); not re-ranked.
> - 📌 **2026-10-06, later:** `0400` moved to [Sprint 7](done/plan-sprint-7.md), priority 51 — owner ruling *"Move it to Sprint 7 (Recommended)"*, relayed by `fkit-lead`; option text, verbatim: *"The whole chain really is on one board. It goes to the end of Sprint 7, at rank 51."* The `0400` row above is now `➡️ Moved to
>   Sprint 7 — priority 51` (rank 12 kept); its stale placement sentence is struck and corrected in place. So the two
>   `0400` bullets just above are **superseded** — the chain is now on one board. `0400`'s brief updated the same way.
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved or renumbered; no mover
> run; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> ➡️ **Addendum — 2026-10-06, latest, newest (above all others): `0401` MOVED to [Sprint 7](done/plan-sprint-7.md); its open questions (a)–(d) answered. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULINGS given live 2026-10-06** in the `fkit lead` session (via `AskUserQuestion`, plus owner
> follow-ups in prose), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent.** Verbatim: placement *"Move it to Sprint 7"*; local look *"First agent, next me"*; the
> purchase and tester checks use DevTools Console snippets that fake "not a citizen" (owner's words recorded in the brief);
> the purchase runs on the owner's currently-paid test account, *"to keep the 2 earned/paid citizenships for testing"*.
>
> **OUTCOME.**
> - [`0401`](../tasks/done/0401-verify-0301-live-the-citizenship-explainer-popup-works-in-production/brief.md) row
>   above is now `➡️ Moved to Sprint 7 — priority 48`; its rank 13 kept (ADR-035). On [Sprint 7](done/plan-sprint-7.md) it is
>   **appended at 48 — append rank, not a merit rank**. The brief's `## Sprint` / `## Priority` are updated (old values struck).
> - The brief records the rulings and adds a step: an agent writes and tests the two Console snippets on the local dev
>   build before the owner's live checks. ~~⚠️ New open question (e): the locked tap cannot show on a dev build at all.~~
>   📌 *answered 2026-10-06 — OWNER RULING "Accept the half test" (relayed by `fkit-lead`): no local prod-build attempt; Snippet B is tested on `npm run dev` only for the half dev can show; the owner's live check 4 in Yandex is the first full test of the locked look and the locked tap.*
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved or renumbered; no mover
> run; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-06, newest (above all others): verify task `0401` (for `0301`) filed and APPENDED at rank 13 — NOT at the top. Read the authority before the outcome.**
>
> **AUTHORITY.** The owner's **standing build/verify-split rule (2026-09-29)** — *close the build task on build +
> review; file a verify task at the top of the NEXT sprint; it must not block the current sprint's deploy*. Relayed by
> `fkit-lead` (driving `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021/037). ⛔ **Not producer precedent.**
>
> **OUTCOME.**
> - [`0301`](../tasks/done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md) closed on
>   [Sprint 7](done/plan-sprint-7.md) `(agent-closed — not owner-verified)`; its local look, deploy and live checks are
>   [`0401`](../tasks/done/0401-verify-0301-live-the-citizenship-explainer-popup-works-in-production/brief.md), the row above.
> - ⚠️ **Priority 13 is append rank, NOT a merit ranking — flagged for owner confirmation.**
>   **On merit this belongs directly below `0398`**, because `0301` deploys together with `0248` (already in `dev`),
>   whose live check is `0398`, and the 2026-09-29 rule puts a verify task on top of the next sprint. "Top" conflicts
>   with ADR-035: ranks 2–4 are closed rows, and a new row always appends. Appending lands it directly below `0400`.
> - **Depends on** `0301`, `0248`, `0396` and `0397` (`0248`'s deploy gates bind this deploy too).
> - ⚠️ **Open to the owner:** Sprint 7 may fit better (same reasoning as `0396`/`0398`/`0400`); whether a real purchase
>   (real money, makes the account a citizen for good) is acceptable and on which account; which non-citizen tester
>   account carries the tester marker; who runs the local look before the deploy.
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved or renumbered; nothing
> committed or pushed; nothing under `ai-agents/wiki-vault/` touched.
>
> 🆕 **Addendum — 2026-10-06, newest (above all others): verify task `0400` (for `0397`) filed and APPENDED at rank 12 — NOT at the top. Read the authority before the outcome.**
>
> **AUTHORITY.** The owner's **standing build/verify-split rule (2026-09-29)** — *close the build task on build +
> review; file a verify task at the top of the NEXT sprint; it must not block the current sprint's deploy*. Relayed by
> `fkit-lead` (driving `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021/037). ⛔ **Not producer precedent.**
>
> **OUTCOME.**
> - [`0397`](../tasks/done/0397-show-players-whether-their-session-is-verified/brief.md) closed on
>   [Sprint 7](done/plan-sprint-7.md) `(agent-closed — not owner-verified)`; its deploy and live check are
>   [`0400`](../tasks/done/0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md), the row above.
> - ⚠️ **Priority 12 is append rank, NOT a merit ranking — flagged for owner confirmation.**
>   **On merit this belongs directly below `0396`** (beside `0398`), because it cannot start until `0396` confirms the
>   verified owner view live, and the 2026-09-29 rule puts a verify task on top of the next sprint. "Top" conflicts
>   with ADR-035: ranks 2–4 are closed rows, and a new row always appends. Appending lands it directly below `0398`.
> - **Depends on** `0397`, `0395` and `0396` (the last may run in the same slot, S3b server first — owner ruling Q4,
>   2026-10-06). Natural to run in the same deploy and sitting as `0398`.
> - ⚠️ **Open to the owner:** Sprint 7 may fit better (same reasoning as `0396`/`0398`); which paid, earned-only and
>   non-citizen test accounts exist; how to get an unverified session in production once `0395` is live; whether
>   flipping `citizenship_ui` off in production for a short check is acceptable (one flip can serve `0398` too).
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved or renumbered; nothing
> committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-06, latest (above all others): verify task `0398` (for `0248`) filed and APPENDED at rank 11 — NOT at the top. Read the authority before the outcome.**
>
> **AUTHORITY.** The owner's **standing build/verify-split rule (2026-09-29)** — *close the build task on build +
> review; file a verify task at the top of the NEXT sprint; it must not block the current sprint's deploy*. Relayed by
> `fkit-lead` (driving `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021/037). ⛔ **Not producer precedent.**
>
> **OUTCOME.**
> - [`0248`](../tasks/done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md) closed on
>   [Sprint 7](done/plan-sprint-7.md) `(agent-closed — not owner-verified)`; its deploy and live check are
>   [`0398`](../tasks/done/0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md),
>   the row above.
> - ⚠️ **Priority 11 is append rank, NOT a merit ranking — flagged for owner confirmation.**
>   **On merit this belongs directly below `0396`**, because it cannot start until `0396` confirms the verified owner
>   view live, and the 2026-09-29 rule puts a verify task on top of the next sprint. "Top" conflicts with ADR-035: ranks
>   2–4 are closed rows, and a new row always appends. Appending happens to land it directly below `0396` already.
> - **Depends on** `0248`, `0396` and `0397` (the last by owner ruling R3, 2026-10-06 — deploy together or after).
> - ⚠️ **Open to the owner:** Sprint 7 may fit better (same reasoning as `0396`); which paid, non-paid and earned-only
>   test accounts exist; whether flipping `citizenship_ui` off in production for a short check is acceptable (it hides
>   citizenship for every player the flag reaches while off).
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved or renumbered; nothing
> committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-06, newest (above all others): verify task `0396` (for `0250` S3b) filed and APPENDED at rank 10 — NOT at the top. Read the authority before the outcome.**
>
> **AUTHORITY.** The owner's **standing build/verify-split rule (2026-09-29)** — *close the build task on build +
> review; file a verify task at the top of the NEXT sprint; it must not block the current sprint's deploy* — as applied
> by `0250`'s owner-approved `plan-s3b.md` § 6 (approved 2026-10-06, live `AskUserQuestion` in the `fkit lead` session).
> Relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021/037). ⛔ **Not producer precedent.**
>
> **OUTCOME.**
> - [`0250`](../tasks/done/0250-authenticated-profile-read-for-paid-entitlement/brief.md) closed on
>   [Sprint 7](done/plan-sprint-7.md) `(agent-closed — not owner-verified)`; its deploy and live check are
>   [`0396`](../tasks/done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md),
>   the row above.
> - ⚠️ **Priority 10 is append rank, NOT a merit ranking — flagged for owner confirmation.**
>   **On merit this belongs directly below `0370`**, because the 2026-09-29 rule puts a verify task on top of the next
>   sprint and `0370` holds rank 1. Ranks 2–4 are closed rows; ADR-035 forbids renumbering them and a new row always
>   appends. Same branch as `0390`, `0392` and `0395`.
> - **No `Depends on` link from any Sprint 7 task onto `0396`** (`fkit-lead`'s instruction). Instead
>   [`0248`](../tasks/done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md) carries a dated note — *deploy
>   only after `0396` confirms the owner view live* — applying the owner's precedent ruling for the identical `0395`
>   case (2026-10-05, *"Note only (Recommended)"*, addendum directly below).
> - ⚠️ **Open to the owner:** Sprint 7 may fit better (its earliest deploy is the slot after 10/11 Oct — the reasoning
>   that moved `0392` and `0395`); and which paid and `vfy:false` test sessions exist for the live check.
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved or renumbered; nothing
> committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-05, final of the day, newest (above all others): `0395` MOVED to [Sprint 7](done/plan-sprint-7.md). Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULINGS given live 2026-10-05 via `AskUserQuestion`** in the `fkit lead` session, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> Verbatim: placement *"Move to Sprint 7 (Recommended)"*; on `0250` S3b / `0319` / `0332` / `0323`, *"Note only (Recommended)"*.
>
> **OUTCOME.**
> - [`0395`](../tasks/done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) row above
>   is now `➡️ Moved to Sprint 7 — priority 45`; its rank 9 kept (ADR-035). On [Sprint 7](done/plan-sprint-7.md) it is
>   **appended at 45 — append rank, not a merit rank**. The brief's `## Sprint` / `## Priority` are updated (old values struck).
> - The four tasks that read `verified` each carry a dated note: *deploy only after `0395` confirms `vfy: true` live*.
>   **No `Depends on` link to `0395` was added** (owner ruling).
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved or renumbered; no mover
> run; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-05, latest of the day, newest (above all others): verify task `0395` (for `0340`) filed and APPENDED at rank 9 — NOT at the top. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULINGS given live 2026-10-05 via `AskUserQuestion`** in the `fkit lead` session at `0340`'s plan
> gate, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021/037). ⛔ **Not producer precedent for re-ranking.** Verbatim: Q1 **"Split it (Recommended)"** (*"Close 0340 once
> it's built and reviewed. A new task 'verify 0340 live' covers the deploy, the live check and the ADR-113 note. Matches
> your rule."*); Q2 **"I'll check once (Rec)"** (*"About 2 minutes at the deploy. Direct proof, and nothing secret leaves
> your browser."*). Placement follows the owner's standing build/verify-split rule (2026-09-29).
>
> **OUTCOME.**
> - [`0395`](../tasks/done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md)
>   filed, `🔲 Backlog`, owner `fkit-producer` (deploy, enforce approval and the `vfy` check are the owner's).
>   **Appended at rank 9** (ADR-035: append, never insert). **No row moved or was renumbered.**
> - ⚠️ Priority 9 is append rank, NOT a merit ranking — flagged for owner confirmation.
>   **On merit this belongs directly below `0370`**, because the rule says top of the next sprint and this task has a
>   fixed date. Not placed there for the same reason as `0390` / `0392`: ranks 2–4 are closed rows.
> - **Depends on** `0340` ([Sprint 7](done/plan-sprint-7.md)) and `0392` ([Sprint 7](done/plan-sprint-7.md)) — the normal
>   direction (a later board waits on an earlier one). **No Sprint 7 task was made to depend on it**, per `fkit-lead`'s
>   instruction; whether `0250` S3b / `0319` / `0332` / `0323` should, for their deploys, is put to the owner.
> - ⚠️ **Placement open, not moved.** Its deploy is the 10/11 Oct slot, during Sprint 7, while this board is not
>   started. Whether it belongs on Sprint 7 instead (as `0392` was moved) is put to the owner.
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row touched; no mover run;
> nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-05, latest, newest (above all others): `0392` MOVED to [Sprint 7](done/plan-sprint-7.md), folder renamed, closes after the first look. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULINGS given live 2026-10-05 via `AskUserQuestion`** in the `fkit lead` session, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> Verbatim: placement *"Move to Sprint 7 (Recommended)"*; when it closes *"After the first look (Rec)"*; folder
> *"Rename and fix links"*.
>
> **OUTCOME.**
> - [`0392`](../tasks/done/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) row above is now `➡️ Moved to Sprint 7 — priority 44`; its rank 8
>   kept (ADR-035). On [Sprint 7](done/plan-sprint-7.md) it is **appended at 44 — append rank, not a merit rank**.
> - Folder renamed with `git mv` (backlog → backlog; not a mover) from the old *verify-0391-live-stale-login-share-…*
>   slug to `0392-read-the-post-0391-login-numbers-before-the-0340-deploy`; every link under `ai-agents/` repointed. The addenda below that say *"folder not renamed"* are history.
> - It now **closes after the owner's call on `0340`**; each later deploy that reads `verified` (`0250` S3b, `0319`,
>   `0332`, `0323`) carries its own small owner-look step (dated note in each brief).
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row moved or renumbered; no mover
> run; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-05, later, newest (above all others): `0392` re-scoped — no 7-day window, no ≤5% bar, gates nothing on its own. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULINGS given live 2026-10-05 via `AskUserQuestion`** in the `fkit lead` session, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> Verbatim: *"Remove the 7 days requirement, we will check whatever data we have at the time it's needed and we will make a decision about waiting or not waiting longer based on that"*; deploy `0391` *"Yes, Tuesday (Recommended)"* (Tue 6 Oct); before `0340`'s 10/11 Oct
> deploy, *"Judge by eye"*. Design record: [ADR-122](../knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md) (accepted 2026-10-05; supersedes ADR-121 Decision 4). The threshold
> ruling quoted in the addendum directly below is superseded; that addendum is kept as written.
>
> **OUTCOME.**
> - [`0392`](../tasks/done/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md): reads the
>   post-`0391` login numbers (stale share, `ok`, `id_mismatch`, `bad_payload`) whenever the owner needs them — first
>   before the 10/11 Oct slot, again before each later deploy that reads `verified` — and records the owner's call each
>   time. Its `Blocks: 0340` line is struck; `0340` may start now. Brief title re-worded in text (old title struck);
>   **folder not renamed**. Row edited above (Task cell; old text struck). Rank 8 unchanged.
> - ⚠️ **Placement open, not moved.** Its first read is now needed before the 10/11 Oct slot (a Sprint 7 deploy), while
>   this board is not started. Whether to move it to Sprint 7 is put to the owner.
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no row moved or renumbered; no mover run;
> nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-05, newest (above all others): the S2-exit re-check `0392` (for `0391`) filed and APPENDED at rank 8 — NOT at the top. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULINGS given live 2026-10-05 via `AskUserQuestion`** in the `fkit lead` session, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent for
> re-ranking.** Verbatim: placement **"Fix: Sprint 7, check: Sprint 8 (Recommended)"** — the check at the top of Sprint 8
> per the 2026-09-29 build/verify rule; threshold **"At most 5% (Recommended)"**.
>
> **OUTCOME.**
> - [`0392`](../tasks/done/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md)
>   filed, `🔲 Backlog`, owner `fkit-producer` (owner-run, or an agent with the owner's read-only SSH approval).
>   **Appended at rank 8** (ADR-035: append, never insert). **No row moved or was renumbered.**
> - ⚠️ **"Top" conflicts, stated plainly.** Ranks 2–4 here are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358`
>   ✅ Done). Rank 1 or 2 would renumber them, which ADR-035 forbids *"not even under an owner ruling"*; a new row always
>   appends. Same branch as `0390`.
> - ⚠️ Priority 8 is append rank, NOT a merit ranking — flagged for owner confirmation.
>   **On merit this belongs directly below `0370`**, because the owner ruled it to the top and it has the most work
>   waiting behind it (`0340`, then `0250` S3b, `0332`, `0323`, `0319`, `0248`, `0301`). **Owner decision:** keep 8, or
>   rule a placement that renumbers no closed row.
> - Depends on [`0391`](../tasks/done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md)
>   ([Sprint 7](done/plan-sprint-7.md), rank 43) shipped in a profile deploy plus 7 days of data — earliest read 17/18 Oct if
>   it ships 10/11 Oct. **Blocks `0340`**, whose `Depends on` now names this task. **Does not block Sprint 7's deploy.**
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched (still `🔲 Backlog`); no other row touched;
> no mover skill run; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-04 (later), newest (above all others): verify task `0390` (for `0377`) filed and APPENDED at rank 7 — NOT at the top. Read the authority before the outcome.**
>
> **AUTHORITY.** The owner's **standing build/verify-split rule (2026-09-29)** — a verify task that needs a deploy plus a
> check goes *on top of the next sprint* and must not block the current sprint's deploy — applied at `0377`'s close on
> 2026-10-04 by `fkit-lead` (driving `/fkit-sprint-ship-loop`), relayed to a spawned `fkit-producer` holding **no owner
> channel** (ADR-021/037). ⛔ **Not producer precedent for re-ranking.**
>
> **OUTCOME.**
> - [`0390`](../tasks/done/0390-verify-0377-live-an-abandoned-private-lobby-ends-after-30-minutes-and-an-occupied-one-does-not/brief.md)
>   filed, `🔲 Backlog`, owner `fkit-producer` (owner-run, or a read-only agent log check). **Appended at rank 7**
>   (ADR-035: append, never insert). **No row moved or was renumbered.**
> - ⚠️ **Why not the top, as the rule says.** Unlike every earlier verify filing here (`0351`, `0358`, `0363`, `0370`),
>   this board now has closed rows at ranks 2–4 (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done). Moving `0390` to
>   rank 1 or 2 would renumber them, which ADR-035 forbids *"not even under an owner ruling"* — a closed row is a wall.
>   A spawned producer also never re-ranks. So the rule's cheapest-to-reverse branch was taken: append.
> - ⚠️ Priority 7 is append rank, NOT a merit ranking — flagged for owner confirmation.
>   **On merit this belongs directly below `0370`**, because the standing rule says top of the next sprint and `0370`
>   holds rank 1 by an earlier ruling. In practice the order barely matters: every verify row here is an independent
>   check, and none waits on another. **Owner decision:** keep 7, or rule a placement that renumbers no closed row.
> - Precondition: [`0377`](../tasks/done/0377-end-abandoned-unstarted-private-lobbies-after-a-short-idle-time-not-3-hours/brief.md)
>   (closed 2026-10-04, agent-closed) **committed** and shipped in a game-server deploy. **Does not block
>   [Sprint 7](done/plan-sprint-7.md)'s deploy.**
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched (still `🔲 Backlog`); no mover skill was run
> for this filing; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> ➡️ **Addendum — 2026-10-04, newest (above all others): task `0373` MOVED OUT TO [SPRINT 7](done/plan-sprint-7.md). Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given live 2026-10-04 via `AskUserQuestion`** in the `fkit lead` session, relayed by
> `fkit-lead` to a spawned `fkit-producer` with **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> Question: *"Where should 0373 (read the stale-login data, choose the fix) go?"* Owner's choice, verbatim: *"Pull into
> Sprint 7 (Recommended)"* — option text: *"Move 0373 onto Sprint 7 now. Sprint 7's goal includes citizenship, and 6 of
> its open tasks wait on this one task."*
>
> **OUTCOME.**
> - The `0373` row (rank 2) now reads `➡️ Moved to [Sprint 7](plan-sprint-7.md) — priority 36`. Its Priority, Task and
>   Brief cells are kept as history. **No row was renumbered** (ADR-035): open rows stay at 1, 5, 6; closed rows at 2,
>   3, 4. `0370` is still rank 1 here.
> - Sprint 7 row appended at **rank 36**, `🔲 Backlog` — ⚠️ **the producer's placement, not owner-ruled** (see that
>   board's 2026-10-04 addendum).
> - Brief `## Sprint` → `Sprint 7`, `## Priority` → `36`, both with dated notes; old values kept struck. No folder
>   moved, no mover run, this board's line-3 banner (`🔲 Backlog`) untouched, nothing committed.

> 🆕 **Addendum — 2026-10-02 (later), newest (above all others): task `0373` (read the stale-login data, choose the fix) filed and APPENDED at rank 6; owner-approved for the top of this board. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULINGS given **2026-10-02 via `AskUserQuestion`** in the live `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with **no owner channel** (ADR-021/037). ⛔ **Not producer precedent for re-ranking.** Verbatim: the owner approved filing a build task and *"a 'read the data and decide' task for the top of the next sprint"*; and on the S2-exit threshold, *"Decide it with the data (Recommended)"*.
>
> **OUTCOME.**
> - [`0373`](../tasks/done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) filed, `🔲 Backlog`, owner `fkit-producer` (decision is the owner's). **Appended at rank 6** (ADR-035: append, never insert). **No row moved or was renumbered.**
> - ~~⚠️ Priority 6 is append rank, NOT a merit ranking — flagged for owner confirmation.~~ ✅ Resolved by the 📌 re-rank line below.
>   **On merit this belongs directly below `0370`**, because the owner asked for the top of this sprint, `0370` holds rank 1 by an earlier ruling, and this is the next step on the chain blocking `0340`. Moving it to rank 2 would move `0363` 2 → 3, `0358` 3 → 4, `0351` 4 → 5, `0343` 5 → 6 (all open; no closed row on this board) — ~~**left for the owner to confirm**, because a spawned producer does not re-rank.~~ confirmed by the owner, below.
> - Depends on [`0372`](../tasks/done/0372-client-diagnostics-for-stale-login-signatures/brief.md) (Sprint 7, rides the 2026-10-03/04 game deploy) and `0366` (rides the 2026-10-03/04 profile deploy), plus 5–7 days of data including a weekend evening — earliest useful read after the evening of 2026-10-10 (UTC) if both deploys land on time.
> - This board's line-3 banner (`🔲 Backlog`) was not touched; no other row changed; nothing committed.
>
> 📌 **2026-10-02 (re-rank) — OWNER RULING: `0373` moved to rank 2, directly below `0370`.** Given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ **not producer precedent for re-ranking.** Verbatim choice: *"Move to rank 2 (Recommended)"*. **Moved:** `0373` 6 → 2 (row now sits directly below `0370`); `0363` 2 → 3, `0358` 3 → 4, `0351` 4 → 5, `0343` 5 → 6. All six rows are open (`🔲 Backlog`); **no closed row exists on this board, so none was renumbered** (ADR-035). Each moved row's rank cell carries "was ~~N~~"; all five briefs' `## Priority` carry a dated 📌 note (old text kept struck or as written). ⚠️ Rank 2 is the owner's placement; it does **not** let `0373` start early — it still waits on `0372` + `0366` being deployed and 5–7 days of data incl. a weekend evening. Line-3 banner (`🔲 Backlog`) and every status cell untouched; nothing committed.

> 🆕 **Addendum — 2026-10-02, newest (above all others): verify task `0370` (for `0367`) filed and placed at the TOP of this board. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given live 2026-10-02 via `AskUserQuestion`** in the `fkit lead` session —
> *"Close + file both tasks (Recommended)"* — together with the owner's **standing build/verify-split rule (2026-09-29)**: a
> verify task that needs a deploy plus an owner check goes *on top of the next sprint* and must not block the current
> sprint's deploy. Applied at `0367`'s close by `fkit-lead` (driving `/fkit-sprint-ship-loop`), relayed to a spawned
> `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent for re-ranking.**
>
> **OUTCOME.**
> - [`0370`](../tasks/done/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md)
>   filed, `🔲 Backlog`. It was **appended at rank 5** (ADR-035: append, never insert), then **moved to rank 1** within
>   this board's contiguous run of open rows. **Moved:** `0363` 1 → 2, `0358` 2 → 3, `0351` 3 → 4 and `0343` 4 → 5 (all
>   open rows). **No closed row exists on this board, so none was renumbered.** All four briefs' `## Priority` updated
>   to match, with dated notes.
> - ⚠️ Rank 1 vs `0363` / `0358` is **placement, not a merit ranking** — they are independent owner checks. This one is
>   the only one with a **fixed date**: its Step 1 re-runs the "before" query **on deploy day** (target 2026-10-03/04),
>   and its day-4 / day-7 reads follow from that date — **whether or not this sprint has started by then**.
> - No other row's text was touched beyond the rank cell.
> - 📌 **2026-10-02 (later) — OWNER RULINGS on `0370`**, relayed by `fkit-lead` to a spawned `fkit-producer` with no
>   owner channel (ADR-021/037); ⛔ not producer precedent. **Window:** *"Yes, leave it out (Recommended)"* — deploy day
>   excluded from both windows. **Step 1:** *"Do it with the deploy (Recommended)"* — the "before" query is run at the
>   weekend deploy (2026-10-03/04), read-only, when the owner tells `fkit-lead` or a coder to run it. Rank and status
>   unchanged. See the brief.

> 🆕 **Addendum — 2026-10-01, newest (above all others): verify task `0363` (for `0356`) filed and placed at the TOP of this board. Read the authority before the outcome.**
>
> **AUTHORITY.** The owner's **standing build/verify-split rule (2026-09-29)** — a verify task that needs a deploy plus an
> owner check goes *on top of the next sprint* and must not block the current sprint's deploy — applied at `0356`'s
> close on 2026-10-01 by `fkit-lead` (driving `/fkit-sprint-ship-loop`), relayed to a spawned `fkit-producer` holding
> **no owner channel** (ADR-021/037). `0356`'s own brief (§ *Dependencies*, *Build / verify split*) names this filing.
> ⛔ **Not producer precedent for re-ranking.**
>
> **OUTCOME.**
> - [`0363`](../tasks/done/0363-verify-0356-in-production-the-telemetry-deploy-is-tagged-with-its-version/brief.md)
>   filed, `🔲 Backlog`. It was **appended at rank 4** (ADR-035: append, never insert), then **moved to rank 1** within
>   this board's contiguous run of open rows. **Moved:** `0358` 1 → 2, `0351` 2 → 3 and `0343` 3 → 4 (all open rows).
>   **No closed row exists on this board, so none was renumbered.** All three briefs' `## Priority` updated to match,
>   with dated notes.
> - ⚠️ Rank 1 vs `0358` is **placement, not a merit ranking**: both are short owner-run checks on different boxes
>   (telemetry vs profile production) and do not compete; they can run in the same weekend slot in either order. To put
>   `0358` back on top, swap the two rank cells (one edit) and the two briefs' `## Priority`.
> - Precondition: [`0356`](../tasks/done/0356-tag-telemetry-server-deploys-with-a-version-like-the-game/brief.md)
>   (closed 2026-10-01, agent-closed) **committed** — until then the telemetry deploy refuses to run (owner ruling Q1
>   at `0356`'s plan gate) — and deployed in the weekend slot. **Does not block [Sprint 7](done/plan-sprint-7.md)'s deploy.**
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched (still `🔲 Backlog`); no mover skill was run
> for this filing; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-09-30, newest (above all others): verify task `0358` (for `0355`) filed and placed at the TOP of this board. Read the authority before the outcome.**
>
> **AUTHORITY.** The owner's **standing build/verify-split rule (2026-09-29)** — a verify task that needs a deploy plus an
> owner check goes *on top of the next sprint* and must not block the current sprint's deploy — applied at `0355`'s
> close on 2026-09-30 by `fkit-lead` (driving `/fkit-sprint-ship-loop`), relayed to a spawned `fkit-producer` holding
> **no owner channel** (ADR-021/037). ⛔ **Not producer precedent for re-ranking.**
>
> **OUTCOME.**
> - [`0358`](../tasks/done/0358-verify-0355-in-production-the-profile-deploy-is-tagged-with-its-version/brief.md)
>   filed, `🔲 Backlog`. It was **appended at rank 3** (ADR-035: append, never insert), then **moved to rank 1** within
>   this board's contiguous run of open rows. **Moved:** `0351` 1 → 2 and `0343` 2 → 3 (both open rows). **No closed row
>   exists on this board, so none was renumbered.** Both briefs' `## Priority` updated to match, with dated notes.
> - ⚠️ Rank 1 vs `0351` is **placement, not a merit ranking**: both are short owner-run checks on different boxes
>   (profile production vs the game dev box) and do not compete. To put `0351` back on top, swap the two rank cells
>   (one edit) and the two briefs' `## Priority`.
> - Precondition: [`0355`](../tasks/done/0355-tag-profile-server-deploys-with-a-version-like-the-game/brief.md)
>   (closed 2026-09-30, agent-closed) **committed** — until then the profile deploy refuses to run — and deployed in
>   the weekend slot. 🚨 The first tagged profile deploy must be the one that first ships `0309`'s log line, and no
>   second profile deploy may come before `0297` §1 reads it. **Does not block [Sprint 7](done/plan-sprint-7.md)'s deploy.**
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched (still `🔲 Backlog`); no mover skill was run
> for this filing; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-09-30, newest (above all others): OWNER-RULED — verify task `0351` filed and placed at the TOP of this board. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given 2026-09-30, live in the `fkit lead` session via `AskUserQuestion`**, relayed by
> `fkit-lead` (driving `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent for re-ranking.** The owner's answer: *"File a verify task for Sprint 8"* — applying the
> owner's standing build/verify-split rule (2026-09-29): a verify task that needs a deploy plus an owner check goes *on
> top of the next sprint* and must not block the current sprint's deploy.
>
> **OUTCOME.**
> - [`0351`](../tasks/done/0351-verify-0035-on-the-dev-box-a-public-match-starts-and-each-map-file-downloads-once/brief.md)
>   filed, `🔲 Backlog`. It was **appended at rank 2** (ADR-035: append, never insert), then **moved to rank 1** within
>   this board's contiguous run of open rows by the ruling above. `0343` moved from 1 to 2 (an open row). **No closed
>   row exists on this board, so none was renumbered.** `0343`'s brief `## Priority` updated to match, with a dated note.
> - ⚠️ Priority 1 here is **owner-ruled placement, not a merit ranking against `0343`**. The two do not compete:
>   `0351` is a short owner-run check, `0343` a discussion. To undo, swap the two rank cells back (one edit).
> - Precondition: [`0035`](../tasks/done/0035-worker-init-timeout-map-refetch/brief.md) (closed 2026-09-30,
>   agent-closed) deployed to the dev box. **Does not block [Sprint 7](done/plan-sprint-7.md)'s deploy.**
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched (still `🔲 Backlog` — the owner has not
> started Sprint 8); no mover skill was run for this filing; nothing committed or pushed; nothing under
> `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-09-29: board created; task `0343` filed here. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given 2026-09-29, live in the `fkit lead` session**, relayed by `fkit-lead` to a
> spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.** The owner's
> words, as relayed: split the brief-less rows into separate briefs; *"each brief should have a list of the things
> that should be discussed (not implemented, but discussed)"*; and the split test quoted in the banner note above,
> which the owner **delegated to the producer** to apply.
>
> **OUTCOME.**
> - `0343` filed at rank 1 (the only row). Status `🔲 Backlog`.
> - **What went into it (producer's classification — owner may overrule):** Paid Campaign Map Packs *(borderline:
>   a separate product, but a pack purchase grants citizenship)*, Nickname Styling System, Map Voting for Verified
>   Players *(borderline: "verified" = citizens; earned vs paid not stated)*, Replay Access as Premium Feature
>   *(borderline: read "premium tier" as citizenship)*, Custom Uploaded Flags & Patterns — Paid Citizens Only.
> - The other six rows went to [`0342`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md)
>   on the [Backlog board](backlog.md). Full record: the 2026-09-29 addendum under [Sprint 6](done/plan-sprint-6.md)'s
>   status table.
>
> ⛔ **WHAT DID NOT HAPPEN.** No other sprint's line-3 banner was touched; no task folder moved; no mover skill was
> run; nothing was committed or pushed; nothing under `ai-agents/wiki-vault/` was touched.

> ➡️ **Addendum — 2026-09-29, later: RULINGS C and D. Read the authority before the outcome.**
>
> **AUTHORITY.** Two **OWNER RULINGS given 2026-09-29, live in the `fkit lead` session**, relayed by `fkit-lead` to a
> spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> - **C**, verbatim: *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that to the Sprint 8."*
> - **D**, name this sprint, exact wording: *"Paid Citizenship Perks and More Content"*.
>
> **OUTCOME.**
> - **C:** Leaderboard — Rewards Layer, Coin Economy + Rewarded Ads, and Clans moved out of
>   [`0342`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) into `0343`
>   (items F, G, H), with all their prose. This overrules the producer's borderline "no" calls on them (see the
>   addendum above). `0343` was retitled; its folder was **not** renamed (ADR-029). Still one row, still rank 1.
>   Full record: the ruling C addendum under [Sprint 6](done/plan-sprint-6.md)'s status table.
> - **D:** the H1 now reads *Sprint 8 — Paid Citizenship Perks and More Content*; `plan-index.md` updated. **Goal still
>   unset. Status unchanged: `🔲 Backlog`.**
>
> ⛔ **WHAT DID NOT HAPPEN.** No line-3 banner was touched; no task folder moved or was renamed; no mover skill was run;
> nothing was committed or pushed; nothing under `ai-agents/wiki-vault/` was touched.

## Notes

- 2026-09-29 — board created by a spawned `fkit-producer` on the owner ruling above. No theme name, no goal, not
  started. All three are the owner's to set.
- 2026-09-29, later — named by owner ruling D (*"Paid Citizenship Perks and More Content"*). Goal and start still the
  owner's to set.
- 2026-09-30 — verify task `0358` (for `0355`) filed at rank 1; `0351` → 2, `0343` → 3. See the addendum above.
- 2026-10-01 — verify task `0363` (for `0356`) filed at rank 1; `0358` → 2, `0351` → 3, `0343` → 4. See the addendum above.
- 2026-10-04 — verify task `0390` (for `0377`) filed and appended at rank 7 — not the top, because ranks 2–4 are closed rows (ADR-035). See the addendum above.
- 2026-10-07 — task `0404` (refresh-the-game popup after ~24 h, start screen only; exit for `0332` R2) filed on owner ruling and appended at rank 14 (ADR-035 append rank). See the addendum above.
- 2026-10-07, later — `0404` moved to [Sprint 7](done/plan-sprint-7.md) at 53 on owner ruling *"Move the refresh popup task to the Sprint 7"*; this row stays as `➡️ Moved`, rank 14 kept. See the addendum above.
- 2026-10-09 — task `0426` (catch-up news-window entry, end of Sprint 8, before its final deploy) filed on an owner request and appended at rank 23 (ADR-035 append rank). See the addendum above.
- 2026-10-09, later — `0219` moved in from [Sprint 7](done/plan-sprint-7.md) on owner ruling *"Move the task to Sprint 8"*, appended at rank 24 (ADR-035 append rank; on merit directly below `0370`), `🔄 In progress`; its G3/G4 deferral lifted (*"Yes, un-pause in Sprint 8 (Recommended)"*). Its epic `0213` moved in too (*"Move it to the Sprint 8"*), appended at 25 directly below `0219`, `🔲 Backlog`. See the addendum above.
- 2026-10-09, later — `0425` closed (agent-closed — not owner-verified); verify task `0430` (owner-run, mid-week profile deploy by owner ruling) and fix task `0431` (stale `Routes.it.test.ts` expectation) filed and appended at ranks 32 and 33 (ADR-035 append rank). See the addendum above.
- 2026-10-10 — `0228` closed (agent-closed — not owner-verified); its live check `0433` (owner-run) filed and appended at rank 34 (ADR-035 append rank; on merit directly above `0428`); `0428` now also depends on `0433`. See the addendum above.
- 2026-10-10, later — `0431` closed (agent-closed — not owner-verified); test-only, no follow-up filed; its "likely cause" corrected from `0340` to `0332` (`077c9e3`). See the addendum above.
- 2026-10-10, later — `0405` and `0406` closed (agent-closed — not owner-verified) on owner rulings; ADR-124 trigger 2 not hit (owner ruling); no token in the logs searched; `0406`'s main question (refreshed players come back verified?) unanswered — no data; open question on 0 `Refresh` presses recorded, no task. See the addendum above.
- 2026-10-10, later — `0351` closed (agent-closed — not owner-verified) on owner ruling *"Close it, that's enough (Recommended)"*: one public dev match started, each map file requested once by the page; the worker's own requests not observed (gap stated); Steps 3–4 not taken. See the addendum above.
- 2026-10-10, later — `0390` closed (agent-closed — not owner-verified) on owner ruling *"Close 0390 + file task for (A) (Recommended)"*: cases 1 and 3 and "no collateral" passed; case 2 and step 2 not run; follow-up `0434` (host window keeps polling an ended lobby) filed on the Backlog board; `0428`'s dependency on `0390` now met, its status unchanged. See the addendum above.
- 2026-10-10, later — `0376` and `0381` closed (agent-closed — not owner-verified) on owner ruling *"Gate item 2 passed, close both (Recommended)"*: gate item 2 passed; `0389` (b) and `0381` steps 3–5 not run (`0389` (b) and `0381` step 3 moved to `0428` step 4b on *"skip tester"*; `0381` step 4 skipped on owner ruling — unproven live); `0428` now waits only on `0433`, its status unchanged. See the addendum above.
