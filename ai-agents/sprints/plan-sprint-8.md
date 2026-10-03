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

---

## Status

| Status | Priority | Task | Brief |
|---|---|---|---|
| 🔲 Backlog | 1 *(append rank 5, then moved to the top — placement on the owner's standing build/verify-split rule (2026-09-29), *"verify task on top of the next sprint"*, applied at `0367`'s close on 2026-10-02 on the OWNER RULING *"Close + file both tasks (Recommended)"* (live `AskUserQuestion`, relayed by `fkit-lead` driving `/fkit-sprint-ship-loop`); ⛔ not producer precedent. Not a merit rank against `0363` / `0358` — independent owner checks; but this one has a **fixed date** (Step 1 runs on deploy day). See the 2026-10-02 `0370` addendum below.)* | **Verify 0367 in production — 1-minute public lobbies vs the 2-minute baseline** *(🆕 **FILED 2026-10-02** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the owner's close ruling and standing build/verify-split rule, relayed by `fkit-lead`: `0367` closes on build + review, this is its verify. Read-only: re-run the lone-player query **on deploy day** for the 7 days before (plan ruling Q1, 2026-10-02); owner reads GameAnalytics `Game:Mode:Multiplayer` entries/day; snapshot on day 4, decision numbers on day 7 (plan ruling Q2; Uptrace retention not changed — observed ~14 days, not 7). Keep if matches/day hold or rise and the lone-player share does not jump noticeably (ruling Q1, 2026-10-01); reference 12.4 % for 2026-09-25..10-01. Watch: slow devices get half the preload time; join-ad vs end-of-match ad shift is not separable (`Ad:Interstitial` has no placement field). ⚠️ **Preconditions: `0367` committed and deployed** (game-server weekend slot). ⚠️ **Step 1 is date-bound to the deploy, not to Sprint 8 starting.** ⚠️ **Does not block Sprint 7's deploy.**)* | [`0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline`](../tasks/backlog/0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md) |
| 🔲 Backlog | 2 *(was ~~6~~ — ✅ **OWNER-RULED placement, 2026-10-02**: moved from append rank 6 to rank 2, directly below `0370`, on the OWNER RULING verbatim *"Move to rank 2 (Recommended)"* (live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent). `0363` 2 → 3, `0358` 3 → 4, `0351` 4 → 5, `0343` 5 → 6 (all open; no closed row on this board). The owner-confirmation flag in the struck text that follows is resolved. See the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that (superseded, kept struck): ~~append rank — ⚠️ **NOT the owner-approved placement** — flagged for owner confirmation. The owner approved this task for *"the top of the next sprint"* (2026-10-02, relayed by `fkit-lead`; ⛔ not producer precedent). `0370` keeps rank 1 by its earlier ruling. **On merit this belongs directly below `0370`** (rank 2), because it is the next step on the chain blocking `0340`; it was appended, not inserted (ADR-035), since rank 2 would renumber four open rows and a spawned producer does not re-rank. **Read as top group, directly below `0370`, whatever this number says**, until the owner confirms the exact rank. ⏳ Cannot start before `0372` + `0366` are deployed and 5–7 days of data incl. a weekend evening exist.~~ ⏳ Still cannot start before `0372` + `0366` are deployed and 5–7 days of data incl. a weekend evening exist.)* | **Read the stale-login data and choose the fix** *(🆕 **FILED 2026-10-02** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given via `AskUserQuestion` in the live `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. Reads `0366`'s server age brackets and [`0372`](../tasks/done/0372-client-diagnostics-for-stale-login-signatures/brief.md)'s client events against a prediction table written up front; the owner chooses one fix, the expected stale share after it, and the S2-exit "good enough" threshold (OWNER RULING *"Decide it with the data (Recommended)"*). Owner-participation task. See the 2026-10-02 `0373` addendum below this table.)* | [`0373-read-the-stale-login-data-and-choose-the-fix`](../tasks/backlog/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 3 *(was ~~2~~ — moved down one by the OWNER-RULED move of `0373` to rank 2, directly below `0370`, 2026-10-02 — verbatim *"Move to rank 2 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent; see the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that: was ~~1~~ — moved down one by the placement of verify task `0370` (for `0367`) at the top, 2026-10-02, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling *"Close + file both tasks (Recommended)"*, relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-02 `0370` addendum below. Before that: append rank 4, then moved to the top — placement on the owner's standing build/verify-split rule (2026-09-29), *"verify task on top of the next sprint"*, applied at `0356`'s close on 2026-10-01 by `fkit-lead` (driving `/fkit-sprint-ship-loop`); ⛔ not producer precedent. Not a merit rank against `0358` — both are short, independent owner checks on different boxes. See the 2026-10-01 `0363` addendum below.)* | **Verify 0356 in production — the telemetry deploy is tagged with its version name, everywhere it should be** *(🆕 **FILED 2026-10-01** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the owner's standing build/verify-split rule, relayed by `fkit-lead`: `0356` closes on local proof (build), this is its verify. Owner-run after the weekend telemetry deploy: the deploy printed a `<base>-telemetry.<N>` name and succeeded; the annotated git tag is on origin at the deployed commit; the box marker `/opt/uptrace/deployed-version` and the local deploy record show the same version and commit; Uptrace still answers. ⚠️ **Preconditions: `0356` committed** (until then the telemetry deploy refuses to run — owner ruling Q1) **and deployed.** ⚠️ **Does not block Sprint 7's deploy.**)* | [`0363-verify-0356-in-production-the-telemetry-deploy-is-tagged-with-its-version`](../tasks/done/0363-verify-0356-in-production-the-telemetry-deploy-is-tagged-with-its-version/brief.md) |
| ✅ Done (agent-closed — not owner-verified) | 4 *(was ~~3~~ — moved down one by the OWNER-RULED move of `0373` to rank 2, directly below `0370`, 2026-10-02 — verbatim *"Move to rank 2 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent; see the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that: was ~~2~~ — moved down one by the placement of verify task `0370` (for `0367`) at the top, 2026-10-02, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling *"Close + file both tasks (Recommended)"*, relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-02 `0370` addendum below. Before that: was ~~1~~ — moved down one by the placement of verify task `0363` (for `0356`) at the top, 2026-10-01, on the owner's standing build/verify-split rule relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-01 `0363` addendum below. Before that: append rank 3, then moved to the top — placement on the owner's standing build/verify-split rule (2026-09-29), *"verify task on top of the next sprint"*, applied at `0355`'s close on 2026-09-30 by `fkit-lead` (driving `/fkit-sprint-ship-loop`); ⛔ not producer precedent. Not a merit rank against `0351` — both are short, independent owner checks. See the 2026-09-30 `0358` addendum below.)* | **Verify 0355 in production — the profile deploy is tagged with its version name, everywhere it should be** *(🆕 **FILED 2026-09-30** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on the owner's standing build/verify-split rule, relayed by `fkit-lead`: `0355` closes on local proof (build), this is its verify. Owner-run after the weekend profile deploy (next slot 2026-10-03/04): the deploy printed a `<base>-profile.<N>` name and succeeded; `/health` reports that name; the annotated git tag is on origin at the deployed commit and the registry holds the name; telemetry `service.version` shows it if observable. ⚠️ **Preconditions: `0355` committed** (until then the profile deploy refuses to run) **and deployed.** 🚨 **The first tagged profile deploy must be the one that first ships `0309`'s log line; no second profile deploy before `0297` §1 reads it; a tagging fault is fixed with a git command, never a redeploy.** ⚠️ **Does not block Sprint 7's deploy.**)* | [`0358-verify-0355-in-production-the-profile-deploy-is-tagged-with-its-version`](../tasks/done/0358-verify-0355-in-production-the-profile-deploy-is-tagged-with-its-version/brief.md) |
| 🔲 Backlog | 5 *(was ~~4~~ — moved down one by the OWNER-RULED move of `0373` to rank 2, directly below `0370`, 2026-10-02 — verbatim *"Move to rank 2 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent; see the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that: was ~~3~~ — moved down one by the placement of verify task `0370` (for `0367`) at the top, 2026-10-02, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling *"Close + file both tasks (Recommended)"*, relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-02 `0370` addendum below. Before that: was ~~2~~ — moved down one by the placement of verify task `0363` (for `0356`) at the top, 2026-10-01, on the owner's standing build/verify-split rule relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-01 `0363` addendum below. Before that: was ~~1~~ — moved down one by the placement of verify task `0358` at the top, 2026-09-30, on the owner's standing build/verify-split rule relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-09-30 `0358` addendum below. Before that: was ~~2~~, append rank — owner-ruled placement 2026-09-30: the standing build/verify-split rule, *"verify task on top of the next sprint"*, applied to `0035` (*"File a verify task for Sprint 8"*); OWNER RULING relayed by `fkit-lead`, ⛔ not producer precedent. See the 2026-09-30 addendum below.)* | **Verify 0035 on the dev box — a public match starts, and each map file downloads once** *(🆕 **FILED 2026-09-30** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead`: `0035` closes on local proof (build), this is its verify. Owner-run, read-only: join a public match on the dev box → it starts, and each map file is requested once after the join, not twice. ⚠️ **Precondition: `0035` deployed to the dev box** (weekend deploy slot). ⚠️ **Does not block Sprint 7's deploy.**)* | [`0351-verify-0035-on-the-dev-box-a-public-match-starts-and-each-map-file-downloads-once`](../tasks/backlog/0351-verify-0035-on-the-dev-box-a-public-match-starts-and-each-map-file-downloads-once/brief.md) |
| 🔲 Backlog | 6 *(was ~~5~~ — moved down one by the OWNER-RULED move of `0373` to rank 2, directly below `0370`, 2026-10-02 — verbatim *"Move to rank 2 (Recommended)"*, live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent; see the 📌 re-rank line in the 2026-10-02 `0373` addendum below. Before that: was ~~4~~ — moved down one by the placement of verify task `0370` (for `0367`) at the top, 2026-10-02, on the owner's standing build/verify-split rule and the 2026-10-02 close ruling *"Close + file both tasks (Recommended)"*, relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-02 `0370` addendum below. Before that: was ~~3~~ — moved down one by the placement of verify task `0363` (for `0356`) at the top, 2026-10-01, on the owner's standing build/verify-split rule relayed by `fkit-lead`; ⛔ not producer precedent; see the 2026-10-01 `0363` addendum below. Before that: was ~~2~~ — moved down one by the placement of verify task `0358` at the top, 2026-09-30; see the 2026-09-30 `0358` addendum below. Before that: was ~~1~~ — moved down one by the OWNER-RULED placement of `0351` at the top, 2026-09-30; relayed by `fkit-lead`, ⛔ not producer precedent; see the 2026-09-30 addendum below. First row of a new board — a position, not a merit rank; the owner ranks this board)* | **Discussion: eight parked features for Sprint 8 — paid-citizenship perks (paid map packs, nickname styling, map voting, premium replays, custom uploaded flags) and more (leaderboard rewards, coin economy, clans)** *(📌 **Retitled later on 2026-09-29:** was *"five parked features tied to paid citizenship …"* — **OWNER RULING C** (relayed by `fkit-lead`), verbatim *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that to the Sprint 8."*, moved Sprint 5 plan Tasks 10, 11, 12 in from `0342`; see the ruling C addendum below. The text that follows is kept as written. 🆕 **FILED 2026-09-29** by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. A discussion agenda, **not** an implementation plan. Replaces Sprint 6's brief-less rows for plan Task 2 (Paid Campaign Map Packs) and Sprint 5 plan Tasks 8a, 14, 13, 15; their prose is copied verbatim into the brief. Twin: [`0342`](../tasks/backlog/0342-discussion-parked-features-not-tied-to-paid-citizenship/brief.md) on the [Backlog board](backlog.md). See the 2026-09-29 addendum below.)* | [`0343-discussion-parked-features-tied-to-paid-citizenship`](../tasks/backlog/0343-discussion-parked-features-tied-to-paid-citizenship/brief.md) |

> 🆕 **Addendum — 2026-10-02 (later), newest (above all others): task `0373` (read the stale-login data, choose the fix) filed and APPENDED at rank 6; owner-approved for the top of this board. Read the authority before the outcome.**
>
> **AUTHORITY.** OWNER RULINGS given **2026-10-02 via `AskUserQuestion`** in the live `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with **no owner channel** (ADR-021/037). ⛔ **Not producer precedent for re-ranking.** Verbatim: the owner approved filing a build task and *"a 'read the data and decide' task for the top of the next sprint"*; and on the S2-exit threshold, *"Decide it with the data (Recommended)"*.
>
> **OUTCOME.**
> - [`0373`](../tasks/backlog/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) filed, `🔲 Backlog`, owner `fkit-producer` (decision is the owner's). **Appended at rank 6** (ADR-035: append, never insert). **No row moved or was renumbered.**
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
