# ~~Verify 0391 live — stale login share at most 5% over 7 days (the S2-exit re-check)~~ ~~read the post-0391 login numbers whenever the owner needs them~~ Read the post-0391 login numbers before the 0340 deploy

> 📌 **Re-scoped 2026-10-05 by owner ruling** — no fixed 7-day window, no fixed ≤5% pass bar, gates nothing on its own.
> See the 2026-10-05 **re-scope** note at the end. ~~The folder name keeps the old wording (no rename was run).~~
> 📌 **2026-10-05, latest:** moved to Sprint 7, folder renamed, closes after the owner's call on `0340` — see the
> **move / close / rename** note at the very end.

## ID
0392

> ℹ️ **ID allocation, checked 2026-10-05 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0390`. `0391`–`0393` allocated in this run, in dependency order.

## Sprint
Sprint 7

*(Earlier value, kept as history — true until 2026-10-05, latest:)* ~~Sprint 8~~ — moved by OWNER RULING *"Move to Sprint 7 (Recommended)"* (see the note at the end).

## Priority
44

> 📌 **2026-10-05, latest — 44 is ADR-035 append rank on [Sprint 7](../../../sprints/plan-sprint-7.md), not a merit rank.**
> Appended after that board's highest (43, `0391`). On merit: worked once `0391`'s Tue 6 Oct deploy has some data, and
> before `0340`'s deploy at the 10/11 Oct slot. The note below about rank 8 describes the Sprint 8 board and is history.
>
> *(Earlier value, kept as history — on Sprint 8:)* ~~8~~

> ⚠️ **Priority 8 is append rank, NOT a merit ranking — flagged for owner confirmation.**
> **On merit this belongs directly below `0370`**, because the owner placed it at the top of Sprint 8 (*"Fix: Sprint
> 7, check: Sprint 8 (Recommended)"*, 2026-10-05, applying the 2026-09-29 build/verify rule), and `0370` holds rank 1
> by an earlier ruling. Among the open verify rows it is also the one with the most work waiting behind it (`0340` and
> six tasks after that).
>
> **"Top" conflicts with ADR-035, stated plainly.** On the [Sprint 8 board](../../../sprints/plan-sprint-8.md), ranks
> 2–4 are closed rows (`0373` ➡️ Moved, `0363` ✅ Done, `0358` ✅ Done). Putting this task at rank 1 or 2 would
> renumber them, which ADR-035 forbids *"not even under an owner ruling"*; a new row always appends, and a spawned
> producer never re-ranks. So it was **appended at 8** — the same branch taken for `0390`. **Read it as top group,
> worked first among the open verify rows, whatever the number says.** Owner decision: keep 8, or rule a placement
> that renumbers no closed row.

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **MAY BE EXECUTED BY THE OWNER, or by an agent session with the owner's approval for read-only
SSH.** The reading is read-only (`SELECT` only, `--readonly=1`). The owner approved read-only SSH for `0373`'s reads on
2026-10-05 (*"Regarding reading only ssh to a server: I give you my approve."*); confirm that approval still covers
this task before an agent runs it. **The pass/fail call is recorded against the owner's threshold; the next step on a
fail is the owner's.**

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — the same form as
[`0370`](../0370-verify-0367-in-production-1-minute-public-lobbies-vs-the-2-minute-baseline/brief.md).)*

## Context

**Filed 2026-10-05 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on OWNER RULINGS given
2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`.** ⛔ Not producer precedent.
Verbatim:
- ~~Good-enough threshold: **"At most 5% (Recommended)"** — stale share on the server, over 7 days after the fix ships.
  It gates starting `0340`.~~ *(Superseded 2026-10-05 by owner ruling — see the re-scope note at the end.)*
- Placement: **"Fix: Sprint 7, check: Sprint 8 (Recommended)"** — this is the check: the ~~7-day S2-exit re-check~~
  post-deploy read after deploy, at the top of Sprint 8 per the 2026-09-29 build/verify rule.

