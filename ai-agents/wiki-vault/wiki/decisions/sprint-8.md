# Sprint 8 — Paid Citizenship Perks and More Content

**Date**: 2026-09-29
**Status**: proposed *(page-type field; the board is **`🔲 Backlog — 2026-09-29` — created, NOT started**)*

> Source: `ai-agents/sprints/plan-sprint-8.md`.
>
> 🆕 **2026-10-04 (latest, `7324c1b`): 6 rows — 2 `✅ Done` · 4 `🔲 Backlog`; 4 OPEN (unchanged).** ⚠️ Counted by me
> this run. Ranks and the line-3 banner (`🔲 Backlog — 2026-09-29`, not started) unchanged.
>
> - ⛔ **`0343` (parked paid-citizenship features) — items A and D ON HOLD, postponed indefinitely** (2026-10-03):
>   *paid campaign map packs* (A) and *premium replay access* (D), because new maps and match archiving are both
>   postponed (see [[decisions/sprint-7]]). OWNER RULING, live via `AskUserQuestion`, relayed by `fkit-lead` (⛔ not
>   producer precedent): *"Keep it, mark A and D on hold"*. `0343` **stays on this board**; its row, rank and status are
>   unchanged; the other items are not affected.
> - 📌 **`0373` (read the stale-login data, choose the fix) — both code preconditions confirmed by ancestry**
>   (`fkit-lead`, read-only git, 2026-10-03): `0372`'s client code is in the `0.0.156` tag and `0366`'s profile code is in
>   `0.0.156-profile.1`, both deployed 2026-10-03 (game ~09:32 UTC, profile ~10:02 UTC). So the data window counts from
>   **2026-10-03 for both**; earliest useful read **after the evening of Saturday 2026-10-10 (UTC)**. ⚠️ **Code in a tag
>   does not prove the events are arriving** — the first reads confirm arrival. See [[tasks/stale-login-client-diagnostics]],
>   [[tasks/stale-login-signature-age]].
>
> > 🆕 **2026-10-03 (latest, `bc39b82`): 6 rows — 2 `✅ Done (agent-closed — not owner-verified)` · 4 `🔲 Backlog`;
> 4 OPEN.** ⚠️ Counted by me this run. **Ranks unchanged:** `0370` 1 · `0373` 2 · `0363` 3 ✅ · `0358` 4 ✅ · `0351` 5 ·
> `0343` 6. ⚠️ **The line-3 banner still reads `🔲 Backlog — 2026-09-29` (NOT started)** although two of its rows are
> now closed — recorded as the board states it, not changed here; whether to start the sprint is the owner's call.
>
> - ✅ **`0363` and `0358` closed 2026-10-03** by `/fkit-task-done`, `(agent-closed — not owner-verified)`, on the
>   OWNER RULING *"Yes, close both (Recommended)"* (relayed by `fkit-lead`). Both verify tasks passed every step after
>   the 2026-10-03 window: telemetry **`0.0.155-telemetry.1`** at `204f931`
>   ([[tasks/telemetry-deploy-version-tags-production-check]]); profile **`0.0.156-profile.1`** at `f712263`
>   ([[tasks/profile-deploy-version-tags-production-check]]). Their files moved `backlog/` → `done/`; the board's links
>   were repointed.
> - 🔄 **`0370` (rank 1) — Steps 1–3 done on deploy day, still `🔲 Backlog`:** `0367`'s 1-minute lobby went live in
>   game release `0.0.156` (~09:32 UTC). **Before baseline** (2026-09-26 → 10-03, deploy day excluded): lone-real-player
>   share **11.8 %** (545 / 4 636; single days 7.6–13.6 %), ≈ 662 public matches with a real player per day;
>   GameAnalytics `Game:Mode:Multiplayer` **4.57K entries/day** (entries, **not** matches; read by the lead through the
>   owner's login — the brief says owner-read; a hidden "demo mode" element on the page means real data was judged,
>   **not proven**). **OWNER RULING — "noticeably worse" = 7-day after share above 15 %** (*"Above 15 %
>   (Recommended)"*), set before any after-data; crossing it puts a revert **on the table**, it is **not** an automatic
>   revert. Day-4 snapshot due 2026-10-08; after window 2026-10-04 → 10-10. See [[tasks/public-lobby-one-minute]].
> - **`0351` (rank 5) is now runnable** — the dev box got the new code in the same window.
> - ⏳ **`0373` (rank 2) — its data clock has probably started, not confirmed.** ✔️ *Wiki check: `0372`'s commit
>   (`0c9a620`) and `0366`'s (`e581824`) are both ancestors of `f712263`, the commit both the game
>   (`0.0.156`) and profile (`0.0.156-profile.1`) deploys ran from.* ⚠️ The runbook does **not** mention `0366`,
>   `0372` or `0373`, and nobody recorded seeing their events or brackets arrive — so "deployed" is by ancestry only,
>   not observed. If it holds, the earliest useful read is after a weekend evening with 5–7 days of data
>   (≈ 2026-10-10/11 UTC).
> - Window record: [[systems/weekend-deploy-window]].
>
> *History —* **2026-10-02 (`0c9a620`): 6 rows — 6 `🔲 Backlog`; 6 OPEN; still NOT started.** ⚠️ Counted by me this
> run. Task **`0373` — read the stale-login data and choose the fix** — was filed 2026-10-02 by a spawned
> `fkit-producer` on owner rulings (filing *"a 'read the data and decide' task for the top of the next sprint"*; the
> S2-exit threshold — *"Decide it with the data (Recommended)"*), appended at rank 6, then **moved to rank 2 by OWNER
> RULING**, verbatim *"Move to rank 2 (Recommended)"* (relayed by `fkit-lead`; ⛔ not producer precedent). **New order:
> `0370` 1 · `0373` 2 · `0363` 3 · `0358` 4 · `0351` 5 · `0343` 6** — all open, so no closed row was renumbered
> (ADR-035). Owner `fkit-producer`; ⚠️ **the decision is the owner's** (the owner chooses the fix and sets the
> threshold; GameAnalytics numbers are owner-read).
>
> - ⏳ **Rank 2 does not let it start early.** Preconditions: `0372` deployed in a game deploy and `0366` in a profile
>   deploy (both target 2026-10-03/04), then **5–7 days of data including a weekend evening (UTC 20–23)** — earliest
>   useful read after the evening of 2026-10-10 (UTC) if both land on time.
> - **What it reads:** `0366`'s server age brackets ([[tasks/stale-login-signature-age]]) and `0372`'s client events
>   ([[tasks/stale-login-client-diagnostics]]), after freezing a prediction table **before** the first query. Possible
>   outcomes: a second Yandex call gives fresh data (→ a small client refetch task); Yandex returns the same signed data
>   for the whole visit (→ the owner chooses a fix); the 900 s window is simply too tight (→ a retune); a clock problem;
>   or *"not determined"*.
> - It is the next step on the chain that blocks `0340` (S3a, [[decisions/adr-116-verified-login]]) and, behind it,
>   `0332`, `0323`, `0250` S3b, `0248` and `0301`.
> - The line-3 banner (`🔲 Backlog`) was not touched.
>
> *History —* **`2247699` (2026-10-02): 5 rows — 5 `🔲 Backlog`; 5 OPEN; still NOT started.** ⚠️ Counted by me this
> run. Verify task **`0370`** — for [[tasks/public-lobby-one-minute]] (`0367`, the 1-minute public lobby test) — was
> filed 2026-10-02 at `0367`'s close (owner ruling *"Close + file both tasks (Recommended)"* plus the standing
> build/verify-split rule) and placed at **rank 1** (appended at 5, then moved up; no closed row exists here, so none
> was renumbered). Read-only: compare the 7 days after the game-server deploy with the 7 days before, on the owner-ruled
> rule — keep 1 minute if multiplayer matches per day hold or rise **and** the lone-real-player share does not jump
> noticeably. **Owner rulings 2026-10-02:** the deploy day is left out of both windows; Step 1 (re-run the "before"
> query) is done **at the weekend deploy (2026-10-03/04), when the owner asks** — whether or not this sprint has started.
> ⚠️ Rank 1 is **placement, not merit** — but it is the only row with a fixed date. **Order then: `0370` 1 · `0363` 2 ·
> `0358` 3 · `0351` 4 · `0343` 5.** The line-3 banner was not touched.
>
> *History —* **`4f9f857` (2026-10-01): 4 rows — 4 `🔲 Backlog`; 4 OPEN; still NOT started.** ⚠️ Counted by me this
> run. Verify task **`0363`** — for [[tasks/telemetry-deploy-version-tags]] (`0356`) — was filed 2026-10-01 and placed
> at **rank 1** by `fkit-lead` at `0356`'s close, on the owner's standing build/verify-split rule (appended at 4, then
> moved up; no closed row exists here, so none was renumbered). Owner-run after the weekend telemetry deploy: the
> deploy printed a `<base>-telemetry.<N>` name and succeeded; the annotated git tag is on origin at the deployed
> commit; the box marker and the local deploy record show the same version and commit; Uptrace still answers.
> ⚠️ Preconditions: `0356` **committed** and deployed. Does not block Sprint 7's deploy. **Order then: `0363` 1 ·
> `0358` 2 · `0351` 3 · `0343` 4.** ⚠️ `0363` above `0358` is **placement, not merit** — two short owner checks on
> different boxes, runnable in either order. The line-3 banner was not touched.
>
> *History — `49a419d`:* **3 rows — 3 `🔲 Backlog`; 3 OPEN; still NOT started.** ⚠️ Counted by me
> this run, by each row's leading status glyph. Two **verify tasks** were filed on 2026-09-30 and placed at the top,
> on the owner's standing build/verify-split rule (*"verify task on top of the next sprint"*; it must not block
> Sprint 7's deploy):
>
> | Rank | Task | Status |
> |---|---|---|
> | 1 | **`0358`** — verify [[tasks/profile-deploy-version-tags]] (`0355`) in production: after the weekend profile deploy (next slot 2026-10-03/04), the deploy printed a `<base>-profile.<N>` name and succeeded, `/health` reports it, the annotated git tag is on origin at the deployed commit, the registry holds the name, and telemetry shows it *if observable*. Placed by `fkit-lead` at `0355`'s close (standing rule, not a fresh owner ruling) | Backlog |
> | 2 | **`0351`** — verify [[tasks/worker-reuses-page-map]] (`0035`) on the dev box: a public match starts and each map file downloads once. Owner ruling *"File a verify task for Sprint 8"* | Backlog |
> | 3 | `0343` discussion: eight parked features (was rank 1, then 2) | Backlog |
>
> ⚠️ `0358` above `0351` is **placement, not merit** — both are short owner-run checks on different boxes. The line-3
> banner was not touched.
>
> *History:* at `b434732` the board had 1 row (`0343`), 1 open.

