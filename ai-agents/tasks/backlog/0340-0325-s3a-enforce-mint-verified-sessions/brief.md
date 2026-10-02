# 0325 S3a — enforce: mint verified (`vfy:true`) sessions at login

## ID
0340

> ℹ️ **ID allocation, checked 2026-09-29.** Allocated in sequence right after
> [`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (same filing; `0338` is
> held by toolkit prose in `.claude/` — see `0339`'s note). No task folder, no `## ID` hit, no `.claude/` hit.

## Sprint
Sprint 7

📌 **Moved BACK from Sprint 6 to Sprint 7 on 2026-09-29, latest** — OWNER RULING given 2026-09-29 live in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"Move 0340 and any tasks from the Sprint 6 that depends on it to the Sprint 7."* **This reverses the same day's earlier ruling A** (*"Move 0340 into Sprint 6"*) — the latest explicit ruling wins. `fkit-lead` read *"depends on it"* as transitive (so no Sprint 6 task is left waiting on a Sprint 7 task) and stated that reading to the owner: `0340`; `0250` (its slice S3b waits on `0340`); `0248` (waits on `0250`); `0301` (waits on `0248` and `0250`). Record: the 2026-09-29 *`0340` chain* addenda under the status tables of [Sprint 6](../../../sprints/done/plan-sprint-6.md) and [Sprint 7](../../../sprints/plan-sprint-7.md). Appended on [Sprint 7](../../../sprints/plan-sprint-7.md) at rank 16; its earlier Sprint 7 row (rank 3) stays there as a closed `➡️ Moved` row (ADR-035). `## Status` unchanged (`🔲 Backlog`); no folder moved; no mover run. **The gate below is unchanged.** The Sprint 6 note directly below (*Sprint 6 cannot close as fully done until this task has shipped*) no longer applies — this task is no longer on Sprint 6.

*(Earlier value, kept as history — true from earlier on 2026-09-29 until this move:)* ~~Sprint 6~~

📌 **Moved from Sprint 7 to Sprint 6 on 2026-09-29** — OWNER RULING given live in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. As relayed: *"Move 0340 into Sprint 6."* Reason: [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) — and so `0248` and `0301` — on [Sprint 6](../../../sprints/done/plan-sprint-6.md) cannot close until this task ships. Record: the 2026-09-29 `0340` addendum under Sprint 6's status table. `## Status` unchanged; no folder moved; no mover run. **The gate below is unchanged.** ⚠️ Because the gate includes a watch window of days after a deploy, Sprint 6 cannot close as fully done until this task has shipped — flagged for the owner.

*(Earlier value, kept as history — true until 2026-09-29:)* ~~Sprint 7~~

## Priority
16

> 📌 **2026-09-29, latest — rank 16 on [Sprint 7](../../../sprints/plan-sprint-7.md) is APPEND RANK, not a merit ranking.** The owner gave no rank on Sprint 7; this board's highest was 15 (`0308`), and the four tasks moved by this ruling were appended in their Sprint 6 relative order: `0340` 16, `0250` 17, `0248` 18, `0301` 19. ADR-035: appended, never inserted; nothing was renumbered. **On merit** this sits at the top of Sprint 7's open work, directly below `0337` — where its earlier Sprint 7 row (rank 3) stood — because `0250` S3b, `0332`, `0323` and `0319` wait on it. Its own gate, `0339`, stays on Sprint 6. The notes below about ranks 47 and 3 are kept as history.
>
> *(Earlier value, kept as history — true on Sprint 6 earlier on 2026-09-29:)* ~~47~~

> 📌 **2026-09-29 — rank 47 on [Sprint 6](../../../sprints/done/plan-sprint-6.md) is APPEND RANK, not a merit ranking — flagged for owner confirmation.** The owner named no rank; this board's highest was 46 (`0341`). **On merit this belongs directly below `0339`**, because `0339`'s S2 exit is this task's gate, and above `0250`, whose slice S3b waits on it. ADR-035: appended, never inserted; nothing was renumbered. The note below about rank 3 describes the Sprint 7 board and is kept as history.
>
> *(Earlier value, kept as history — true on Sprint 7 until 2026-09-29:)* ~~3~~

> **Rank 3 is OWNER-RULED placement** — the owner's ruling of 2026-09-29 (see *Context*): *"a separate 'S3a
> enforce' build task after it"* (after the verify task, `0339`). It was **appended** at rank 13 (ADR-035:
> append, never insert) and then moved up to sit directly below `0339`, within the
> [Sprint 7 board](../../../sprints/plan-sprint-7.md)'s contiguous run of open rows, by that ruling. The board
> has no closed row, so none was renumbered. See the board's 2026-09-29 `0339`/`0340` addendum. ⛔ Not producer
> precedent for re-ranking.
>
> ⚠️ **Rank is position, not "ready".** This task cannot start until `0339`'s S2 exit is met **and** the owner
> has separately approved enforcing (see *Gate*). Until then the next open rows are worked around it.