**What this verifies.** [`0391`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md)
widens the login-signature freshness window from 15 min to 24 h and checks the player id before the age. `0373`
predicts the server stale share falls from ≈34% to **~2.5%** (only notes over 24 h old stay stale). This task reads
the real share ~~over 7 days and compares it with the owner's threshold~~ over whatever post-deploy data exists when the
owner needs it, and records the owner's call (2026-10-05 re-scope).

**What "stale" means now.** Since `0391` the id is checked first, so `stale` = "right player, note too old". Before
it, `stale` also hid any id mismatch on an old note. `id_mismatch` was ~0.04% (6 of ~16.6K) in `0373`'s window, so the
two readings stay comparable; record both anyway.

### Preconditions
- `0391` is **committed** (the owner commits) and shipped in a **profile deploy** (target ~~weekend slot 10/11 Oct~~
  **Tue 6 Oct 2026**, owner-run, mid-week exception by owner ruling 2026-10-05). Record the deploy date and the first
  post-deploy point. If `0391`'s client part shipped too, record the game deploy date as well.
- ~~**7 full days** of data since the first post-deploy point. Earliest read if it ships 10/11 Oct: 17/18 Oct (UTC).~~
  **Whatever data exists since the first post-deploy point** when the owner needs it (owner ruling 2026-10-05). First
  read: before the 10/11 Oct weekend slot (≈ 3–4 days of data if `0391` ships Tue 6 Oct).
- Read-only access to the telemetry box. ⚠️ Unreachable while a full-tunnel VPN is on (project memory note).

## What to build

Nothing — this is a check. Same method as `0373`'s Step 1 (its worklog, *INTERIM Step 1 (server)*).

1. **Outcome counter** (`geoconflict_profile_login_verification`, label `outcome`), summed over ~~the 7 days from the
   first post-deploy point~~ the window (see the 2026-10-05 note at the end of this step): counts of every outcome (`ok`, `stale`, `id_mismatch`, `absent`, `bad_*` if any).
   **Stale share = stale ÷ all outcomes** — the same denominator as `0339`/`0373`. *(2026-10-05: the window is
   ~~the 7 days~~ first post-deploy point → the time of the read; report `ok`, `stale`, `id_mismatch` and
   `bad_payload` counts and shares explicitly every read.)*
2. **Per day and per hour of day (UTC)**, the stale share — to see that no day or evening hides a problem. Informational;
   the pass rule is the 7-day share.
3. **Stale-age brackets** (as reworked by `0391`) over the same window.
4. **`id_mismatch` share** over the same window, next to the ~0.04% baseline.
5. ⚠️ **The profile deploy restarts the counters.** Read only inside the post-deploy window; never subtract or compare
   a cumulative value across a restart. If another profile deploy lands inside the ~~7 days~~ window, say so and treat the window
   as two pieces.

## Verification steps

1. The worklog records the deploy date, the window (UTC start and end), the source, and every count and share above.
2. ~~**Pass = the 7-day server stale share is at most 5%.** The worklog states the verdict in one line: `PASS` or
   `FAIL`, with the number.~~ **(2026-10-05)** No pass bar. Each read records the window (UTC start and end, length in
   days), the numbers, and **the owner's call in one line**: deploy what is waiting, or wait longer (and until when).
3. ~~**On PASS:** `0340` may start — **but it still needs the owner's explicit OK to enforce**, which is gate item 2 in
   [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md)'s brief. **Meeting the ≤5% gate does not approve
   enforcing on its own** — [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md)
   Decision 4 keeps ADR-116's separate, explicit owner approval for S3a. This task closing does not give that OK.~~
   **(2026-10-05, ADR-122)** `0340` may start now regardless of this task. **The owner's look at the numbers is not the
   approval to enforce** — each deploy that reads `verified` still needs the owner's separate, explicit OK (ADR-116,
   kept by ADR-122). Nothing this task records gives that OK.
4. ~~**On FAIL:** no fix is chosen here. Record the readings and put the next step to the owner (`0340` stays blocked).~~
   **(2026-10-05)** If the numbers look wrong, no fix is chosen here either; record them and put the next step to the owner.
