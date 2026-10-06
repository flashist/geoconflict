# Accept login signatures up to 24 hours old, checking the player first

## ID
0391

> ℹ️ **ID allocation, checked 2026-10-05 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest task folder and
> highest `## ID` on all three boards: `0390`. `0391`, `0392` and `0393` allocated in this run, in dependency order.
> No `.claude/` or board hit for any of the three.

## Sprint
Sprint 7

## Priority
43

> ⚠️ **Priority 43 is append rank, NOT a merit ranking — flagged for owner confirmation.** The owner named the sprint
> (*"Fix: Sprint 7, check: Sprint 8 (Recommended)"*), not a rank; appended after the
> [Sprint 7 board](../../../sprints/plan-sprint-7.md)'s highest (42, `0389`), never inserted (ADR-035).
> **On merit this belongs directly below `0373`**, because it is the fix `0373` chose and it is the next step on the
> chain that blocks `0340` (and `0250` S3b, `0332`, `0323`, `0319`, `0248`, `0301` behind it). `0373` itself sits at
> append rank 36 and is read as "worked before `0340`" — read this one the same way, whatever the number says.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**Filed 2026-10-05 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given
2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`.** ⛔ Not producer precedent.

**The owner's choice (Step 4 of [`0373`](../../done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md)), verbatim:
"24 hours (Recommended)".** The option text, as relayed:
- leaves ~2.5% of logins (~50 players/day) stale;
- server-only, ~1 day, can ship 10/11 Oct;
- a stolen note works up to ~48h instead of ~24h;
- in every option the server first checks the note belongs to the right player, and the game logs in again if the
  player switches Yandex accounts.

Other rulings the same day: the S2-exit "good enough" threshold is **"At most 5% (Recommended)"** — stale share on
the server, over 7 days after this fix ships (checked by [`0392`](../../backlog/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md));
placement **"Fix: Sprint 7, check: Sprint 8 (Recommended)"**.

**The problem, in plain terms.** About 1 login in 3 (≈34% on the server, 3–5 Oct) fails the freshness part of the
login signature check. `0373` found why: each match exit reloads the game, each reload is a new login, and **Yandex
hands back the same signed player data ("the note") for the whole visit** — so any reload more than 15 minutes into a
visit looks stale. Asking Yandex again returns the same note ≈99% of the time, and ≈58% of stale notes are 30 min to
6 h old, so neither a client refetch nor a small window nudge helps. Full readings:
[`0373` worklog](../../done/0373-read-the-stale-login-data-and-choose-the-fix/worklog.md) and
[`2026-10-05-0373-stale-login-findings.md`](../../../knowledge-base/reports/2026-10-05-0373-stale-login-findings.md).

**The security rule this changes.** [ADR-116](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
set the freshness window (900 s old / 300 s ahead). **[ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md)
(accepted 2026-10-05, supersedes ADR-116 in part)** records the move to 24 h, the id-first order, the re-login on
account switch, and the ≤5% gate. **Read it first — build to it.** If its text differs from this brief, the ADR wins;
raise the difference with the owner in the plan, don't pick silently. Its accepted residual R1 (*a stolen signature
works up to ~48 h*) is closeout of that ADR, not a new defect, if a reviewer raises it.

**Still shadow mode.** This task changes only how logins are *classified and counted*. Every session stays
`vfy:false`; login never refuses because of the signature (ADR-116's fail-open rule). Minting `vfy:true` is
[`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md), which waits on this fix, its re-check `0392`, and a
separate owner approval to enforce.

### ⚠️ Not purely server-only — flagged, not decided

The owner's option text called this fix **"server-only, ~1 day"**. The architect consult and the Yandex-docs research
found a **small game-side (client) change** belongs with it (see *What to build → Client*), which would mean a **game
deploy as well as a profile deploy**. **The coder's plan must say whether the client part is needed now or can be
split into its own task**, and put that to the owner at the plan gate. This brief does not decide it. If the client
part ships now, the "~1 day" and "server-only" in the owner's option text no longer hold exactly; say so in the plan.

## What to build

The coder's plan may re-ground line numbers (they are from 2026-10-05) but not widen scope.

### Server (profile server)
1. **Widen the window.** `LOGIN_SIGNATURE_MAX_AGE_SECONDS` in `src/profile-server/PlayerSignature.ts` (~line 39):
   **900 → 86,400 s** (24 h). The future limit, `LOGIN_SIGNATURE_MAX_FUTURE_SECONDS`, **stays 300 s**.
2. **Return the signed id for old payloads too.** Today the stale branch in `verifySignedPlayer`
   (`PlayerSignature.ts` ~135–139) returns only `status` + `ageBracket`, so the caller cannot compare ids. Return the
   signed player id on the stale result as well. It must stay inside the server — never logged, never in a counter
   label, never in a response.