> 📌 **2026-09-29, later — `0339` moved to Sprint 6; this task did NOT move.** On an OWNER RULING 2026-09-29, typed directly by the owner in the `fkit lead` session (the owner's own message, not an `AskUserQuestion` answer), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"Mov ethe 0339 into the Sprint 6 to the top of priorities."* (typo as typed; meaning: move `0339` into Sprint 6, at the top of its priorities). `0339` is now on [Sprint 6](../../../sprints/done/plan-sprint-6.md) (owner-ruled top priority, board rank 45). This task stays on Sprint 7 at rank 3, now directly below `0339`'s `➡️ Moved` row (not renumbered — ADR-035). **The gate is unchanged** — `0339`'s S2 exit plus a separate owner approval to enforce — it now waits on a task on another board. Where this brief says *"after the verify task"* or *"directly below `0339`"*, read it as the order of work, not board position. *(📌 Superseded later on 2026-09-29, kept as written: this task **did** then move to Sprint 6 by owner ruling, and now sits on the same board as `0339` — see `## Sprint` above.)*

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given
live in the `fkit lead` session via `AskUserQuestion` on 2026-09-29, relayed by `fkit-lead`.** ⛔ Not producer
precedent. The question: *"0325's S2 is built and reviewed; S3a (turn verification on) waits on deploy + a watch
period + your approval. How should we track what's left?"* The answer: **"Split it (Recommended)"**, option text
*"Close 0325 as the S2 build (agent-closed). File a 'verify S2 live' task (deploy check + watch the ok-rate) at
the top of Sprint 7, and a separate 'S3a enforce' build task after it. ADR-116 gets a note that S3a moved to that
task."*

**Where this comes from.** [`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md)
planned three slices: S0 (owner-run spike, passed 2026-09-29), S2 (shadow mode, built and reviewed, closed as
`0325`), and **S3a — this task**. The plan for S3a is **already approved** (2026-09-28, with the S0-informed
amendment and its rulings approved 2026-09-29). **Read first:** `0325`'s
[`plan.md`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/plan.md) — § *S3a*
(steps 13–15), § *Tests* (the S3a items), § *Deploy order and rollback*, the § *S0-informed amendment* and
§ *Owner rulings on the amendment* — and
[ADR-116](../../../knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md)
(accepted 2026-09-29).

**The problem, in plain terms.** After `0325`, the profile server already *checks* Yandex's signed player data at
every login and counts the result — but it still hands every player an unverified (`vfy:false`) session. This
task makes the check count: a login whose signature is genuine, fresh, and for the same player gets a
**verified** session (`vfy:true`), which a forger cannot get. Nothing a player sees changes in this task; it
only makes "is this the proven owner?" answerable for the tasks that need it.

### Gate — both must hold before this task starts

1. **[`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md)'s S2 exit is met** —
   the owner picked a watch window and a threshold, and real logins showed `ok` as the large majority.
2. **An explicit owner approval to enforce**, given after `0339`'s numbers are in (`0325` plan § *S2 exit*: *"The
   owner approves moving to S3a (a later gate, not decided now)."*). `0339` closing does **not** by itself
   approve this task.

### Who reads `verified` after this ships

No route reads `verified` in this task. These tasks do, and all wait on this one:
- [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) slice **S3b** — the verified-only
  view of paid state;
- [`0319`](../0319-close-the-forged-login-name-change-hole-once-identity-is-verified/brief.md) — gates the
  name-change routes on a verified caller;
- [`0332`](../0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md) — the
  join token (the game server has the profile server vouch for a verified session);
- [`0323`](../0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) — the confirmed-name mark (via
  `0332`, and directly).

## What to build

Plan steps 13–15, as approved. **Server only; the client is unchanged.** The coder's plan may re-ground line
numbers (the tree has moved since), but not widen scope.

- **Step 13 — the login route mints `vfy:true`.** Use the S2 classification's `verified` result (true only for
  outcome `ok`, which already requires signed id = asserted id and a fresh `issuedAt`). When verified, resolve
  the player by the **signed** id (equal to the asserted id by construction); otherwise exactly as today. Pass
  `verified` into the session-token mint. The creation-switch path is unchanged. **The response shape and status
  are unchanged.**
