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

📌 **Moved from Sprint 7 to Sprint 6 on 2026-09-29** — OWNER RULING given live in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. As relayed: *"Move 0340 into Sprint 6."* Reason: [`0250`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md) — and so `0248` and `0301` — on [Sprint 6](../../../sprints/done/plan-sprint-6.md) cannot close until this task ships. Record: the 2026-09-29 `0340` addendum under Sprint 6's status table. `## Status` unchanged; no folder moved; no mover run. **The gate below is unchanged.** ⚠️ Because the gate includes a watch window of days after a deploy, Sprint 6 cannot close as fully done until this task has shipped — flagged for the owner.

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
> ⚠️ **Rank is position, not "ready".** ~~This task cannot start until `0339`'s S2 exit is met **and** the owner
> has separately approved enforcing (see *Gate*). Until then the next open rows are worked around it.~~
> *(Struck 2026-10-05 by owner ruling — see the 2026-10-05 **later** note at the end: this task **may start now**;
> only its **deploy** is gated.)*

> 📌 **2026-09-29, later — `0339` moved to Sprint 6; this task did NOT move.** On an OWNER RULING 2026-09-29, typed directly by the owner in the `fkit lead` session (the owner's own message, not an `AskUserQuestion` answer), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"Mov ethe 0339 into the Sprint 6 to the top of priorities."* (typo as typed; meaning: move `0339` into Sprint 6, at the top of its priorities). `0339` is now on [Sprint 6](../../../sprints/done/plan-sprint-6.md) (owner-ruled top priority, board rank 45). This task stays on Sprint 7 at rank 3, now directly below `0339`'s `➡️ Moved` row (not renumbered — ADR-035). **The gate is unchanged** — `0339`'s S2 exit plus a separate owner approval to enforce — it now waits on a task on another board. Where this brief says *"after the verify task"* or *"directly below `0339`"*, read it as the order of work, not board position. *(📌 Superseded later on 2026-09-29, kept as written: this task **did** then move to Sprint 6 by owner ruling, and now sits on the same board as `0339` — see `## Sprint` above.)*

## Status
✅ Done (agent-closed — not owner-verified)

*(2026-10-05 — set by a spawned `fkit-producer` (no owner channel, ADR-021/037) at `fkit-lead`'s instruction: the lead is starting this task's plan under `fkit-sprint-ship-loop`, on the owner ruling that it may start now ([ADR-122](../../../knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md)). Earlier value, kept as history:)* ~~🔲 Backlog~~

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

### Gate — both must hold before this task ~~starts~~ **deploys**

> 📌 **2026-10-05 — the gate moved from *start* to *deploy*** (OWNER RULINGS 2026-10-05, relayed by `fkit-lead`; ⛔ not
> producer precedent; ADR-122; full text in the 2026-10-05 **later** note at the end). **This task may start now.** Before its
> **deploy**: (1) the owner looks at whatever post-`0391` login data exists at the time and decides whether to wait
> longer — no fixed window, no fixed bar (verbatim: *"Remove the 7 days requirement, we will check whatever data we have
> at the time it's needed and we will make a decision about waiting or not waiting longer based on that"*); (2) a
> separate, explicit owner approval to enforce (unchanged). Items 1–2 below are kept as written, as history.

1. **[`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md)'s S2 exit is met** —
   the owner picked a watch window and a threshold, and real logins showed `ok` as the large majority.
2. **An explicit owner approval to enforce**, given after `0339`'s numbers are in (`0325` plan § *S2 exit*: *"The
   owner approves moving to S3a (a later gate, not decided now)."*). `0339` closing does **not** by itself
   approve this task.

### Who reads `verified` after this ships

No route reads `verified` in this task. These tasks do, and all wait on this one:
- [`0250`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md) slice **S3b** — the verified-only
  view of paid state;
- [`0319`](../../backlog/0319-close-the-forged-login-name-change-hole-once-identity-is-verified/brief.md) — gates the
  name-change routes on a verified caller;
- [`0332`](../../backlog/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md) — the
  join token (the game server has the profile server vouch for a verified session);
- [`0323`](../../backlog/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) — the confirmed-name mark (via
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

> 📌 **2026-10-05, Q1 ruling — this subsection MOVED to [`0395`](../../backlog/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md).**
> The deploy, the rollback rule's worklog entry and the live check are no longer part of this task; it closes once built
> and reviewed. Text below kept as written, struck in meaning (see the 2026-10-05 **Q1 split** note at the end).

- ~~**Deploy:**~~ *(moved to `0395`)* profile server only, after ~~`0339`'s S2 exit~~ the owner's look at whatever post-`0391` login data
  exists (read by [`0392`](../../backlog/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md); owner
  ruling 2026-10-05) and the owner's separate approval to enforce. Record the deploy in the worklog (date, order).
  Architect advice (2026-10-05): **deploy this task alone, not together with `0250` S3b** — see the 2026-10-05 later
  note at the end.
- ⛔ **Rollback rule: never roll S3a straight back to a pre-S2 build.** A pre-S2 server only accepts `vfy:false`,
  so every live verified token turns invalid and every client re-logs in once — survivable but noisy. S3a → S2 is
  safe (S2 already accepts a `vfy:true` token). Put this rule in the worklog's deploy entry.

### ⛔ The ADR-113 note — shipping this task triggers it

From the `0325` worklog (2026-09-29, *ADR-116 accepted …*): **once S3a ships** (the profile server mints
`vfy:true` in production), the ADR-113 dated note must be added — its content is in ADR-116 § *Amendments to
older ADRs* → *ADR-113* (point 5, point 9, the re-raise list, key rotation). Append-only, dated, attributed,
keeping every earlier wording visible; then mark that ADR-116 subsection applied. **Not before S3a ships.**
**ADR edits are `fkit-architect`'s** — the coder routes it; the producer or lead spawns the architect after the
deploy. ~~This task does not close until that note is applied or the owner rules otherwise.~~ *(Struck 2026-10-05 —
the owner ruled otherwise (Q1, *"Split it (Recommended)"*): routing the ADR-113 note moved to
[`0395`](../../backlog/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md). This task closes once
built and reviewed.)*

## Verification steps

1. **Positive:** a valid signature whose signed id equals the asserted id ⇒ the session is `vfy:true`, and
   `resolveCaller` reports `verified: true`.
2. **Forgery:** a **valid** signature for player A sent with player B's id ⇒ `vfy:false`, and the token's player
   is never A's. A tampered signature ⇒ `vfy:false`. A stale one (over ~~900 s~~ **86,400 s (24 h)** old, or over 300 s ahead) ⇒
   `vfy:false`. *(2026-10-05: threshold updated to 24 h per ADR-121 / `0391`, built on `6eef01f`; the 300 s
   future limit is unchanged. Since ADR-121 Decision 2 the id is checked before the age, so a stale note is always
   the right player — the coder's plan should re-ground this step against the tree.)*
3. **Fail-open for login:** no secret configured, a bad signature, or no signature at all ⇒ login still returns
   200 with a `vfy:false` session, and the citizenship card still loads. Both branches tested.
4. **Creation switch off plus a valid signature** ⇒ unchanged find-only behaviour.
5. **The small caller-mapping function:** `verified` follows the token's `vfy` claim; unit-tested.
6. **No response change:** login's status and body shape are identical for verified and unverified callers.
7. **No credential leak:** the S2 no-leak test (the signature never appears in any log write or repository call)
   still passes and covers the S3a path.
8. **Optional (plan):** one real-Postgres integration case with a synthetic key ⇒ `vfy:true`.
9. ~~**Deploy recorded** in the worklog, with the rollback rule.~~ *(Moved 2026-10-05 to
   [`0395`](../../backlog/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md), Q1 ruling.)*
10. ~~**The ADR-113 note** is applied by `fkit-architect` after the deploy (or an owner ruling defers it), and
    ADR-116's subsection is marked applied.~~ *(Moved 2026-10-05 to `0395`, Q1 ruling.)*
11. Tests are mandatory for any `src/core/` change (CLAUDE.md). `npm test` green; if a known supertest flake or
    `0197`'s segfault shows, re-run and say so.
12. No secret, key value, real player id, signature, token, host or IP in any committed artifact; fixtures use
    synthetic keys, as the S2 tests do.

## Notes

- **Depends on:** no task — **may start now** (OWNER RULING 2026-10-05, relayed by `fkit-lead`; see the 2026-10-05
  later note at the end). The fix [`0391`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md)
  is built (`6eef01f`) and `0325` (the S2 build, closed 2026-09-29) is built into the tree. Its **deploy** — not its
  start — needs the owner's look at whatever post-`0391` data exists, plus the owner's separate explicit approval to
  enforce.
- *Earlier `Depends on` values — struck 2026-10-05 and moved off the line above so the status dashboard reads only the
  live value; kept as written:* ~~[`0392`](../../backlog/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) (hard — the
  S2-exit re-check: server stale share ≤5% over 7 days after the fix [`0391`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md)
  ships) plus an explicit owner approval to enforce.~~ *Repointed 2026-10-05 (see the dated note at the end), kept as
  written:* ~~[`0373`](../../done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (hard — read the stale-login data and
  choose the fix; then the fix and an S2-exit re-check, not yet filed) plus an explicit owner approval to enforce.~~
  *Repointed 2026-10-02 (see the dated note at the end), kept as written:* ~~[`0366`](../../done/0366-measure-how-old-stale-login-signatures-are/brief.md) (hard — `0325`'s S2 exit was ruled
  **not met** in `0339` on 2026-10-01; the next step toward it is this measurement, then a fix and an S2-exit
  re-check that are not filed yet) plus an explicit owner approval to enforce.~~ *Repointed 2026-10-01, kept as
  written:* ~~[`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (hard — its S2
  exit) plus an explicit owner approval to enforce.~~ `0325` (the S2 build, closed 2026-09-29) is built into the
  tree.
- **Blocks:** [`0250`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md) (slice S3b only — hard),
  [`0319`](../../backlog/0319-close-the-forged-login-name-change-hole-once-identity-is-verified/brief.md) (hard),
  [`0332`](../../backlog/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md) (hard),
  [`0323`](../../backlog/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md) (hard). Each of those briefs carries a
  dated 2026-09-29 note repointing its dependency here. Also
  [`0395`](../../backlog/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) (hard — this task's
  deploy and live check, split out 2026-10-05).
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
  [`0373`](../../done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (read the data, owner chooses the fix and
  the S2-exit "good enough" threshold; Sprint 8) → the fix task (not yet filed) → an S2-exit re-check with the owner
  → this task. Gate item 2 (a separate owner approval to enforce) is unchanged.
- The `Depends on` line above is repointed from `0366` (done) to `0373`; the old text is kept struck.
- **`## Status` unchanged (`🔲 Backlog`). No folder moved, no board row edited, no mover run on this task.**

## 📌 2026-10-05 — gate update: the fix is chosen (`0391`), and the S2-exit re-check is `0392` (appended; nothing above edited except the `Depends on` repoint, ADR-035)

**Provenance.** OWNER RULINGS given 2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim: fix
**"24 hours (Recommended)"**; good-enough threshold **"At most 5% (Recommended)"** (server stale share over 7 days after
the fix ships — *"It gates starting `0340`"*); placement **"Fix: Sprint 7, check: Sprint 8 (Recommended)"**.

- **The gate's chain is now:** [`0391`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md)
  (the fix: freshness window 900 s → 24 h, id checked before age; [Sprint 7](../../../sprints/plan-sprint-7.md)) →
  [`0392`](../../backlog/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) (~~the S2-exit re-check, pass =
  ≤5% over 7 days~~ *superseded 2026-10-05 by ADR-122: reads whatever post-`0391` data exists when the owner needs it,
  no fixed bar, gates nothing on its own*; [Sprint 8](../../../sprints/plan-sprint-8.md)) → this task. *(ADR-122:
  → this task's **deploy**, not its start.)* `0373` produced the decision and stays
  open until the lead routes its close.
- ~~**Gate item 1** (*"`0339`'s S2 exit is met"*) now reads: **`0392` PASS**.~~ *(Superseded 2026-10-05 by ADR-122 —
  see the later note below: gate item 1 is now the owner's by-eye look at whatever post-`0391` data exists, before
  **deploy**.)* **Gate item 2 is unchanged:** an explicit owner approval to enforce, given after `0392`'s numbers are in.
  [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md) Decision
  4 keeps it: ~~meeting the ≤5% gate~~ *(ADR-122: the owner's look at the numbers)* does not by itself approve this task.
- **The *Freshness window* bullet under *What to build* is answered:** the retune is ruled (24 h old / 300 s ahead,
  ADR-121) and is built in `0391`, not here. ⚠️ **For this task's plan:** verification step 2's *"over 900 s old"* reads
  **over 86,400 s old** once `0391` ships, and a stale note is now always the right player (ADR-121 Decision 2) — the
  coder's plan should re-ground that step against the tree. Left as written above (append-only).
- The `Depends on` line above is repointed from `0373` to `0392`; the old text is kept struck.
- **`## Status` unchanged (`🔲 Backlog`). No folder moved, no board row edited, no mover run on this task.**

## 📌 2026-10-05, later — no fixed 7-day / ≤5% gate; this task may start now; only its deploy is gated (appended; edits above are struck, not deleted, ADR-035)

**Provenance.** OWNER RULINGS given 2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
- On what the 7-day ≤5% stale-login check should hold back: *"Remove the 7 days requirement, we will check whatever
  data we have at the time it's needed and we will make a decision about waiting or not waiting longer based on that"*.
- Deploy `0391` (profile server) on **Tuesday 6 Oct** — a mid-week exception to the weekend-slot rule: *"Yes, Tuesday
  (Recommended)"*.
- Before deploying this task at the 10/11 Oct slot: *"Judge by eye"* (option: *"Look at whatever numbers exist by the
  weekend and decide then"*).
- The owner's own proposal, typed directly earlier the same day: deploy the fix, keep developing this task meanwhile,
  and use the pre-weekend numbers to decide whether to postpone this task's deploy.

Recorded in [ADR-122](../../../knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md)
(accepted 2026-10-05; supersedes ADR-121 Decision 4).

- **This task may start now.** The hard dependency on [`0392`](../../backlog/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md)
  is removed (the `Depends on` line above is rewritten; old values kept struck).
- **Its deploy is gated on two things:** (1) the owner looks at whatever post-`0391` login data exists by then
  (`0392` reads it: stale share, `ok`, `id_mismatch`, `bad_payload`) and judges by eye whether to deploy or wait longer
  — no fixed window, no fixed bar; (2) **a separate, explicit owner approval to enforce** — unchanged; looking at the
  numbers does not by itself give it (ADR-116; kept by ADR-122, which supersedes ADR-121 Decision 4).
- **Target:** `0391` deploys Tue 6 Oct; this task's earliest deploy is the 10/11 Oct weekend slot, if the owner's look
  and approval allow.
- **Architect advice (2026-10-05, relayed by `fkit-lead`): deploy this task alone, not together with
  [`0250`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md) S3b**. (The advice as relayed; its full
  reasoning is not recorded here — ask the architect if it is needed.)
- **Verification step 2** now reads 86,400 s (24 h) for the age limit (edited above, old value struck).
- `0394` (re-login on a Yandex account switch) stays on the Backlog board and gates nothing here (owner ruling
  2026-10-05: *"I already told you that the described scenario is very rare. Keep the task in the backlog"*).
- **`## Status` unchanged (`🔲 Backlog`). No folder moved, no mover run on this task.**

## 📌 2026-10-05, Q1 split — this task closes once built and reviewed; deploy, live check and ADR-113 note moved to `0395` (appended; edits above are struck, not deleted, ADR-035)

**Provenance.** OWNER RULINGS given 2026-10-05 live via `AskUserQuestion` in the `fkit lead` session at this task's
plan gate, relayed by `fkit-lead` (driving `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` with no owner channel
(ADR-021/037); ⛔ not producer precedent. Verbatim:
- **Q1 — when is `0340` done:** **"Split it (Recommended)"** — option text: *"Close 0340 once it's built and reviewed. A
  new task 'verify 0340 live' covers the deploy, the live check and the ADR-113 note. Matches your rule."* (the owner's
  2026-09-29 build/verify rule).
- **Q2 — live proof:** **"I'll check once (Rec)"** — option text: *"About 2 minutes at the deploy. Direct proof, and
  nothing secret leaves your browser."* (Belongs to the verify task.)

- **New close condition:** this task closes once it is **built and reviewed** (agent-closed, per ADR-033). The earlier
  *"does not close until that note is applied"* condition is struck above.
- **Moved to [`0395`](../../backlog/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md)**
  (~~[Sprint 8](../../../sprints/plan-sprint-8.md)~~ [Sprint 7](../../../sprints/plan-sprint-7.md) — moved the same day by owner ruling *"Move to Sprint 7 (Recommended)"*): the deploy gate (`0391` live; the owner's look via `0392`; the
  separate approval to enforce), the deploy itself, the delta check, the post-deploy watch, the worklog deploy entry, the
  ⛔ one-way rollback rule (target = the `0391` image; never pre-S2), the owner's DevTools `vfy` check, routing the
  ADR-113 note to `fkit-architect`, and the runbook's rollback-target line. Source: `plan.md` § 4 and § 3's rollback
  bullets (the plan itself is unchanged).
- **Verification steps 9 and 10** are struck above (moved). Steps 1–8, 11 and 12 remain this task's.
- ⚠️ **What closing this task does NOT mean:** verified sessions are not live in production until `0395` is done.
  `0250` S3b, `0319`, `0332` and `0323` keep `Depends on: 0340` (their **builds**); whether their **deploys** must
  also wait on `0395` is an open question to the owner — not recorded as a dependency here.
- `plan.md` and `worklog.md` were not touched. **`## Status` unchanged (`🔄 In progress`). No folder moved, no mover
  run on this task.**