## Context

The board was **created on 2026-09-29** by a spawned `fkit-producer`, on an owner ruling given live in the
`fkit lead` session and relayed by `fkit-lead` (ADR-021/037; ⛔ not producer precedent). The ruling: split
[[decisions/sprint-6]]'s **11 brief-less rows** into discussion briefs — *"each brief should have a list of the
things that should be discussed (not implemented, but discussed)"* — and *"is the task related to the paid
citizenship? If yes, put this brief into Sprint 8. If no — put it into Backlog."* The owner **delegated that
test to the producer**.

- **Named 2026-09-29 — owner ruling D**, exact wording: *"Paid Citizenship Perks and More Content"*.
- ⚠️ **No goal set.** The producer did not invent one; the name is not a goal. *(Sprint 7's goal was set 2026-10-02 — see [[decisions/sprint-7]]; this board's was not.)*
- **Not started** — the owner did not start this sprint.

## Decision

| Rank | Task | Status |
|---|---|---|
| ~~1~~ ~~3~~ **6** *(first row of a new board — a position, not a merit rank; moved down by the verify tasks and `0373` above — 2026-09-30, 2026-10-01, 2026-10-02)* | `0343` **Discussion: eight parked features** — paid-citizenship perks and more | Backlog |

**What `0343` holds:**