- **Step 14 — `resolveCaller` reports `verified`.** Its `ok` result becomes `{ playerId, verified }`. Extract a
  small pure function that maps a checked session to that result, so it can be unit-tested. Update the warning
  doc on the caller result: `ok` alone is not the proven owner; `verified: true` is. **No route reads `verified`
  yet.**
- **Step 15 — comments only.** Update every comment that still says "no verification yet" (plan step 15 lists
  them: the public projection, the session token, the login contract, the client profile session).
- **Freshness window.** S2 ships 900 s old / 300 s future. **If `0339`'s `stale` count says to retune it, that is a
  plan decision put to the owner before enforcing** — not a silent change.

### Fail behaviour — unchanged from ADR-116

- **Every failure falls back to today's `vfy:false` login. Login never refuses because of the signature,** and no
  read turns into an error because of it.
- ⛔ **This task changes no response.** What a verified caller *sees* is `0250` S3b; which routes *require* one is
  `0319`.

### Deploy and rollback — carry these

- **Deploy:** profile server only, after `0339`'s S2 exit and the owner's approval. Record the deploy in the
  worklog (date, order).
- ⛔ **Rollback rule: never roll S3a straight back to a pre-S2 build.** A pre-S2 server only accepts `vfy:false`,
  so every live verified token turns invalid and every client re-logs in once — survivable but noisy. S3a → S2 is
  safe (S2 already accepts a `vfy:true` token). Put this rule in the worklog's deploy entry.

### ⛔ The ADR-113 note — shipping this task triggers it

From the `0325` worklog (2026-09-29, *ADR-116 accepted …*): **once S3a ships** (the profile server mints
`vfy:true` in production), the ADR-113 dated note must be added — its content is in ADR-116 § *Amendments to
older ADRs* → *ADR-113* (point 5, point 9, the re-raise list, key rotation). Append-only, dated, attributed,
keeping every earlier wording visible; then mark that ADR-116 subsection applied. **Not before S3a ships.**
**ADR edits are `fkit-architect`'s** — the coder routes it; the producer or lead spawns the architect after the
deploy. This task does not close until that note is applied or the owner rules otherwise.

## Verification steps

1. **Positive:** a valid signature whose signed id equals the asserted id ⇒ the session is `vfy:true`, and
   `resolveCaller` reports `verified: true`.
2. **Forgery:** a **valid** signature for player A sent with player B's id ⇒ `vfy:false`, and the token's player
   is never A's. A tampered signature ⇒ `vfy:false`. A stale one (over 900 s old, or over 300 s ahead) ⇒
   `vfy:false`.
3. **Fail-open for login:** no secret configured, a bad signature, or no signature at all ⇒ login still returns
   200 with a `vfy:false` session, and the citizenship card still loads. Both branches tested.
4. **Creation switch off plus a valid signature** ⇒ unchanged find-only behaviour.
5. **The small caller-mapping function:** `verified` follows the token's `vfy` claim; unit-tested.
6. **No response change:** login's status and body shape are identical for verified and unverified callers.
7. **No credential leak:** the S2 no-leak test (the signature never appears in any log write or repository call)
   still passes and covers the S3a path.
8. **Optional (plan):** one real-Postgres integration case with a synthetic key ⇒ `vfy:true`.
9. **Deploy recorded** in the worklog, with the rollback rule.
10. **The ADR-113 note** is applied by `fkit-architect` after the deploy (or an owner ruling defers it), and
    ADR-116's subsection is marked applied.
11. Tests are mandatory for any `src/core/` change (CLAUDE.md). `npm test` green; if a known supertest flake or
    `0197`'s segfault shows, re-run and say so.
12. No secret, key value, real player id, signature, token, host or IP in any committed artifact; fixtures use
    synthetic keys, as the S2 tests do.

