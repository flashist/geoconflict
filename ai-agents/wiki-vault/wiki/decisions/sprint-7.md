# Sprint 7 *(no theme name yet — goal set 2026-10-02)*

**Date**: 2026-09-27
**Status**: proposed *(page-type field; the board is **🔄 In progress since 2026-09-29** — see below)*

> Source: `ai-agents/sprints/plan-sprint-7.md`.
>
> # 🆕 2026-10-06 (latest, `036a5c8`) — 48 ROWS, 7 OPEN: `0248` CLOSED, `0397` AND `0399` ADDED AND CLOSED
>
> **Re-counted at `HEAD` = `036a5c8`: 48 rows — 36 `✅ Done` · 6 `🔲 Backlog` · 1 `🚧 Blocked` · 4 `➡️ Moved` ·
> 1 `⛔ Cancelled`; 7 OPEN** (was 46 / 8). ⚠️ Counted by me this run, by each row's leading status glyph. All three closes
> are `(agent-closed — not owner-verified)`, by spawned `fkit-producer`s via `/fkit-task-done` at `fkit-lead`'s
> instruction under `/fkit-sprint-ship-loop`, on owner-approved plans and the build/verify-split rule (2026-09-29). The
> line-3 banner still reads `🔄 In progress — 2026-09-29`.
>
> - ✅ **18** `0248` — no interstitial ads for paid citizens; Step 1 closed by owner ruling R1 (*all six placements off,
>   one place in the code*); built, committed `91eb99a`, **not deployed** ([[tasks/paid-citizen-ad-free]]). Deploy only
>   after `0396` passes **and** with or after `0397` (R3). Live check `0398` on Sprint 8.
> - ➕✅ **46** `0397` — show the player whether the session is verified; filed on R2 (*"Sprint 7, now
>   (Recommended)"*), `0278` folded in; built, committed `036a5c8`, **not deployed**
>   ([[tasks/session-verified-status-line]]). Live check `0400` on Sprint 8.
> - ➕✅ **47** `0399` — `npm test` capped at 4 jest workers; supersedes `0197`'s A2 for this reason only; committed
>   `036a5c8`, test config only ([[tasks/jest-worker-cap]]).
> - ⚠️ Ranks 46 and 47 are **append ranks, not merit ranks** — flagged for owner confirmation (on merit `0397` belongs
>   directly below `0250`; `0399` directly below `0397`, where it already is).
> - 🚨 Recorded on the `0397` row: the owner's Mac **kernel-panicked** during one diagnostic full test run — cause
>   **unproven**.
>
> # 🆕 2026-10-06 (latest, `6f4ab77`) — 46 ROWS, 8 OPEN: NINE CLOSED, FOUR ADDED; THE STALE-LOGIN CHAIN RAN END TO END
>
> **Re-counted at `HEAD` = `6f4ab77`: 46 rows — 33 `✅ Done` · 7 `🔲 Backlog` · 1 `🚧 Blocked` · 4 `➡️ Moved` ·
> 1 `⛔ Cancelled`; 8 OPEN** (was 42 / 15). ⚠️ Counted by me this run, by each row's leading status glyph. Every close
> is `(agent-closed — not owner-verified)`, made by spawned `fkit-producer`s on owner rulings relayed by `fkit-lead`
> (⛔ not producer precedent). The line-3 banner still reads `🔄 In progress — 2026-09-29`.
>
> - ✅ **Closed:** **16** `0340` S3a — built + reviewed only, **not deployed** ([[tasks/verified-login-enforce]]) ·
>   **17** `0250` — S1 live since 2026-09-29, S3b built and committed (`6f4ab77`), **not deployed**
>   ([[tasks/authenticated-profile-read]]) · **21** `0297` — three checks **waived by the owner, not verified**
>   ([[tasks/paid-citizenship-test-buy]]) · **36** `0373` ([[tasks/stale-login-fix-decision]]) · **37** `0354`
>   ([[tasks/private-lobby-tester-default]]) · **38** `0380` ([[tasks/yandex-invite-copies-code]]) · **39** `0377`
>   ([[tasks/private-lobby-idle-end]]) · **40** `0353` ([[tasks/host-window-poll-before-lobby]]) · **41** `0374`
>   ([[tasks/lobby-window-joining-mark]]).
> - ➕ **Added (all append rank — ⚠️ not merit ranks, flagged for owner confirmation):** **42** `0389` (done —
>   [[tasks/private-lobby-code-format]]) · **43** `0391` (done, **deployed 2026-10-06** —
>   [[tasks/login-signature-24h-window]]) · **44** `0392` (read the post-`0391` login numbers before `0340`'s deploy;
>   moved in from Sprint 8, folder renamed) · **45** `0395` (verify `0340` live: deploy S3a, the owner's DevTools `vfy`
>   check, route the ADR-113 note; moved in from Sprint 8).
> - 📌 **Rulings carried (2026-10-05):** fix *"24 hours (Recommended)"* → [[decisions/adr-121-login-signature-24h-window]];
>   the 5 %/7-day bar removed → [[decisions/adr-122-stale-login-gate-owner-judgment]]; `0391` deployed on a Tuesday
>   (mid-week exception, *"Yes, Tuesday (Recommended)"*); `0340` split (*"Split it (Recommended)"*) — closes on build +
>   review, deploy in `0395`; `0250` S3b / `0319` / `0332` / `0323` carry a dated note *"deploy only after `0395` confirms
>   `vfy: true` live"* — **a note, not a dependency** (*"Note only (Recommended)"*). Architect advice: deploy `0340`
>   **alone**, not with `0250` S3b.
> - ⚠️ **Committed ≠ deployed:** the six private-lobby closes are in `8d74090`; no game deploy since `0.0.156`. The only
>   deploy in this window is the 2026-10-06 profile deploy (`0391` only).
> - **Still open:** `0219` (Blocked), `0323`, `0332`, `0213`, `0248`, `0301`, `0392`, `0395`.
>
> ---
>
> # 🆕 2026-10-04 (latest, `72a223d`) — 42 ROWS, 15 OPEN: `0032` PASSED AND CLOSED; FIVE PRIVATE-LOBBY TASKS MOVED IN AT RANKS 37–41
>
> **Re-counted at `HEAD` = `72a223d`: 42 rows — 22 `✅ Done` · 13 `🔲 Backlog` · 2 `🚧 Blocked` · 4 `➡️ Moved` ·
> 1 `⛔ Cancelled`; 15 OPEN** (was 37 / 11 — one closed, five added). ⚠️ Counted by me this run, by each row's leading
> status glyph. Both edits are by spawned `fkit-producer`s with no owner channel, on facts / an OWNER RULING relayed by
> `fkit-lead` (⛔ not producer precedent). The line-3 banner still reads `🔄 In progress — 2026-09-29`.
>
> - ✅ **`0032` (rank 5, client null-id errors) → `✅ Done (agent-closed — not owner-verified)`**, 2026-10-04. **Step 5
>   re-check PASSED** — run read-only by `fkit-lead` in Uptrace at the owner's request (relayed agent measurement, not
>   owner-verified): ingest live (≈ 38.5 k spans on the fixed versions), **zero spans** for clusters B / C / D / E on
>   `0.0.154`–`0.0.156`; the 48 remaining `reading 'id'` spans are all cluster G (`0261`), not a regression. In Uptrace
>   `service_version` is the commit SHA, not the semver. Optional preload-analytics check **not taken**; three
>   out-of-scope error groups seen, **nothing filed**. Full record: [[tasks/client-null-id-errors]]. ⚠️ **Board text vs
>   repo:** the row ends *"Not committed"*; the close **is** in `72a223d` (checked).
> - ➡️ **Five tasks MOVED IN FROM [[decisions/sprint-backlog]], appended at ranks 37–41**, all `🔲 Backlog` (status copied
>   verbatim): **37** `0354` (show private lobbies to testers + an "everyone" flag) · **38** `0380` (Yandex build: copy
>   the lobby code, stop honouring `#join=` links — [[decisions/adr-119-yandex-invite-sdk-link-plus-code]]) · **39**
>   `0377` (end abandoned unstarted private lobbies after a short idle time) · **40** `0353` (host window polls before a
>   lobby exists) · **41** `0374` (lobby windows end their "joining" mark on close). OWNER RULING given live 2026-10-04
>   via `AskUserQuestion`, verbatim: *"Yes: all 5 ready ones"* — option text: *"0354, 0377, 0380 plus the two small
>   fixes 0353 (error every second) and 0374 (joining mark). More work this week."*
>   - ⚠️ **The order is the PRODUCER's, NOT owner-ruled** — the owner named tasks, not ranks; open for owner confirmation.
>     `0380` sits next to `0354` on merit (it unblocks `0381` and `0382`).
>   - ⚠️ **`0353` and `0374` both edit `HostLobbyModal.ts`** — build them one after the other, not at once.
>   - Moving them answered **none** of their open owner questions (`0354`: who counts as a tester; `0377`: grace time;
>     `0380`: its list). The everyone-flag release gate is unchanged ([[tasks/private-lobby-citizen-perk]]); `0301`
>     (gate item 5) and `0382` (half of item 6) are not on this list. Still on the Backlog board: `0376`, `0381`,
>     `0382`, `0383`.
>
> ---
>
> # 🆕 2026-10-04 (`b99c1f1`) — 37 ROWS, 11 OPEN: `0337` PASSED AND CLOSED; `0373` MOVED IN FROM SPRINT 8 AT RANK 36
>
> **Re-counted at `HEAD` = `b99c1f1`: 37 rows — 21 `✅ Done` · 8 `🔲 Backlog` · 3 `🚧 Blocked` · 4 `➡️ Moved` ·
> 1 `⛔ Cancelled`; 11 OPEN** (was 36 / 11 — one closed, one added). ⚠️ Counted by me this run, by each row's leading
> status glyph. Both edits are by spawned `fkit-producer`s with no owner channel, on facts / OWNER RULINGS relayed by
> `fkit-lead` (⛔ not producer precedent). The line-3 banner still reads `🔄 In progress — 2026-09-29`.
>
> - ✅ **`0337` (rank 1, verify `0331` in production) → `✅ Done (agent-closed — not owner-verified)`**, 2026-10-04.
>   **Verification PASSED:** owner-run probe P1 after a match exit, in the game iframe re-picked after the reload —
>   `has("sdk")` **true**, length **138** (pre-`0331`: false / 0). The informational GameAnalytics read (by
>   `fkit-lead`) shows **no visible drop** in the boot-timeout rate and carries caveats (unfiltered pull, an
>   unchecked *"Demo mode"* banner, three excluded `Session:Start` spike days, nothing filed). Full record:
>   [[tasks/match-exit-query-string-production-check]]. ⚠️ **Board text vs repo:** the row ends *"Not committed"*;
>   the close **is** in `b99c1f1` (checked).
> - ➡️ **`0373` (read the stale-login data, choose the fix) MOVED IN FROM [[decisions/sprint-8]], APPENDED AT RANK 36**,
>   `🔲 Backlog` (status copied verbatim). OWNER RULING given live 2026-10-04 via `AskUserQuestion`, verbatim:
>   *"Pull into Sprint 7 (Recommended)"* — option text: *"Move 0373 onto Sprint 7 now. Sprint 7's goal includes
>   citizenship, and 6 of its open tasks wait on this one task."*
>   - ⚠️ **Rank 36 is the PRODUCER's placement, NOT owner-ruled** — the owner named the sprint only. **On merit it sits
>     directly above `0340` (rank 16)**: chain `0373` → stale-signature fix (not yet filed) → S2-exit re-check → `0340`
>     → `0332`, `0323`, `0250` S3b, `0248`, `0301`. Inserting at 16 would renumber ranks 16–35, which ADR-035 forbids,
>     so it was appended. **Read it as worked before `0340`.** Exact rank is **open for owner confirmation**.
>   - ⏳ **Being here does not let it start early:** it still needs 5–7 days of data since the 2026-10-03 deploys,
>     including a weekend evening (UTC 20–23) — earliest useful read **after the evening of Saturday 2026-10-10 (UTC)**.
>     See [[tasks/stale-login-signature-age]], [[tasks/stale-login-client-diagnostics]].
> - 📌 Link repoints only: `0337` → `tasks/done/` on this board, on Sprint 6's closed board, on ADR-119 and in the
>   briefs that cite it.
>
> ---
>
> # 🆕 2026-10-04 (`7324c1b`) — 36 ROWS, 11 OPEN: TWO TASKS POSTPONED OFF THE BOARD, `0297` UNBLOCKED, TWO STALE GATES STRUCK
>
> **Re-counted at `HEAD` = `7324c1b`: 36 rows — 20 `✅ Done` · 8 `🔲 Backlog` · 3 `🚧 Blocked` · 4 `➡️ Moved` ·
> 1 `⛔ Cancelled`; 11 OPEN** (was 36 / 13). ⚠️ Counted by me this run, by each row's leading status glyph. All edits
> below are by spawned `fkit-producer`s on OWNER RULINGS relayed by `fkit-lead` (⛔ not producer precedent). The
> line-3 banner still reads `🔄 In progress — 2026-09-29`.
>
> - ➡️ **`0027` (New Maps — Community Demand) → Backlog board: NEW-MAPS CONTENT POSTPONED INDEFINITELY** (2026-10-03).
>   Owner, verbatim: *"We wil postpone the new maps, don't know for how long, move the new maps content related tasks
>   to the backglog sprint"*. Earlier the same day its timing gate had been ruled met (the 2026-09-26 paid-citizenship
>   switch-on counts as "the launch", *"Yes, that was it"*) — superseded: **no map briefs are to be written** until
>   the postponement lifts. A de-scope edit, **not** a mover — nothing closed, no folder moved; the row stays here as a
>   pointer.
> - ➡️ **`0030` (S3-Backed Match Archival) → Backlog board: MATCH ARCHIVING POSTPONED INDEFINITELY** (2026-10-03).
>   Owner, verbatim: *"we will pospone the Archive Matches tasks, move the tasks related to it to the backlog."* Rank 4
>   surrendered. The same day's rulings still stand: blocker 1 discharged (*"Yes, it's done"*), new dedicated bucket +
>   scoped key + a new `STORAGE_REGION` slot, 30-day retention by our own code, prod only, and reads **through the
>   game server** — [[decisions/adr-118-archive-read-through-game-server]].
> - 🔓 **`0297` (paid-citizenship test-buy sequence): `🚧 Blocked` → `🔲 Backlog` — block resolved** (2026-10-04, on
>   facts relayed by `fkit-lead`). §1 is complete: the profile deploy ran 2026-10-03 and the read-only log read found
>   **`construction=decoded_json`** via `/complete` — ⚠️ n = 1, `/reconcile` not observed. Still open, owner-run, no
>   deploy needed: §2 first box, §4 (reconcile watch), §5 (catalog check). `Backlog` not `In progress` because no
>   session owns it. ⇒ the profile freeze is lifted ([[systems/weekend-deploy-window]]); `0310` was cancelled and
>   superseded by `0379` ([[tasks/hmac-construction-log-label]]).
> - 📌 **`0032` (null-id errors) — stale gate struck** (*"Yes, fix them"*, 2026-10-03): the weekend-slot half is
>   **done** — the fix shipped 2026-09-26 (game `0.0.152`, also `0.0.154`). **Only the owner's Uptrace re-check (W15)
>   is left**; no re-check result is recorded in the repo. Still `🚧 Blocked`, rank unchanged.
> - 📌 **`0337` (verify `0331` in production) — precondition MET** (*"Yes, fix them"*, 2026-10-03): `0331` (`572d134`)
>   went to production in game `0.0.155` on 2026-09-29 and is in `0.0.156`. Startable, **not started** — status and
>   rank unchanged. See [[tasks/match-exit-keeps-query-string]].
>
> ---
>
> # 🆕 2026-10-03 (latest, `bc39b82`) — 36 ROWS, 13 OPEN (UNCHANGED): ONE LINK REPOINT ONLY
>
> **Re-counted at `HEAD` = `bc39b82`: 36 rows — 20 `✅ Done` · 9 `🔲 Backlog` · 4 `🚧 Blocked` · 2 `➡️ Moved` ·
> 1 `⛔ Cancelled`; 13 OPEN** (unchanged). ⚠️ Counted by me this run. The only board edit in this window: the
> `0355` close addendum's link to verify task `0358` now points at `done/` — `0358` (and `0363`) closed on
> [[decisions/sprint-8]] on 2026-10-03 ([[tasks/profile-deploy-version-tags-production-check]],
> [[tasks/telemetry-deploy-version-tags-production-check]]). ⚠️ **Not reflected on this board:** the 2026-10-03
> window shipped this sprint's committed work to production in game release `0.0.156` and profile
> `0.0.156-profile.1` — including `0367` (1-minute lobbies, now live) and the first profile deploy carrying `0309`.
> No row's text was updated for that here; see [[systems/weekend-deploy-window]].
>
> ---
>
> # 🆕 2026-10-02 (`957a56b`) — 36 ROWS, 13 OPEN (UNCHANGED): THREE DATED BOARD CORRECTIONS, NO STATUS OR RANK CHANGE
>
> **Re-counted at `HEAD` = `957a56b`, by each row's leading status glyph: 36 rows — 20 `✅ Done` · 9 `🔲 Backlog` ·
> 4 `🚧 Blocked` · 2 `➡️ Moved` · 1 `⛔ Cancelled`; 13 OPEN** (was 36 / 13). ⚠️ Counted by me this run.
>
> - 📌 **`0250` (rank 17) — slice S1 (the paid-state leak fix) WENT LIVE in the 2026-09-29 deploy.** The row and the
>   brief had said S1 was *"NOT deployed"* and waiting for a weekend slot; both now strike that and carry a dated
>   correction. Evidence on the board: commit `68303d5` is an ancestor of game tag `0.0.155` (tag commit `00825f0`,
>   2026-09-29); the profile deploy that evening ran from a checkout holding `68303d5` (runbook § *What happened
>   2026-09-29*); `src/profile-server/PublicProjection.ts` unchanged since. ✔️ **I re-checked the ancestry this run**
>   (`git merge-base --is-ancestor 68303d5 0.0.155` → yes). Source: the `fkit-reviewer` deploy-readiness review of
>   2026-10-02 (range `0.0.155..8a7f8c5`); OWNER RULING 2026-10-02 *"Yes, correct it (Recommended)"*, relayed by
>   `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent. 🚨 **Deployed, NOT verified in use** — the
>   runbook records N2's game checks and N3.2 (citizen bell message) as *not reported*. **Status stays `🚧 Blocked`,
>   rank unchanged** — S3b still waits on `0340`. See [[systems/player-profile-store]], [[systems/weekend-deploy-window]].
> - 📌 **`0369` (rank 33) and `0372` (rank 35) rows corrected** (owner request, live `fkit lead` session, relayed by
>   `fkit-lead`): `0369` — *"Not committed"* struck → **committed in `57f3147`; docs only, nothing to deploy**. `0372` —
>   *"Not committed"* struck → **committed in `0c9a620`; not deployed** (the deploy is still pending). This resolves
>   the "row still says *Not committed*" notes on both task pages and in the sections below.
> - Not on this board: `0374` (lobby windows end their joining mark on close — R1/R2 of the same 2026-10-02 review) was
>   filed on the **Backlog** board, placement unruled — see [[decisions/sprint-backlog]].
>
> ---
>
> # 2026-10-02 (`0c9a620`) — 36 ROWS, 13 OPEN: GOAL SET · `0372` ADDED AND DONE · `0219` G3/G4 STAY DEFERRED *(history — superseded above)*
>
> **Re-counted at `HEAD` = `0c9a620`, by each row's leading status glyph: 36 rows — 20 `✅ Done` · 9 `🔲 Backlog` ·
> 4 `🚧 Blocked` · 2 `➡️ Moved` · 1 `⛔ Cancelled`; 13 OPEN** (was 35 / 13). ⚠️ Counted by me this run.
>
> - 🎯 **Sprint goal set by OWNER RULING** (live `AskUserQuestion` in the `fkit lead` session — the owner typed his own
>   answer — relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent). Verbatim: ***"The goal is
>   bugfixes and extending citizenship/profiles features."*** ⚠️ The owner gave **no scope list, no success criteria
>   and no row changes** with it; none were added. **Still open:** the theme name (the H1 is still *"Sprint 7"*).
> - **`0219` G3/G4 stay deferred — OWNER RULING**, verbatim *"Keep deferred (Recommended)"* — even though `0285` and
>   `0289`, deferred alongside them on 2026-09-19, are now both closed. Status and rank unchanged.
> - **`0372` added at rank 35 and done (agent-closed — not owner-verified)** — [[tasks/stale-login-client-diagnostics]]:
>   client-only analytics for stale login signatures (A1 age by boot kind, A2 second-call `Newer`/`Same`/`Older`/`Failed`,
>   A3 held ms on `Ready`); login unchanged. Owner ruling *"Close it (Recommended)"*. Rank 35 is an **append rank**,
>   not merit — owner ruling *"Leave the number, start now (Recommended)"*; on merit it sits with `0366`. Code in
>   `0c9a620` (the row still says *"Not committed"* — written before the commit); 🚨 **not deployed** — targets the
>   2026-10-03/04 game deploy. Its partner **`0373`** (read the data, choose the fix) was filed on [[decisions/sprint-8]]
>   and owner-placed at rank 2 there.
> - `0340`'s brief: its gate is now preceded by `0372` + `0373`, and its `Depends on` line was repointed to `0373`.
>   `0339`'s brief and worklog carry a dated correction (`absent` exactly 1, `id_mismatch` 6) —
>   [[tasks/verified-login-live-check]].
>
> ---
>
> # 2026-10-02 (`57f3147`) — 35 ROWS, 13 OPEN: `0369` DONE · "NOT COMMITTED" CORRECTED *(history — superseded above)*
>
> **Re-counted at `HEAD` = `57f3147`, by each row's leading status glyph: 35 rows — 19 `✅ Done` · 9 `🔲 Backlog` ·
> 4 `🚧 Blocked` · 2 `➡️ Moved` · 1 `⛔ Cancelled`; 13 OPEN** (was 35 / 14). No `🔄 In progress` row remains. ⚠️ Counted
> by me this run.
>
> - **`0369` done (agent-closed — not owner-verified)** — [[tasks/alert-channel-ui-reenable-runbook]]: the runbook now
>   names the UI re-enable for a disabled alert channel (**Alerting → CHANNELS → row → `Unpause channel` ▶**) and warns
>   that *Test channel* is not a liveness signal. Owner ruling *"Close it (Recommended)"*. Doc-only. The row says
>   *"Not committed at close"*; the runbook edit is in `57f3147`.
> - **Board correction (owner request, relayed by `fkit-lead`):** the `0367`, `0368` and `0371` rows (and two addendum
>   notes) now strike *"Not committed"* and say **committed in `2247699` (2026-10-02); not deployed**. This resolves the
>   ⚠️ below about `0367`'s row reading "not committed".
> - Links to `0369` on the board and in the `0341` / `0368` briefs re-pointed from `backlog/` to `done/`.
>
> ---
>
> # 2026-10-02 (`2247699`) — 35 ROWS, 14 OPEN: `0367`, `0368`, `0371` DONE · `0371` MOVED IN *(history — superseded above)*
>
> **Re-counted at `HEAD` = `2247699`, by each row's leading status glyph: 35 rows — 18 `✅ Done` · 9 `🔲 Backlog` ·
> 4 `🚧 Blocked` · 1 `🔄 In progress` (`0369`) · 2 `➡️ Moved` · 1 `⛔ Cancelled`; 14 OPEN** (was 34 / 16). ⚠️ Counted by
> me this run.
>
> - **`0367` done (agent-closed — not owner-verified)** — [[tasks/public-lobby-one-minute]]: the public lobby window
>   cut 120 s → 60 s (prod + preprod), a test. **Committed in `2247699` (verified); not deployed** — weekend game-server
>   slot 2026-10-03/04 (the board row still reads "not committed", written before the commit). Closed over a red full
>   `npm test` by owner ruling *"Close + file both tasks (Recommended)"* — the red ruled pre-existing. "Before"
>   baseline: lone-real-player share 12.4 %. Verify task `0370` filed at the top of [[decisions/sprint-8]].
> - **`0368` done (agent-closed — not owner-verified)** — [[tasks/alert-channel-sql-reenable-runbook]]: the runbook's
>   SQL fallback for a disabled alert channel, plus `0289`'s idle result. Owner ruling *"Keep fix + close
>   (Recommended)"* also accepted a review fix that changes behaviour (the update now touches only a `disabled`
>   channel). 🚩 Command tested locally only, **not on the box**.
> - **`0371` filed, moved in, and done (agent-closed — not owner-verified)** — [[tasks/hardening-harness-speedup]]:
>   filed on the Backlog board at `0367`'s close; owner ruled *"Move into Sprint 7 (Recommended)"* → **rank 34**
>   (append position, ADR-035). The harness is fast again (255 s → 54 s alone, 740 checks unchanged); full `npm test`
>   green twice in a row. ⚠️ Accepted residual: heavy machine load can still cause a 150 s kill.
> - **Owner rulings on `0370` (2026-10-02):** the deploy day is **left out** of both 7-day windows; its Step 1 (re-run the
>   "before" query) is done **at the weekend deploy**, read-only, **when the owner asks** — it falls inside this sprint
>   and nobody runs it unprompted.
> - `0369` unchanged: `🔄 In progress`, runbook rewrite (step 6) pending.
>
> ---
>
> # 2026-10-01 (`e11f2eb`) — 34 ROWS, 16 OPEN: `0221`, `0341`, `0289` DONE · `0367`, `0368`, `0369` ADDED *(history — superseded above)*
>
> **Re-counted at `HEAD` = `e11f2eb`, by each row's leading status glyph: 34 rows — 15 `✅ Done` · 11 `🔲 Backlog` ·
> 4 `🚧 Blocked` · 1 `🔄 In progress` (`0369`) · 2 `➡️ Moved` · 1 `⛔ Cancelled`; 16 OPEN** (was 31 / 16). ⚠️ Counted by
> me this run.
>
> - **`0221` done (agent-closed — not owner-verified)** — [[tasks/profile-os-baseline-hardening]]. The owner ran every
>   live check (B1–B3 on 2026-09-26, B4 on 2026-10-01); **B5 and B6 closed as owner-accepted residuals, not passes.**
> - **`0341` done (agent-closed — not owner-verified)** — [[tasks/uptrace-channel-state-production-check]]: verification
>   passed; check 13 seen to trip; alerting down ≈ 3 min. 🚨 Channel re-enabled by **reverse SQL, not the UI** — the UI
>   step is unproven by it.
> - **`0289` done (agent-closed — not owner-verified)** — [[tasks/alert-delivery-after-idle]]: closed on **observed
>   evidence, no drill** (owner ruling), **bounded to 4 h 36 min**; an overnight gap is still unproven. Its runbook edit
>   rides `0368`.
> - **`0367` added, rank 31, `🔲 Backlog`, owner `fkit-coder`** — cut the public lobby wait from 2 minutes to 1 minute,
>   as a test. Owner rulings Q0–Q4: placed **directly below `0366`** with the top group (number stays 31, ADR-035), built
>   for the 2026-10-03/04 game-server deploy; keep 1 min if matches/day hold or rise **and** the lone-real-player share
>   does not jump noticeably; 7 days after vs 7 before; change only the number. A verify task is filed at close, not
>   before.
> - **`0368` added, rank 32, `🔲 Backlog`** — write `0341`'s proven SQL re-enable into the runbook as a fallback, mark the
>   UI step unproven, and (owner-confirmed) replace the runbook's *"idle delivery unproven"* lines with `0289`'s bounded
>   result.
> - **`0369` added, rank 33, `🔄 In progress`** — find the UI re-enable for a `disabled` channel and correct the runbook.
>   Live look (steps 1–5) done 2026-10-01: **`Unpause channel` (▶)** re-enables it; ⚠️ the *Test channel* button failed
>   silently 3×. The runbook rewrite (step 6) is pending.
> - Owner rulings: `0368`/`0369` split kept (*"Keep two"*); both **left at the bottom** — 32/33 are their real place.
>   `0366`'s row now reads committed in `e581824` (still **not deployed**) and placed directly below `0337`.
>
> ---
>
> # 2026-10-01 (`e581824`) — 31 ROWS, 16 OPEN: `0366` DONE *(history — superseded above)*
>
> **Re-counted at `HEAD` = `e581824`, by each row's leading status glyph: 31 rows — 12 `✅ Done` · 9 `🔲 Backlog` ·
> 6 `🚧 Blocked` · 1 `🔄 In progress` (`0341`) · 2 `➡️ Moved` · 1 `⛔ Cancelled`; 16 OPEN** (was 31 / 17). ⚠️ Counted by
> me this run.
>
> - **`0366` done (agent-closed — not owner-verified)** — [[tasks/stale-login-signature-age]]: new counter
>   `geoconflict.profile.login.verification.stale_age`, label `bracket`, 8 fixed values; the existing `outcome`
>   counter is unchanged. ⚠️ A bracket can include genuine signatures for a *different* id (`stale` is decided before
>   the id check). ⚠️ **Not deployed** — targets Saturday's (2026-10-03/04) profile deploy. ⚠️ The row's text says
>   *"Not committed"*; the code is in `e581824`, so that clause is now stale. Per Q2, reading the brackets is **not**
>   the close condition — it folds into the S2-exit re-check before `0340`, which stays not started.
>
> ---
>
> # 2026-10-01 (`4f9f857`) — 31 ROWS, 17 OPEN: `0339` FAILED, `0356` DONE, `0308` CANCELLED, `0366` ADDED *(history — superseded above)*
>
> **Re-counted at `HEAD` = `4f9f857`, by each row's leading status glyph: 31 rows — 11 `✅ Done` · 10 `🔲 Backlog` ·
> 6 `🚧 Blocked` · 1 `🔄 In progress` (`0341`) · 2 `➡️ Moved` · 1 `⛔ Cancelled`; 17 OPEN** (was 30 / 19). ⚠️ Counted by
> me this run. Every close is agent-closed — not owner-verified.
>
> - 🚨 **`0339` closed as a FAILED verification — S2 exit NOT met** ([[tasks/verified-login-live-check]]): ≈ 68 % `ok`,
>   ≈ 32 % `stale`, not falling; owner *"Agree"*. `0325` not reopened; **`0340` not started** and now waits on `0366`.
> - **`0366` added at rank 30** — measure how old `stale` login signatures are (a past/future age bracket on `stale`
>   only; profile server only). Filed on the Backlog board, then moved here the same day by owner ruling Q1 *"Move to
>   Sprint 7 (Recommended)"*. ⚠️ **Rank 30 is append rank, not merit** — flagged for owner confirmation; **on merit it
>   belongs directly below `0337`**, because it should ride Saturday's (2026-10-03/04) profile deploy (or wait until
>   `0297` §1 has read `0309`'s log line). Q2 *"Fold into the re-check (Recommended)"*: **no separate verify task** for
>   `0366` — an owner-ruled exception to the build/verify-split rule, for this task only.
> - **`0356` done** — telemetry deploys carry a version name ([[tasks/telemetry-deploy-version-tags]]); verify `0363`
>   at the top of [[decisions/sprint-8]]. ⚠️ Until it is committed, a real telemetry deploy refuses to run.
> - **`0308` cancelled — not reproduced** ([[tasks/player-name-lost-space]]); its leftovers became `0364` (hyphens and
>   apostrophes in matches) and `0365` (invisible-character names + look-alike warning), both on the Backlog board.
>
> ---
>
> # 2026-10-01 (`49a419d`) — 30 ROWS, 19 OPEN: NINE TASKS CLOSED, TWO ROWS ADDED *(history — superseded above)*
>
> **Re-counted at `HEAD` = `49a419d`, by each row's leading status glyph: 30 rows — 9 `✅ Done` · 10
> `🔲 Backlog` · 6 `🚧 Blocked` · 3 `🔄 In progress` · 2 `➡️ Moved`; 19 OPEN** (was 28 / 26). ⚠️ Counted by me this
> run. Every close is **`✅ Done (agent-closed — not owner-verified)`**, all on 2026-09-30, all committed, **none
> deployed** (latest game tag `0.0.155`):
>
> - **The reconnect run is finished:** `0347` [[tasks/rejoin-after-failed-match-start]] → `0348`
>   [[tasks/worker-start-failure-reporting]] → `0035` [[tasks/worker-reuses-page-map]]. `0035`'s dev-box proof is
>   verify task `0351` on [[decisions/sprint-8]].
> - **The lobby-close follow-ups are finished:** `0333` [[tasks/host-create-leaves-public-lobby]], `0334`
>   [[tasks/host-start-stops-after-window-close]], `0335` [[tasks/lobby-close-leftovers-investigation]] (report;
>   case 1 → `0228`, case 2 → `0252`, cases 3–4 accepted), and `0336` [[tasks/tenure-popup-never-over-match]].
> - **`0309` [[tasks/hmac-construction-log-label]] closed on LOCAL PROOF with NO RESULT** (owner: *"Move it into
>   0297"*). `0297` stays `🚧 Blocked` — its blocker is now **the profile deploy + a real purchase**, not `0309`.
> - **Two rows added 2026-09-30, owner-ruled TOP of the sprint** (appended at 28–29 because ADR-035 forbids
>   renumbering closed rows): **`0355`** — profile deploys carry a version name ([[tasks/profile-deploy-version-tags]],
>   **closed** the same day; verify `0358` on Sprint 8; rule recorded as
>   [[decisions/adr-117-server-deploy-version-names]]) — and **`0356`**, the same for the telemetry server (`🔲 Backlog`).
>   ⚠️ Their order against the other top groups (**Q8**) is **not ruled**.
> - **`0308` (player name loses its space) set `🔄 In progress`** 2026-09-30 by `fkit-lead`: plan re-approved, **waiting
>   on the owner's Step 0 snippet — no build before it.** `0339` and `0341` stay `🔄 In progress`.
> - 🚨 **Deploy ordering carried on the board:** the first tagged profile deploy must be the weekend slot that first
>   ships `0309`'s log line, and **no second profile deploy may come before `0297` §1 reads it** (container logs are
>   lost on recreate).
>
> ---
>
> # 2026-09-30 (`b434732`) — SPRINT 7 IS THE ACTIVE SPRINT: 28 ROWS, 26 OPEN *(history — superseded above)*
>
> **Re-counted at `HEAD` = `b434732`, by each row's leading status glyph: 28 rows — 18 `🔲 Backlog` · 6
> `🚧 Blocked` · 2 `🔄 In progress` · 2 `➡️ Moved`; 26 OPEN** (was 11, all open). ⚠️ Counted by me this run. The
> two `➡️ Moved` rows are older rows for `0339` and `0340` that now point at their newer rows on this same board
> (ADR-035 forbids reviving a closed row).
>
> - **Started 2026-09-29** — line-3 banner `🔄 In progress — 2026-09-29` (was `🔲 Backlog — 2026-09-27`), owner
>   ruling **R2** *"Yes, start Sprint 7 now (Recommended)"*, the same day [[decisions/sprint-6]] closed.
> - **Still no theme name and no goal** (both the owner's to set).
> - **The owner-ruled top of the board — three groups, run IN PARALLEL** (ruling **G1**, 2026-09-30, *"All in
>   parallel (Recommended)"*; each group keeps its own internal order):
>   1. `0337` — verify [[tasks/match-exit-keeps-query-string]] (`0331`) in production (rank 1; *"The verify task
>      should be put on top of the next sprint"*).
>   2. The reconnect run `0347` (a refresh after a failed match start can rejoin the match) → `0348` (worker
>      start failures report the real error, wait longer, stop the leftover worker) → `0035` (give the worker the
>      map the page already loaded; moved in from `sprint-backlog.md`). Owner ruling R1: *"to the top of the
>      Sprint 7"* — appended at 22–24 because ADR-035 forbids renumbering closed rows.
>   3. `0339` (verify `0325` S2 live) → `0341` (verify `0285` in production: deploy + disabled-channel drill) →
>      `0289` (idle-period Telegram alert proof, 🚧 blocked on `0341`). Moved from Sprint 6 by R1, ranks 25–27.
>      **`0339` and `0341` set `🔄 In progress` on 2026-09-30** (ruling **G2**): the deploy ran 2026-09-29 and
>      the watch has started; `0341` steps 1.3–1.5, 2 and 3 are still pending.
> - **Moved in on 2026-09-29:** `0340` (S3a enforce, from [[tasks/verified-login-shadow-mode]]) with the tasks
>   that depend on it — `0250` (🚧 slice S3b waits on `0340`), `0248`, `0301`; `0297` (🚧 blocked on `0309`) with
>   `0309` from the Backlog board; `0308` (plan approved, moved at its plan gate); epic `0213`.
> - ⚠️ **All ranks from 14 up are append positions, not merit ranks** — the board says so row by row.
>
> ---
>
> # 2026-09-28 (`68303d5`) — board created, not started *(history — superseded above)*
>
> ~~Line-3 banner: **`🔲 Backlog — 2026-09-27` — created, NOT started.** [[decisions/sprint-6]] is the active
> sprint.~~
>
> **Counted at `HEAD` = `68303d5`, by each row's leading status glyph: 11 rows — 8 `🔲 Backlog` · 3
> `🚧 Blocked`; all 11 OPEN.**

## Context

The board was created on **2026-09-27** to receive five rows the owner moved out of Sprint 6. Owner ruling,
typed in the `fkit lead` session and relayed by `fkit-lead` to a spawned `fkit-producer` (ADR-021/037; ⛔ not
producer precedent), verbatim: *"Move the tasks 0027, 0030, 0032, 0219, 0221 to the Sprint 7"*. **The owner
moved rows here; they did not start this sprint.**

- ⚠️ **No theme name — an open owner question.** The title is just *"Sprint 7"*.
- 🎯 **Goal — set 2026-10-02 by OWNER RULING**, verbatim: ***"The goal is bugfixes and extending citizenship/profiles
  features."*** Plain gloss: fixing bugs, and building out the citizenship and player-profile features. No scope list,
  success criteria or row changes came with it. *(History: from 2026-09-27 until that ruling there was no goal; the
  producer did not invent one.)*

## Decision

**The board at `957a56b` (2026-10-02)** — the same 13 open rows, ranks and statuses as at `0c9a620`. Only dated
corrections were added: 17 `0250` — S1 **deployed 2026-09-29** (not verified in use; still `Blocked`, S3b waits on
`0340`); 33 `0369` and 35 `0372` — *"Not committed"* corrected to committed (`57f3147` / `0c9a620`).

**The board at `0c9a620` (2026-10-02)** — the open rows are the same 13 as at `57f3147` below (`0219`'s G3/G4 deferral
re-affirmed by owner ruling; no rank or status changed). **Added and closed 2026-10-02:** 35 `0372` — `✅ Done
(agent-closed — not owner-verified)`.

**The board at `57f3147` (2026-10-02), open rows by rank** — ranks are positions, not merit (see above):

| Rank | Task | Status |
|---|---|---|
| 1 | `0337` verify `0331` in production | Backlog |
| — | `0027` New Maps — Community Demand (tracker; unranked ≠ low) | Backlog |
| 4 | `0030` S3-backed match archival | Backlog |
| 5 | `0032` client null-id errors | Blocked |
| 6 | `0219` profile P4 operability | Blocked |
| 8 | `0323` mark a server-confirmed approved name | Backlog |
| 9 | `0332` join token | Backlog |
| 14 | `0213` epic — profile backend + S3 | Backlog |
| 16 | `0340` `0325` S3a — mint verified sessions | Backlog |
| 17 | `0250` authenticated profile read | Blocked |
| 18 | `0248` suppress interstitial ads for paid citizens | Backlog |
| 19 | `0301` citizenship explainer popup | Backlog |
| 21 | `0297` paid citizenship owner-run test-buy | Blocked |

**Closed 2026-10-02 (later):** 33 `0369` — `✅ Done (agent-closed — not owner-verified)`.

*The table below is the board at `2247699` (2026-10-02), kept as history.*

**The board at `2247699` (2026-10-02), open rows by rank** — ranks are positions, not merit (see above):

| Rank | Task | Status |
|---|---|---|
| 1 | `0337` verify `0331` in production | Backlog |
| — | `0027` New Maps — Community Demand (tracker; unranked ≠ low) | Backlog |
| 4 | `0030` S3-backed match archival | Backlog |
| 5 | `0032` client null-id errors | Blocked |
| 6 | `0219` profile P4 operability | Blocked |
| 8 | `0323` mark a server-confirmed approved name | Backlog |
| 9 | `0332` join token | Backlog |
| 14 | `0213` epic — profile backend + S3 | Backlog |
| 16 | `0340` `0325` S3a — mint verified sessions | Backlog |
| 17 | `0250` authenticated profile read | Blocked |
| 18 | `0248` suppress interstitial ads for paid citizens | Backlog |
| 19 | `0301` citizenship explainer popup | Backlog |
| 21 | `0297` paid citizenship owner-run test-buy | Blocked |
| 33 | `0369` find the UI re-enable and correct the runbook | **In progress** |

**Closed 2026-10-02** (all `✅ Done (agent-closed — not owner-verified)`): 31 `0367`, 32 `0368`, 34 `0371`.

*The table below is the board at `e11f2eb` (2026-10-01), kept as history.*

**The board at `e11f2eb` (2026-10-01), open rows by rank** — ranks are positions, not merit (see above):

| Rank | Task | Status |
|---|---|---|
| 1 | `0337` verify `0331` in production | Backlog |
| — | `0027` New Maps — Community Demand (tracker; unranked ≠ low) | Backlog |
| 4 | `0030` S3-backed match archival | Backlog |
| 5 | `0032` client null-id errors | Blocked |
| 6 | `0219` profile P4 operability | Blocked |
| 8 | `0323` mark a server-confirmed approved name | Backlog |
| 9 | `0332` join token | Backlog |
| 14 | `0213` epic — profile backend + S3 | Backlog |
| 16 | `0340` `0325` S3a — mint verified sessions | Backlog |
| 17 | `0250` authenticated profile read | Blocked |
| 18 | `0248` suppress interstitial ads for paid citizens | Backlog |
| 19 | `0301` citizenship explainer popup | Backlog |
| 21 | `0297` paid citizenship owner-run test-buy | Blocked |
| 31 | `0367` public lobby wait 2 min → 1 min, a test (owner-placed directly below `0366`) | Backlog |
| 32 | `0368` runbook: SQL re-enable for a disabled alert channel | Backlog |
| 33 | `0369` find the UI re-enable and correct the runbook | **In progress** |

**Closed 2026-10-01** (all `✅ Done (agent-closed — not owner-verified)`): 7 `0221`, 25 `0339` (a FAILED verification),
26 `0341`, 27 `0289`, 29 `0356`, 30 `0366`. Cancelled: 15 `0308`.

*The table below is the board at `49a419d` (2026-10-01), kept as history.*

| Rank | Task | Status |
|---|---|---|
| 1 | `0337` verify `0331` in production | Backlog |
| — | `0027` New Maps — Community Demand (tracker; unranked ≠ low) | Backlog |
| 4 | `0030` S3-backed match archival | Backlog |
| 5 | `0032` client null-id errors | Blocked |
| 6 | `0219` profile P4 operability | Blocked |
| 7 | `0221` profile P6 OS hardening | Blocked |
| 8 | `0323` mark a server-confirmed approved name | Backlog |
| 9 | `0332` join token | Backlog |
| 14 | `0213` epic — profile backend + S3 | Backlog |
| 15 | `0308` player name loses its space | **In progress** (waiting on the owner's Step 0 snippet) |
| 16 | `0340` `0325` S3a — mint verified sessions | Backlog |
| 17 | `0250` authenticated profile read (S1 built; S3b waits on `0340`) | Blocked |
| 18 | `0248` suppress interstitial ads for paid citizens | Backlog |
| 19 | `0301` citizenship explainer popup | Backlog |
| 21 | `0297` paid citizenship owner-run test-buy | Blocked — **now on the profile deploy + a real purchase** |
| 25 | `0339` verify `0325` S2 live | In progress |
| 26 | `0341` verify `0285` in production | In progress |
| 27 | `0289` idle-period alert proof | Blocked (on `0341`) |
| 29 | `0356` telemetry deploys carry a version name (owner-ruled top, after `0355`) | Backlog |

**Closed 2026-09-30** (all `✅ Done (agent-closed — not owner-verified)`): 10 `0333`, 11 `0334`, 12 `0335`, 13
`0336`, 20 `0309`, 22 `0347`, 23 `0348`, 24 `0035`, 28 `0355`.

*The table below is the board at `b434732` (2026-09-30), kept as history.*

| Rank | Task | Status |
|---|---|---|
| 1 | `0337` verify `0331` in production | Backlog |
| — | `0027` New Maps — Community Demand (tracker; unranked ≠ low) | Backlog |
| 4 | `0030` S3-backed match archival | Backlog |
| 5 | `0032` client null-id errors | Blocked |
| 6 | `0219` profile P4 operability | Blocked |
| 7 | `0221` profile P6 OS hardening | Blocked |
| 8 | `0323` mark a server-confirmed approved name | Backlog |
| 9 | `0332` join token | Backlog |
| 10–13 | `0333`, `0334`, `0335`, `0336` (lobby-close and tenure-popup follow-ups) | Backlog |
| 14 | `0213` epic — profile backend + S3 | Backlog |
| 15 | `0308` player name loses its space | Backlog |
| 16 | `0340` `0325` S3a — mint verified sessions | Backlog |
| 17 | `0250` authenticated profile read (S1 built; S3b waits on `0340`) | Blocked |
| 18 | `0248` suppress interstitial ads for paid citizens | Backlog |
| 19 | `0301` citizenship explainer popup | Backlog |
| 20 | `0309` record which Yandex HMAC construction a real purchase matches | Backlog |
| 21 | `0297` paid citizenship owner-run test-buy (blocks closing only on `0309`) | Blocked |
| 22–24 | `0347` → `0348` → `0035` the reconnect run (owner-ruled top) | Backlog |
| 25 | `0339` verify `0325` S2 live | In progress |
| 26 | `0341` verify `0285` in production | In progress |
| 27 | `0289` idle-period alert proof | Blocked (on `0341`) |

*The table below is the board as created (2026-09-27/28), kept as history; its ranks have since shifted.*

| Rank | Task | Status | Where it came from |
|---|---|---|---|
| — | `0027` New Maps — Community Demand (tracker, unranked ≠ low) | Backlog | Sprint 6 |
| 1 | `0030` S3-backed match archival (citizen-gated) | Backlog | Sprint 6 (position rank carried, **not** a merit rank) |
| — | `0032` investigate & fix client null-id errors | Blocked (deploy slot, then a ≥ 24 h re-measure) | Sprint 6 |
| — | `0219` profile P4 operability (G1/G2 core; G3/G4 deferred) | Blocked | Sprint 6 |
| — | `0221` profile P6 OS baseline hardening | Blocked (built + reviewed 2026-09-13) | Sprint 6 |
| 5 | `0323` mark a server-confirmed approved name in matches | Backlog | `0317` ruling D5 — *"…add it to the end of the end of the next sprint"*; depends on `0322` |
| 6 | `0332` join token — the game server has the profile server vouch for a verified session | Backlog | owner, 2026-09-28 — *"File it, end of Sprint 7 (Recommended)"*; on merit directly above `0323`, which depends on it |
| 7 | `0333` closing the host window before the private lobby exists leaves the player in a public lobby | Backlog | `0327` review R2, an owner-ruled known bug |
| 8 | `0334` host Start still sends `start_game` after the window closed during the settings save | Backlog | `0327` review R1, an owner-ruled known bug |
| 9 | `0335` investigate the four known lobby-close leftovers from `0327` | Backlog | `0327` plan residuals |
| 10 | `0336` tenure gift popup can open over a lobby or match on a quick-join | Backlog | `0329` review R3 — *"End of Sprint 7 (Recommended)"* |

⚠️ Ranks 6–10 are **append ranks**, not merit ranks — the board itself says so for each.

## Consequences

- `0332` is the step ADR-115 names as the **expected exit** for its forged-id residual: with `0325` (verified
  login), it lets `getCreditableYandexId` verify inside the funnel with no change to `0322`'s code. `0323`
  (the mark) must be decided against ADR-115's *"presented as confirmed identity"* condition before it ships.
- Five rows are profile/ops carry-overs from Sprint 4 via 5 and 6; the other six are Sprint 6 follow-ups.

## Related

- [[decisions/sprint-6]] — the board these rows came from (closed 2026-09-29)
- [[decisions/adr-115-approved-name-in-matches]] — `0323` and `0332`'s place in the trust story
- [[tasks/approved-name-in-matches-investigation]] — task `0317`, ruling D5 (`0323`)
- [[tasks/private-lobby-close-leaves-lobby]] — task `0327`, source of `0333`–`0335`
- [[tasks/citizenship-card-late-recovery-recheck]] — task `0329`, source of `0336`
- [[decisions/sprint-5]] — its `0030`, `0032`, `0219`, `0221` rows now point here
- [[decisions/sprint-4]] — its moved rows for the same four tasks now point here
- [[decisions/product-strategy]] — `plan-index.md` lists this board
- [[decisions/sprint-8]] — the next board, created 2026-09-29, not started
- [[tasks/verified-login-shadow-mode]] — task `0325`; its S3a (`0340`) and live check (`0339`) sit here
- [[decisions/adr-116-verified-login]] — the verified-login decision `0339` / `0340` carry out
- [[tasks/match-exit-keeps-query-string]] — task `0331`; its live check `0337` is rank 1 here
- [[tasks/match-exit-query-string-production-check]] — task `0337`, rank 1, closed 2026-10-04 (agent-closed — not owner-verified): P1 passed
- [[systems/weekend-deploy-window]] — the 2026-09-29 deploy that `0337`, `0339` and `0341` verify
- [[decisions/sprint-backlog]] — `0309` and `0035` moved here from the Backlog boards 2026-09-29
- [[decisions/adr-108-active-sprint-pointer]] — the active-sprint rule; this board's line-3 banner makes it the active sprint
- [[tasks/uptrace-channel-state-check]] — task `0285`, whose production check `0341` sits here
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`, whose forged-id case waits on `0332` here
- [[tasks/rejoin-after-failed-match-start]] — task `0347`, closed 2026-09-30 (reconnect run, 1 of 3)
- [[tasks/worker-start-failure-reporting]] — task `0348`, closed 2026-09-30 (reconnect run, 2 of 3)
- [[tasks/worker-reuses-page-map]] — task `0035`, closed 2026-09-30 (reconnect run, 3 of 3)
- [[tasks/host-create-leaves-public-lobby]] — task `0333`, closed 2026-09-30
- [[tasks/host-start-stops-after-window-close]] — task `0334`, closed 2026-09-30
- [[tasks/lobby-close-leftovers-investigation]] — task `0335`, closed 2026-09-30
- [[tasks/tenure-popup-never-over-match]] — task `0336`, closed 2026-09-30
- [[tasks/hmac-construction-log-label]] — task `0309`, closed 2026-09-30 on local proof, no result
- [[tasks/profile-deploy-version-tags]] — task `0355`, closed 2026-09-30; `0356` follows it here
- [[decisions/adr-117-server-deploy-version-names]] — ADR-117, the naming rule `0355` built and `0356` reuses
- [[tasks/verified-login-live-check]] — task `0339`, closed 2026-10-01 as a FAILED verification; follow-up `0366` sits here
- [[tasks/telemetry-deploy-version-tags]] — task `0356`, closed 2026-10-01; verify `0363` on Sprint 8
- [[tasks/player-name-lost-space]] — task `0308`, cancelled 2026-10-01 (not reproduced)
- [[tasks/stale-login-signature-age]] — task `0366`, rank 30, closed 2026-10-01 (agent-closed — not owner-verified); committed in `e581824`, not deployed; owner-placed directly below `0337`
- [[tasks/profile-os-baseline-hardening]] — task `0221`, rank 7, closed 2026-10-01 (B5/B6 owner-accepted residuals)
- [[tasks/uptrace-channel-state-production-check]] — task `0341`, rank 26, closed 2026-10-01 (passed; SQL re-enable, UI unproven)
- [[tasks/alert-delivery-after-idle]] — task `0289`, rank 27, closed 2026-10-01 on observed evidence, bounded to 4 h 36 min
- [[systems/alert-delivery]] — the alert path `0341`, `0289`, `0368` and `0369` concern
- [[tasks/public-lobby-one-minute]] — task `0367`, rank 31, closed 2026-10-02 (agent-closed — not owner-verified); committed in `2247699`, not deployed; verify `0370` on Sprint 8
- [[tasks/alert-channel-sql-reenable-runbook]] — task `0368`, rank 32, closed 2026-10-02 (runbook SQL fallback; tested locally only)
- [[tasks/hardening-harness-speedup]] — task `0371`, rank 34, moved in from the Backlog board and closed 2026-10-02
- [[tasks/alert-channel-ui-reenable-runbook]] — task `0369`, rank 33, closed 2026-10-02 (UI re-enable named; Test-channel warning)
- [[systems/player-profile-store]] — where `0250` S1 (rank 17, deployed 2026-09-29) lives
- [[tasks/stale-login-client-diagnostics]] — task `0372`, rank 35, added and closed 2026-10-02 (agent-closed — not owner-verified); committed in `0c9a620`, not deployed; `0373` reads it (moved here from Sprint 8 at rank 36 on 2026-10-04)
- [[tasks/profile-deploy-version-tags-production-check]] — task `0358`, `0355`'s verify on Sprint 8: passed, closed 2026-10-03
- [[tasks/telemetry-deploy-version-tags-production-check]] — task `0363`, `0356`'s verify on Sprint 8: passed, closed 2026-10-03
- [[tasks/client-null-id-errors]] — task `0032`, rank 5, closed 2026-10-04 (agent-closed — not owner-verified): Step 5 Uptrace re-check passed
- [[tasks/private-lobby-citizen-perk]] — the release gate behind `0354`, `0377`, `0380` (ranks 37–39, moved in 2026-10-04)
- [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] — the decision `0380` (rank 38) builds the code half of
- [[tasks/verified-login-enforce]] — task `0340` (rank 16), S3a built; deploy in `0395` (rank 45)
- [[tasks/authenticated-profile-read]] — task `0250` (rank 17), closed 2026-10-06; S3b not deployed
- [[tasks/paid-citizenship-test-buy]] — task `0297` (rank 21), closed 2026-10-05 with three checks waived
- [[tasks/stale-login-fix-decision]] — task `0373` (rank 36), closed 2026-10-05
- [[tasks/private-lobby-tester-default]] — task `0354` (rank 37)
- [[tasks/yandex-invite-copies-code]] — task `0380` (rank 38)
- [[tasks/private-lobby-idle-end]] — task `0377` (rank 39)
- [[tasks/host-window-poll-before-lobby]] — task `0353` (rank 40)
- [[tasks/lobby-window-joining-mark]] — task `0374` (rank 41)
- [[tasks/private-lobby-code-format]] — task `0389` (rank 42)
- [[tasks/login-signature-24h-window]] — task `0391` (rank 43), deployed 2026-10-06
- [[decisions/adr-121-login-signature-24h-window]] — the 24 h window decision behind `0391`
- [[decisions/adr-122-stale-login-gate-owner-judgment]] — no fixed bar for `0340`'s deploy
- [[tasks/paid-citizen-ad-free]] — task `0248` (rank 18), closed 2026-10-06; committed, not deployed; live check `0398` on Sprint 8
- [[tasks/session-verified-status-line]] — task `0397` (rank 46), added and closed 2026-10-06; committed, not deployed; live check `0400` on Sprint 8
- [[tasks/jest-worker-cap]] — task `0399` (rank 47), added and closed 2026-10-06