- **Five placed by the producer's "tied to paid citizenship" test** (the owner may overrule):
  - Paid Campaign Map Packs — *borderline: a separate product, but a pack purchase grants citizenship*;
  - Nickname Styling System;
  - Map Voting for Verified Players — *borderline: "verified" = citizens, earned vs paid not stated*;
  - Replay Access as Premium Feature — *borderline: "premium tier" read as citizenship*;
  - Custom Uploaded Flags & Patterns — Paid Citizens Only.
- **Three moved in by owner ruling C**, verbatim *"Leaderboard Rewards, Coin Economy, Clans → Backlog — move that
  to the Sprint 8."*: Leaderboard — Rewards Layer, Coin Economy + Rewarded Ads, Clans. This **overrules** the
  producer's borderline "no" calls on them; they had first gone to `0342`. `0343` was retitled; its folder was
  not renamed.

The other brief, `0342` (**three** items NOT tied to paid citizenship: server restart UX, mobile warning, free
historical maps), sits on the Backlog board — see [[decisions/sprint-backlog]].

## Consequences

- Every item here is a **discussion**, not a build: nothing is scoped for implementation yet.
- Most items were Sprint 5 plan tasks carried to Sprint 6 on 2026-09-26; the Sprint 5 plan's task prose stays
  where it is, with a pointer to `0343` (see [[decisions/sprint-5]]).