## Notes

- **Depends on:** [`0373`](../0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (hard — read the stale-login data and
  choose the fix; then the fix and an S2-exit re-check, not yet filed) plus an explicit owner approval to enforce.
  *Repointed 2026-10-02 (see the dated note at the end), kept as written:* ~~[`0366`](../../done/0366-measure-how-old-stale-login-signatures-are/brief.md) (hard — `0325`'s S2 exit was ruled
  **not met** in `0339` on 2026-10-01; the next step toward it is this measurement, then a fix and an S2-exit
  re-check that are not filed yet) plus an explicit owner approval to enforce.~~ *Repointed 2026-10-01, kept as
  written:* ~~[`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (hard — its S2
  exit) plus an explicit owner approval to enforce.~~ `0325` (the S2 build, closed 2026-09-29) is built into the
  tree.
- **Blocks:** [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) (slice S3b only — hard),
  [`0319`](../0319-close-the-forged-login-name-change-hole-once-identity-is-verified/brief.md) (hard),
  [`0332`](../0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md) (hard),
  [`0323`](../0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) (hard). Each of those briefs carries a
  dated 2026-09-29 note repointing its dependency here.
- **Related:** ADR-116 (the design), ADR-103 (amended 2026-09-29; the game-server seam stays asserted until
  `0332`), ADR-113 (the note above), `0267` (this is the Yandex half of its scope).
- **Effort (`0325` plan):** ~0.5 day. An estimate, not a measurement.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

## 📌 2026-10-01 — gate update: `0339` closed as a FAILED verification (appended; nothing above edited, ADR-035)

**Provenance.** OWNER RULING given 2026-10-01, typed in prose by the owner in the live `fkit lead` session,
relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer
precedent. Owner, verbatim: **"Agree"** — to *"`0339` Step 4: **not met for now**, plus a small task to **measure
how old the `stale` tickets are**, aiming for Saturday's profile deploy if it's ready in time."*

- **Gate item 1 above (*"`0339`'s S2 exit is met"*) is NOT met.** `0339` closed on 2026-10-01 *(agent-closed — not
  owner-verified)* with its result recorded as a failed verification: ≈ 68 % `ok`, ≈ 32 % `stale`, not falling
  (readings in `0339`'s `worklog.md`). `0339` closing does **not** open this task.
- **What the gate now waits on:** [`0366`](../../done/0366-measure-how-old-stale-login-signatures-are/brief.md) (measure how
  old `stale` signatures are) → a fix chosen from its readings → an S2-exit re-check with the owner. Only the first
  is filed. Gate item 2 (a separate owner approval to enforce) is unchanged.
- The *Freshness window* bullet under *What to build* still holds: any retune of 900 s / 300 s is a plan decision
  put to the owner before enforcing — `0366`'s brackets are the evidence for it.
- **`## Status` unchanged (`🔲 Backlog`). No folder moved, no board row edited, no mover run on this task.**

## 📌 2026-10-02 — gate update: the "fix chosen from its readings" step is now preceded by `0372` + `0373` (appended; nothing above edited except the `Depends on` repoint, ADR-035)

**Provenance.** OWNER RULINGS given 2026-10-02 via `AskUserQuestion` in the live `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent.

- **Cause of `stale` is still unknown.** A read-only check on 2026-10-02 found it flat at ~32–33 % since S2 went
  live, with a strong evening peak. An architect consult found `0366`'s server brackets alone cannot choose the fix
  (they cannot tell whether a second Yandex call returns newer data, or first boot from after-match reload).
- **The gate's chain is now:** [`0372`](../../done/0372-client-diagnostics-for-stale-login-signatures/brief.md) (client
  diagnostics, Sprint 7, rides the 2026-10-03/04 game deploy) and `0366` (rides the 2026-10-03/04 profile deploy) →
  [`0373`](../0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (read the data, owner chooses the fix and
  the S2-exit "good enough" threshold; Sprint 8) → the fix task (not yet filed) → an S2-exit re-check with the owner
  → this task. Gate item 2 (a separate owner approval to enforce) is unchanged.
- The `Depends on` line above is repointed from `0366` (done) to `0373`; the old text is kept struck.
- **`## Status` unchanged (`🔲 Backlog`). No folder moved, no board row edited, no mover run on this task.**