3. **Check the player before the age.** In `classifyLoginSignature` (`src/profile-server/LoginVerification.ts`), move
   the id comparison (~`:45`) **above** the age check (~`:34`). Result: a genuine note for someone else is
   `id_mismatch` whatever its age; `stale` now means **"right player, too old"**. (This closes the gap `0373`'s brief
   flagged: today a stale login's id is never checked.)
4. **Stale-age brackets — the plan must decide (ADR-121 leaves it to this task).** The `0366` brackets below 24 h
   (`past_15m_20m` … `past_6h_24h`) become unreachable; only `past_over_24h` (and the `future_*` pair) stay. Decide
   whether to drop the dead ones and/or add brackets that say **how far past the new edge** a stale note was — a small
   fixed set, never the raw age (the `0366` rule). Keep the **`outcome` counter's name and values unchanged**, so
   `0392`'s re-check reads the same series as `0339`/`0373`.
5. **Tests** for all of the above (see *Verification*), plus every existing test that pins 900 s updated with a note.
6. **Comments** that state "15 min" / "900 s" updated to the new window and ADR-121 — including the bracket and
   outcome comments in `src/profile-server/Telemetry.ts` (~lines 102–122), which ADR-121 names.

### Client (game) — the coder's plan decides now vs split
7. **Log in again after the player may have switched Yandex accounts** (ADR-121 Decision 3). With a 24-hour window, a
   note for the previous account could still be in date; a fresh login makes the profile session follow the account
   the player now uses. This is what the owner's option text means by *"the game logs in again if the player
   switches Yandex accounts"*.
   - **`ACCOUNT_SELECTION_DIALOG_CLOSED`: `src/client` has NO handler today** (ADR-121 *Open*, grep 2026-10-05). The
     plan must **add it or explicitly defer it** (with the owner's OK at the plan gate) — not leave it unsaid.
   - **`openAuthDialog`** (`src/client/flashist/FlashistFacade.ts` ~2057) **already re-fetches the player object**.
     The plan confirms whether a fresh **profile login** follows that re-fetch, and adds one if not.
8. **The 300 s client refetch (ADR-116 B4 / `0372`'s `Refetch` path) — the plan must decide.** With a 24 h window it
   becomes near-useless (and `0373` saw `Same` ≈99%). Keep it (it also feeds the `Refetch` diagnostics), simplify it,
   or remove it — the plan names the choice and its effect on `0372`'s GameAnalytics events. ADR-121 leaves this to
   this task.

### Out of scope
- Minting `vfy:true` (`0340`). Any route reading `verified` (`0250` S3b, `0319`, `0332`, `0323`).
- Any player-facing message for notes over 24 h old — that is the watch task
  [`0393`](../../backlog/0393-watch-paid-citizens-with-login-data-over-24-hours-old-and-decide-on-a-reopen-message/brief.md),
  and the owner ruled **no forced popup**.
- Storing the session token across reloads (fix (b) in `0373`) — not chosen.

### Deploy
- **Profile deploy**, weekend slot (the option text: *"can ship 10/11 Oct"*); plus a **game deploy** if the client
  part ships now. Record in the worklog the deploy date and the **first post-deploy UTC time** — `0392`'s 7-day window
  starts there.
- ⚠️ The profile deploy restarts the server counters. Never compare a cumulative value across the restart.
- **Rollback** to the previous profile build is safe: it only narrows classification back to 900 s; sessions are
  `vfy:false` either way. Say this in the worklog's deploy entry.

## Verification steps

1. **Inside the window, right player:** a validly signed note for the asserted player, 23 h 59 m old ⇒ outcome `ok`.
2. **Edges:** exactly 86,400 s old ⇒ `ok`; 86,401 s old ⇒ `stale` with the over-24 h bracket; 301 s in the future ⇒
   `stale` (future limit unchanged); 300 s ahead ⇒ `ok`.
3. **Player first:** a validly signed note for player A sent as player B ⇒ `id_mismatch` **both** when it is 1 min old
   **and** when it is 3 days old (never `stale`).
4. **Signed id never leaks:** the existing no-leak test (no signature or id in any log write, counter label or
   repository call) still passes and covers the stale path that now carries the id.
5. **Brackets:** each new bracket edge is unit-tested; no raw age appears in any label.
6. **Fail-open unchanged:** missing secret, bad signature, absent signature, stale, id mismatch ⇒ login still 200
   with a `vfy:false` session; response shape unchanged.
7. **Client (if built now):** a test or a recorded manual check that closing the account-selection dialog and
   completing `openAuthDialog` each trigger one fresh profile login; no login loop. **If deferred:** the plan records
   the owner's OK to defer and a follow-up task id. Either way, the worklog states the B4 refetch decision (step 8).
8. `npm test` green. If a known `supertest` flake or `0197`'s segfault shows, re-run and say so (CLAUDE.md).
9. Deploy recorded in the worklog (date, first post-deploy UTC time, rollback note).
10. No secret, key, real player id, signature, token, host or IP in any artifact; fixtures use synthetic keys.

**This task's production proof is [`0392`](../../backlog/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md)**
(the owner's build/verify rule, 2026-09-29): this task closes when built, reviewed and deployed; the 7-day share is
read there.

## Notes

- **Depends on:** [`0373`](../../done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (hard — the owner's choice
  of fix and threshold). The design record, [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md),
  is already accepted (2026-10-05).
- **Blocks:** [`0392`](../../backlog/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) (the S2-exit
  re-check) → [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md). Also feeds
  [`0393`](../../backlog/0393-watch-paid-citizens-with-login-data-over-24-hours-old-and-decide-on-a-reopen-message/brief.md)
  (the watch task starts after this ships).
- **Expected stale share after the fix: ~2.5%** — only `past_over_24h` stays stale: 417 of ~16.6K server logins,
  3 Oct 10:04Z → 5 Oct ~14:00Z (`0373` worklog). Threshold: **≤5%**. `id_mismatch` was 6 of ~16.6K (~0.04%), so moving
  the id check first barely changes what counts as stale, and the re-check stays comparable with `0339`/`0373`.
- **Not explained by this fix:** some first-boot stale notes are 6 h+ old; those under 24 h are now accepted, those
  over 24 h stay stale — that residue is the ~2.5% and the subject of `0393`.
- **Related:** [ADR-116](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
  (superseded in part by ADR-121), `0366` (the brackets), `0372` (the client diagnostics),
  [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (its *Freshness window* bullet is answered by this
  task).
- **Effort:** ~1 day server (the owner's option text); the client part, if included, is extra. Estimates, not
  measurements.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
