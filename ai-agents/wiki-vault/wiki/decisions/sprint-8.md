# Sprint 8 — Paid Citizenship Perks and More Content

**Date**: 2026-09-29
**Status**: proposed *(page-type field; the board is **`🔲 Backlog — 2026-09-29` — created, NOT started**)*

> Source: `ai-agents/sprints/plan-sprint-8.md`.
>
> 🆕 **2026-10-08 (latest, `a555111`): 18 rows — 2 `✅ Done` · 8 `🔲 Backlog` · 8 `➡️ Moved`; 8 OPEN** (was 17 / 7),
> counted by me by each row's leading status glyph. **`0420` appended at 18** — **one live-check checklist** for the
> Sprint 7 builds `0416` ([[tasks/worker-route-query-string]]), `0408` ([[tasks/explainer-paid-only-subheading]]),
> `0409` ([[tasks/explainer-buy-for-earned-citizens]]), `0407` ([[tasks/paid-citizen-thank-you-line]]), `0417`
> ([[tasks/explainer-popup-wider]]), `0412` ([[tasks/start-screen-private-tab]]) and `0413`
> ([[tasks/join-modal-paste-hint]]); `0382` is not in it (its check is `0383` on [[decisions/sprint-7]]). Owner ruling
> 2026-10-08: one verify task *"at the top of Sprint 8"* under the build/verify-split rule; ADR-035 forbids renumbering
> closed rows, so it was appended — then **"Keep rank 18"** (owner, same day): read it as the top group. Also ruled:
> `0413`'s error-window copy is **"not checked live"** (no safe way to raise the window in production). Deploy timing on
> the brief: `0416`, `0407`–`0409` cleared same-day; `0412`, `0413`, `0417` weekend slot — so the checklist may run in
> two passes. ⚠️ None of the seven is deployed yet (`git tag --contains a555111` → none). Line-3 banner unchanged
> (`🔲 Backlog`). `0420`'s brief is open, so it has no vault page; summary from the board's addendum.
>
> 🆕 **2026-10-08 (`6f1d737`): 17 rows — 2 `✅ Done` · 7 `🔲 Backlog` · 8 `➡️ Moved`; 7 OPEN** (was 16 / 6),
> counted by me by each row's leading status glyph. **`0418` appended at 17** — re-read `Citizenship:Status:Unverified`
> and `Citizenship:Status:Restart` in GameAnalytics over several days, because `0400`'s check 8 did not see them
> ([[tasks/session-verified-status-line-live]]); owner, verbatim: *"No need for the investigation, brief a task to the
> Sprint 8 to recheck the numbers in GameAnalytics."* Append rank, not merit; it blocks nothing and is time-gated. The
> rest of the diff is `backlog/` → `done/` link repoints for `0396`, `0398`, `0400`, `0401` (all closed 2026-10-08 on
> Sprint 7). Line-3 banner unchanged (`🔲 Backlog`).
>
> 🆕 **2026-10-07 (latest, `077c9e3`): 16 rows — 2 `✅ Done` · 6 `🔲 Backlog` · 8 `➡️ Moved`; 6 OPEN** (was 13 / 4).
> Counted by me this run. Line-3 banner (`🔲 Backlog — 2026-09-29`, not started) unchanged.
> - ➕ **14** `0404` (refresh popup after ~24 h) — filed here on the owner's free-text answer to `0332`'s review R2
>   (*"… brief it to the next sprint. The popup shouldn't break active matches, probably should be shown only on the
>   main screen."*), then **moved to [[decisions/sprint-7]] at 53** the same day (*"Move the refresh popup task to the
>   Sprint 7"*); this row is now `➡️ Moved`, rank 14 kept. Done there — [[tasks/long-session-refresh-popup]].
> - ➕ **15** `0405` — verify `0332` live: read the two identity counters and confirm no session token reaches the logs
>   ([[tasks/join-token-identity-vouch]]). Filed at `0332`'s close on the owner's *"Close it (Recommended)"*.
> - ➕ **16** `0406` — verify `0404` live: read the long-session refresh events and the after-refresh login split. Filed
>   at `0404`'s close under the owner's standing build/verify rule (no new ruling).
> - ⚠️ **15 and 16 are ADR-035 append ranks, flagged for owner confirmation:** on merit both belong with the other verify
>   tasks at the top, but ranks 2–4 and 8–14 are closed rows that may not be renumbered.
>
> 📌 **2026-10-07 (latest, `03d027b`): 13 rows — 2 `✅ Done` · 4 `🔲 Backlog` · 7 `➡️ Moved`; 4 OPEN — unchanged.**
> Counted by me this run. Only link repoints (`backlog/` → `done/`) for `0392` and `0395`, whose ➡️ Moved rows here
> (ranks 8 and 9) point at Sprint 7, where both **closed 2026-10-07** — [[tasks/post-24h-window-login-read]],
> [[tasks/verified-login-enforce-live]]. `df36b95` struck the stale *"New open question (e)"* in this board's `0401`
> move addendum (answered 2026-10-06, *"Accept the half test"*). Line-3 banner unchanged.
>
> 🆕 **2026-10-06 (latest, `31bfb06`): 13 rows — 2 `✅ Done` · 4 `🔲 Backlog` · 7 `➡️ Moved`; 4 OPEN** (was 12 / 7). ⚠️
> Counted by me this run. Line-3 banner (`🔲 Backlog — 2026-09-29`, not started) unchanged.
> - ➕ **13** `0401` — verify `0301` live ([[tasks/citizenship-explainer-popup]]), filed here at `0301`'s close (append
>   rank), then ➡️ **moved to [[decisions/sprint-7]] (48)** the same day.
> - ➡️ **10** `0396`, **11** `0398` moved to Sprint 7 (49, 50) — owner *"Move both to Sprint 7 (Recommended)"*; **12**
>   `0400` followed (51) — owner *"Move it to Sprint 7 (Recommended)"*. The placement question on each is answered;
>   the ranks here are kept, not renumbered (ADR-035).
> - **Still open here:** `0370` (1), `0351` (5), `0343` (6), `0390` (7). `0343`'s brief changed in this window only by
>   two `0301` link repoints (`backlog/` → `done/`).
>
> 🆕 **2026-10-06 (latest, `036a5c8`): 12 rows — 2 `✅ Done` · 7 `🔲 Backlog` · 3 `➡️ Moved`; 7 OPEN** (was 10 / 5). ⚠️
> Counted by me this run. Line-3 banner (`🔲 Backlog — 2026-09-29`, not started) unchanged. Two verify rows appended on
> the build/verify-split rule (2026-09-29), each ⚠️ an append rank flagged for owner confirmation (ranks 2–4 are closed
> rows, so "top of the next sprint" could not be honoured):
> - **11** `0398` — verify `0248` live: paid citizens see no interstitial ads ([[tasks/paid-citizen-ad-free]]). Gates:
>   `0396` passed → `0397` live or in the same deploy → `0248` committed (✔️ it is, `91eb99a`) → a weekend slot.
> - **12** `0400` — verify `0397` live: the session-status line shows the right state
>   ([[tasks/session-verified-status-line]]). Gates: `0395` passed → `0396` passed or same slot, S3b server first → a
>   weekend slot.
> - ⚠️ Open to the owner on both: whether they belong on Sprint 7; which paid / earned-only / non-citizen test accounts
>   exist; whether a short `citizenship_ui` flip-off in production is acceptable (one flip can serve both); how to get an
>   unverified session once `0395` is live.
>
> 🆕 **2026-10-06 (latest, `6f4ab77`): 10 rows — 2 `✅ Done` · 5 `🔲 Backlog` · 3 `➡️ Moved`; 5 OPEN** (was 6 / 3). ⚠️
> Counted by me this run. Line-3 banner (`🔲 Backlog — 2026-09-29`, not started) unchanged. Four verify rows appended
> (ADR-035: ranks 2–4 are closed rows, so none could go to the top as the 2026-09-29 build/verify rule says — every
> append rank is ⚠️ flagged for owner confirmation; on merit each belongs directly below `0370`):
> - **7** `0390` — verify `0377` live: an abandoned private lobby ends after 30 minutes, an occupied one does not
>   ([[tasks/private-lobby-idle-end]]).
> - **8** `0392` — filed as the 7-day ≤ 5 % re-check, re-scoped the same day by ADR-122 (no fixed bar), renamed *"Read the
>   post-0391 login numbers before the 0340 deploy"*, then ➡️ **moved to Sprint 7 (44)**.
> - **9** `0395` — verify `0340` live; ➡️ **moved to Sprint 7 (45)** the same day.
> - **10** `0396` — verify `0250` S3b live ([[tasks/authenticated-profile-read]]). Gates, in order: `0340` in its own
>   earlier slot (never the same one) → `0395` confirms `vfy: true` → the owner's look at the login numbers → a weekend
>   slot. ⚠️ Open to the owner: whether it belongs on Sprint 7, and which paid / `vfy:false` test sessions exist. `0248`
>   carries a dated note: deploy only after `0396`.
>
> 🆕 **2026-10-04 (latest, `b99c1f1`): 6 rows — 2 `✅ Done` · 3 `🔲 Backlog` · 1 `➡️ Moved`; 3 OPEN** (was 6 / 4). ⚠️
> Counted by me this run. Line-3 banner (`🔲 Backlog — 2026-09-29`, not started) unchanged.
>
> - ➡️ **`0373` (rank 2) MOVED OUT TO [[decisions/sprint-7]]** — row now reads `➡️ Moved to Sprint 7 — priority 36`.
>   OWNER RULING given live 2026-10-04 via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer` (⛔ not
>   producer precedent), verbatim: *"Pull into Sprint 7 (Recommended)"*. **No row renumbered here** (ADR-035): open
>   rows stay at 1 (`0370`), 5 (`0351`), 6 (`0343`); closed / moved rows at 2, 3, 4. ⚠️ Sprint 7's rank 36 is the
>   producer's append placement, **not owner-ruled** — on merit it is worked before `0340`. The ⏳ data clock below is
>   unchanged: earliest useful read after the evening of Saturday 2026-10-10 (UTC).
> - 📌 `0351`'s brief: one link repoint (`0337` → `tasks/done/`); nothing else.
>
> 🆕 **2026-10-04 (`7324c1b`): 6 rows — 2 `✅ Done` · 4 `🔲 Backlog`; 4 OPEN (unchanged).** ⚠️ Counted by me
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
- [[tasks/stale-login-client-diagnostics]] — task `0372`, the client events `0373` (rank 2 here until 2026-10-04; now Sprint 7, rank 36) reads
- [[tasks/stale-login-signature-age]] — task `0366`, the server brackets `0373` (rank 2 here until 2026-10-04; now Sprint 7, rank 36) reads
- [[tasks/verified-login-live-check]] — task `0339`, the failed live check that started the `0373` chain
- [[decisions/adr-116-verified-login]] — the verified-login decision; `0340` (S3a) waits on `0373`
- [[systems/analytics]] — the `0372` events `0373` (rank 2 here until 2026-10-04; now Sprint 7, rank 36) reads
- [[tasks/telemetry-deploy-version-tags-production-check]] — task `0363` (rank 3): verify passed, closed 2026-10-03
- [[tasks/profile-deploy-version-tags-production-check]] — task `0358` (rank 4): verify passed, closed 2026-10-03
- [[systems/weekend-deploy-window]] — the 2026-10-03 window in which `0363`, `0358` and `0370`'s Steps 1–3 ran
- [[tasks/private-lobby-idle-end]] — task `0377`, verified by `0390` (rank 7)
- [[tasks/authenticated-profile-read]] — task `0250`, S3b verified by `0396` (rank 10)
- [[tasks/verified-login-enforce]] — task `0340`, verified by `0395` (filed here at 9, moved to Sprint 7)
- [[decisions/adr-122-stale-login-gate-owner-judgment]] — why `0392` was re-scoped and moved
- [[tasks/stale-login-fix-decision]] — task `0373`, filed here (rank 2), moved to Sprint 7 on 2026-10-04
- [[tasks/paid-citizen-ad-free]] — task `0248`, verified by `0398` (rank 11)
- [[tasks/session-verified-status-line]] — task `0397`, verified by `0400` (rank 12)
- [[tasks/citizenship-explainer-popup]] — task `0301`, whose verify `0401` was filed here (rank 13) and moved to Sprint 7 (48) the same day
- [[tasks/post-24h-window-login-read]] — task `0392`, filed here (rank 8), moved to Sprint 7, closed 2026-10-07
- [[tasks/verified-login-enforce-live]] — task `0395`, filed here (rank 9), moved to Sprint 7, closed 2026-10-07
- [[tasks/join-token-identity-vouch]] — task `0332`, whose verify-live task `0405` sits here at 15
- [[tasks/long-session-refresh-popup]] — task `0404`, filed here at 14 and moved to Sprint 7; its verify `0406` sits here at 16
- [[decisions/adr-124-join-token]] — ADR-124, the design `0405` checks live
- [[tasks/session-verified-status-line-live]] — task `0400` (filed here at 12, closed on Sprint 7 2026-10-08): its failed check 8 became `0418` (rank 17)
- [[tasks/authenticated-profile-read-live]] — task `0396` (filed here at 10; closed on Sprint 7 2026-10-08)
- [[tasks/paid-citizen-ad-free-live]] — task `0398` (filed here at 11; closed on Sprint 7 2026-10-08)
- [[tasks/citizenship-explainer-popup-live]] — task `0401` (filed here at 13; closed on Sprint 7 2026-10-08)
- [[tasks/worker-route-query-string]] — task `0416`, live check on `0420` (rank 18)
- [[tasks/explainer-paid-only-subheading]] — task `0408`, live check on `0420`
- [[tasks/explainer-buy-for-earned-citizens]] — task `0409`, live check on `0420`
- [[tasks/paid-citizen-thank-you-line]] — task `0407`, live check on `0420`
- [[tasks/explainer-popup-wider]] — task `0417`, live check on `0420`
- [[tasks/start-screen-private-tab]] — task `0412`, live check on `0420`
- [[tasks/join-modal-paste-hint]] — task `0413`, live check on `0420` (error-window copy: not checked live, by ruling)
