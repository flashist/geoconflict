# Geoconflict — Sprint 8 — Paid Citizenship Perks and More Content

> ## 🔄 In progress — 2026-10-12.

> ▶️ **2026-10-12 — SPRINT STARTED. OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-12**,
> relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> Verbatim: **"Mark it started (Recommended)"** — option text: *"Only the label at the top changes; the board tools then see
> Sprint 8 as the current sprint."* Line 3 changed from ~~`🔲 Backlog — 2026-09-29`~~ to `🔄 In progress — 2026-10-12`. No row
> changed by this act. The 📌 note directly below is history: true 2026-09-29 → 2026-10-12 (*"NOT STARTED"*).

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
| ✅ Done (agent-closed — not owner-verified) *(2026-10-11 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING *"Close it (Recommended)"* given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`. Evidence: the task's `worklog.md` — run 1 (2026-10-09, game `0.0.161`) and the section *"Earned test account — unblocked by `0430` — 2026-10-11"* (items 3(a), 8(b) and the earned part of item 4: all pass, owner-run, game `0.0.163`). **Not checked live:** item 7(B) (never passed; stays "not checked live" per the 2026-10-08 owner ruling); item 7(A) on a phone — optional, not run. Earlier value, kept as history: ~~🔲 Backlog~~.)* | 18 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs at the very top of this board, beside `0370`**, because the OWNER RULED *"top of Sprint 8"* (2026-10-08) on his standing build/verify-split rule. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`), and ADR-035 never renumbers them, *"not even under an owner ruling"* — a new row always appends. Appended after the highest (17, `0418`). **Read it as the top group.** See the 2026-10-08 `0420` addendum below.)* | **Verify Sprint 7's popup, start-screen and private-lobby fixes live — one checklist for 0416, 0408, 0409, 0407, 0417, 0412, 0413** *(🆕 **FILED 2026-10-08** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session at the end of the Sprint 7 ship loop, relayed by `fkit-lead`; ⛔ not producer precedent. One owner-run checklist in the Yandex Games shell, no real purchase: private-lobby Start works with no 403 and the log's create line carries `, creator: …` (`0416`); paid-only sub-heading (`0408`); Buy button on the earned verified account — look only, never tap (`0409`); paid thank-you line (`0407`); wider popup, dark scrollbar (`0417`); Приватная tab (`0412`); join window hint (`0413`; its error-window copy is **not checked live** — owner ruling 2026-10-08). Two passes possible: `0416`/`0407`–`0409` cleared for a same-day deploy (*"might"*), `0412`/`0413`/`0417` weekend slot. Pass/fail + who/when per item. `0382` excluded — that is `0383`. Blocks nothing; does not block Sprint 7's deploy.)* | [`0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist`](../tasks/done/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md) |
| ⛔ Cancelled (agent-closed — not owner-verified) (2026-10-09) — Merged into 0420 by owner ruling 2026-10-09 ('Fold into 0420') | 19 *(append rank — ⚠️ **Priority 19 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0420`, in the top group**, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task at the top of the next sprint, and `0420` checks the same popup with the same test accounts. Not inserted higher: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`), and ADR-035 never renumbers them — a new row always appends. Appended after the highest (18, `0420`), which is directly below `0420`. **Read it as the top group.** See the 2026-10-09 `0422` addendum below.)* | **Verify 0421 live: the shorter citizenship popup on a real phone inside Yandex Games** *(🆕 **FILED 2026-10-09** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at `0421`'s close, on the owner-approved `0421` plan (*"the verify task is filed at close"*) and the standing build/verify-split rule; ⛔ not producer precedent. OWNER-executed, ru, real phone, portrait (landscape optional, *not run* allowed), game `0.0.161`: (a) non-citizen — Buy visible without scrolling, text matches `0421`'s approved table; (b) earned test account — no "Получите бесплатно" line, paid-Buy button visible, ⛔ **never tap Buy**; (c) paid account — no free line, no Buy button. Pass/fail/not run per step; no ids. No size target (owner ruling 2026-10-08), so a "Buy not visible" result is a question for the owner, not a failure. Its checks are now `0420` item 8. Depends on `0421`; blocks nothing.)* | [`0422-verify-0421-live-the-shorter-citizenship-popup-on-a-real-phone-inside-yandex-games`](../tasks/cancelled/0422-verify-0421-live-the-shorter-citizenship-popup-on-a-real-phone-inside-yandex-games/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 20 *(append rank — ⚠️ **Priority 20 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0420`**, because the owner found these tooltips while running `0420`'s checklist and believes they break a Yandex Games rule — a compliance fix for the game's only storefront. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`, `0422`), and ADR-035 never renumbers them — a new row always appends. Appended after the highest (19, `0422`). See the 2026-10-09 `0415`/`0423` addendum below.)* | **No native browser tooltips anywhere in the UI — `o-button` / `o-modal` stop carrying a `title` attribute, and every other `title` tooltip in the client goes** *(➡️ **PULLED FROM THE [Backlog board](backlog.md) 2026-10-09** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live via `AskUserQuestion` in the coordinating Claude Code session, verbatim **"Move 0415 into Sprint 8 (Recommended)"**; ⛔ not producer precedent. Seen live on `0.0.161` (owner screenshots 2026-10-09): the join window's "Присоединиться к лобби" button (`JoinPrivateLobbyModal.ts:176`) and the single-player window's "Начать игру" button (`SinglePlayerModal.ts:398`, owner: *"Confirmed: the START button also have the same tooltip"*); on `0.0.157` the host window showed "Приватное лобби". Owner: generic hints are *"forbidden by Yandex.Games rules"*. Whole task, unchanged scope: §1 the two shared components, §2 every other `title`; plan-gate point for icon-only controls (owner confirms each). Same `Modal.ts` file as `0423` — whichever lands second rebases. Client-only, both templates. Live check filed at close. Weekend slot unless the owner says otherwise. Depends on nothing; blocks nothing.)* | [`0415-no-native-browser-tooltips-anywhere-in-the-ui`](../tasks/done/0415-no-native-browser-tooltips-anywhere-in-the-ui/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 21 *(append rank — ⚠️ **Priority 21 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0415`**, because it is low-priority visual polish (nothing broken, no platform rule), while `0415` is a Yandex-rules fix in the same file. 21 is already directly below `0415`. See the 2026-10-09 `0415`/`0423` addendum below.)* | **Dark thin scrollbar in every game window (shared `o-modal` first), matching the citizenship popup** *(🆕 **FILED 2026-10-09** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live via `AskUserQuestion` in the coordinating Claude Code session, verbatim **"Brief a small task, Sprint 8 (Recommended)"**; ⛔ not producer precedent. Seen live on `0.0.161`: the "Одиночная игра" window shows the light default scrollbar. Cause: the dark scrollbar lives in `styles.css`, which does not reach into the shadow-DOM `o-modal` (`Modal.ts`, two scrolling areas). Fix once in the shared component where possible; coder inventories other scrolling windows. Reference look `0417` (no `scrollbar-color` — it turns the rules off in Chromium). Chromium-based only, Firefox not. `0419`'s seven small popups stay with `0419` (assumption, flagged). Same `Modal.ts` as `0415` — whichever lands second rebases. Live check folded into `0429` (owner ruling 2026-10-09, verbatim **"Add a line to 0429 (Recommended)"**). Depends on nothing; blocks nothing.)* | [`0423-dark-thin-scrollbar-in-every-game-window`](../tasks/done/0423-dark-thin-scrollbar-in-every-game-window/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 22 *(append rank — ⚠️ **Priority 22 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs at the very top of this board, directly beside `0420`**, because it unblocks live checks that cannot run today (`0420`'s earned-account items, possibly `0376`) and the owner asked for it *"as one of the first things"*. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`, `0422`), and ADR-035 never renumbers them — a new row always appends. Appended after the highest (21, `0423`). An owner re-rank can lift it only to 20 (top of the open run `0415`, `0423`; `0422`'s cancelled row at 19 is a wall). **Read it as the top group.** See the 2026-10-09 `0425` addendum below.)* | **SSH-only tester roles: apply a fixed test role (non-citizen, earned, paid, …) to an allowlisted tester record, and restore it** *(🆕 **FILED 2026-10-09** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST typed by the owner in the coordinating Claude Code session plus three OWNER RULINGS given live via `AskUserQuestion` there; ⛔ not producer precedent. Why: since the 2026-10-08 incident (`0424`) there is no earned-citizen test account. One operator command on the profile box, SSH only (`0312` shape): `apply <tester> <role>` (exactly two inputs), `restore <tester>`, read-only `show <tester>`. Box-only, owner-edited tester allowlist (one entry; fail closed). Roles fixed in code: non-citizen, almost a citizen (99 XP), earned, paid (flag only — **no fake purchase record**), brand-new (0 XP, tenure gift reset). Copy-from-a-real-player mode **left out** (owner ruling). Save before first apply, exact restore (owner ruling). Touches only the tester's rows; every run logged on the box. Each production run needs the owner's in-session OK; first live run filed at close. Architect consult suggested at plan. Depends on nothing; blocks `0420` (earned items), `0376` (only if it needs an earned host).)* | [`0425-ssh-only-tester-roles-apply-a-fixed-test-role-to-an-allowlisted-tester-and-restore-it`](../tasks/done/0425-ssh-only-tester-roles-apply-a-fixed-test-role-to-an-allowlisted-tester-and-restore-it/brief.md) |
| 🔄 In progress *(2026-10-15 — OWNER RULING, live `AskUserQuestion`, relayed by the main session; ⛔ not producer precedent; verbatim *"Both (Recommended)"*. Work has started: the news text was drafted 2026-10-11 and owner-approved 2026-10-12 (worklog). Waiting for deploy day — `resources/announcements.json` is not edited yet.)* | 23 *(append rank — ⚠️ **Priority 23 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs last on this board, directly below `0425`**, because by design it runs after every other Sprint 8 build task and ships in the final Sprint 8 deploy. 23 already sits there. **Rank barely matters — the brief's Timing rule governs when it starts.** See the 2026-10-09 `0426` addendum below.)* | **Update the news window: tell players everything that shipped since 2026-06-06 (end of Sprint 8, before its final deploy)** *(🆕 **FILED 2026-10-09** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST typed by the owner in the coordinating Claude Code session; ⛔ not producer precedent. The newest news entry is `2026-06-06-game-update` (shipped in `0.0.136`); 25 prod deploys since (`0.0.137`–`0.0.161`) told players nothing. New entry (or a few — coder proposes) in `resources/announcements.json`, en + ru in sync, Russian first; player-visible changes only, live for everyone at deploy time (owner gives `citizenship_ui` / `private_lobbies_all` values); no game name (`0311` test). ⛔ Owner approves the exact text + included/excluded list before the file is edited; recorded in the worklog. **Timing:** starts after the last Sprint 8 build task is built, ships in the final Sprint 8 deploy, never ahead of a feature it names. `resources/changelog.md` is an unused upstream sample — out of scope. Live look filed at close. Depends on `0415`, `0423` and any later Sprint 8 build task in that deploy — **except `0350`** (2026-10-15 OWNER RULING, live `AskUserQuestion`, relayed by the main session; ⛔ not producer precedent; verbatim *"Ship 0350 on its own (Recommended)"*: not player-facing, ships in its own weekend profile-server deploy); blocks nothing.)* | [`0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06`](../tasks/backlog/0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/brief.md) |
| 🔄 In progress *(2026-10-09 — moved in from [Sprint 7](done/plan-sprint-7.md), where it read ~~🚧 Blocked~~ on the G3/G4 deferral. That deferral is LIFTED by OWNER RULING 2026-10-09 (live `AskUserQuestion`, *"Yes, un-pause in Sprint 8 (Recommended)"*, relayed to a spawned `fkit-producer` with no owner channel; ⛔ not producer precedent). `🔄 In progress`, not `🔲 Backlog`: all of G1–G4 is built and deployed (2026-09-26), G1 is verified, and what is left is owner-side setup and live drills — not a build for the sprint loop to re-plan. **Left:** B3 (the two outside uptime monitors, alerting to Telegram + email); confirm B2's daily check alerts to Telegram (it exists and emailed the owner on 2026-09-25 — Telegram not confirmed); drills B7–B10 (watch each alert arrive); and B6/V2, only partial — the 2026-09-26 prune removed the Postgres image tag the compose file names, fix direction not decided. The 2026-09-13 hold-open ruling still stands: no close until the alerts are seen arriving.)* | 24 *(append rank — ⚠️ **Priority 24 is append rank, NOT a merit ranking** — ~~flagged for owner confirmation~~ ✅ **merit order OWNER-CONFIRMED 2026-10-15** (live `AskUserQuestion`, relayed by the main session; ⛔ not producer precedent; verbatim *"Confirm that order (Recommended)"*): **`0452` → `0462` → `0449`/`0450` near the top, and `0219` near the top for its deadline.** Row number unchanged (ADR-035); see the 2026-10-15 four-rulings addendum below. **On merit this belongs directly below `0370`, at the top of this board**, because it carries a dated fuse: the profile box's certificate renewal starts real attempts around 2026-10-21 and the certificate expires 2026-11-20 (both dates reported, never verified from the repo), and until these alarms are on and tested a failed renewal is silent. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`, `0422`), and ADR-035 never renumbers them. See the 2026-10-09 `0219` addendum below.)* | **P4 — Operability on the profile box: log rotation, image prune, an outside uptime check, and a reader for `last-backup.json`** *(➡️ **MOVED IN FROM [SPRINT 7](done/plan-sprint-7.md) ON 2026-10-09** — OWNER RULING typed by the owner in the coordinating session, verbatim *"Move the task to Sprint 8"*, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner-participation task: the owner sets up the outside monitors and runs the drills on the box. Effort small; consequence high — the "outage nobody noticed for three weeks" class. Depends on `0215` and `0241`, both ✅ Done. Parent epic `0213` — not touched by this move. Full history: the brief and the [Sprint 7](done/plan-sprint-7.md) row.)* | [`0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness`](../tasks/backlog/0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) |
| 🔲 Backlog *(2026-10-09 — moved in from [Sprint 7](done/plan-sprint-7.md) with the status it carried there, unchanged. Open; waits only on `0219` — the epic's only unmet completion criterion is item 8, `0219`'s P4 work; item 9 is partly met by the earlier owner ruling Q2.)* | 25 *(append rank — ⚠️ **Priority 25 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0219`**, because the epic closes when `0219` closes. 25 already sits there. See the 2026-10-09 `0219` / `0213` addendum below.)* | **EPIC — Profile backend + S3: wipe and rebuild onto the existing box and bucket (P0–P7)** *(➡️ **MOVED IN FROM [SPRINT 7](done/plan-sprint-7.md) ON 2026-10-09** — OWNER RULING typed by the owner in the coordinating session, verbatim *"Move it to the Sprint 8"*, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Tracking epic, no build of its own. Child phases are closed except `0219` (P4), directly above. Full history: the brief and the [Sprint 7](done/plan-sprint-7.md) row.)* | [`0213-profile-backend-clean-slate-rebuild`](../tasks/backlog/0213-profile-backend-clean-slate-rebuild/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 26 *(append rank — ⚠️ **Priority 26 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs at the very top of this board, directly beside `0370`**, because the owner asked for it *"the first thing"*: every full test run on the owner's Mac risks another crash and slows every other task's checks. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`, `0422`), and ADR-035 never renumbers them — a new row always appends. Appended after the highest (25, `0213`). **Read it as the top group.** See the 2026-10-09 `0427` addendum below.)* | **Project-wide lock so only one full jest run happens at a time, plus `--detectOpenHandles --forceExit` on the unit run** *(🆕 **FILED 2026-10-09** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST typed by the owner in the coordinating Claude Code session plus two OWNER RULINGS given live via `AskUserQuestion` there; ⛔ not producer precedent. Why: Mac kernel panics 2026-10-06 and 2026-10-08 during full runs, and a session lost to CPU overload 2026-10-09 with a forgotten background full run; `maxWorkers: 1` is per run, so parallel agents still stack full runs. One lock shared by `npm test`, `test:coverage`, `test:integration`, in git's shared dir (all worktrees); holds pid + start time; dead holder → taken over. A second full run **waits its turn with a clear message** naming holder and start time, then starts by itself (Ruling 1). Targeted runs and `--watch` not locked. `--detectOpenHandles --forceExit` on unit + coverage runs only (Ruling 2); integration keeps `0197`'s no-`--forceExit` rule. Trade-offs accepted: slower runs, `--forceExit` can hide a unit-suite handle leak, `npx jest` bypasses the lock (CLAUDE.md: always use npm scripts). Cause of the panics still unproven. Depends on nothing; blocks nothing. ✅ **CLOSED 2026-10-09** by a spawned `fkit-producer` on the OWNER RULING *"Commit, then close task"* (relayed; ⛔ not producer precedent); work committed in `1926f4c`. Proof: 15/15 lock tests, a real-lock-path check with a stub runner, lint/tsc clean, one full `npm test` through the wrapper — exit 0, 74 s, 216/216 suites, 4400 passed, 1 skipped (Docker-probed harness, Docker down — skipped, not passed). ⚠️ **Not done:** the owner's own two-terminal check (second full run waits, then starts) — the waiting behaviour is proven only by the automated tests and the stub check; 74 s vs the 292 s baseline is **not like-for-like**. ⚠️ No-git fallback differs from the brief's default: a lock file, not an unlocked run (coder's choice, in the worklog).)* | [`0427-project-wide-lock-so-only-one-full-jest-run-happens-at-a-time`](../tasks/done/0427-project-wide-lock-so-only-one-full-jest-run-happens-at-a-time/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 27 *(append rank — ⚠️ **Priority 27 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0370`, at the top of this board**, because the owner's build/verify rule puts a verify task at the top of the next sprint, and what is left of it is small. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`, `0422`), and ADR-035 never renumbers them. See the 2026-10-09 private-lobby release addendum below.)* | **Verify private lobbies in production — a real citizen hosts inside the Yandex Games page, a friend joins, the match starts and ends** *(➡️ **MOVED IN FROM THE [BACKLOG BOARD](backlog.md) ON 2026-10-09** — OWNER RULING typed by the owner in the coordinating Claude Code session on 2026-10-09 (the owner's own message), verbatim *"1. Yes move to the Sprint 8 and brief a dedicated task for the Sprint 8 to turn the private lobbies on for everybody."*, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Release-gate item 2 in `0354`. **Mostly passed live 2026-10-09** (game `0.0.161`, run as `0420` item 1 + `0383`): a paid citizen tester hosted inside Yandex Games on the computer; a **non-tester, non-citizen** second account on a phone joined by the Yandex invite link; the match started for both; no `403`, no "Не удалось начать игру"; server log counts: 1 create line with the creator, 0 "creator not a citizen" refusals; tester sees three tabs, non-tester two. 📌 **2026-10-10 — CLOSED `(agent-closed — not owner-verified)`**, OWNER RULING verbatim **"Gate item 2 passed, close both (Recommended)"**; ⛔ not producer precedent. Second run, `0.0.161`: `0353` host-window check pass; `0389` (a) code as `XXXX XXXX` pass; a non-citizen **non-tester** on an iPhone joined inside Yandex by the invite link; match started; the host played to the win screen, the friend quit back to the start screen; console (owner's screenshot): `citizenship_ui` = `enabled`, `private_lobbies` and `private_lobbies_all` not set; log: 2 create lines with the creator, 0 refusals, `start_game` 1 × 200 / 0 × 403. **Not run:** `0389` (b) lowercase code typing — OWNER RULING *"skip tester"* (typed), carried by `0428` step 4b. See the worklog and the 2026-10-10 close addendum below. Observation, not a fail: re-opening the same link after leaving put the friend back into the running match with a fast-forward catch-up. Owner-executed. Blocks `0428`.)* | [`0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins`](../tasks/done/0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 28 *(append rank — ⚠️ **Priority 28 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0376`, near the top of this board**, because it is the one gate item whose answer nobody can predict, and a reproduced race needs a fix, a build and a deploy before `0428` — starting early keeps it off the critical path. 28 already sits there. See the 2026-10-09 private-lobby release addendum below.)* | `handleJoinLobby()` leaves a stale `gameStop` across three awaits — two fast `join-lobby` events can interleave *(➡️ **MOVED IN FROM THE [BACKLOG BOARD](backlog.md) ON 2026-10-09** — OWNER RULING typed by the owner in the coordinating Claude Code session on 2026-10-09 (the owner's own message), verbatim *"1. Yes move to the Sprint 8 and brief a dedicated task for the Sprint 8 to turn the private lobbies on for everybody."*, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Release-gate item 3 in `0354`: an **investigation first**; by the 2026-10-03 rulings (*"Only if it's proven"*, *"No, needs a real repro"*) it is fixed only if actually reproduced, and **drops off the gate if not**. No new evidence 2026-10-09. Owner `fkit-coder`. Full history: the brief and the Backlog board row. Blocks `0428` unless it ends as *not reproduced*.)* | [`0228-handlejoinlobby-stale-gamestop-race`](../tasks/done/0228-handlejoinlobby-stale-gamestop-race/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 29 *(append rank — ⚠️ **Priority 29 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0376`, in the top group with `0370`**, because it is a short owner live check and its remaining steps can run in the same session as `0376`'s leftovers. Not inserted there: closed rows sit below the top, and ADR-035 never renumbers them. See the 2026-10-09 private-lobby release addendum below.)* | **Verify `0380` in production — ~~the Yandex invite copies the code~~, and old `#join=` links are ignored** *(➡️ **MOVED IN FROM THE [BACKLOG BOARD](backlog.md) ON 2026-10-09** — OWNER RULING typed by the owner in the coordinating Claude Code session on 2026-10-09 (the owner's own message), verbatim *"1. Yes move to the Sprint 8 and brief a dedicated task for the Sprint 8 to turn the private lobbies on for everybody."*, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Release-gate item 6 in `0354` (with `0383`, passed 2026-10-09). **Step 1 (pasted text is the code only) and step 6 (mobile repeat) are superseded by `0382`** — the invite now copies a Yandex Games link via the SDK, proven live by `0383` on `yandex.ru` and `yandex.com`; the paste-button question is answered (no paste button, `0420`). 📌 **2026-10-10 — CLOSED `(agent-closed — not owner-verified)`**, same OWNER RULING as `0376` (**"Gate item 2 passed, close both (Recommended)"**; ⛔ not producer precedent). Step 2 (code shown) **pass**. **Not run:** step 3 (code join — moved to `0428` step 4b by *"skip tester"*); step 4 (old `#join=` link) by OWNER RULING, typed, *"We didn't have private lobbies with private links before, so no links existed before"* — the Yandex build ignoring `#join=` stays **unproven live**; step 5 (standalone). See the worklog and the 2026-10-10 close addendum below. Old text struck in the brief, not deleted. Owner-executed. Blocks `0428`.)* | [`0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored`](../tasks/done/0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-13 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING *"Close it (Recommended)"* given live via `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed by `fkit-lead`; ⛔ not producer precedent. Evidence: the task's `worklog.md`. **`private_lobbies_all` = `enabled` for everyone, no condition, since about 17:09–17:12 MSK 2026-10-13** (game `0.0.163`); console values before/after as expected (owner: *"Yes, exactly as expected"*); checks 4a–4c (incl. 4b lowercase code join) **pass per owner statement "all good" — not itemised by the owner**; snippet on a non-tester page after the flip printed `citizenship_ui` and `private_lobbies_all` = `enabled`. ⚠️ **Not run:** check 4d (server-log counts) — skipped by the owner after the permission filter blocked the read-only SSH read. Rollback not used. Accepted risk stays: `0332` Q4 (forged citizen id can host). Earlier values, kept as history: ~~🔲 Backlog~~ → ~~🔄 In progress~~ (2026-10-13, owner doing the console flip).)* | 30 *(append rank — ⚠️ **Priority 30 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0381`**, because it is the last step of the private-lobby release chain and cannot start before `0376`, `0228` and `0381` finish. 30 already sits there. See the 2026-10-09 private-lobby release addendum below.)* | **Turn private lobbies on for everyone — set the `private_lobbies_all` everyone-flag in the Yandex Games console** *(🆕 **FILED 2026-10-09** by a spawned `fkit-producer` — OWNER RULING typed by the owner in the coordinating Claude Code session on 2026-10-09 (the owner's own message), verbatim *"1. Yes move to the Sprint 8 and brief a dedicated task for the Sprint 8 to turn the private lobbies on for everybody."*, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner-run console step, no build, no deploy: record `private_lobbies_all`, `citizenship_ui` and the old `private_lobbies` **before and after**; set `private_lobbies_all` = `enabled` with no condition; **live check right after** (reload first — flags are read once per page load): a non-tester sees the Приватная tab, a non-citizen can join (by code), Create stays citizen-only (explainer opens; the server's citizens-only start check is independent of the flag), read-only server-log counts with the owner's OK. **Rollback:** delete the flag; players lose the tab on next page load. Needs `citizenship_ui` on for everyone, or the flag does nothing. Records the accepted forged-citizen-id risk (`0332` Q4). **For `0426`:** its news may name private lobbies only if this flag is on before that deploy. Open questions: must `0390` (live check of gate item 4, `0377`) pass first *(📌 2026-10-10: `0390` has **passed** — closed `✅ Done (agent-closed — not owner-verified)`; see the 2026-10-10 `0390` close addendum above)*; flip timing vs the final deploy. Depends on `0376`, `0228`, `0381`, and `0433` (`0228`'s live check — OWNER RULING 2026-10-10, verbatim **"File it, before 0428 (Recommended)"**; ⛔ not producer precedent); *(📌 2026-10-10, later: `0376` and `0381` are **closed** `✅ Done (agent-closed — not owner-verified)` — OWNER RULING **"Gate item 2 passed, close both (Recommended)"**; ⛔ not producer precedent. `0428` now waits only on `0433` (`0228` committed + deployed + its live check). Its step 4b now also carries `0389`'s lowercase code-typing check and `0381` step 3 (a non-citizen joins by typing the code in lowercase) — OWNER RULING *"skip tester"* (typed). Status unchanged. See the 2026-10-10 `0376`/`0381` close addendum above.)* gate items 1, 4, 5 (`0354`, `0377`, `0301`) are closed — all three agent-closed, not owner-verified. 📌 **2026-10-11: UNBLOCKED** — its last dependency `0433` closed `✅ Done (agent-closed — not owner-verified)` (OWNER RULING 2026-10-11; ⛔ not producer precedent); all dependencies now closed. Status unchanged (`🔲 Backlog`): the console flip and live check are still the owner's to do.)* | [`0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console`](../tasks/done/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 31 *(append rank — ⚠️ **Priority 31 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0428`** — exactly where it sits — because the owner ruled "Bottom of Sprint 8" and it can only run after the deploy that carries `0415`. See the 2026-10-09 `0429` addendum below.)* | **Verify `0415` live — no native browser tooltips inside the Yandex Games iframe** *(🆕 **FILED 2026-10-09 at `0415`'s close** by a spawned `fkit-producer` — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` (ADR-021/037), verbatim **"Bottom of Sprint 8"**; ⛔ not producer precedent. **Executed by the owner (human)** with a real mouse hover — screenshots cannot show native tooltips. Short version of `0415`'s step 3: start-screen buttons, host and join windows, the join window's "Присоединиться к лобби" button, the single-player window's "Начать игру" button, one in-game panel. **+ one `0423` line** (OWNER RULING 2026-10-09, live `AskUserQuestion` in the `fkit lead` session, verbatim **"Add a line to 0429 (Recommended)"**; ⛔ not producer precedent): game windows show the dark thin scrollbar, not the light default. Depends on `0415` and `0423` committed and deployed; blocks nothing. **Owner ran the live check on 2026-10-10 (game `0.0.163`) and reported "Pass"** — one overall pass, items not listed one by one; evidence in the task's `worklog.md`.)* | [`0429-verify-0415-live-no-native-browser-tooltips-inside-the-yandex-games-iframe`](../tasks/done/0429-verify-0415-live-no-native-browser-tooltips-inside-the-yandex-games-iframe/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-11 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING *"Close 0430, file a fix task (Recommended)"* given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`. Evidence: the task's `worklog.md` — (a) profile deploy + checks pass; (b) allowlist created; (c) tester id found, login verified; (d) `apply earned-citizen` + `show` + run log pass, (d)4 reload pass per the owner; (e) `restore` round trip identical to the before-`show`. ⚠️ **NOT RUN: (f) the full backup dry-run** — `npm run test:scripts:docker` failed at container start, Docker Hub refused `minio/minio` (same as `0425`); the encrypt → upload → download → restore chain with migration `008` stays unproven. Carried to [`0436`](../tasks/done/0436-backup-dry-run-harness-fetch-the-minio-image-from-a-source-that-works-then-run-it-once/brief.md) on the [Backlog board](backlog.md). Earlier value, kept as history: ~~🔲 Backlog~~.)* | 32 *(append rank — ⚠️ **Priority 32 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs at the very top of this board, directly beside `0420`**, because it unblocks `0420`'s earned-account items (and possibly `0376`) and the owner ruled its deploy urgent. Not inserted there: closed rows sit below the top, and ADR-035 never renumbers them. **Read it as the top group.** See the 2026-10-09 `0425` close addendum below.)* | **Verify `0425` live — deploy tester roles to the profile box, apply "earned citizen" to the tester, and restore it** *(🆕 **FILED 2026-10-09 at `0425`'s close** by a spawned `fkit-producer` — OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` (ADR-021/037), verbatim **"Close + file both (Recommended)"** and, on deploy timing, **"Urgent: after review passes"** — a **mid-week profile deploy**, an exception to the weekend-slot rule for this deploy only; ⛔ not producer precedent. **Executed by the owner (human)**; every production write needs the owner's OK in-session. Steps, per `profile-tester-roles-runbook.md`: deploy (new image, migration `008`, new compose mount); create the allowlist (only if absent); find the tester's internal id (recommended devtools way); `show` → `apply <id> earned-citizen` → `show` → reload and confirm the earned view; later `restore` + `show`; re-run the full backup dry-run where MinIO can be pulled (only the drill's SQL path was proven). Warnings: no real purchase while a role is on; apply between matches. Depends on `0425` committed; unblocks `0420` (earned items), possibly `0376`.)* | [`0430-verify-0425-live-deploy-tester-roles-and-apply-earned-citizen-to-the-tester`](../tasks/done/0430-verify-0425-live-deploy-tester-roles-and-apply-earned-citizen-to-the-tester/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 33 *(append rank — ⚠️ **Priority 33 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit its rank barely matters:** a small test-only fix that blocks nothing, though `npm run test:integration` stays red on `dev` until it lands. Appended after the highest (32, `0430`). See the 2026-10-09 `0425` close addendum below.)* | **Update `Routes.it.test.ts` to expect the `verified` field the resolve route now returns** *(🆕 **FILED 2026-10-09 at `0425`'s close** by a spawned `fkit-producer` — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` (ADR-021/037), verbatim **"File a small fix task (Recommended)"**; ⛔ not producer precedent. Two tests (~`:318`, ~`:367`) fail on `dev` before `0425` (proven on a clean `HEAD` worktree); ~~likely since `0340` / commit `71efd10` — traced from logs, not bisected~~ — ⚠️ corrected 2026-10-10: since commit `077c9e3`, task `0332` (ADR-124), confirmed by blame and `git log -S`. Test-only; no deploy. Owner `fkit-coder`. Depends on nothing; blocks nothing.)* | [`0431-update-routes-it-test-to-expect-the-verified-field-on-resolve`](../tasks/done/0431-update-routes-it-test-to-expect-the-verified-field-on-resolve/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 34 *(append rank — ⚠️ **Priority 34 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly above `0428`** (rank 30), because `0428` now waits for it. The owner ruled "the bottom of Sprint 8"; appended after the highest (33, `0431`) — ADR-035 never renumbers rows. See the 2026-10-10 `0228` close addendum below.)* | **Verify `0228` live — a quick leave, a double Join, or closing the window during a lobby join all take effect** *(🆕 **FILED 2026-10-10 at `0228`'s close** by a spawned `fkit-producer` — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` (ADR-021/037), verbatim **"File it, before 0428 (Recommended)"**; ⛔ not producer precedent. **Executed by the owner (human)** inside the Yandex Games page, ideally a phone on a weak connection, after 5+ minutes on the start screen (the cosmetics file's 5-minute cache — otherwise the window is too small to hit): (a) public lobby card, click again to leave quickly — not pulled into the match; (b) host a private lobby, the other account double-taps Join — listed once, stays connected; (c) Join then close the window right away — not left in the host's list; (d) normal join/leave, Solo and Tutorial still start. Also covers `0228`'s unproven points (browser proof older than the R1 fix; no phone / Yandex page / Tutorial / Solo; production's same-player kick). Weekend slot unless the owner says otherwise. Depends on `0228` committed and deployed; **blocks `0428`**. 📌 **2026-10-11 — CLOSED `(agent-closed — not owner-verified)`** on OWNER RULING (2026-10-11, `fkit lead` session; ⛔ not producer precedent), verbatim *"Let's consider this check to be done and everything is ok"*; game `0.0.163`. ⚠️ Checks not itemized, (c) phone join-close not run, slow network / 5-minute wait not recorded — shows no regression on the main paths, not proof the fix works under the targeted conditions. Evidence in the task's `worklog.md`. `0428` unblocked.)* | [`0433-verify-0228-live-quick-leave-double-join-and-close-during-a-lobby-join`](../tasks/done/0433-verify-0228-live-quick-leave-double-join-and-close-during-a-lobby-join/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-11 — moved in from the [Backlog board](backlog.md) the same day. **Built, not deployed** — see the close note at the end of the task cell.)* | 35 *(append rank — ⚠️ **Priority 35 is append rank, NOT a merit ranking.** Appended after the highest (34, `0433`); ADR-035 never renumbers rows. See the 2026-10-11 `0437` / `0436` addendum below.)* | **Ask the player to confirm before leaving a match from the in-match exit button** *(➡️ **MOVED IN FROM THE [BACKLOG BOARD](backlog.md) ON 2026-10-11** — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-11, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim **"0437 Exit confirm popup (Recommended)"** — build it while waiting on Yandex infrastructure. In-game designed popup, no native `confirm`. **All five open questions ruled the same day:** Q1 the settings-window exit gets the same popup and, after "Leave", the same ad → clear reconnect → start screen as the sidebar exit; Q2 ask **always** (even dead or watching — not the recommended default); Q3 question `help_modal.exit_confirmation`, buttons "Выйти" / "Остаться" (en "Leave" / "Stay"); Q4 no pause change; Q5 no analytics. Client-only, owner `fkit-coder`. Weekend deploy slot; a live verify task follows per the build/verify split rule. Depends on nothing; blocks nothing. 📌 **2026-10-11 — CLOSED `(agent-closed — not owner-verified)`** by a spawned `fkit-producer` via `/fkit-task-done`, on OWNER RULING *"Close both (Recommended)"* (live `AskUserQuestion`, `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent). **Built, not deployed — code uncommitted at close.** Evidence in the task's `worklog.md` / `review.md`: targeted 32 passed; full `npm test` 4549 passed (one run); lint 0; `tsc` clean; local hand check in the dev build, both templates, desktop en + phone ru, all steps pass. ⚠️ **Not tested:** the real Yandex interstitial ad (no SDK locally). Review R1 (exit can stay stuck if the ad never calls back) accepted as a known limit by owner ruling *"Accept the risk"*. Live check filed as [`0439`](../tasks/backlog/0439-verify-0437-live-exit-confirm-popup-inside-yandex-games/brief.md) on the Backlog board.)* | [`0437-ask-the-player-to-confirm-before-leaving-a-match-from-the-exit-button`](../tasks/done/0437-ask-the-player-to-confirm-before-leaving-a-match-from-the-exit-button/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-11 — moved in from the [Backlog board](backlog.md) the same day; closed the same day, see the close note at the end of the task cell.)* | 36 *(append rank — ⚠️ **Priority 36 is append rank, NOT a merit ranking.** Appended after `0437` (35), in the order relayed; ADR-035 never renumbers rows. See the 2026-10-11 `0437` / `0436` addendum below.)* | **Backup dry-run harness: fetch the MinIO image from a source that works, then run it once** *(➡️ **MOVED IN FROM THE [BACKLOG BOARD](backlog.md) ON 2026-10-11** — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-11, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim **"0436 backup test fix"**. `tests/profile-backup-dryrun.sh` (`npm run test:scripts:docker`) dies at container start — the `minio/minio` image can no longer be pulled. Switch to a pinned image that works, run once, expect `IDENTICAL` over 11 tables. Closes the last unproven item of `0425` / `0430`. Routine-fix, owner `fkit-coder`. Depends on nothing; **blocks [`0438`](../tasks/backlog/0438-restore-drill-seeds-no-tester-role-snapshot-row-so-the-snapshot-data-is-never-compared/brief.md)** (Backlog board). 📌 **2026-10-11 — CLOSED `(agent-closed — not owner-verified)`** by a spawned `fkit-producer` via `/fkit-task-done`, on OWNER RULING *"Close both (Recommended)"* (live `AskUserQuestion`, `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent). Evidence in the task's `worklog.md` / `review.md` (no findings): `npm run test:scripts:docker` → `RESULT: 55 passed, 0 failed`, fingerprint `IDENTICAL` over 11 tables; image `pgsty/minio` pinned by tag + digest. One run. `0438` unblocked.)* | [`0436-backup-dry-run-harness-fetch-the-minio-image-from-a-source-that-works-then-run-it-once`](../tasks/done/0436-backup-dry-run-harness-fetch-the-minio-image-from-a-source-that-works-then-run-it-once/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-13 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING *"Close; 0439 stands alone (Recommended)"* given live via `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed by `fkit-lead`; ⛔ not producer precedent. Evidence: the task's `worklog.md`. Yandex judged back 2026-10-13 — items 1a, 1b, 1d pass per owner statement "all good", 1c proven by `0428`'s flip; item 2 done in `0428`; item 3 flag values given to `0426` (its worklog); **item 4 re-planned by the owner: `0439` carries the exit-popup live check on its own** (still waits on the deploy carrying `0437`); item 6 outage window 2026-10-11 → 2026-10-13 recorded, no `0424` trigger reported, `0428`'s flip time noted in `0435`. ⚠️ **Not run:** item 5 (server-log counts) — skipped by the owner. Known gap: snippet values before the flip and on a tester page not read out. Earlier values, kept as history: ~~🔲 Backlog~~ → ~~🔄 In progress~~ (2026-10-13, owner reported Yandex back).)* | 37 *(append rank — ⚠️ **Priority 37 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly above `0428`**, because its first check (is Yandex back?) gates `0428`'s console flip. Appended after the highest (36, `0436`); ADR-035 never renumbers rows. See the 2026-10-12 `0440` addendum below.)* | **When Yandex Games is working again: the flag change and checks blocked by its outage** *(🆕 **FILED 2026-10-12** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER REQUEST typed in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. Owner-run checklist that **points to** the owning tasks, never copies their steps: (1) is Yandex back — console works, the game reads its flags (read-only DevTools check in the brief); (2) `0428` flag flip + its checks 4a–4d; (3) `0426`'s flag gate; (4) `0439` (also needs the `0437` deploy); (5) optional read-only server-log counts by `fkit-lead`; (6) watch items `0435`, `0411`, `0424`, `0394`. Waits on the Yandex Games outage (noticed 2026-10-11). Depends on nothing; blocks nothing.)* | [`0440-when-yandex-games-is-working-again-the-flag-change-and-checks-blocked-by-its-outage`](../tasks/done/0440-when-yandex-games-is-working-again-the-flag-change-and-checks-blocked-by-its-outage/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-12 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING *"Close; verify task in Sprint 8 (Recommended)"* given live via `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed by `fkit-lead`; ⛔ not producer precedent. **Repo work only:** `deploy.sh`, `build-deploy-telemetry.sh`, `scripts/telemetry-tunnel.sh` fixed, harness extended, runbook §7 written; full `npm test` green (223/223 suites), lint clean, review closed out (R2 accepted residual `0441-signal-cleanup-test`). ⚠️ **Nothing done on any box** — keys, installs, key-only login check, box inventory and proof deploys moved to verify task [`0445`](../tasks/done/0445-verify-0441-on-the-boxes-install-the-ssh-keys-prove-key-only-login-and-deploy-over-the-key/brief.md); `0442` now waits on `0445`.)* | 38 *(🚨 **TOP PRIORITY BY OWNER RULING 2026-10-12**. ⚠️ **Priority 38 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 forbids inserting above closed rows, so it appends after the highest (37, `0440`). **On merit — and by the owner's ruling — this is the first open work on the board, directly above `0440`**, because the game box takes ~260 password guesses an hour and our own password logins already broke a deploy. See the 2026-10-12 `0441`/`0442` addendum below.)* | **Game and telemetry boxes: install an SSH key and switch their deploys to key login** *(🔁 **2026-10-12 — TELEMETRY ADDED by OWNER RULING** *"Yes, add telemetry (Recommended)"* — *"Same steps: key first, check it works, then password off. Same top priority."* (live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent); open question 4 answered; `build-deploy-telemetry.sh` key path also needs `IdentitiesOnly`. Folder slug kept.)* *(🆕 **FILED 2026-10-12** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. Read-only check of each game box (dev not yet checked), new key, public half installed, `deploy.sh` gaps fixed (`IdentitiesOnly`, password never on the command line), proven by a real deploy over the key. **Password login stays on here** — never lock ourselves out. Owner runs box steps and deploys. Four open questions in the brief (key type, root login, which boxes, telemetry). Depends on nothing; blocks `0442`.)* | [`0441-game-boxes-install-an-ssh-key-and-switch-game-deploys-to-key-login`](../tasks/done/0441-game-boxes-install-an-ssh-key-and-switch-game-deploys-to-key-login/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-13 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, at the end of its `fkit-sprint-ship-loop` run, relayed by `fkit-lead`; owner rulings this session (live `AskUserQuestion`; ⛔ not producer precedent): plan Q1–Q4, review R1 *"Fix now (Recommended)"*, R2 *"Fix now (small)"*, verify placement *"Sprint 8 (Recommended)"*, profile follow-up *"File it in Sprint 8"*. **Repo work only:** new shared `sshd-hardening.sh`; sshd sections in `setup-game-host.sh` and `setup-telemetry.sh`; `deploy.sh` root step now runs with a blank token (alerts part SKIPPED, deploy exits 3 until `0449` sets the token); telemetry deploy stages its auth mode and never offers a password prompt on the key path (R1); an unchanged drop-in is now `sshd -t` → reload → gate (R2); fallback notes; runbook §7/§8. Review stateful, coverage **reasoning-only second opinion** (Codex sandbox could not run the harness); R1 medium + R2 low, both defects, both fixed; ledger closed out, no residuals. Verify run green 225/225 suites, 4611/4611 tests, lint clean; independent re-verify: `tests/ssh-alerts.sh` 151/0, hardening ALL PASS, full run 4610/4611 with one `Exceeded timeout of 5000 ms` in `tests/profile-server/AlertRoutes.test.ts` (known supertest flake, untouched suite, re-run alone 94/94, no SIGSEGV). shellcheck not run (not installed); real sshd/systemd untested (stubs only). ⚠️ **Nothing done on any box.** Pre-checks, dev + telemetry now, prod in the weekend slot moved to verify task [`0452`](../tasks/backlog/0452-verify-0442-on-the-boxes-pre-checks-then-turn-password-login-off-on-game-dev-and-telemetry-now-game-prod-in-the-weekend-slot/brief.md). 🚨 **Once this code is committed, ANY key deploy of a game box applies the hardening (password login off)** — including a deploy for another task — so `0452`'s pre-checks must come before the next game deploy after the commit. Same profile-box gap as R1 filed as [`0453`](../tasks/done/0453-profile-deploy-never-fall-back-to-a-password-prompt-on-the-key-path/brief.md). For `0446`: the sshd item landed in `setup-game-host.sh` directly.)* | 39 *(🚨 **TOP PRIORITY BY OWNER RULING 2026-10-12**, second after `0441`. ⚠️ **Priority 39 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0441`** — where it sits — because it cannot start until `0441` proves key login on every in-scope box.)* | **Game and telemetry boxes: turn off password login over SSH, after key login is proven** *(🔁 **2026-10-12 — TELEMETRY ADDED**, same owner ruling as `0441`. Folder slug kept.)* *(🆕 **FILED 2026-10-12**, same ruling and relay as `0441`; ⛔ not producer precedent. Copies the profile box's `0221` sshd hardening (guards, `Match all`, effective-config check, restore on failure); provider web console checked as the way back **before** the change; dev first; fail2ban checked after; password fallback retired for these boxes. Owner runs or approves every box change. Depends on ~~`0441`~~ **`0445`** *(re-pointed 2026-10-12 — OWNER RULING *"Close; verify task in Sprint 8 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent: `0441` closed on the repo work, its box-side proof moved to verify task `0445`)*.)* | [`0442-game-boxes-turn-off-password-login-over-ssh-after-key-login-is-proven`](../tasks/done/0442-game-boxes-turn-off-password-login-over-ssh-after-key-login-is-proven/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-12 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING *"Close; verify task in Sprint 8 (Recommended)"* given live via `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed by `fkit-lead`; ⛔ not producer precedent. **Repo work only:** A1–A10 as amended by owner rulings; full `npm test` green (225/225 suites, 4611/4611 tests), lint / tsc / config-parity clean, `tests/ssh-alerts.sh` 102/102, hardening harness ALL PASS; review round 1 closed out (R6 accepted residual). ⚠️ **Nothing run on any box, no deploy** — token, allow list, commit, deploys and the 2-day observation moved to verify task [`0449`](../tasks/backlog/0449-verify-0443-on-the-boxes-deploy-the-ssh-security-alerts-and-watch-them-for-two-days/brief.md).)* | 40 *(⚠️ **Priority 40 is append rank (ADR-035). Real place: RIGHT AFTER `0441`/`0442`, by OWNER RULING 2026-10-12** — third in line, directly below `0442`.)* | **SSH security alerts to Telegram on all three boxes — every successful login, fail2ban down, daily counts** *(🆕 **FILED 2026-10-12** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. Verbatim: **"All three (Recommended)"** — *"Login alert + fail2ban-down alert + daily counts, on game, profile and telemetry. One task in Sprint 8, right after 0441/0442."* One task by owner ruling (not split). Reuses the `0277` bot and Alerts topic; route per box decided in the plan (ADR-114 relay or direct via proxy). **Never an alert per failed guess.** A login alert must never block a login. Owner runs box changes. Three open questions in the brief (what the login message shows, where the daily counts go, grouping deploy logins). Depends on nothing technically; sequenced after `0442`.)* | [`0443-ssh-security-alerts-to-telegram-on-all-three-boxes-logins-fail2ban-down-daily-counts`](../tasks/done/0443-ssh-security-alerts-to-telegram-on-all-three-boxes-logins-fail2ban-down-daily-counts/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-13 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING *"Yes, mark it finished (Recommended)"* given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. **The owner executed and confirmed every step in-session:** two keys made and installed for `root` (= deploy user on both game boxes), key-only login OK on game prod, game dev, telemetry; proof deploys over the key with no password prompt and only `publickey` logins in each box's auth log — game dev (same version), telemetry `0.0.163-telemetry.1`, game prod a **real release `0.0.164`** (owner ruling *"Real release now"*; ships `0437`); dev password fallback OK (`sshpass -p` 0, `-f` 1). Results in the task's `worklog.md`. Unblocks `0442`.)* | 41 *(🚨 **FIRST OPEN WORK ON THE BOARD, BY OWNER RULING 2026-10-12** — *"verify task at the top of Sprint 8"*. ⚠️ **Priority 41 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit — and by the owner's ruling — this belongs directly above `0442`**, because `0442` now waits on it. ADR-035 forbids inserting above closed rows, so it appends after the highest (40, `0443`). See the 2026-10-12 `0441` close addendum below.)* | **Verify 0441 on the boxes — install the SSH keys, prove key-only login, and deploy game dev, game prod and telemetry over the key** *(🆕 **FILED 2026-10-12** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULING *"Close; verify task in Sprint 8 (Recommended)"* (live `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed by `fkit-lead`); ⛔ not producer precedent. **Bends the standing 2026-09-29 "verify task at the top of the NEXT sprint" rule for this case only** — the owner plans to deploy this week (mid-week is fine). Owner-executed: read-only box + env-name inventory, two new keys (game, telemetry), public halves installed for the deploy user **and root** on game prod + dev and root on telemetry, key-only login check, **commit `0441` before any proof deploy**, proof deploys (game dev, game prod, telemetry), dev fallback check. Proof = no fallback line **and no password prompt** and `Accepted publickey for <user>` in the box auth log; `ps` check prints **counts only**; fallback needs BOTH `SSH_KEY_<ENV>` and shared `SSH_KEY` commented out. Password login stays on. Depends on `0441`; blocks `0442`.)* | [`0445-verify-0441-on-the-boxes-install-the-ssh-keys-prove-key-only-login-and-deploy-over-the-key`](../tasks/done/0445-verify-0441-on-the-boxes-install-the-ssh-keys-prove-key-only-login-and-deploy-over-the-key/brief.md) |
| 🔲 Backlog | 42 *(⚠️ **Priority 42 is append rank, NOT a merit ranking** — ~~flagged for owner confirmation~~ ✅ **merit order OWNER-CONFIRMED 2026-10-15** (live `AskUserQuestion`, relayed by the main session; ⛔ not producer precedent; verbatim *"Confirm that order (Recommended)"*): **`0452` → `0462` → `0449`/`0450` near the top, and `0219` near the top for its deadline.** Row number unchanged (ADR-035); see the 2026-10-15 four-rulings addendum below. **On merit this belongs directly below `0445`**, because its game-box steps cannot pass until `0445` installs the game key for root. ADR-035 forbids inserting above closed rows, so it appends after the highest (41, `0445`). See the 2026-10-12 `0443` close addendum below.)* | **Verify 0443 on the boxes — deploy the SSH security alerts and watch them for two days** *(🆕 **FILED 2026-10-12** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULING *"Close; verify task in Sprint 8 (Recommended)"* (live `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed by `fkit-lead`); ⛔ not producer precedent. **Bends the standing 2026-09-29 "verify task at the top of the NEXT sprint" rule for this case only**, as for `0445`. Owner-executed: token in the three gitignored secret files, game dev added to `PROFILE_INTERNAL_ALLOW_IPS`, game dev `PROFILE_API_URL` checked, commit, deploy profile → telemetry → game dev → game prod; test login per box (masked source); "Telegram unreachable" login on game dev; fail2ban down/back; two days of digests (failed-sends line, OLD flag, 08:00 UTC window on Moscow-time boxes); 24 h with no per-guess messages; `GAME HOST SETUP OK` banner; `logrotate` + real `flock` on each box; no tracked file holds an address, token or chat id. 🚨 **Until `0445` installs the root key, every game deploy exits 3 after the game is live** (owner ruling Q-A1; no skip switch). Residuals: fake login alerts possible, never a hidden login (R6, accepted); nothing pages if the digest stops (Q8 follow-up after `0219`). Depends on `0443`, `0445`, `0452` — **`0452`'s pre-checks P1–P4 only, not its close** (added 2026-10-13 on an OWNER RULING; see the 2026-10-13 `0452`-dependency addendum below), **and only for its telemetry and game deploys: its profile-box steps may run before P1–P4** (carve-out 2026-10-13 on an OWNER RULING, *"Let the profile step go first (Recommended)"*; see the 2026-10-13 profile-carve-out addendum below).)* | [`0449-verify-0443-on-the-boxes-deploy-the-ssh-security-alerts-and-watch-them-for-two-days`](../tasks/backlog/0449-verify-0443-on-the-boxes-deploy-the-ssh-security-alerts-and-watch-them-for-two-days/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-13 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING *"Move it to the verify task (Recommended)"* (2026-10-12) given live via `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed by `fkit-lead`; ⛔ not producer precedent. **Repo work only:** `update.sh` (env file removed on every exit + INT/TERM/HUP/PIPE traps; Part C — a failed pull of an image not on the box exits before touching the running game), harness T72–T76, docs, one `CLAUDE.md` clause; `deploy.sh` untouched (ruling Q1 — the `deploy.sh`-side gap is `0444` item 5, now required). Harness ALL PASS (21 failures against HEAD's `update.sh`); full `npm test` green twice (225/225 suites, 4611/4611 tests); review round 1 closed out (R1 accepted residual `pull-fallback-after-prune`). ⚠️ **Nothing done on any box, nothing deployed — the ~21 leftover files on game dev are STILL THERE**; listing, delete and deploy check moved to verify task [`0450`](../tasks/done/0450-verify-0447-on-the-boxes-list-the-leftover-deploy-env-files-owner-deletes-them-on-game-dev-and-confirm-a-dev-deploy-leaves-no-file/brief.md). Earlier values: ~~🔄 In progress~~ (2026-10-12), ~~🔲 Backlog~~; moved in from the [Backlog board](backlog.md) 2026-10-12.)* | 43 *(append rank — ⚠️ **Priority 43 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit it has no ordering constraint on this board:** it depends on nothing and blocks nothing; its only coupling, reusing `0443`'s `deploy_cleanup()` if it touches `deploy.sh`, is already met (`0443` is Done). ADR-035 forbids inserting above closed rows, so it appends after the highest (42, `0449`). See the 2026-10-12 `0447` move addendum below.)* | Game dev: delete the leftover deploy env files, and make the game deploy always remove its env file — even when it fails *(➡️ **MOVED IN 2026-10-12** from the [Backlog board](backlog.md) on an OWNER RULING given in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move it to the Sprint 8"*. Filed the same day on the Backlog board on the OWNER RULING **"File a task (Recommended)"**. `0443`'s read-only inventory found ~21 leftover `dev-*.env` deploy files on game dev (prod: none) — `update.sh` removes its env file only on success. Fix `update.sh` to remove it on every exit; owner-run/approved one-off delete. Overlaps `0444` item 5 (open question 1 — fold or keep separate, owner decides; `0444` stays on the Backlog board). Any `deploy.sh` part reuses `0443`'s `deploy_cleanup()`. Live proof goes to a verify task filed at close (build/verify split). Owner `fkit-coder`; every box change owner-run or owner-approved. Depends on nothing; blocks nothing.)* | [`0447-game-dev-delete-leftover-deploy-env-files-and-make-the-game-deploy-always-remove-its-env-file`](../tasks/done/0447-game-dev-delete-leftover-deploy-env-files-and-make-the-game-deploy-always-remove-its-env-file/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 44 *(⚠️ **Priority 44 is append rank, NOT a merit ranking** — ~~flagged for owner confirmation~~ ✅ **merit order OWNER-CONFIRMED 2026-10-15** (live `AskUserQuestion`, relayed by the main session; ⛔ not producer precedent; verbatim *"Confirm that order (Recommended)"*): **`0452` → `0462` → `0449`/`0450` near the top, and `0219` near the top for its deadline.** Row number unchanged (ADR-035); see the 2026-10-15 four-rulings addendum below. **On merit this belongs directly below `0449`**, because like `0449` its box steps wait on `0445`'s root key; no ordering constraint against `0449` itself. ADR-035 forbids inserting above closed rows, so it appends after the highest (43, `0447`). See the 2026-10-13 `0447` close addendum below.)* | **Verify 0447 on the boxes — list the leftover deploy env files, owner deletes them on game dev, and confirm a dev deploy leaves no file** *(🆕 **FILED 2026-10-13** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULINGS *"Move it to the verify task (Recommended)"* (2026-10-12) and *"Sprint 8 (Recommended)"* (2026-10-13) — both live `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed by `fkit-lead`; ⛔ not producer precedent. **Bends the standing 2026-09-29 "verify task at the top of the NEXT sprint" rule for this case only**, as for `0445` and `0449`. F1 read-only listing on game dev + prod (an agent may run it once root key login works — ruling Q3 *"Agent F1, me F2"*); stop-and-ask if any file is not 0600/root or `/root` not 700 (Q4 — otherwise no rotation); F2 one-off delete on game dev, **owner-run** or approved line by line; after the `0447` code is committed and deployed (weekend slot), one ordinary dev deploy leaves **0** `dev-*.env` files; optional deliberately failed dev deploy (nonexistent tag — safe now, Part C keeps the game up); optional dropped-session check. Commands: `0447` `plan.md` § Part F. Depends on `0445`, `0447`, `0452` — **`0452`'s pre-checks P1–P4 only, not its close** (added 2026-10-13 on an OWNER RULING; see the 2026-10-13 `0452`-dependency addendum below).)* | [`0450-verify-0447-on-the-boxes-list-the-leftover-deploy-env-files-owner-deletes-them-on-game-dev-and-confirm-a-dev-deploy-leaves-no-file`](../tasks/done/0450-verify-0447-on-the-boxes-list-the-leftover-deploy-env-files-owner-deletes-them-on-game-dev-and-confirm-a-dev-deploy-leaves-no-file/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-14 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, at the end of its `fkit-sprint-ship-loop` run, relayed by `fkit-lead`; owner rulings this session (live `AskUserQuestion`; ⛔ not producer precedent): plan *"Approve (Recommended)"*, *"Add both failure events"*, stray probe *"Delete it (Recommended)"*, player-facing wrong-code message *"Separate small task (Recommended)"* (→ `0454`), GA follow-up placement *"Sprint 8"* (→ `0455`). **Repo work only:** 16 new `PrivateLobby:*` events in `FlashistFacade.ts` via the new `PrivateLobbyAnalytics.ts`; `Game:Start` / `Game:Mode:Multiplayer` / `Match:Duration` / `Game:Abandon` unchanged; reference doc 16 keys = 16 rows; no codes/links/ids in any event; local 3-player Playwright walk-through of the whole funnel (no duplicates, host never counted as guest). Review round 1 (coverage: **reasoning-only second opinion**) closed out — R1 medium (`JoinFailed:NotFound` could never fire on prod, checked with one read-only GET), R2, R3 low, all fixed; no residuals. Independent re-verify: full `npm test` green 227/227 suites, 4684/4684 tests (92.7 s), lint + `tsc --noEmit` clean (an earlier run had one known `supertest` flake, re-run alone green). ⚠️ **Not verified:** the walk-through was not re-run after the R1–R3 counting fix; Yandex portal-link copy, invite-payload join and the win-modal finish path are unit-tested only. **Not deployed — no event has reached production**; prod arrival + the GameAnalytics funnel are follow-up [`0455`](../tasks/backlog/0455-build-the-private-lobby-funnel-and-dashboard-in-gameanalytics-and-confirm-the-0451-events-arrive/brief.md). Earlier values: ~~🔄 In progress~~ (2026-10-13), ~~🔲 Backlog~~.)* | 45 *(⚠️ **Priority 45 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly above `0426`**, because `0426`'s Timing rule makes the news entry wait on every Sprint 8 build task that rides the final Sprint 8 deploy, and this is now one of them. ADR-035 forbids inserting above closed rows, so it appends after the highest (44, `0450`). See the 2026-10-13 `0451` addendum below.)* | **Private lobbies — add the missing analytics events for a full usage funnel** *(🆕 **FILED 2026-10-13** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULING typed live in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. Verbatim *"private_lobbies_all - this is on for everybody. Brief a task for the current sprint ot add missing events."* Funnel: Private tab → Create → invite copied → guest joined (link vs code) → host Start → private match started → match ended; today only the tab tap, the locked-button tap, its popup, the private win-condition events and the cohort exist. New events only; `Game:Mode:Multiplayer` keeps its meaning (any change is an owner question). Enum in `FlashistFacade.ts`, reference doc in the same change, no codes/links/ids/names in any event, ≤ 5 colon parts. Owner `fkit-coder`; the coder's plan confirms the exact set. The GameAnalytics funnel itself is a follow-up verify task filed at close (owner's Chrome, like `0418`). **Joins `0426`'s wait set** (Timing rule). Depends on nothing; blocks `0426`.)* | [`0451-private-lobbies-add-the-missing-analytics-events-for-a-full-usage-funnel`](../tasks/done/0451-private-lobbies-add-the-missing-analytics-events-for-a-full-usage-funnel/brief.md) |
| 🔄 In progress *(2026-10-15 — OWNER RULING, live `AskUserQuestion`, relayed by the main session; ⛔ not producer precedent; verbatim *"Both (Recommended)"*. Work has started: pre-checks P1–P4 passed 2026-10-15; password login is off on telemetry and game dev (V2–V4 passed on both). Left: V5 on those two boxes (`0462`), game prod in the weekend slot, the Q3 switch removal. See its worklog.)* | 46 *(🚨 **On merit the FIRST OPEN WORK on the board** — `0442` was the owner's top priority (ruling 2026-10-12). ⚠️ **Priority 46 is append rank, NOT a merit ranking** — ~~flagged for owner confirmation~~ ✅ **merit order OWNER-CONFIRMED 2026-10-15** (live `AskUserQuestion`, relayed by the main session; ⛔ not producer precedent; verbatim *"Confirm that order (Recommended)"*): **`0452` → `0462` → `0449`/`0450` near the top, and `0219` near the top for its deadline.** Row number unchanged (ADR-035); see the 2026-10-15 four-rulings addendum below. **On merit this belongs directly above `0449`**, because `0449` and `0450` deploy the game boxes (`0449` telemetry too), and once `0442`'s code is committed any such deploy turns password login off — so this task's pre-checks must come first. ADR-035 forbids inserting above closed rows, so it appends after the highest (45, `0451`). See the 2026-10-13 `0442` close addendum below.)* | **Verify 0442 on the boxes — pre-checks, then turn password login off on game dev and telemetry now, game prod in the weekend slot** *(🆕 **FILED 2026-10-13** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULING *"Sprint 8 (Recommended)"* (live `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed by `fkit-lead`); ⛔ not producer precedent. **Bends the standing 2026-09-29 "verify task at the top of the NEXT sprint" rule for this case only**, as for `0445`, `0449` and `0450`. Owner-executed (agent SSH denied by the permission classifier in `0445`; owner pastes address-free output): P1 reg.ru console logged into as root on all three boxes; P2 keys + passphrases and P3 root passwords in the password manager; P4 read-only sshd/fail2ban batch (STOP on any `Match` line or a file sorting before `00-`); P5 `0442` committed. Then per box — game dev, telemetry now; game prod in the weekend slot (Q2) — terminal A kept open, deploy, fresh-terminal checks (password refused, `KEY-OK`, `sshd -T` incl. root), fail2ban a few hours later. Game exit 3 expected until `0449` sets the token (record `OK sshd`). Q3: keep the password lines; delete only the two `ALLOW_*_PASSWORD_FALLBACK` switches by name, never printing values; no rotation. Telemetry needs VPN off. 🚨 **After the commit, ANY key deploy of a game box or telemetry applies the hardening** — `0449`/`0450` deploys included — so P1–P4 come first. Covers `0442` V1–V5, V7. Depends on `0442`. Blocks `0449` (its telemetry and game deploys only — its profile-box steps may run first; carve-out 2026-10-13 on an OWNER RULING, see the profile-carve-out addendum below), `0450` — until P1–P4 pass only, not until this task closes (added 2026-10-13 on an OWNER RULING; see the 2026-10-13 `0452`-dependency addendum below).)* | [`0452-verify-0442-on-the-boxes-pre-checks-then-turn-password-login-off-on-game-dev-and-telemetry-now-game-prod-in-the-weekend-slot`](../tasks/backlog/0452-verify-0442-on-the-boxes-pre-checks-then-turn-password-login-off-on-game-dev-and-telemetry-now-game-prod-in-the-weekend-slot/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-14 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, in a `fkit-sprint-ship-loop` run, relayed by `fkit-lead`; owner rulings this session (live `AskUserQuestion`; ⛔ not producer precedent): plan approved (blob `ba70ffae…`), review R1 *"Accept as known, no change (Recommended)"*, verify placement *"Verify task, top of Sprint 9 (Recommended)"*. **Repo work only:** `build-deploy-profile.sh`'s key branch now passes `-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no` before `-o IdentitiesOnly=yes -i <key>` on every ssh/scp (preflight, scps, remote run, cleanup trap — all via `SSH_CMD`/`SCP_CMD`), mirroring `0442` R1; no `BatchMode` (deliberate); password branch untouched. Harness: 3 new checks (structural count with comment filter + driven ssh/scp checks requiring ≥1 call) — red on HEAD (exactly the 3 new checks), ALL PASS after (1006 ✅), plus an scp-only red check. `ssh -G` locally confirms the settings. Lint clean; one full `npm test` green 227/227 suites, 4684/4684 tests. shellcheck not run (not installed). Review stateful, **both reviewers measured**; 1 finding R1 (low — a comment over-states "no way in but the key": GSSAPI/host-based are not blocked, both off everywhere, no lock-out possible) → `won't fix (frontier)`, accepted residual `key-path-comment-overstates-auth-lockdown` covering both `build-deploy-profile.sh` and `build-deploy-telemetry.sh`. ⚠️ **No live proof yet — nothing done on any box.** One profile deploy over the key, no password prompt → verify task [`0460`](../tasks/backlog/0460-verify-0453-one-profile-deploy-over-the-key-finishes-with-no-password-prompt/brief.md), filed on the Backlog board flagged **top of Sprint 9** (no Sprint 9 board exists yet).)* | 47 *(⚠️ **Priority 47 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0452`**, because it is the same lesson as `0442`'s R1 but far less urgent: harmless while the profile box refuses passwords (`0221`), and it blocks nothing. ADR-035 forbids inserting above closed rows, so it appends after the highest (46, `0452`). See the 2026-10-13 `0442` close addendum below.)* | **Profile deploy: never fall back to a password prompt on the key path (same gap as 0442 R1)** *(🆕 **FILED 2026-10-13** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULING *"File it in Sprint 8"* (live `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed by `fkit-lead`); ⛔ not producer precedent. `build-deploy-profile.sh`'s key path passes only `IdentitiesOnly`, so a rejected key falls back to a typed password prompt, and guard 0 trusts the staged `PROFILE_DEPLOY_SSH_AUTH=key` label. Fix mirrors `0442` R1: `-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no` on every ssh/scp of the key branch (no `BatchMode`) + harness checks in `tests/scripts/profile-deploy-hardening.test.sh`. Found by the `0442` process-review coder. Live proof (one profile deploy over the key) → verify task at close or the next profile deploy, owner decides. Owner `fkit-coder`. Depends on nothing; blocks nothing.)* | [`0453-profile-deploy-never-fall-back-to-a-password-prompt-on-the-key-path`](../tasks/done/0453-profile-deploy-never-fall-back-to-a-password-prompt-on-the-key-path/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-14 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, in a `fkit-sprint-ship-loop` run, relayed by `fkit-lead`; owner rulings this session (live `AskUserQuestion`; ⛔ not producer precedent): plan approved (blob `1d712886…`), doc fix *"Fix the stale sentences (Recommended)"*, `0292` *"Cancel when 0454 closes (Recommended)"*. **Repo work only:** `src/client/JoinPrivateLobbyModal.ts` — config read once at the top of `joinLobby()`'s try; an `archiveEnabled()` gate right after the joined/closed check, so while it is false (a hard `false`, `DefaultConfig.ts:316`, unchanged) the client sends **no** archive `/game/<code>` and **no** `/commit.txt` request; new `showJoinFailed(notFound)` sets the message and the `PrivateLobby:JoinFailed:{NotFound|Error}` event together; a wrong code now shows the existing `private_lobby.not_found` (EN+RU) instead of the generic error; `0451`'s event semantics unchanged on every reachable path; no new lang keys. Tests: three Join suites 64/64; negative control (the new tests fail 6 on HEAD's modal); local Playwright EN+RU check (not-found shown, no archive/commit requests, a live code still joins). Build full run 4687/4688 (one `socket hang up` in untouched `SessionRoutes` — known `supertest` flake family; re-run alone 124/124) → independent Verify full run **green 227/227 suites, 4688/4688 tests**; lint + tsc clean. Review stateful, **reasoning-only second opinion**; R1 (doc clause) + R2 (two Leave tests weaker than their names) — both CORRECT, low → fixed (doc + tests only; targeted 64/64; a negative check proves the strengthened test bites); ledger closed-out. `analytics-event-reference.md` player-message sentences corrected. `0292` cancelled as absorbed (condition re-checked by the closing producer against the code). ⚠️ **No live proof yet** — wrong code on the live game → verify task [`0461`](../tasks/backlog/0461-verify-0454-a-wrong-private-lobby-code-shows-lobby-not-found-on-the-live-game/brief.md), filed on the Backlog board flagged **top of Sprint 9** (no Sprint 9 board exists yet).)* | 48 *(⚠️ **Priority 48 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0451`**, because it edits the same `JoinPrivateLobbyModal.ts` lines `0451` is changing now, must agree with `0451`'s `PrivateLobby:JoinFailed:NotFound` event, and joins `0426`'s wait set. ADR-035 forbids inserting above closed rows, so it appends after the highest (47, `0453`). See the 2026-10-14 `0454` addendum below.)* | **Private lobbies: show "lobby not found" when a player enters a wrong code (production shows a generic error today)** *(🆕 **FILED 2026-10-14** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULING *"Separate small task (Recommended)"* (live `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, 2026-10-13, relayed by `fkit-lead`); ⛔ not producer precedent. Pre-dates `0451`: a wrong code → worker `/exists` says `exists: false` → the archive lookup `${getApiBase()}/game/<code>` hits the Master's SPA catch-all (archiving is off, `archiveEnabled()` false) → **200 `text/html`** → `.json()` throws → the player sees `private_lobby.error`, not `private_lobby.not_found` (locally: connection refused → same symptom). Fix: existing `not_found` text only (en + ru already have it; no new key); recommended direction — skip the archive lookup when `archiveEnabled()` is false (one flag, never a second; value stays `false`); real `/exists` failures stay errors; screen agrees with `0451`'s `JoinFailed` events; test mocks stop faking a 404. ⚠️ **Overlaps backlog `0292`** (same gate) and refutes its *"benign — 404 → not_found"* premise — ~~absorb-or-keep is an open owner question~~ ✅ answered 2026-10-14 by OWNER RULING *"Cancel when 0454 closes (Recommended)"*: at `0454`'s close a producer cancels `0292` as absorbed, **only if** `0454` gated the read on `archiveEnabled()` (else back to the owner) — see the brief's *At close* note and the 2026-10-14 `0292` addendum. Production proof → verify task at close. Owner `fkit-coder`. Depends on `0451` (same lines; the `NotFound` firing point is being settled there). Blocks `0426` (Timing rule; player-visible, so the news may mention it).)* | [`0454-private-lobbies-show-lobby-not-found-when-a-player-enters-a-wrong-code`](../tasks/done/0454-private-lobbies-show-lobby-not-found-when-a-player-enters-a-wrong-code/brief.md) |
| 🔲 Backlog | 49 *(⚠️ **Priority 49 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit its rank barely matters:** it blocks nothing and is time-gated (only workable once `0451` is deployed to production and several days of data exist). ADR-035 forbids inserting above closed rows, so it appends after the highest (48, `0454`). See the 2026-10-14 `0455` addendum below.)* | **Build the private-lobby funnel and dashboard in GameAnalytics, and confirm the 0451 events arrive** *(🆕 **FILED 2026-10-14** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed by `fkit-lead`; ⛔ not producer precedent. Verbatim selection *"Sprint 8"* — bends the build/verify-split "next sprint" rule for this case only. Owner `fkit-producer`, **in the owner's Chrome with the owner logged in** (like `0418`); saves a funnel and a dashboard in GameAnalytics, each on the owner's yes. Confirm all 16 `PrivateLobby:*` events arrive with sane counts and no id-like values, find out what GameAnalytics can do for funnels (not yet checked), then build the funnel (Private tab → Created → InviteCopied → Joined → Start:Tapped → MatchStarted:Host → MatchEnded) and a small dashboard. ⚠️ **Time-gated:** needs `0451` committed, deployed to production (weekend slot) and several full days of data — the board may show it ready before that. Depends on `0451`; blocks nothing; ships no code, so **not** in `0426`'s wait set.)* | [`0455-build-the-private-lobby-funnel-and-dashboard-in-gameanalytics-and-confirm-the-0451-events-arrive`](../tasks/backlog/0455-build-the-private-lobby-funnel-and-dashboard-in-gameanalytics-and-confirm-the-0451-events-arrive/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-14 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, at the end of its `fkit-sprint-ship-loop` step, relayed by `fkit-lead`. **Investigation done; no code changed.** Deliverable: the [findings report](../knowledge-base/reports/2026-10-14-0456-gameanalytics-per-user-event-limit-findings.md). Verdict at its stated strength: breach day 12 Oct (1,822.3 events per active user); on the big spike days the excess was extra copies of the once-per-page-load events, **NOT new page loads** (sessions normal); **leading explanation: the GameAnalytics SDK re-sending queued events, queue shared across builds — NOT proven**; source of the old-build-tagged events **not identified**. Normal days ~114 events per user, well under 500. GameAnalytics docs: alert only, no data loss stated. Reviewer pass done (coverage: **reasoning-only second opinion**), all R1–R10 applied. **Plan §4 fix gate ended in "no code fix"** by owner ruling. Owner rulings 2026-10-14 (live `AskUserQuestion`; ⛔ not producer precedent): fix path → *"Yes, file it in Backlog (Recommended)"* (monitoring only → [`0458`](../tasks/backlog/0458-monitor-gameanalytics-for-event-volume-spikes/brief.md), Backlog board) and *"Yes, close with the report (Recommended)"*; `0230` → *"Not answered: keep 0230 open (Recommended)"* ([`0230`](../tasks/backlog/0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md) stays open); `0226` → *"Leave it where it is (Recommended)"* (note added, [`0226`](../tasks/backlog/0226-deploy-env-fails-open-to-prod-analytics/brief.md)); game ID → *"File in Sprint 8"* (→ [`0459`](../tasks/done/0459-remove-the-gameanalytics-game-id-from-tracked-task-files/brief.md)). No verify task: nothing to verify. ⚠️ Not owner-verified.)* | 50 *(⚠️ **Priority 50 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0351` — i.e. above `0343`, the board's first open row**, because the owner ruled it *"our next task in the Sprint 8"* and every day over the limit risks the metrics the owner wants to keep collecting. ADR-035 forbids inserting above closed rows, so it appends after the highest (49, `0455`). **Work order is the owner's ruling, not this number: the ship loop takes it next.** See the 2026-10-14 `0456` addendum below.)* | **INVESTIGATION + fix plan — GameAnalytics "500 events per active user per day" limit exceeded again (seen 2026-10-14)** *(🆕 **FILED 2026-10-14** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULING typed by the owner in the `fkit lead` session driving `fkit-sprint-ship-loop` (verbatim *"we need to investigate it and make it as our next task in the Sprint 8 (it's important for us to keep collecting metrics)"*, with a GameAnalytics screenshot), relayed by `fkit-lead`; ⛔ not producer precedent. Third sighting (4 Sep measured, 11 Sep banner only, 14 Oct banner only — breach day(s) not yet known). Part 1: GameAnalytics read in the **owner's Chrome, owner present, read-only** (like `0418`) — breach day(s), events/user/day trend, category + event-name breakdown vs a normal day, few heavy users vs everyone, build/platform split, what GameAnalytics says the limit does. Part 2: code read — every repeating emitter, page-reload paths, SDK double-init / offline replay, `0226` dev-traffic channel, per-session budget incl. `0451`'s undeployed `PrivateLobby:*` events (≤ ~6/host cycle, ≤ ~3/guest). Part 3: findings report in `knowledge-base/reports/` (mechanism with evidence and arithmetic, or plainly not found) + fix plan; **plan gate** — owner rules build-here vs follow-up brief. Live check → separate verify task, placement the owner's. Owner `fkit-coder` (+ owner for Part 1). Depends on nothing.)* | [`0456-investigate-and-plan-the-fix-gameanalytics-500-events-per-user-per-day-limit-exceeded-again`](../tasks/done/0456-investigate-and-plan-the-fix-gameanalytics-500-events-per-user-per-day-limit-exceeded-again/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-14 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, on the OWNER RULING *"Do 0459 now, then stop (Recommended)"* (live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent). **3 lines edited, the number replaced outright by neutral wording** (`backlog.md` `0212` row, `0212` brief, `0439` brief). Occurrences of the value, tracked tree and working tree: **3 before → 0 after** (value never printed). ⚠️ **Git history still holds the old copies (2 commits) — not rewritten, out of scope.** No verify task: pure doc edit, nothing to deploy. Nothing committed.)* | 51 *(⚠️ **Priority 51 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit its rank barely matters** — it blocks nothing, and the value is already public (public repository; git history keeps the old copies). Appended after the highest (50, `0456`), never inserted (ADR-035). See the 2026-10-14 `0456`-close addendum below.)* | **Remove the GameAnalytics game ID from tracked task files** *(🆕 **FILED 2026-10-14** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULING *"File in Sprint 8"* (live `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent). The numeric GameAnalytics game ID is in three tracked files of a public repo — `backlog.md` (the `0212` row), `0212`'s brief, `0439`'s brief — one line each, re-checked 2026-10-14. Replace it outright (no strike-through), grep the whole tracked tree, never write the value; git history is out of scope. Small. Owner `fkit-producer`. Depends on nothing.)* | [`0459-remove-the-gameanalytics-game-id-from-tracked-task-files`](../tasks/done/0459-remove-the-gameanalytics-game-id-from-tracked-task-files/brief.md) |
| ✅ Done (agent-closed — not owner-verified) *(2026-10-15 — closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, in a `fkit-sprint-ship-loop` run driven by `fkit-lead`. Plan owner-approved 2026-10-15. **Repo work and test proof only:** new `npm run -s name-change:review` walk-through (`NameChangeReviewCommand.ts`, `reviewNameChanges.ts`) over the existing decide route, with the decide command's code split into shared helpers (output unchanged); runbook updated. Verify: full `npm test` **228/228 suites, 4757/4757 tests, green** after the review fixes; targeted 401/401; lint clean; integration 13 suites / 181 tests green (Build). Review: stateful, own pass + Codex second opinion, both measured; R1–R3 done (R2 owner-ruled), ledger closed-out. ⚠️ **Not proven:** box-only behaviour — Ctrl-C and Cyrillic names through SSH + docker, ts-node start-up on the low-RAM box. Not deployed. Live check → verify task [`0463`](../tasks/backlog/0463-verify-0350-on-the-profile-box-decide-waiting-name-changes-with-the-walk-through-command/brief.md) on the [Backlog board](backlog.md), flagged for the top of Sprint 9 (see the 2026-10-15 `0350` close addendum). Before that: 🔄 In progress (2026-10-15); ~~🔲 Backlog~~ — moved in from the [Backlog board](backlog.md) with the status it carried there, unchanged.)* | 52 *(⚠️ **Priority 52 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit it has no ordering constraint here** — depends on nothing, blocks nothing. ADR-035 forbids inserting above closed rows, so it appends after the highest (51, `0459`). See the 2026-10-15 `0350` addendum below.)* | **Name-change moderation without copy-and-paste — approve or reject a request in one step** *(➡️ **MOVED IN FROM THE [BACKLOG BOARD](backlog.md) ON 2026-10-15** — OWNER RULING given live on 2026-10-15 in the coordinating session (the owner's own words), relayed by the main session to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move the task to the current sprint"*. Shape **A1** already chosen by OWNER RULING 2026-09-29: one interactive command on the profile box that walks through the waiting requests, asks approve / reject / skip, and fills in the exact name itself (keeps the `expectedName` check; the internal token is never typed or shown). Not chosen: B (Telegram buttons / links), C (a per-id command). Later additions, NOT v1: a one-word laptop wrapper over SSH, and Claude's question popup driving it (A2). Profile-box change → weekend deploy slot; build/verify split applies (live check → verify task at the top of the next sprint). Owner `fkit-coder`. Depends on nothing; blocks nothing. 📌 **2026-10-15 — SHIPS ON ITS OWN** (OWNER RULING, live `AskUserQuestion`, relayed by the main session; ⛔ not producer precedent; verbatim *"Ship 0350 on its own (Recommended)"*): not player-facing (a tool only the owner uses), so it does **not** hold back the final Sprint 8 deploy or `0426`; it goes out in its own weekend profile-server deploy.)* | [`0350-name-change-moderation-without-copy-and-paste`](../tasks/done/0350-name-change-moderation-without-copy-and-paste/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 53 *(⚠️ **Priority 53 is append rank, NOT a merit ranking** — ~~flagged for owner confirmation~~ ✅ **merit order OWNER-CONFIRMED 2026-10-15** (live `AskUserQuestion`, relayed by the main session; ⛔ not producer precedent; verbatim *"Confirm that order (Recommended)"*): **`0452` → `0462` → `0449`/`0450` near the top, and `0219` near the top for its deadline.** Row number unchanged (ADR-035); see the 2026-10-15 four-rulings addendum below. **On merit this belongs directly below `0452`**, because it is `0452`'s own V5 for two of its boxes and is time-gated behind `0452`'s game dev and telemetry steps. ADR-035 forbids inserting above closed rows, so it appends after the highest (52, `0350`). See the 2026-10-15 `0462` addendum below.)* | **Re-check fail2ban on telemetry and game dev a few hours after password login was turned off (0452 V5)** *(🆕 **FILED 2026-10-15** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the OWNER RULING given live in the main session (the owner's own words), relayed by the main session; ⛔ not producer precedent. Verbatim *"I think we need to create a task to the current sprint, to keep track of it."* **This IS `0452`'s V5 for game dev and telemetry — not an extra check; do not count it twice.** Owner `fkit-producer`, **executed by the owner** (agent SSH denied in `0445`): one key session per box, `fail2ban-client status sshd`, count lines only. Pass: jail answers and "Total failed" above the P4 baseline (telemetry 25430, game dev 160736). Result recorded here and in `0452`'s worklog. Stalled → record and file a follow-up; fail2ban settings out of scope. ⚠️ **Time-gated:** no earlier than a few hours after ~12:15 MSK 2026-10-15. Game prod not in scope (its V5 stays with `0452`'s weekend half). Depends on `0452`'s dev/telemetry steps (done 2026-10-15), not its close; blocks nothing formally.)* | [`0462-re-check-fail2ban-on-telemetry-and-game-dev-a-few-hours-after-password-login-was-turned-off`](../tasks/done/0462-re-check-fail2ban-on-telemetry-and-game-dev-a-few-hours-after-password-login-was-turned-off/brief.md) |

> ✅ **Addendum — 2026-10-15, newest (above all others): `0350` CLOSED (agent-closed — not owner-verified); NEW verify task `0463` (Backlog board, flagged top of Sprint 9). Read the authority before the outcome.**
>
> **AUTHORITY.** Closed by a spawned `fkit-producer` holding **no owner channel** (ADR-021/037), in a `fkit-sprint-ship-loop`
> run driven by `fkit-lead` — hence the agent-closed marker (ADR-033 §5). ⛔ **Not producer precedent.** The owner rulings it
> rests on: `0350`'s plan approved 2026-10-15 (live `AskUserQuestion` in the driver session); review finding R2 owner-ruled
> 2026-10-15; verify placement — the standing build/verify-split rule (OWNER RULING 2026-09-29); its own weekend deploy —
> Ruling 3 of the four-rulings addendum below.
>
> **OUTCOME.**
> - [`0350`](../tasks/done/0350-name-change-moderation-without-copy-and-paste/brief.md) → `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`; folder
>   moved to `tasks/done/`. Repo work and test proof only — see its row above. ⚠️ Not deployed; box-only behaviour unproven.
> - NEW [`0463`](../tasks/backlog/0463-verify-0350-on-the-profile-box-decide-waiting-name-changes-with-the-walk-through-command/brief.md) on the [Backlog board](backlog.md), `🔲 Backlog`, owner `fkit-producer`,
>   executed by the owner — **goes to the TOP of Sprint 9** (no Sprint 9 board exists yet; same placement as `0460`, `0461`).
>   Per Ruling 3 it does not hold back the final Sprint 8 deploy or `0426`.
> - **No other status changed, nothing renumbered (ADR-035), nothing committed.**

> 📌 **Addendum — 2026-10-15, ~~newest (above all others)~~ (superseded as newest the same day): four OWNER RULINGS after a `/fkit-status` briefing — `0452` and `0426` → `🔄 In progress`; the game dev deploy's env-file proof copied into `0450`; `0350` ships on its own; the merit order of `0452` / `0462` / `0449` / `0450` / `0219` confirmed. Read the authority before the outcome.**
>
> **AUTHORITY.** Four **OWNER RULINGS given live on 2026-10-15 via `AskUserQuestion` in the main session**, relayed by
> the main session to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> Questions and answers, verbatim:
> 1. *"Mark 0452 and 0426 as 'In progress' on the board, since work on both has started?"* → **"Both (Recommended)"**.
> 2. *"Today's game dev deploy already showed the leftover env file being deleted. Copy that proof into task 0450 now?"*
>    → **"Copy it into 0450 now (Recommended)"**.
> 3. *"Should 0350 (the name-change helper, a tool only you use) hold back the final Sprint 8 deploy and the player news
>    text (0426)?"* → **"Ship 0350 on its own (Recommended)"**.
> 4. *"Confirm the real work order the producer suggests: 0452 → 0462 → 0449/0450 near the top, and 0219 near the top
>    for its deadline? (Only the notes change, not the row numbers.)"* → **"Confirm that order (Recommended)"**.
>
> **OUTCOME.**
> - **Ruling 1.** [`0452`](../tasks/backlog/0452-verify-0442-on-the-boxes-pre-checks-then-turn-password-login-off-on-game-dev-and-telemetry-now-game-prod-in-the-weekend-slot/brief.md)
>   `🔲 Backlog` → `🔄 In progress` (pre-checks P1–P4 passed; password login off on telemetry and game dev, V2–V4 passed
>   on both; game prod waits for the weekend slot). [`0426`](../tasks/backlog/0426-update-the-news-window-tell-players-everything-shipped-since-2026-06-06/brief.md)
>   `🔲 Backlog` → `🔄 In progress` (news text drafted 2026-10-11, owner-approved 2026-10-12; waiting for deploy day,
>   the news file not yet edited). Row and brief `## Status` changed together, so the two agree.
> - **Ruling 2.** New [`0450` worklog](../tasks/done/0450-verify-0447-on-the-boxes-list-the-leftover-deploy-env-files-owner-deletes-them-on-game-dev-and-confirm-a-dev-deploy-leaves-no-file/worklog.md)
>   with the 2026-10-15 game dev deploy evidence (*"Removing environment file …"* then *"Environment file removed."*).
>   ⚠️ **It does not satisfy any of `0450`'s verification steps on its own** — it is partial evidence toward step 4 only
>   (see the worklog for why). `0450`'s status is unchanged (`🔲 Backlog`).
> - **Ruling 3.** [`0350`](../tasks/done/0350-name-change-moderation-without-copy-and-paste/brief.md) is not
>   player-facing, so it does **not** hold back the final Sprint 8 deploy or `0426`; it ships in its own weekend
>   profile-server deploy. Recorded on `0350`'s row and brief *Notes*, and on `0426`'s row and brief (its dependency on
>   "every other Sprint 8 build task in the final Sprint 8 deploy" now excludes `0350`).
> - **Ruling 4.** **Owner-confirmed merit order: `0452` → `0462` → `0449`/`0450` near the top, and `0219` near the top
>   for its deadline.** The "append rank, NOT a merit ranking — flagged for owner confirmation" flag on the rows and
>   briefs of `0452`, `0462`, `0449`, `0450` and `0219` now reads owner-confirmed. ⚠️ The ruling does not order `0219`
>   against the `0452` chain beyond "near the top"; none is invented here. `0426`'s and `0350`'s flags were not part
>   of this ruling and stay as they were.
> - **Row numbers unchanged** (ADR-035). No folder moved, no mover run, nothing committed.

> 🆕 **Addendum — 2026-10-15, ~~newest (above all others)~~ (superseded as newest the same day): task `0462` (fail2ban re-check on telemetry and game dev — `0452`'s V5 for those two boxes) filed and APPENDED at rank 53 — NOT ranked on merit. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given live on 2026-10-15 in the main session** (the owner's own words), relayed by the
> main session to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent** — for
> filing or for ranking. Verbatim: *"I think we need to create a task to the current sprint, to keep track of it."* —
> "it" = the fail2ban re-check after password login was turned off. "Current sprint" resolved with
> `dashboard.sh select-active` → Sprint 8 (the only `🔄 In progress` board).
>
> **OUTCOME.**
> - NEW [`0462`](../tasks/done/0462-re-check-fail2ban-on-telemetry-and-game-dev-a-few-hours-after-password-login-was-turned-off/brief.md)
>   appended at **rank 53** — ⚠️ ADR-035 append rank, NOT a merit ranking, flagged for owner confirmation. On merit it
>   belongs directly below `0452` (it is `0452`'s own V5 for two boxes, and time-gated behind them). `🔲 Backlog`, owner
>   `fkit-producer`, executed by the owner.
> - ℹ️ **Not an extra check:** `0462` **is** `0452`'s V5 for game dev and telemetry. When it passes, `0452`'s V5 stays open
>   only for game prod (weekend slot). `0452`'s brief and row are unchanged.
> - Nothing renumbered (ADR-035), no folder moved, no mover run, nothing committed.

> ➡️ **Addendum — 2026-10-15, ~~newest (above all others)~~ (superseded as newest the same day): `0350` (name-change moderation without copy-and-paste) moved in from the [Backlog board](backlog.md). Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given live on 2026-10-15 in the coordinating session** (the owner's own words), relayed by
> the main session to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent** — for
> moving a row or for ranking. Verbatim: *"Move the task to the current sprint"*. "Current sprint" resolved with
> `dashboard.sh select-active` → Sprint 8 (the only `🔄 In progress` board).
>
> **OUTCOME.**
> - [`0350`](../tasks/done/0350-name-change-moderation-without-copy-and-paste/brief.md)
>   appended at **rank 52** — ⚠️ ADR-035 append rank, NOT a merit ranking, flagged for owner confirmation. On merit it has
>   no ordering constraint here (depends on nothing, blocks nothing). Status unchanged, `🔲 Backlog` (not started); scope
>   unchanged — shape **A1**, chosen by OWNER RULING 2026-09-29 (Q3), is v1.
> - Brief's `## Sprint` → `Sprint 8`, `## Priority` → `52 on Sprint 8`, dated note added to the brief. Backlog-board
>   row kept as `➡️ Moved`, with a dated move note there.
> - ℹ️ Off this sprint's theme (*Paid Citizenship Perks and More Content*) — recorded, not a blocker; the owner placed it.
> - ℹ️ A profile-box change: deploy in a weekend slot; the live check is a separate verify task at the top of the next
>   sprint (the owner's standing build/verify-split rule, 2026-09-29).
> - Nothing renumbered (ADR-035), no folder moved, no mover run, nothing committed.

> ✅ **Addendum — 2026-10-14, ~~newest (above all others)~~ (superseded as newest 2026-10-15): `0454` CLOSED (agent-closed — not owner-verified); backlog task `0292` CANCELLED as absorbed (agent-closed); NEW verify task `0461` (Backlog board, flagged top of Sprint 9). Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-14 (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent.** `0454` plan approved (blob `1d712886…`); doc fix *"Fix the stale sentences
> (Recommended)"*; `0292` — question *"Backlog task 0292 (from September) plans to switch off the same useless archive
> lookup that 0454 will switch off. If 0454 does it, 0292 has nothing left to do. What should happen to 0292?"* →
> **"Cancel when 0454 closes (Recommended)"**; verify placement — the standing build/verify-split rule (2026-09-29).
>
> **OUTCOME.**
> - [`0454`](../tasks/done/0454-private-lobbies-show-lobby-not-found-when-a-player-enters-a-wrong-code/brief.md) → `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`; folder
>   moved to `tasks/done/`. Repo work and test proof only — see its row above. ⚠️ Not yet seen on the live game.
> - [`0292`](../tasks/cancelled/0292-client-archive-read-bypasses-archive-enabled-flag/brief.md) → `⛔ Cancelled (agent-closed — not owner-verified) (2026-10-14)` via
>   `/fkit-task-cancelled`. **The ruling's condition was re-checked by the closing producer against the code before
>   cancelling:** `src/client/JoinPrivateLobbyModal.ts:368` returns before `checkArchivedGame()` (the only call site,
>   which holds both the archive and `/commit.txt` fetches) while `archiveEnabled()` is false; `DefaultConfig.ts:316`
>   is a hard `false` with no env override; no second flag. Its [Backlog-board](backlog.md) row updated.
> - NEW [`0461`](../tasks/backlog/0461-verify-0454-a-wrong-private-lobby-code-shows-lobby-not-found-on-the-live-game/brief.md) on the [Backlog board](backlog.md), `🔲 Backlog`, owner `fkit-producer`,
>   executed by the owner — **goes to the TOP of Sprint 9** (no Sprint 9 board exists yet; same placement as `0460`).
> - **No other status changed, nothing renumbered (ADR-035), nothing committed.**

> 🆕 **Addendum — 2026-10-14, ~~newest (above all others)~~ (superseded as newest the same day): `0456` CLOSED (agent-closed — not owner-verified), NO code fix; `0230` NOT cancelled; NEW tasks `0459` (this board, APPENDED at rank 51 — NOT ranked on merit) and `0458` (Backlog board). Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-14 (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent** — for closing, filing, placing or ranking. Verbatim:
> 1. Fix path — the owner wrote ("Other" field): *"Do I understand correctly that you're saying that the problem is not
>    going to be repeated in tegular situations? If yes, I suggest adding a task to the backlog sprint about monitoring the
>    spikes in the future, but don't mention the proposed solutions there: to be honest, I don't like the options of us
>    "intruding" into the GameAnalytics logic of deduplication and filtering events from not latest builds (the last one is
>    a no-no, because we need to collect the events from all builds to be able to spot any problems during releases)"*;
>    then **"Yes, file it in Backlog (Recommended)"** — *"Monitoring only; no proposed solutions; nothing dropped or
>    filtered."* — and **"Yes, close with the report (Recommended)"** — *"A producer closes 0456 (agent-closed marker); I
>    put the 0230/0226/game-ID questions to you then."*
> 2. `0230` — **"Not answered: keep 0230 open (Recommended)"** — *"0230 stays on Backlog, noting the re-send explanation as
>    its open lead; the new monitoring task covers future spikes."*
> 3. `0226` — **"Leave it where it is (Recommended)"** — *"You prefer not to change analytics now; it stays a separate
>    Backlog task, with this new reason noted on it."*
> 4. Game ID — *"The numeric GameAnalytics game ID is written in 3 task files (backlog.md, 0212 brief, 0439 brief) of a
>    public repo, against the 'no IDs in files' rule. File a small task to remove it?"* → **"File in Sprint 8"**.
>
> **OUTCOME.**
> - [`0456`](../tasks/done/0456-investigate-and-plan-the-fix-gameanalytics-500-events-per-user-per-day-limit-exceeded-again/brief.md) → `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`; folder moved to `tasks/done/`;
>   no code changed; no follow-up fix task and no verify task. The report's fix options stay analysis only.
> - [`0230`](../tasks/backlog/0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md): **not cancelled** — the conditional cancel in the next addendum did **not** fire (report §11 leaves
>   hypothesis 3 open). Dated notes on its brief and its [Backlog-board](backlog.md) row; status unchanged (`🔲 Backlog`).
> - [`0226`](../tasks/backlog/0226-deploy-env-fails-open-to-prod-analytics/brief.md): dated note (the repo is public); status and board unchanged.
> - NEW [`0459`](../tasks/done/0459-remove-the-gameanalytics-game-id-from-tracked-task-files/brief.md) on this board, `🔲 Backlog`, owner `fkit-producer`, **append rank 51**.
>   ⚠️ **Priority 51 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit its rank barely
>   matters** — it blocks nothing, and the value is already public, so earlier or later changes little.
> - NEW [`0458`](../tasks/backlog/0458-monitor-gameanalytics-for-event-volume-spikes/brief.md) on the [Backlog board](backlog.md) (monitoring only, no solutions named, per ruling 1), owner
>   `fkit-producer`.
> - **No other status changed, nothing renumbered (ADR-035), nothing committed.**

> 🆕 **Addendum — 2026-10-14, ~~newest (above all others)~~ (superseded as newest the same day): backlog task `0230` to be CANCELLED as absorbed by `0456` when `0456` closes — conditional. Nothing cancelled yet. Read the authority before the outcome.** ⛔ **Superseded at `0456`'s close, 2026-10-14: the condition was NOT met and `0230` was NOT cancelled, by owner ruling — see the addendum directly above.**
>
> **AUTHORITY.** OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-14 (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent.** Question: *"0230 (Backlog, September) investigated the 3–4 Sep spike of this same limit and
> never found the cause. 0456 looks at the same limit and starts from 0230's list of suspects. What happens to 0230?"*
> Verbatim selection: **"Absorb, cancel at 0456 close (Recommended)"** — option text: *"One investigation. When 0456
> closes, a producer cancels 0230 as absorbed, but only if 0456's report answered all four of 0230's suspects; otherwise
> it comes back to you."* This answers the 🚩 open owner question in the `0456` filing addendum directly below.
>
> **OUTCOME.**
> - [`0456`](../tasks/done/0456-investigate-and-plan-the-fix-gameanalytics-500-events-per-user-per-day-limit-exceeded-again/brief.md) `## Notes`: new *At close* bullet — the producer closing `0456` runs `/fkit-task-cancelled` on `0230`
>   in the same act, reason naming `0456` and this ruling. ⚠️ **Only if `0456`'s findings report marks all four of `0230`'s
>   hypotheses confirmed or refuted**; any left open ⇒ `0230` is not absorbed and goes back to the owner. The old open-question
>   bullet is struck, kept as history. `0456`'s status line and its row above were **not** touched (driver-owned, `🔄 In progress`).
> - [`0230`](../tasks/backlog/0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md): dated 📌 note under `## Sprint` (ruling + condition; *do not start separately while `0456` is open*) and a
>   matching `## Notes` bullet. Its [Backlog-board](backlog.md) row carries a one-line note saying the same.
> - For the record, same session, **not on this board**: new task [`0457`](../tasks/backlog/0457-host-lobby-copy-button-copies-the-previous-lobbys-code-while-a-new-lobby-is-being-created/brief.md) (host copy button copies the previous lobby's code during create — found in `0451`'s plan) filed on the [Backlog board](backlog.md) by owner ruling *"File in Backlog (Recommended)"*.
> - **No status changed, nothing cancelled, nothing renumbered (ADR-035), nothing committed.**

> 🆕 **Addendum — 2026-10-14, ~~newest (above all others)~~ (superseded as newest the same day): NEW task `0456` (GameAnalytics 500-events-per-user-per-day limit exceeded again — investigate, then fix plan) filed on an OWNER RULING and APPENDED at rank 50 — NOT ranked on merit; by the ruling it is the NEXT task. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULING typed by the owner in the `fkit lead` session on 2026-10-14 (driver of
> `fkit-sprint-ship-loop`), with a GameAnalytics screenshot, relayed by `fkit-lead` to a spawned `fkit-producer` holding
> **no owner channel** (ADR-021/037). ⛔ **Not producer precedent** — for filing, placing or ranking. Verbatim: *"we need
> to investigate it and make it as our next task in the Sprint 8 (it's important for us to keep collecting metrics)"*.
> The screenshot: *"Limit Exceeded: Total number of events per active user (per day) has exceeded the limit of 500"*,
> *"Status: Collecting events…"*.
>
> **OUTCOME.**
> - [`0456`](../tasks/done/0456-investigate-and-plan-the-fix-gameanalytics-500-events-per-user-per-day-limit-exceeded-again/brief.md) filed, `🔲 Backlog`, owner `fkit-coder` (Part 1 in the owner's Chrome with the owner), **append rank 50 — a position, not merit**.
>   ⚠️ **Priority 50 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs
>   directly below `0351` — i.e. above `0343`, the board's first open row**, because the owner ruled it the next task.
>   Not placed there: closed rows sit between (ADR-035 — a new row always appends), and a spawned producer never re-ranks.
>   **The ruling, not the number, sets the work order: the loop takes `0456` next.**
> - One brief, not several: the GameAnalytics read and the code read feed one finding; the fix's shape is unknown until
>   the findings exist, so the plan gate decides build-here vs a follow-up brief. The live check is a separate verify task.
> - **Not caused by `0451`** — its 16 `PrivateLobby:*` events are built, not deployed; the fix plan budgets for them.
> - If the fix ships code in this sprint, it joins `0426`'s wait set. `0426`'s brief needs no edit now.
> - 🚩 **Open owner question:** backlog [`0230`](../tasks/backlog/0230-investigate-3-4-sep-gameanalytics-per-user-event-spike/brief.md) (the 3–4 Sep spike, cause unknown) — absorb into `0456` and cancel at `0456`'s close, or keep separate? Recommended: absorb. **`0230` and the [Backlog board](backlog.md) were NOT edited.**
> - **No status changed, nothing renumbered, nothing committed.**

> 🆕 **Addendum — 2026-10-14, ~~newest (above all others)~~ (superseded as newest the same day): NEW task `0455` (GameAnalytics funnel + dashboard for `0451`'s events) filed on an OWNER RULING and APPENDED at rank 49 — NOT ranked on merit. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-14 (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent** — for filing, placing or ranking. Question: *"When 0451 closes, a follow-up task gets filed:
> build the private-lobby funnel/dashboard in GameAnalytics (in your Chrome, with you) and check the events arrive. It only
> works after 0451 is deployed and a few days of data exist. Where should that task go?"* Verbatim selection: **"Sprint 8"**
> — option text: *"Keep it in this sprint, if 0451 will be deployed and have data before Sprint 8 ends."* This bends the
> standing build/verify-split rule (2026-09-29, verify task at the top of the **next** sprint) **for this case only.**
>
> **OUTCOME.**
> - [`0455`](../tasks/backlog/0455-build-the-private-lobby-funnel-and-dashboard-in-gameanalytics-and-confirm-the-0451-events-arrive/brief.md) filed, `🔲 Backlog`, owner `fkit-producer` (owner's Chrome, owner logged in), **append rank 49 — a position, not merit**.
>   ⚠️ **Priority 49 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit its rank barely
>   matters**, because it blocks nothing and is time-gated. Appended after the highest (48, `0454`), never inserted (ADR-035).
> - ⚠️ **Time gate:** workable only after `0451` is committed (owner's call), deployed to production in a weekend slot, and
>   several full days of data exist. `**Depends on:** 0451` cannot express that, so the board may show `0455` as ready early.
> - **Not in `0426`'s wait set** — it ships no code. `0426`'s brief needs no edit.
> - One brief, not two: checking arrival and building the funnel are one session on the same data; the check is the
>   funnel's first step.

> ✅ **Addendum — 2026-10-14: `0451` CLOSED `✅ Done (agent-closed — not owner-verified)`. Read the authority before the outcome.**
>
> **AUTHORITY.** Closed by a spawned `fkit-producer` (no owner channel, ADR-021/037) via `/fkit-task-done`, at the end of
> `fkit-sprint-ship-loop`'s run on it, relayed by `fkit-lead`. **No human checked this close** — hence the marker
> (ADR-033 §5). Owner rulings this session (live `AskUserQuestion`; ⛔ not producer precedent) are listed in the row.
>
> **OUTCOME.**
> - [`0451`](../tasks/done/0451-private-lobbies-add-the-missing-analytics-events-for-a-full-usage-funnel/brief.md) moved `tasks/backlog/` → `tasks/done/`; row above → `✅ Done (agent-closed — not owner-verified)`.
> - **Built, not deployed.** No event has reached production. Prod arrival and the GameAnalytics funnel are `0455`.
> - ⚠️ **Not verified:** the local Playwright walk-through was not re-run after the R1–R3 counting-only fix; the Yandex
>   portal-link copy, the invite-payload join and the win-modal finish path are unit-tested only.
> - 🚩 **Pre-existing issue noted by `0451`'s plan, NOT fixed, NOT filed:** while the create request is in flight, the host
>   window's copy button can copy the code of the **previous** opening (`lobbyId` is not cleared in `open()`). `0451` makes
>   sure such a copy is not counted; the player-facing bug remains. **Open owner question:** file it as a task, or leave it?
> - `0426` still waits on `0451` (it rides the final Sprint 8 deploy); `0454` (depends on `0451`) is now unblocked on that link.

> 🆕 **Addendum — 2026-10-14, ~~newest (above all others)~~ (superseded as newest the same day): backlog task `0292` to be CANCELLED as absorbed by `0454` when `0454` closes — conditional. Nothing cancelled yet. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-14 (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent.** Question: *"Backlog task 0292 (from September) plans to switch off the same useless archive
> lookup that 0454 will switch off. If 0454 does it, 0292 has nothing left to do. What should happen to 0292?"* Verbatim
> selection: **"Cancel when 0454 closes (Recommended)"** — option text: *"When 0454 closes, a producer cancels 0292 as
> 'absorbed by 0454', with that reason recorded."* This answers the 🚩 open owner question in the `0454` filing addendum
> directly below.
>
> **OUTCOME.**
> - [`0454`](../tasks/done/0454-private-lobbies-show-lobby-not-found-when-a-player-enters-a-wrong-code/brief.md) `## Notes`: new *At close* bullet — the producer closing `0454` runs `/fkit-task-cancelled` on `0292`
>   in the same act, reason naming `0454` and this ruling. ⚠️ **Only if `0454` actually put the client archive read behind
>   `archiveEnabled()`**; if its approved plan or shipped change does not, `0292` is not absorbed and goes back to the owner.
> - [`0292`](../tasks/cancelled/0292-client-archive-read-bypasses-archive-enabled-flag/brief.md): dated 🚨 correction at the top of `## Context` — its *"benign — 404 → not_found"* premise is wrong
>   for production (200 `text/html` from the Master's catch-all → generic error) — plus the ruling and the condition. Old
>   text kept, flagged. Its [Backlog-board](backlog.md) row carries a one-line note saying the same.
> - The `0454` row above marks its open question answered.
> - **No status changed, nothing cancelled, nothing renumbered (ADR-035), nothing committed.** `0451`'s folder and row untouched.

> 🆕 **Addendum — 2026-10-14, ~~newest (above all others)~~ (superseded as newest the same day): NEW task `0454` (wrong private-lobby code shows "not found") filed on an OWNER RULING and APPENDED at rank 48 — NOT ranked on merit. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-13 (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent** — for filing, placing or ranking. Question: *"In production, a player who types a wrong
> lobby code sees a generic "something went wrong" message instead of "lobby not found" (already true before 0451; caused
> by a lookup to a switched-off games archive). 0451 only fixes what gets counted. How should we handle what the player
> sees?"* Verbatim selection: **"Separate small task (Recommended)"** — option text: *"File a new Sprint 8 task to show
> 'not found' for a wrong code. 0451 stays analytics-only."*
>
> **OUTCOME.**
> - [`0454`](../tasks/done/0454-private-lobbies-show-lobby-not-found-when-a-player-enters-a-wrong-code/brief.md) filed, `🔲 Backlog`, owner `fkit-coder`, **append rank 48 — a position, not merit**.
>   ⚠️ **Priority 48 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs
>   directly below `0451`**, because it edits the same lines and must agree with `0451`'s `JoinFailed:NotFound` event.
>   Not placed there: rows below `0451` are open, but a new row always appends (ADR-035), and a spawned producer never re-ranks.
> - One brief, not several: one client file plus its tests; the screen fix and its test mocks cannot ship apart.
> - **Depends on `0451`** (in progress): same `joinLobby()` / `checkArchivedGame()` lines, and `0451`'s review R1 is
>   settling where `NotFound` fires — building after avoids two coders on one block and a guess about the event.
> - **`0426` interplay:** `0426`'s Timing rule waits on every Sprint 8 build task in the final deploy, so `0454` **joins
>   that set**. Unlike `0451` it is **player-visible**, so the news entry may mention it. `0426`'s brief needs no edit.
> - ⚠️ **Overlap with backlog task `0292`** (gate the client archive read on `archiveEnabled()`): `0454`'s recommended fix
>   does all of `0292`'s work, and the production finding refutes `0292`'s *"benign — 404 → not_found"* premise. Neither
>   `0292` nor the Backlog board was edited. 🚩 Open owner question: cancel `0292` as absorbed when `0454` closes, or keep it?
> - 📌 Flagged for `fkit-wiki` (not acted on): `wiki/tasks/archive-endpoint-failures.md` carries the same wrong
>   "benign 404" claim.
> - Nothing renumbered (ADR-035), nothing committed, `0451`'s folder and row untouched, no status changed.

> 🆕 **Addendum — 2026-10-13, ~~newest (above all others)~~ (superseded as newest 2026-10-14): `0449`'s profile-box steps may run before `0452`'s pre-checks P1–P4; its telemetry and game deploys still wait. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-13 (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent.** Question: *"0449's first step only deploys the profile server, which 0442's password-off
> change never touches. Should that one step be allowed to go ahead before 0452's safety checks, or should all of 0449
> wait?"* Verbatim selection: **"Let the profile step go first (Recommended)"** — option text: *"Only 0449's profile-box
> step may run before 0452's checks; its game and telemetry deploys still wait. Small brief edit."* This narrows the
> `0452`-dependency addendum directly below, for `0449` only.
>
> **OUTCOME.**
> - [`0449`](../tasks/backlog/0449-verify-0443-on-the-boxes-deploy-the-ssh-security-alerts-and-watch-them-for-two-days/brief.md): *Depends on* still lists `0452` (P1–P4 only), now **only for its telemetry and game
>   deploys**. Its profile-box steps — the profile deploy (first in its step-3 order) and the profile box's own checks
>   in steps 4, 5 and 7 — may run first. New *Profile-box carve-out* note quotes the ruling.
> - [`0452`](../tasks/backlog/0452-verify-0442-on-the-boxes-pre-checks-then-turn-password-login-off-on-game-dev-and-telemetry-now-game-prod-in-the-weekend-slot/brief.md): *Blocks* now reads `0449` (its telemetry and game deploys only), `0450`.
> - `0450` unchanged — it deploys game dev only, so all of its box steps still wait for P1–P4.
> - The `0449` and `0452` rows above say the same. **No status changed, nothing renumbered (ADR-035), nothing committed.** `0451`
>   and everything under `tasks/done/` untouched.

> 🆕 **Addendum — 2026-10-13, ~~newest (above all others)~~ (superseded as newest the same day): `0449` and `0450` now formally wait for `0452`'s pre-checks P1–P4 (not for `0452` to close). Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-13 (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent.** Question: *"After you commit 0442, the next deploy of a game box or the telemetry box (even
> one done for 0449 or 0450) turns password login off. Should 0449 and 0450 formally wait for 0452's safety checks (web
> console login proven, keys + root passwords saved, a read-only config check)?"* Verbatim selection: **"Yes, make them
> wait (Recommended)"** — option text: *"Add 0452 to 0449's and 0450's 'Depends on'. Tiny edit, easy to undo. Their
> deploys can still count as 0452's deploy for that box once the checks pass."* This answers the open owner question
> recorded in the `0442` close addendum below.
>
> **OUTCOME.**
> - [`0449`](../tasks/backlog/0449-verify-0443-on-the-boxes-deploy-the-ssh-security-alerts-and-watch-them-for-two-days/brief.md) and [`0450`](../tasks/done/0450-verify-0447-on-the-boxes-list-the-leftover-deploy-env-files-owner-deletes-them-on-game-dev-and-confirm-a-dev-deploy-leaves-no-file/brief.md): `0452` added to *Depends on* — for
>   **`0452`'s pre-checks P1–P4 only**, not for its close. `0452`'s game prod half waits for the weekend slot;
>   `0449`/`0450` must not be stuck behind it.
> - A `0449`/`0450` deploy **may count as `0452`'s deploy for that box**, once P1–P4 have passed and `0452`'s terminal A
>   is kept open for that box (`0452` *Context*).
> - [`0452`](../tasks/backlog/0452-verify-0442-on-the-boxes-pre-checks-then-turn-password-login-off-on-game-dev-and-telemetry-now-game-prod-in-the-weekend-slot/brief.md): *Blocks* now `0449`, `0450` (P1–P4 only); its "ordering, not a formal block" note marked answered.
> - The three rows above say the same. **No status changed, nothing renumbered (ADR-035), nothing committed.** `0451`
>   and everything under `tasks/done/` untouched.

> 🆕 **Addendum — 2026-10-13, ~~newest (above all others)~~ (superseded as newest the same day): `0442` closed (agent-closed) on its repo work only; verify task `0452` and follow-up `0453` filed on THIS sprint, both APPENDED (ranks 46, 47) — NOT ranked on merit. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-13 (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent** — for closing, for placing a verify task, for filing, or for ranking. Verbatim:
> - **"Sprint 8 (Recommended)"** — option text: *"Same as 0445: you already ruled dev + telemetry go out now, so the verify
>   task sits in this sprint. Bends the 'next sprint' rule for this case only."* ⚠️ Like the `0441`, `0443` and `0447`
>   rulings, this **bends, for this case only,** the standing build/verify-split rule (owner ruling 2026-09-29).
> - **"File it in Sprint 8"** — to the question *"The profile box's deploy script has the same gap as R1 (key path could
>   fall back to a password prompt). Harmless today because that box already refuses passwords. File a small follow-up
>   task?"*; option text: *"Same task, but in this sprint."*
> - Earlier the same session: `0442` plan Q1–Q4 (recorded in its `plan.md` § *Owner decisions*); review R1 *"Fix now
>   (Recommended)"*, R2 *"Fix now (small)"*.
>
> **OUTCOME.**
> - [`0442`](../tasks/done/0442-game-boxes-turn-off-password-login-over-ssh-after-key-login-is-proven/brief.md) closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`. **Repo work
>   only** (new `sshd-hardening.sh`; sections in `setup-game-host.sh` and `setup-telemetry.sh`; `deploy.sh` Q1; telemetry
>   key path never offers a password prompt, R1; unchanged drop-in now reloads, R2; runbook §7/§8). Review coverage
>   **reasoning-only second opinion**; both findings fixed, no residuals. Tests: see the row. ⚠️ **Nothing on any box.**
> - 🚨 **Once `0442`'s code is committed, ANY key deploy of a game box or the telemetry box turns password login off** —
>   including the deploys `0449` and `0450` plan. `0452`'s pre-checks P1–P4 must come before the first such deploy.
>   `0449`/`0450` were **not edited**; whether they should formally wait on `0452` is an open owner question.
> - [`0452`](../tasks/backlog/0452-verify-0442-on-the-boxes-pre-checks-then-turn-password-login-off-on-game-dev-and-telemetry-now-game-prod-in-the-weekend-slot/brief.md) filed at **append rank 46** — ⚠️ append rank, NOT a merit ranking, flagged for
>   owner confirmation. **On merit it belongs directly above `0449`** — the first open work on the board — for the reason
>   above. Depends on `0442`.
> - [`0453`](../tasks/done/0453-profile-deploy-never-fall-back-to-a-password-prompt-on-the-key-path/brief.md) filed at **append rank 47** — ⚠️ append rank, NOT a merit ranking, flagged for owner
>   confirmation. **On merit it belongs directly below `0452`** (same lesson, low urgency, blocks nothing). Owner
>   `fkit-coder`.
> - For `0446`: the sshd item landed in `setup-game-host.sh` directly (by `0442`); `0446` was not edited.
> - Nothing renumbered (ADR-035), nothing committed.

> 🆕 **Addendum — 2026-10-13, ~~newest (above all others)~~ (superseded as newest the same day): NEW task `0451` (private-lobby funnel analytics events) filed on an OWNER RULING and APPENDED at rank 45 — NOT ranked on merit. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULING typed by the owner live in the `fkit lead` session on 2026-10-13 (the owner's own message,
> not an `AskUserQuestion` answer), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021/037). ⛔ **Not producer precedent** — for filing, placing or ranking. Verbatim: *"private_lobbies_all - this is
> on for everybody. Brief a task for the current sprint ot add missing events."* The "on for everybody" part is the
> owner's statement, matching `0428`'s close; no agent has read the Yandex console.
>
> **OUTCOME.**
> - [`0451`](../tasks/done/0451-private-lobbies-add-the-missing-analytics-events-for-a-full-usage-funnel/brief.md) filed, `🔲 Backlog`, owner `fkit-coder`, **append rank 45 — a position, not merit**.
>   ⚠️ **Priority 45 is append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs
>   directly above `0426`**, because `0426`'s Timing rule makes it wait on this build task. Not placed there: rows below
>   `0426` include closed rows (ADR-035), and a spawned producer never re-ranks.
> - One brief, not several: every event is a few lines in the same client flow, and the funnel is only readable once all
>   steps report — splitting per event would ship nothing useful on its own.
> - **`0426` interplay:** `0426`'s Timing rule covers Sprint 8 build tasks filed after 2026-10-09 that ride the final
>   deploy, so `0451` **joins that set**; `0426`'s brief needs no edit (its coder re-checks this board at start). ⚠️ Open
>   question for the owner: these events are invisible to players and the news entry will not mention them — exempt
>   `0451` from `0426`'s wait, or keep it in?
> - Follow-up **not filed now**: the GameAnalytics funnel build/check in the owner's Chrome (like `0418`) is a separate
>   verify task, filed at `0451`'s close per the build/verify split rule (2026-09-29); its sprint is the owner's call then.
> - Nothing renumbered (ADR-035), nothing committed, `0442`'s folder untouched.

> 🆕 **Addendum — 2026-10-13, ~~newest (above all others)~~ (superseded as newest the same day): `0428` and `0440` closed (agent-closed) — private lobbies are ON FOR EVERYONE. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULINGS given live via `AskUserQuestion` on 2026-10-13 in the `fkit lead` session (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent** — for closing, or for re-planning another task's scope. Verbatim:
> - `0428`: **"Close it (Recommended)"**.
> - `0440`: **"Close; 0439 stands alone (Recommended)"** — `0440` item 4 (`0439`, the exit-popup live check) is re-planned:
>   `0439` carries it on its own.
>
> **OUTCOME.**
> - [`0428`](../tasks/done/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md) closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`.
>   **`private_lobbies_all` = `enabled` for everyone since about 17:09–17:12 MSK 2026-10-13** (game `0.0.163`). Checks
>   4a–4c pass **per owner statement "all good" — not itemised**. ⚠️ Check 4d (server-log counts) **not run** — skipped by
>   the owner. Rollback not used. The `0332` Q4 forged-citizen-id risk stays accepted. The flip time is noted in `0435`'s
>   brief (as `0440` item 6 asks).
> - [`0440`](../tasks/done/0440-when-yandex-games-is-working-again-the-flag-change-and-checks-blocked-by-its-outage/brief.md) closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`.
>   Yandex judged back 2026-10-13; items 2–3 done in `0428` / `0426`; item 4 re-planned (above); ⚠️ item 5 **not run** —
>   skipped by the owner; outage window 2026-10-11 → 2026-10-13 recorded; no `0424` trigger.
> - `0439` unchanged — still on the Backlog board, still waits on the deploy carrying `0437`.
> - Nothing renumbered (ADR-035), nothing committed.

> 🆕 **Addendum — 2026-10-13, ~~newest (above all others)~~ (superseded as newest the same day): `0447` closed (agent-closed) on its repo work only; verify task `0450` filed on THIS sprint; `0444` item 5 made required. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent** — for closing, for placing a verify task, for ranking, or for changing another task's scope.
> Verbatim:
> - 2026-10-12: **"Move it to the verify task (Recommended)"** — `0447`'s read-only box listing (F1) could not run (no root
>   key login yet), so the box part moves to a verify task and `0447` closes on its repo work.
> - 2026-10-13: **"Sprint 8 (Recommended)"** — option text: *"Same as 0441's and 0443's verify tasks today. It sits next to
>   0445, which it waits on, so the whole SSH chain is on one board."* ⚠️ Like the `0441` and `0443` rulings, this **bends,
>   for this case only,** the standing build/verify-split rule (owner ruling 2026-09-29) that a verify task goes to the top
>   of the **next** sprint.
> - 2026-10-12, at `0447`'s plan gate, Q1: **"Leave it to 0444 (Recommended)"** — the `deploy.sh`-side gap is `0444`'s.
>
> **OUTCOME.**
> - [`0447`](../tasks/done/0447-game-dev-delete-leftover-deploy-env-files-and-make-the-game-deploy-always-remove-its-env-file/brief.md) closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`. **Repo
>   work only:** `update.sh` (env file removed on every exit, plus signal traps; Part C — a failed pull of an image that is
>   not on the box exits before touching the running game), harness T72–T76, docs, one `CLAUDE.md` clause. `deploy.sh`
>   untouched (Q1). Harness `ALL PASS` (21 failures against HEAD's `update.sh`); full `npm test` green twice — 225/225
>   suites, 4611/4611 tests (second run after the post-review comment-only edit). Review round 1 closed out, both reviewers
>   measured; R1 recorded as accepted residual `pull-fallback-after-prune` (owner ruling *"Record as settled
>   (Recommended)"*).
> - ⚠️ **Nothing done on any box, nothing deployed. The ~21 leftover deploy env files on game dev are STILL THERE.** The
>   listing, the owner's delete and the deploy check moved to `0450`. This close made no commit.
> - [`0450`](../tasks/done/0450-verify-0447-on-the-boxes-list-the-leftover-deploy-env-files-owner-deletes-them-on-game-dev-and-confirm-a-dev-deploy-leaves-no-file/brief.md) filed at **append rank 44** — ⚠️ append rank, NOT a merit ranking, flagged for
>   owner confirmation. **On merit it belongs directly below `0449`**, because like `0449` its box steps wait on `0445`'s
>   root key. Owner-run delete and deploys; an agent may run the read-only F1 listing (ruling Q3). Depends on `0445`,
>   `0447`.
> - [`0444`](../tasks/backlog/0444-game-deploy-move-secrets-off-the-ssh-command-line/brief.md) item 5 ("remove the
>   box-side env file on a failed deploy too") changed from optional to **required**, with a dated note citing `0447`.
>   Nothing else in `0444` changed; it stays on the Backlog board.
> - Nothing renumbered (ADR-035), nothing committed. `0445` and `0449` not touched.

> 🆕 **Addendum — 2026-10-12, ~~newest (above all others)~~ (superseded as newest 2026-10-13): `0447` moved in from the Backlog board. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given in the `fkit lead` session on 2026-10-12**, relayed by `fkit-lead` to a spawned
> `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent** — for moving a row or for
> ranking. Verbatim: *"Move it to the Sprint 8"*.
>
> **OUTCOME.**
> - [`0447`](../tasks/done/0447-game-dev-delete-leftover-deploy-env-files-and-make-the-game-deploy-always-remove-its-env-file/brief.md)
>   appended at **rank 43** — ⚠️ ADR-035 append rank, NOT a merit ranking, flagged for owner confirmation. On merit it has
>   no ordering constraint here (depends on nothing, blocks nothing). Status unchanged, `🔲 Backlog`; scope unchanged.
> - Brief's `## Sprint` → `Sprint 8`, `## Priority` → `43 on Sprint 8`. Backlog-board row kept as `➡️ Moved`, with a
>   dated move note there.
> - Not decided by this move: `0447`'s open question 1 (fold into `0444` or keep separate). `0444` and `0448` stay on the
>   Backlog board.
> - Nothing renumbered (ADR-035), no folder moved, no mover run, nothing committed.

> 🆕 **Addendum — 2026-10-12, ~~newest (above all others)~~ (superseded as newest the same day): `0443` closed (agent-closed); verify task `0449` filed on THIS sprint. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-12** (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent** — for closing, for placing a verify task, or for ranking. Verbatim selection: **"Close; verify
> task in Sprint 8 (Recommended)"** — option text: *"Same as 0441: 0443 closes now (agent-closed, not owner-verified); a producer
> files one verify task on Sprint 8 with your deploy + 2-day observation steps. Mid-week deploys fine."* ⚠️ Like the `0441` ruling,
> this **bends, for this case only,** the standing build/verify-split rule (owner ruling 2026-09-29) that a verify task goes
> to the top of the **next** sprint.
>
> **OUTCOME.**
> - `0443` closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`: repo work A1–A10 done as amended by the
>   owner's rulings, full `npm test` green (225/225 suites, 4611/4611 tests), lint / tsc / config-parity clean, review round 1
>   closed out (R6 accepted residual). **Nothing run on any box, no deploy** — every box step moved to `0449`. This close made
>   no commit.
> - [`0449`](../tasks/backlog/0449-verify-0443-on-the-boxes-deploy-the-ssh-security-alerts-and-watch-them-for-two-days/brief.md)
>   filed at **append rank 42** — ⚠️ append rank, NOT a merit ranking, flagged for owner confirmation. **On merit it belongs
>   directly below `0445`**, because its game-box steps need `0445`'s root key. Owner-executed. Depends on `0443` and `0445`.
> - 🚨 Once `0443` is committed, **every game deploy exits 3 after the game is live until `0445` installs the root key** (owner
>   ruling Q-A1, no skip switch) — and also if `PROFILE_SSH_ALERT_TOKEN` or game dev's `PROFILE_API_URL` is blank.
> - Nothing renumbered (ADR-035), nothing committed. `0441` and `0445` statuses not touched.

> 🆕 **Addendum — 2026-10-12, ~~newest (above all others)~~ (superseded as newest the same day): `0441` closed (agent-closed); verify task `0445` filed on THIS sprint; `0442` re-pointed to wait on `0445`. Read the authority before the outcome.**
>
> **AUTHORITY.** An **OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-12** (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037).
> ⛔ **Not producer precedent** — for closing, for placing a verify task, or for ranking. Verbatim selection: **"Close; verify
> task in Sprint 8 (Recommended)"** — option text: *"0441 closes now (agent-closed, not owner-verified). A producer files one
> verify task at the top of Sprint 8: install keys, key-only login check, proof deploys (mid-week is fine). 0442 then waits on
> that verify task. Bends your 'next sprint' rule because you plan to deploy this week."* ⚠️ This **explicitly bends, for this
> case only,** the standing build/verify-split rule (owner ruling 2026-09-29) that a verify task goes to the top of the
> **next** sprint.
>
> **OUTCOME.**
> - `0441` closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`: repo work done (`deploy.sh`,
>   `build-deploy-telemetry.sh`, `scripts/telemetry-tunnel.sh`, the hardening harness, runbook §7), full `npm test` green,
>   review closed out. **Nothing done on any box** — every box step moved to `0445`. This close made no commit.
> - [`0445`](../tasks/done/0445-verify-0441-on-the-boxes-install-the-ssh-keys-prove-key-only-login-and-deploy-over-the-key/brief.md)
>   filed at **append rank 41** — ⚠️ append rank, NOT a merit ranking, flagged for owner confirmation. **By the owner's
>   ruling its real place is the top of this board's open work, directly above `0442`.** Owner-executed.
> - `0442`'s **Depends on** changed from `0441` to `0445` (brief and row), same ruling.
> - Nothing renumbered (ADR-035), nothing committed.

> 🆕 **Addendum — 2026-10-12, ~~newest (above all others)~~ (superseded as newest the same day): telemetry added to `0441`/`0442`; `0443` (SSH security alerts) filed. Read the authority before the outcome.**
>
> **AUTHORITY.** Two **OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-12**, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.** Verbatim:
> **"Yes, add telemetry (Recommended)"** (*"Same steps: key first, check it works, then password off. Same top priority."*) and
> **"All three (Recommended)"** (*"Login alert + fail2ban-down alert + daily counts, on game, profile and telemetry. One task in
> Sprint 8, right after 0441/0442."*).
>
> **OUTCOME.**
> - `0441` and `0442` now cover the **telemetry box** too (titles updated; folder slugs kept so no link breaks). Still the top
>   priority, same order.
> - [`0443`](../tasks/done/0443-ssh-security-alerts-to-telegram-on-all-three-boxes-logins-fail2ban-down-daily-counts/brief.md)
>   filed at append rank 40 — **its real place is right after `0441`/`0442`, by owner ruling.** One task, not split, by ruling.
> - Nothing renumbered (ADR-035), nothing committed.

> 🆕 **Addendum — 2026-10-12, ~~newest (above all others)~~ (superseded as newest the same day): Sprint 8 STARTED; `0441` + `0442` (game-box SSH key login, then password login off) filed as 🚨 TOP PRIORITY. Read the authority before the outcome.**
>
> **AUTHORITY.** Two **OWNER RULINGS given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-12**, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent** — for
> starting a sprint or for ranking. Verbatim: **"Mark it started (Recommended)"**, and *"File it to the current sprint, and
> it should be our top priority to work on."*
>
> **OUTCOME.**
> - Line-3 banner: ~~`🔲 Backlog — 2026-09-29`~~ → `🔄 In progress — 2026-10-12`. `dashboard.sh select-active` now reports
>   Sprint 8 as the one active sprint.
> - 🚨 **[`0441`](../tasks/done/0441-game-boxes-install-an-ssh-key-and-switch-game-deploys-to-key-login/brief.md) (rank 38) and [`0442`](../tasks/done/0442-game-boxes-turn-off-password-login-over-ssh-after-key-login-is-proven/brief.md) (rank 39) are the
>   TOP PRIORITY of this board by owner ruling — pick `0441` up first.** Their numbers are ADR-035 append ranks only: a new
>   row may not be inserted above closed rows, so the owner's "top priority" is carried by this note and the rows, not by
>   the number. The producer split the request in two so password login can never be switched off before key login is
>   proven (`0442` depends on `0441`).
> - Owner-run: key creation, box changes, deploys. Open questions in `0441` (key type, root login, which boxes, telemetry)
>   and `0442` (how to apply, root password).
> - Nothing renumbered (ADR-035), nothing committed.

> 🆕 **Addendum — 2026-10-12, ~~newest (above all others)~~ (superseded as newest the same day): `0440` (Yandex-outage checklist) added out of band. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER REQUEST typed by the owner in the `fkit lead` session on 2026-10-12** (the owner's own message), relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.** Verbatim:
> *"Yandex.Games still have problems with their services and infrastructure, so I can't do all the needed checks and changes of
> flags. Can you brief a task for that and add it to the current sprint, to make sure we don't forget about all the needed checks?"*
>
> **OUTCOME.**
> - [`0440`](../tasks/done/0440-when-yandex-games-is-working-again-the-flag-change-and-checks-blocked-by-its-outage/brief.md) appended at rank 37 — ⚠️ ADR-035 append
>   position, **not** a merit rank. **On merit it belongs directly above `0428`**: its first item (is Yandex back?) gates
>   `0428`'s flip. `🔲 Backlog`; it waits on Yandex Games recovering (outage noticed 2026-10-11).
> - It is a pointer list: `0428`, `0426`'s flag gate, `0439` (Backlog board; also needs the `0437` deploy), an optional
>   read-only server check, and watch items `0435`, `0411`, `0424`, `0394` found while filing. No other row changed.
> - ⚠️ This board's line-3 banner still reads `🔲 Backlog` (`select-active` reports no active sprint) — not changed here.
> - Nothing renumbered (ADR-035), nothing committed.

> 🆕 **Addendum — 2026-10-11, ~~newest (above all others)~~ (superseded as newest 2026-10-12): `0437` and `0436` closed (agent-closed); verify task `0439` filed on the Backlog board. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-11**, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> Verbatim: **"Close both (Recommended)"** — option text: *"The producer closes 0436 and 0437 (agent-closed) and files the
> 0437 live-check task for after the next deploy."*
>
> **OUTCOME.**
> - [`0436`](../tasks/done/0436-backup-dry-run-harness-fetch-the-minio-image-from-a-source-that-works-then-run-it-once/brief.md) → `✅ Done (agent-closed — not owner-verified)`. `0438` (Backlog board) unblocked.
> - [`0437`](../tasks/done/0437-ask-the-player-to-confirm-before-leaving-a-match-from-the-exit-button/brief.md) → `✅ Done (agent-closed — not owner-verified)`. ⚠️ **Built, not deployed** — code
>   uncommitted at close; the real Yandex interstitial ad was not tested locally.
> - Verify task [`0439`](../tasks/backlog/0439-verify-0437-live-exit-confirm-popup-inside-yandex-games/brief.md) filed on the
>   [Backlog board](backlog.md), noted as belonging at the **top of the next sprint** (build/verify split rule, owner ruling
>   2026-09-29). No next sprint board exists, so it is not on one yet. It does not block this sprint's deploy.
> - Nothing renumbered (ADR-035), nothing committed.

> 🆕 **Addendum — 2026-10-11, ~~newest (above all others)~~ (superseded as newest the same day): `0437` (exit confirm popup) and `0436` (backup dry-run image
> fix) moved in from the Backlog board, both `🔄 In progress`. ⚠️ This board's line-3 banner still reads `🔲 Backlog` —
> not changed here. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session on 2026-10-11**, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> Verbatim selections: **"0437 Exit confirm popup (Recommended)"** and **"0436 backup test fix"** — work to build now while
> waiting on Yandex infrastructure.
>
> **OUTCOME.**
> - [`0437`](../tasks/done/0437-ask-the-player-to-confirm-before-leaving-a-match-from-the-exit-button/brief.md) appended at rank 35, [`0436`](../tasks/done/0436-backup-dry-run-harness-fetch-the-minio-image-from-a-source-that-works-then-run-it-once/brief.md) at 36 — ⚠️ ADR-035 append positions, not merit
>   ranks. Both `🔄 In progress`, as relayed. Their Backlog-board rows are kept as `➡️ Moved`. `0437`'s five open questions
>   were ruled the same day (recorded in its brief).
> - ⚠️ **Odd, flagged, not fixed:** two tasks are `🔄 In progress` on a board whose line-3 banner reads `🔲 Backlog`, and
>   `dashboard.sh select-active` reports **no active sprint** (`active none`). Starting Sprint 8 (flipping the banner) is
>   the owner's call; nobody asked for it here.
> - Same day, follow-up `0438` (the restore drill seeds no `tester_role_snapshots` row) was filed on the Backlog board,
>   depending on `0436`.
> - Nothing renumbered (ADR-035), no folder moved, no mover run, nothing committed.

> 🆕 **Addendum — 2026-10-11, ~~newest (above all others)~~ (superseded as newest the same day): verify task `0433` (`0228`'s live check) closed (agent-closed). ⚠️ Partial coverage — no regression on the main paths, not proof under the targeted conditions. `0428` is now unblocked. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULING given in the `fkit lead` session on 2026-10-11**, relayed verbatim by `fkit-lead` to a
> spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.** Verbatim: *"I checked
> the main and easy points, but I didn't do something that I am thinking an overkill for us (phone join-close, etc.).
> Let's consider this check to be done and everything is ok"*.
>
> **OUTCOME.**
> - [`0433`](../tasks/done/0433-verify-0228-live-quick-leave-double-join-and-close-during-a-lobby-join/brief.md) closed `✅ Done (agent-closed — not owner-verified)` (rank 34). Game `0.0.163`
>   (includes `0228`). ⚠️ Checks (a), (b), (d) **not itemized**; (c) phone join-close **not run**; device, slow network,
>   5-minute wait and console lines **not recorded**. So it shows **no regression on the main paths**, not that the `0228`
>   fix works live under the conditions it targets. Server side (read-only, after the deploy): 0 error lines. Evidence in
>   the task's `worklog.md`.
> - [`0428`](../tasks/done/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md): **unblocked** — all five dependencies (`0376`, `0228`, `0381`, `0390`,
>   `0433`) are closed, all agent-closed. Status **unchanged** (`🔲 Backlog`): the console flip and its live check are still
>   the owner's to do. Notes added to its row and brief.
> - No row was renumbered (ADR-035).
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched; `0428` was **not** marked done; nothing
> committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

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
> - [`0428`](../tasks/done/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md): status
>   **unchanged** (`🔲 Backlog`). Of its dependencies, only [`0433`](../tasks/done/0433-verify-0228-live-quick-leave-double-join-and-close-during-a-lobby-join/brief.md)
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
> - [`0428`](../tasks/done/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md) depended on
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
> - [`0433`](../tasks/done/0433-verify-0228-live-quick-leave-double-join-and-close-during-a-lobby-join/brief.md) filed,
>   `🔲 Backlog`, owner seat `fkit-producer`, **executed by the owner (human)**. ⚠️ Priority 34 is append rank, NOT a
>   merit ranking — flagged for owner confirmation. **On merit this belongs directly above `0428`**, because `0428` waits
>   for it. Depends on `0228` committed and deployed (weekend slot unless the owner says otherwise).
> - [`0428`](../tasks/done/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md): `0433`
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
> - [`0430`](../tasks/done/0430-verify-0425-live-deploy-tester-roles-and-apply-earned-citizen-to-the-tester/brief.md) filed, `🔲 Backlog`, owner seat `fkit-producer`, **executed by the owner
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
> - [`0429`](../tasks/done/0429-verify-0415-live-no-native-browser-tooltips-inside-the-yandex-games-iframe/brief.md) filed,
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
> - **[`0428`](../tasks/done/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md) filed and
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
> - **Dependencies:** depends on nothing. Blocks [`0420`](../tasks/done/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)
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
>   [`0420`](../tasks/done/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)
>   items 2 and 5 now describe the `0421` popup; old wording kept struck through. Item 3 unchanged (its quoted text did
>   not change).
> - ❓ **Open owner question:** keep `0422` separate, or fold it into `0420` (one checklist, one sitting)? Not folded —
>   `0420`'s scope is an owner ruling. Recorded in `0422`'s *Notes*.
>   ✅ **ANSWERED 2026-10-09 — OWNER RULING *"Fold into 0420 (Recommended)"*** (the owner's own selection, live via
>   `AskUserQuestion` in the coordinating session, relayed to a spawned `fkit-producer`; ⛔ not producer precedent).
>   `0422`'s checks were added to [`0420`](../tasks/done/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md) as **item 8**, and `0422`
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
> - [`0420`](../tasks/done/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md)
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
- 2026-10-11 — `0433` closed (agent-closed — not owner-verified) on owner ruling *"Let's consider this check to be done and everything is ok"*: checks not itemized, (c) phone join-close not run, slow network / 5-minute wait not recorded — no regression on the main paths, not proof under the targeted conditions; `0428` unblocked, its status unchanged. See the addendum above.
- 2026-10-13 — task `0451` (private-lobby funnel analytics events) filed on an owner ruling (*"Brief a task for the current sprint ot add missing events"*) and appended at rank 45 (ADR-035 append rank; on merit directly above `0426`); joins `0426`'s Timing-rule wait set. See the addendum above.