5. The per-day / per-hour table and the bracket split are recorded, with any day ~~above 5%~~ that stands out (much above the rest) called out. *(2026-10-05: no fixed bar, ADR-122.)*
6. No secret, key, real player id, signature, token, host, IP or connection string in any artifact.

## Notes

- **Depends on:** [`0391`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md)
  (hard — committed and shipped in a profile deploy, planned Tue 6 Oct 2026; then whatever data exists when the owner
  needs it). *Struck 2026-10-05, kept as written:* ~~(hard — committed, shipped in a profile deploy, plus 7 days of
  data).~~
- ~~**Blocks:** [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (hard — its S2 exit; plus the owner's
  separate OK to enforce).~~ *(Struck 2026-10-05 by owner ruling: this task gates nothing on its own. It **feeds** the
  owner's look before each deploy that reads `verified` — first [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md)'s.)*
- **Related:** [`0373`](../../done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (the decision and the baseline
  readings), [`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (the first S2
  reading), `0366` (the brackets),
  [`0393`](../0393-watch-paid-citizens-with-login-data-over-24-hours-old-and-decide-on-a-reopen-message/brief.md) (the
  watch task on the >24 h residue), [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md) (Decision 4: the gate).
- **Does not block Sprint 7's deploy** (the build/verify rule).
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

## 📌 2026-10-05 — re-scope: no 7-day window, no ≤5% bar; read the numbers whenever the owner needs them (appended; edits above are struck, not deleted, ADR-035)

**Provenance.** OWNER RULINGS given 2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
- *"Remove the 7 days requirement, we will check whatever data we have at the time it's needed and we will make a
  decision about waiting or not waiting longer based on that"*.
- Deploy `0391` (profile server) on **Tuesday 6 Oct**, a mid-week exception to the weekend-slot rule: *"Yes, Tuesday
  (Recommended)"*.
- Before deploying `0340` at the 10/11 Oct slot: *"Judge by eye"* (option: *"Look at whatever numbers exist by the
  weekend and decide then"*).

Recorded in the [ADR-122](../../../knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md)
(accepted 2026-10-05; supersedes ADR-121 Decision 4). The earlier threshold ruling (*"At most 5% (Recommended)"*) is superseded by it.

**What this task is now.**
- Read the post-`0391` login numbers — **stale share, `ok`, `id_mismatch`, `bad_payload`** (plus the per-day / per-hour
  split and the stale-age brackets as before) — from the first post-deploy point to the time of the read.
- **When:** whenever the owner needs them. **First read: before the 10/11 Oct weekend slot**, to inform the owner's
  call on deploying `0340`. **Again before each later deploy that reads `verified`** (`0250` S3b, `0319`, `0332`,
  `0323`) — each read is a new dated entry in the worklog.
- **Record the owner's call each time** in one line (deploy / wait longer, and until when), with the window and numbers.
- **It gates nothing on its own.** `0340` may start now; its deploy needs the owner's look plus the separate explicit
  approval to enforce (unchanged — the look is not the approval).
- **Preconditions changed:** `0391` deploys **Tue 6 Oct 2026** (owner-run), not 10/11 Oct; no 7-day wait. A first read
  before 10/11 Oct will cover only ≈ 3–4 days — say so in the entry.
- ~~**Closing:** this task now spans several reads. When it closes is an open question for the owner (see below).~~ *(Answered — see the next note.)*
- ~~**Sprint placement — open, not moved.**~~ *(Answered — moved to Sprint 7, see the next note.)* The first read is now needed before the 10/11 Oct slot, which is Sprint 7's
  deploy, while this task sits on Sprint 8 (not started). Whether to move it to Sprint 7 is put to the owner; this note
  moved nothing.
- `0394` stays on the Backlog board and gates nothing (owner ruling 2026-10-05).
- **`## Status` unchanged (`🔲 Backlog`).** ~~No folder moved or renamed, no mover run.~~ *(No mover run. The folder **was** renamed later the same day — see the next note.)*

## 📌 2026-10-05, latest — moved to Sprint 7; closes after the first look; folder renamed (appended; edits above are struck, not deleted, ADR-035)

**Provenance.** OWNER RULINGS given 2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
placement *"Move to Sprint 7 (Recommended)"*; when it closes *"After the first look (Rec)"*; folder *"Rename and fix
links"*.

- **Sprint:** now [Sprint 7](../../../sprints/plan-sprint-7.md), appended at **44** (ADR-035 append rank, not a merit
  rank). Its [Sprint 8](../../../sprints/plan-sprint-8.md) row is `➡️ Moved`.
- **Scope, narrowed — one look, then close.** Read the post-`0391` login numbers (stale share, `ok`, `id_mismatch`,
  `bad_payload`, plus the per-day / per-hour split and the stale-age brackets) from the first post-deploy point to the
  time of the read, **before `0340`'s deploy** (target: the 10/11 Oct slot). The *"again before each later deploy that
  reads `verified`"* reads in the re-scope note above are **no longer this task's** — each of those tasks (`0250` S3b,
  `0319`, `0332`, `0323`) carries its own small *"owner looks at the login numbers before deploy"* step (dated note in
  each brief, ADR-122).
- **Done when:** the worklog records the window (UTC start and end, length in days), the numbers above, and **the
  owner's call on `0340` in one line** — deploy at the slot, or wait (and until when). Then this task closes (via the
  producer's mover). The owner's call on the numbers is **not** the approval to enforce; that stays a separate,
  explicit owner OK on `0340` (ADR-116, kept by ADR-122).
- **Folder renamed** with `git mv` (backlog → backlog; not a mover) from
  `0392-verify-0391-live-stale-login-share-…-over-7-days` to `0392-read-the-post-0391-login-numbers-before-the-0340-deploy`;
  every link under `ai-agents/` repointed (struck history links included, so they still resolve). Nothing under
  `ai-agents/wiki-vault/` linked to it.
- **`## Status` unchanged (`🔲 Backlog`). No mover run.**

## 📌 2026-10-06 — `0391` is live; the reading window starts now (appended; nothing above edited, ADR-035)

**Provenance.** Facts checked read-only by `fkit-lead` on 2026-10-06, relayed to a spawned `fkit-producer` (no owner
channel, ADR-021/037).

- [`0391`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md) is **live since 2026-10-06T08:09:49Z** — profile `0.0.156-profile.2`, commit `0aef613`
  (`0391` only; `0340` not in it). Owner-run, mid-week by owner ruling (ADR-122). Deploy record:
  [`0391` worklog](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/worklog.md) § *Deploy*.
- **This task's reading window starts at 2026-10-06T08:09:49Z.** Counters restarted at deploy — never compare
  cumulative values across it.
- Not yet checked at filing: login metrics in Uptrace; game-server `failed after retries` count.
- **`## Status` unchanged (`🔲 Backlog`). No mover run.**

## 📌 2026-10-06 — an early 5-minute sample was read; it is NOT this task's reading (appended; nothing above edited, ADR-035)

**Provenance.** Read read-only by `fkit-lead` on 2026-10-06 (owner's 2026-10-05 read-only approval), relayed to a
spawned `fkit-producer` (no owner channel, ADR-021/037).

- **Sample:** Uptrace/ClickHouse, version `.2`, **08:09–08:14Z (~5 min)** — `ok` 45, `stale` 1 (~2 %),
  `id_mismatch` 0; no `absent` / `no_secret` seen. The one `stale` fell in the new `past_48h_7d` bracket, so the
  new brackets are recording.
- ⚠️ **Far too little data to judge — an early sign only. It is NOT the reading this task delivers** and does not
  satisfy any verification step above. The reading window still starts at 2026-10-06T08:09:49Z.
- The earlier note's *"Not yet checked at filing"* items are now looked at: the login metric only by this sample; the
  game-server `failed after retries` count is resolved — one blip during the profile restart (08:10:48Z), the
  retried-later kind, no `credit batch … dropped` line, no XP lost. Details:
  [`0391` worklog](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/worklog.md) § *post-deploy checks*.
- **`## Status` unchanged (`🔲 Backlog`). No mover run.**
