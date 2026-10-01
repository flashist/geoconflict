# Sprint 7 *(no theme name yet)*

**Date**: 2026-09-27
**Status**: proposed *(page-type field; the board is **🔄 In progress since 2026-09-29** — see below)*

> Source: `ai-agents/sprints/plan-sprint-7.md`.
>
> # 🆕 2026-10-01 (latest, `e581824`) — 31 ROWS, 16 OPEN: `0366` DONE
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
- ⚠️ **No goal set.** The producer did not invent one. The source describes the contents, not a goal.

## Decision

**The board at `49a419d` (2026-10-01), open rows by rank** — ranks are positions, not merit (see above):

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
- [[tasks/stale-login-signature-age]] — task `0366`, rank 30, closed 2026-10-01 (agent-closed — not owner-verified); not deployed