## Related

- [[decisions/sprint-6]] — the closed board whose brief-less rows became `0342` / `0343`
- [[decisions/sprint-7]] — the active sprint
- [[decisions/sprint-5]] — the original home of most of these items; its prose now points at `0343`
- [[decisions/sprint-backlog]] — `0342`, the "not tied to paid citizenship" discussion brief
- [[decisions/product-strategy]] — `plan-index.md` lists this board and repoints the priority table to `0342` / `0343`
- [[tasks/profile-deploy-version-tags]] — task `0355`, verified by `0358` (rank 1)
- [[tasks/worker-reuses-page-map]] — task `0035`, verified by `0351` (rank 2)
- [[tasks/telemetry-deploy-version-tags]] — task `0356`, verified by `0363` (rank 1)
- [[tasks/public-lobby-one-minute]] — task `0367`, verified by `0370` (rank 1, filed 2026-10-02)
- [[tasks/stale-login-client-diagnostics]] — task `0372`, the client events `0373` (rank 2) reads
- [[tasks/stale-login-signature-age]] — task `0366`, the server brackets `0373` (rank 2) reads
- [[tasks/verified-login-live-check]] — task `0339`, the failed live check that started the `0373` chain
- [[decisions/adr-116-verified-login]] — the verified-login decision; `0340` (S3a) waits on `0373`
- [[systems/analytics]] — the `0372` events `0373` (rank 2) reads
- [[tasks/telemetry-deploy-version-tags-production-check]] — task `0363` (rank 3): verify passed, closed 2026-10-03
- [[tasks/profile-deploy-version-tags-production-check]] — task `0358` (rank 4): verify passed, closed 2026-10-03
- [[systems/weekend-deploy-window]] — the 2026-10-03 window in which `0363`, `0358` and `0370`'s Steps 1–3 ran
