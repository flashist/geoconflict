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
>   sprint and [Sprint 7](plan-sprint-7.md) is still `🔲 Backlog`.
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
| 🔲 Backlog | 1 *(append rank 5, then moved to the top — placement on the owner's standing build/verify-split rule (2026-09-29), *"verify task on top of the next sprint"*, applied at `0367`'s close on 2026-10-02 on the OWNER RULING *"Close + file both tasks (Recommended)"* (live `AskUserQuestion`, relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`); ⛔ not producer precedent. Not a merit rank against `0363` / `0358` — independent owner checks; but this one has a **fixed date** (Step 1 runs on deploy day). See the 2026-10-02 `0370` addendum below.)* | **Verify 0367 in production — 1-minute public lobbies vs the 2-minute baseline** *(🆕 **FILED 2026-10-02** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the owner's close ruling and standing build/verify-split rule, relayed by `fkit-lead`: `0367` closes on build + review, this is its verify. Read-only: re-run the lone-player query **on deploy day** for the 7 days before (plan ruling Q1, 2026-10-02); owner reads GameAnalytics `Game:Mode:Multiplayer` entries/day; snapshot on day 4, decision numbers on day 7 (plan ruling Q2; Uptrace retention not changed — observed ~14 days, not 7). Keep if matches/day hold or rise and the lone-player share does not jump noticeably (ruling Q1, 2026-10-01); reference 12.4 % for 2026-09-25..10-01. Watch: slow devices get half the preload time; join-ad vs end-of-match ad shift is not separable (`Ad:Interstitial` has no placement field). ⚠️ **Preconditions: `0367` committed and deployed** (game-server weekend slot). ⚠️ **Step 1 is date-bound to the deploy, not to Sprint 8 starting.** ⚠️ **Does not block Sprint 7's deploy.**)* | [`0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline`](../tasks/backlog/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md) |
| ➡️ Moved to [Sprint 7](plan-sprint-7.md) — priority 36 *(2026-10-04 — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Pull into Sprint 7 (Recommended)"*. The status this row carried (~~🔲 Backlog~~) was copied verbatim to Sprint 7, appended at 36 (append rank, the producer's placement — not owner-ruled; on merit directly above `0340`). This row's rank 2 is kept, not renumbered, and no other row here moved (ADR-035). See the 2026-10-04 `0373` addendum directly below this table.)* | 2 *(was ~~6~~ — ✅ **OWNER-RULED placement, 2026-10-02**: moved from append rank 6 to rank 2, directly below `0370`, on the OWNER RULING verbatim *"Move to rank 2 (Recommended)"* (live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent). `0363` 2 → 3, `0358` 3 → 4, `0351` 4 → 5, `0343` 5 → 6 (all open; no closed row on this board). The owner-confirmation flag in the struck text that follows is resolved. See the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that (superseded, kept struck): ~~append rank — ⚠️ **NOT the owner-approved placement** — flagged for owner confirmation. The owner approved this task for *"the top of the next sprint"* (2026-10-02, relayed by `fkit-lead`; ⛔ not producer precedent). `0370` keeps rank 1 by its earlier ruling. **On merit this belongs directly below `0370`** (rank 2), because it is the next step on the chain blocking `0340`; it was appended, not inserted (ADR-035), since rank 2 would renumber four open rows and a spawned producer does not re-rank. **Read as top group, directly below `0370`, whatever this number says**, until the owner confirms the exact rank. ⏳ Cannot start before `0372` + `0366` are deployed and 5–7 days of data incl. a weekend evening exist.~~ ⏳ Still cannot start before `0372` + `0366` are deployed and 5–7 days of data incl. a weekend evening exist.)* | **Read the stale-login data and choose the fix** *(🆕 **FILED 2026-10-02** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given via `AskUserQuestion` in the live `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. Reads `0366`'s server age brackets and [`0372`](../tasks/done/0372-client-diagnostics-for-stale-login-signatures/brief.md)'s client events against a prediction table written up front; the owner chooses one fix, the expected stale share after it, and the S2-exit "good enough" threshold (OWNER RULING *"Decide it with the data (Recommended)"*). Owner-participation task. See the 2026-10-02 `0373` addendum below this table.)* | [`0373-read-the-stale-login-data-and-choose-the-fix`](../tasks/done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 3 *(was ~~2~~ — moved down one by the OWNER-RULED move of `0373` to rank 2, directly below `0370`, 2026-10-02 — verbatim *"Move to rank 2 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent; see the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that: was ~~1~~ — moved down one by the placement of verify task `0370` (for `0367`) at the top, 2026-10-02, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling *"Close + file both tasks (Recommended)"*, relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-02 `0370` addendum below. Before that: append rank 4, then moved to the top — placement on the owner's standing build/verify-split rule (2026-09-29), *"verify task on top of the next sprint"*, applied at `0356`'s close on 2026-10-01 by `fkit-lead` (driving `/fkit-sprint-ship-loop`); ⛔ not producer precedent. Not a merit rank against `0358` — both are short, independent owner checks on different boxes. See the 2026-10-01 `0363` addendum below.)* | **Verify 0356 in production — the telemetry deploy is tagged with its version name, everywhere it should be** *(🆕 **FILED 2026-10-01** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the owner's standing build/verify-split rule, relayed by `fkit-lead`: `0356` closes on local proof (build), this is its verify. Owner-run after the weekend telemetry deploy: the deploy printed a `<base>-telemetry.<N>` name and succeeded; the annotated git tag is on origin at the deployed commit; the box marker `/opt/uptrace/deployed-version` and the local deploy record show the same version and commit; Uptrace still answers. ⚠️ **Preconditions: `0356` committed** (until then the telemetry deploy refuses to run — owner ruling Q1) **and deployed.** ⚠️ **Does not block Sprint 7's deploy.**)* | [`0363-verify-0356-in-production-the-telemetry-deploy-is-tagged-with-its-version`](../tasks/done/0363-verify-0356-in-production-the-telemetry-deploy-is-tagged-with-its-version/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 4 *(was ~~3~~ — moved down one by the OWNER-RULED move of `0373` to rank 2, directly below `0370`, 2026-10-02 — verbatim *"Move to rank 2 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent; see the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that: was ~~2~~ — moved down one by the placement of verify task `0370` (for `0367`) at the top, 2026-10-02, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling *"Close + file both tasks (Recommended)"*, relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-02 `0370` addendum below. Before that: was ~~1~~ — moved down one by the placement of verify task `0363` (for `0356`) at the top, 2026-10-01, on the owner's standing build/verify-split rule relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-01 `0363` addendum below. Before that: append rank 3, then moved to the top — placement on the owner's standing build/verify-split rule (2026-09-29), *"verify task on top of the next sprint"*, applied at `0355`'s close on 2026-09-30 by `fkit-lead` (driving `/fkit-sprint-ship-loop`); ⛔ not producer precedent. Not a merit rank against `0351` — both are short, independent owner checks. See the 2026-09-30 `0358` addendum below.)* | **Verify 0355 in production — the profile deploy is tagged with its version name, everywhere it should be** *(🆕 **FILED 2026-09-30** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the owner's standing build/verify-split rule, relayed by `fkit-lead`: `0355` closes on local proof (build), this is its verify. Owner-run after the weekend profile deploy (next slot 2026-10-03/04): the deploy printed a `<base>-profile.<N>` name and succeeded; `/health` reports that name; the annotated git tag is on origin at the deployed commit and the registry holds the name; telemetry `service.version` shows it if observable. ⚠️ **Preconditions: `0355` committed** (until then the profile deploy refuses to run) **and deployed.** 🚨 **The first tagged profile deploy must be the one that first ships `0309`'s log line; no second profile deploy before `0297` §1 reads it; a tagging fault is fixed with a git command, never a redeploy.** ⚠️ **Does not block Sprint 7's deploy.**)* | [`0358-verify-0355-in-production-the-profile-deploy-is-tagged-with-its-version`](../tasks/done/0358-verify-0355-in-production-the-profile-deploy-is-tagged-with-its-version/brief.md) |
| 🔲 Backlog | 5 *(was ~~4~~ — moved down one by the OWNER-RULED move of `0373` to rank 2, directly below `0370`, 2026-10-02 — verbatim *"Move to rank 2 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent; see the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that: was ~~3~~ — moved down one by the placement of verify task `0370` (for `0367`) at the top, 2026-10-02, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling *"Close + file both tasks (Recommended)"*, relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-02 `0370` addendum below. Before that: was ~~2~~ — moved down one by the placement of verify task `0363` (for `0356`) at the top, 2026-10-01, on the owner's standing build/verify-split rule relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-01 `0363` addendum below. Before that: was ~~1~~ — moved down one by the placement of verify task `0358` at the top, 2026-09-30, on the owner's standing build/verify-split rule relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-09-30 `0358` addendum below. Before that: was ~~2~~, append rank — owner-ruled placement 2026-09-30: the standing build/verify-split rule, *"verify task on top of the next sprint"*, applied to `0035` (*"File a verify task for Sprint 8"*); OWNER RULING relayed by `fkit-lead`, ⛔ not producer precedent. See the 2026-09-30 addendum below.)* | **Verify 0035 on the dev box — a public match starts, and each map file downloads once** *(🆕 **FILED 2026-09-30** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`: `0035` closes on local proof (build), this is its verify. Owner-run, read-only: join a public match on the dev box → it starts, and each map file is requested once after the join, not twice. ⚠️ **Precondition: `0035` deployed to the dev box** (weekend deploy slot). ⚠️ **Does not block Sprint 7's deploy.**)* | [`0351-verify-0035-on-the-dev-box-a-public-match-starts-and-each-map-file-downloads-once`](../tasks/backlog/0351-verify-0035-on-the-dev-box-a-public-match-starts-and-each-map-file-downloads-once/brief.md) |
| 🔲 Backlog | 6 *(was ~~5~~ — moved down one by the OWNER-RULED move of `0373` to rank 2, directly below `0370`, 2026-10-02 — verbatim *"Move to rank 2 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent; see the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that: was ~~4~~ — moved down one by the placement of verify task `0370` (for `0367`) at the top, 2026-10-02, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling *"Close + file both tasks (Recommended)"*, relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-02 `0370` addendum below. Before that: was ~~3~~ — moved down one by the placement of verify task `0363` (for `0356`) at the top, 2026-10-01, on the owner's standing build/verify-split rule relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-01 `0363` addendum below. Before that: was ~~2~~ — moved down one by the placement of verify task `0358` at the top, 2026-09-30; see the 2026-09-30 `0358` addendum below. Before that: was ~~1~~ — moved down one by the OWNER-RULED placement of `0351` at the top, 2026-09-30; relayed by `fkit-lead`, ⛔ not producer precedent; see the 2026-09-30 addendum below. First row of a new board — a position, not a merit rank; the owner ranks this board)* | **Discussion: eight parked features for Sprint 8 — paid-citizenship perks (paid map packs, nickname styling, map voting, premium replays, custom uploaded flags) and more (leaderboard rewards, coin economy, clans)** *(📌 **Retitled later on 2026-09-29:** was *"five parked features tied to paid citizenship …"* — **OWNER RULING C** (relayed by `fkit-lead`), verbatim *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that to the Sprint 8."*, moved Sprint 5 plan Tasks 10, 11, 12 in from `0342`; see the ruling C addendum below. The text that follows is kept as written. 🆕 **FILED 2026-09-29** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. A discussion agenda, **not** an implementation plan. Replaces Sprint 6's brief-less rows for plan Task 2 (Paid Campaign Map Packs) and Sprint 5 plan Tasks 8a, 14, 13, 15; their prose is copied verbatim into the brief. Twin: [`0342`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) on the [Backlog board](backlog.md). See the 2026-09-29 addendum below.)* | [`0343-discussion-parked-features-tied-to-paid-citizenship`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) |
| 🔲 Backlog | 7 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0370`**, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"* and `0370` already holds rank 1. Not placed there: ranks 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done), and moving this row above them would renumber them — ADR-035 forbids that *"not even under an owner ruling"*; a spawned producer also never re-ranks. Appended instead (the reversible branch). See the 2026-10-04 `0390` addendum below.)* | **Verify 0377 live — an abandoned private lobby ends after 30 minutes, and an occupied one does not** *(🆕 **FILED 2026-10-04** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at `0377`'s close, on the owner's standing build/verify-split rule (2026-09-29), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent. After the game-server deploy: an abandoned test private lobby is gone 30 min after the last person left, the server log shows `private lobby ended, no client connected` with `anyClientJoined`, and an occupied lobby is NOT ended. Read-only agent log check, or owner-run. Does **not** block Sprint 7's deploy.)* | [`0390-verify-0377-live-an-abandoned-private-lobby-ends-after-30-minutes-and-an-occupied-one-does-not`](../tasks/backlog/0390-verify-0377-live-an-abandoned-private-lobby-ends-after-30-minutes-and-an-occupied-one-does-not/brief.md) |
| ➡️ Moved to [Sprint 7](plan-sprint-7.md) — priority 44 *(2026-10-05 — OWNER RULING given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move to Sprint 7 (Recommended)"* — its first read is needed before the 10/11 Oct slot, a Sprint 7 deploy. The status this row carried (~~🔲 Backlog~~) was copied verbatim to Sprint 7, appended at 44 (ADR-035 append rank — a position, not a merit rank). This row's rank 8 is kept, not renumbered, and no other row here moved (ADR-035). Same day, by OWNER RULING *"Rename and fix links"*, its folder was renamed to `0392-read-the-post-0391-login-numbers-before-the-0340-deploy` (`git mv`, backlog → backlog; not a mover) and every link repointed. See the 2026-10-05 *`0392` move* addendum directly below this table.)* | 8 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0370`**, because the owner placed it at the top of this sprint (*"Fix: Sprint 7, check: Sprint 8 (Recommended)"*, 2026-10-05, the 2026-09-29 build/verify rule) and `0370` holds rank 1 by an earlier ruling; it also has the most work waiting behind it (`0340` and six more). Not placed there: "top" conflicts with ADR-035 — ranks 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done), and a new row always appends. Read it as top group. See the 2026-10-05 `0392` addendum below.)* | **Verify 0391 live — stale login share at most 5% over 7 days (the S2-exit re-check)** *(🆕 **FILED 2026-10-05** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given live 2026-10-05 via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. Threshold, verbatim: *"At most 5% (Recommended)"*. ~~After `0391`'s profile deploy, read the server stale share over 7 days; **pass = ≤5%**.~~ Read-only — owner, or an agent with the owner's approval for read-only SSH. ~~On pass `0340` may start, but **still needs the owner's explicit OK to enforce** ([ADR-121](../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md) Decision 4).~~ 📌 **RE-SCOPED 2026-10-05 (OWNER RULINGS relayed by `fkit-lead`, ⛔ not producer precedent; [ADR-122](../knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md))**: no 7-day window, no ≤5% bar, gates nothing on its own. After `0391`'s profile deploy (**Tue 6 Oct**), read stale share, `ok`, `id_mismatch`, `bad_payload` over whatever data exists **whenever the owner needs them** — first before the 10/11 Oct slot (`0340`'s deploy), again before each later deploy that reads `verified` — and record the owner's call each time. `0340` may start now; its deploy still needs the owner's explicit OK to enforce. ⚠️ First read is needed before a Sprint 7 deploy while this row is on Sprint 8 — move put to the owner, **not** done. Does **not** block [Sprint 7](plan-sprint-7.md)'s deploy.)* | [`0392-read-the-post-0391-login-numbers-before-the-0340-deploy`](../tasks/backlog/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) |
| ➡️ Moved to [Sprint 7](plan-sprint-7.md) — priority 45 *(2026-10-05 — OWNER RULING given live 2026-10-05 via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim *"Move to Sprint 7 (Recommended)"* — its deploy is the 10/11 Oct slot, during Sprint 7. The status this row carried (~~🔲 Backlog~~) was copied verbatim to Sprint 7, appended at 45 (ADR-035 append rank — a position, not a merit rank). This row's rank 9 is kept, not renumbered, and no other row here moved (ADR-035). See the 2026-10-05 *`0395` move* addendum directly below this table.)* | 9 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0370`**, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"*, `0370` already holds rank 1, and this task has a fixed date (the 10/11 Oct profile slot at the earliest). Not placed there: ranks 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done) — ADR-035 forbids renumbering them *"not even under an owner ruling"*; a spawned producer never re-ranks. Appended instead. See the 2026-10-05 `0395` addendum below.)* | **Verify 0340 live — deploy S3a and confirm verified logins in production** *(🆕 **FILED 2026-10-05** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS at `0340`'s plan gate (live `AskUserQuestion`, relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent): Q1 *"Split it (Recommended)"* — `0340` closes on build + review, this task carries the deploy, live check and ADR-113 note; Q2 *"I'll check once (Rec)"*. Gate: `0391` live, the owner's by-eye look at the post-`0391` numbers (`0392`, ADR-122), and a separate explicit owner approval to enforce. Profile server alone (not with `0250` S3b), 10/11 Oct at the earliest, outside 02:00–03:15 UTC; delta check; read-only watch; owner's ~2-minute DevTools check reporting only `vfy: true/false` (token never pasted); ⛔ one-way rollback — target the `0391` image, never pre-S2; then `fkit-architect` applies the ADR-113 note; runbook rollback-target line updated. Depends on `0340` and `0392`. ⚠️ **Does not block Sprint 7's deploy**; no Sprint 7 task was made to depend on it.)* | [`0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production`](../tasks/backlog/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) |
| 🔲 Backlog | 10 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0370`**, because the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"* and `0370` already holds rank 1. Not placed there: ranks 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done) — ADR-035 forbids renumbering them *"not even under an owner ruling"*; a spawned producer never re-ranks. Appended instead. Read it as top group. See the 2026-10-06 `0396` addendum below.)* | **Verify 0250 S3b live — deploy the verified owner view and confirm it in production** *(🆕 **FILED 2026-10-06** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at [`0250`](../tasks/done/0250-authenticated-profile-read-for-paid-entitlement/brief.md)'s close, on the owner's standing build/verify-split rule (2026-09-29) as applied by `0250`'s owner-approved `plan-s3b.md` § 6 (2026-10-06), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent. Gates in order: `0340` deployed in its own earlier slot → [`0395`](../tasks/backlog/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) confirms `vfy: true` live → the owner's ADR-122 look at the post-`0391` numbers → a weekend slot (earliest: after 10/11 Oct). Then a DevTools check: a verified paid test account's `GET /v1/profile` shows `is_paid_citizen: true`; a `vfy:false` session shows the S1 view — true/false only, never a token. Depends on `0250` (build) and `0395`. ⚠️ Open: Sprint 7 vs 8 placement; which test sessions exist.)* | [`0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production`](../tasks/backlog/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md) |
| 🔲 Backlog | 11 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0396`**, because it cannot start until `0396` has confirmed the verified owner view live, and the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"*. Appending lands it directly below `0396` already; ADR-035, nothing renumbered. See the 2026-10-06 `0398` addendum below.)* | **Verify 0248 live — paid citizens see no interstitial ads in production** *(🆕 **FILED 2026-10-06** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at [`0248`](../tasks/done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md)'s close, on the owner's standing build/verify-split rule (2026-09-29), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent. Gates: [`0396`](../tasks/backlog/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md) passed → [`0397`](../tasks/done/0397-show-players-whether-their-session-is-verified/brief.md) live or in the same deploy (owner ruling R3) → `0248` committed (owner's ask only) → a weekend slot. Owner's live checks: a verified paid account sees no interstitial at the six placements and `Ad:InterstitialSuppressed:PaidCitizen` fires; a non-paid and an earned-only account still get ads requested; `citizenship_ui` flipped off ⇒ ads return on a fresh session. Yes/no and counts only, never a token. Depends on `0248`, `0396`, `0397`. ⚠️ Open: Sprint 7 vs 8 placement; which test accounts exist; whether a production flag flip is acceptable.)* | [`0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production`](../tasks/backlog/0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md) |
| 🔲 Backlog | 12 *(append rank — ⚠️ **append rank, NOT a merit ranking — flagged for owner confirmation.** **On merit this belongs directly below `0396`** (beside `0398`), because it cannot start until `0396` has confirmed the verified owner view live, and the owner's standing build/verify-split rule (2026-09-29) puts a verify task *"on top of the next sprint"*. "Top" conflicts with ADR-035: ranks 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done), and a new row always appends; appending lands it directly below `0398`, in the right group. Nothing renumbered. See the 2026-10-06 `0400` addendum below.)* | **Verify 0397 live: the session-status line shows the right state in production** *(🆕 **FILED 2026-10-06** by a spawned `fkit-producer` with no owner channel (ADR-021/037), at [`0397`](../tasks/done/0397-show-players-whether-their-session-is-verified/brief.md)'s close, on the owner's standing build/verify-split rule (2026-09-29), relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`; ⛔ not producer precedent. Gates: [`0395`](../tasks/backlog/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) passed → [`0396`](../tasks/backlog/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md) passed or same slot, server first (owner ruling Q4) → `0397` committed (owner's ask only) → a weekend slot. Owner's live checks on a real build: "Checking…" briefly, never a login button to a logged-in player; verified paid citizen sees "✓ Verified…"; unverified citizen sees the neutral not-confirmed text, no button; unverified non-citizen sees nothing new; forced read failure shows "couldn't load" + Restart (reloads only on the start screen; "Still not working" after a restart that didn't help); RU text; `citizenship_ui` off hides everything; the three `Citizenship:Status:*` events arrive in GameAnalytics. Yes/no and counts only, never a token. Run with [`0398`](../tasks/backlog/0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md) in the same slot. Depends on `0397`, `0395`, `0396`. ⚠️ Open: Sprint 7 vs 8 placement; which test accounts exist; how to get an unverified session in production; whether a production flag flip is acceptable.)* | [`0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production`](../tasks/backlog/0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md) |

> 🆕 **Addendum — 2026-10-06, newest (above all others): verify task `0400` (for `0397`) filed and APPENDED at rank 12 — NOT at the top. Read the authority before the outcome.**
>
> **AUTHORITY.** The owner's **standing build/verify-split rule (2026-09-29)** — *close the build task on build +
> review; file a verify task at the top of the NEXT sprint; it must not block the current sprint's deploy*. Relayed by
> `fkit-lead` (driving `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` holding **no owner channel**
> (ADR-021/037). ⛔ **Not producer precedent.**
>
> **OUTCOME.**
> - [`0397`](../tasks/done/0397-show-players-whether-their-session-is-verified/brief.md) closed on
>   [Sprint 7](plan-sprint-7.md) `(agent-closed — not owner-verified)`; its deploy and live check are
>   [`0400`](../tasks/backlog/0400-verify-0397-live-the-session-status-line-shows-the-right-state-in-production/brief.md), the row above.
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
>   [Sprint 7](plan-sprint-7.md) `(agent-closed — not owner-verified)`; its deploy and live check are
>   [`0398`](../tasks/backlog/0398-verify-0248-live-paid-citizens-see-no-interstitial-ads-in-production/brief.md),
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
>   [Sprint 7](plan-sprint-7.md) `(agent-closed — not owner-verified)`; its deploy and live check are
>   [`0396`](../tasks/backlog/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md),
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

> 🆕 **Addendum — 2026-10-05, final of the day, newest (above all others): `0395` MOVED to [Sprint 7](plan-sprint-7.md). Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULINGS given live 2026-10-05 via `AskUserQuestion`** in the `fkit lead` session, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> Verbatim: placement *"Move to Sprint 7 (Recommended)"*; on `0250` S3b / `0319` / `0332` / `0323`, *"Note only (Recommended)"*.
>
> **OUTCOME.**
> - [`0395`](../tasks/backlog/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) row above
>   is now `➡️ Moved to Sprint 7 — priority 45`; its rank 9 kept (ADR-035). On [Sprint 7](plan-sprint-7.md) it is
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
> - [`0395`](../tasks/backlog/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md)
>   filed, `🔲 Backlog`, owner `fkit-producer` (deploy, enforce approval and the `vfy` check are the owner's).
>   **Appended at rank 9** (ADR-035: append, never insert). **No row moved or was renumbered.**
> - ⚠️ Priority 9 is append rank, NOT a merit ranking — flagged for owner confirmation.
>   **On merit this belongs directly below `0370`**, because the rule says top of the next sprint and this task has a
>   fixed date. Not placed there for the same reason as `0390` / `0392`: ranks 2–4 are closed rows.
> - **Depends on** `0340` ([Sprint 7](plan-sprint-7.md)) and `0392` ([Sprint 7](plan-sprint-7.md)) — the normal
>   direction (a later board waits on an earlier one). **No Sprint 7 task was made to depend on it**, per `fkit-lead`'s
>   instruction; whether `0250` S3b / `0319` / `0332` / `0323` should, for their deploys, is put to the owner.
> - ⚠️ **Placement open, not moved.** Its deploy is the 10/11 Oct slot, during Sprint 7, while this board is not
>   started. Whether it belongs on Sprint 7 instead (as `0392` was moved) is put to the owner.
>
> ⛔ **WHAT DID NOT HAPPEN.** Line-3 banner not touched (still `🔲 Backlog`); no other row touched; no mover run;
> nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> 🆕 **Addendum — 2026-10-05, latest, newest (above all others): `0392` MOVED to [Sprint 7](plan-sprint-7.md), folder renamed, closes after the first look. Read the authority before the outcome.**
>
> **AUTHORITY.** **OWNER RULINGS given live 2026-10-05 via `AskUserQuestion`** in the `fkit lead` session, relayed by
> `fkit-lead` to a spawned `fkit-producer` holding **no owner channel** (ADR-021/037). ⛔ **Not producer precedent.**
> Verbatim: placement *"Move to Sprint 7 (Recommended)"*; when it closes *"After the first look (Rec)"*; folder
> *"Rename and fix links"*.
>
> **OUTCOME.**
> - [`0392`](../tasks/backlog/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) row above is now `➡️ Moved to Sprint 7 — priority 44`; its rank 8
>   kept (ADR-035). On [Sprint 7](plan-sprint-7.md) it is **appended at 44 — append rank, not a merit rank**.
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
> - [`0392`](../tasks/backlog/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md): reads the
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
> - [`0392`](../tasks/backlog/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md)
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
>   ([Sprint 7](plan-sprint-7.md), rank 43) shipped in a profile deploy plus 7 days of data — earliest read 17/18 Oct if
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
> - [`0390`](../tasks/backlog/0390-verify-0377-live-an-abandoned-private-lobby-ends-after-30-minutes-and-an-occupied-one-does-not/brief.md)
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
>   [Sprint 7](plan-sprint-7.md)'s deploy.**
>
> ⛔ **WHAT DID NOT HAPPEN.** This board's line-3 banner was **not** touched (still `🔲 Backlog`); no mover skill was run
> for this filing; nothing committed or pushed; nothing under `ai-agents/wiki-vault/` touched.

> ➡️ **Addendum — 2026-10-04, newest (above all others): task `0373` MOVED OUT TO [SPRINT 7](plan-sprint-7.md). Read the authority before the outcome.**
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
> - [`0370`](../tasks/backlog/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md)
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
>   at `0356`'s plan gate) — and deployed in the weekend slot. **Does not block [Sprint 7](plan-sprint-7.md)'s deploy.**
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
>   second profile deploy may come before `0297` §1 reads it. **Does not block [Sprint 7](plan-sprint-7.md)'s deploy.**
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
> - [`0351`](../tasks/backlog/0351-verify-0035-on-the-dev-box-a-public-match-starts-and-each-map-file-downloads-once/brief.md)
>   filed, `🔲 Backlog`. It was **appended at rank 2** (ADR-035: append, never insert), then **moved to rank 1** within
>   this board's contiguous run of open rows by the ruling above. `0343` moved from 1 to 2 (an open row). **No closed
>   row exists on this board, so none was renumbered.** `0343`'s brief `## Priority` updated to match, with a dated note.
> - ⚠️ Priority 1 here is **owner-ruled placement, not a merit ranking against `0343`**. The two do not compete:
>   `0351` is a short owner-run check, `0343` a discussion. To undo, swap the two rank cells back (one edit).
> - Precondition: [`0035`](../tasks/done/0035-worker-init-timeout-map-refetch/brief.md) (closed 2026-09-30,
>   agent-closed) deployed to the dev box. **Does not block [Sprint 7](plan-sprint-7.md)'s deploy.**
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
