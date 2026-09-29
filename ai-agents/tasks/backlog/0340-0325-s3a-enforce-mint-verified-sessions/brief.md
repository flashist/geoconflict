# 0325 S3a — enforce: mint verified (`vfy:true`) sessions at login

## ID
0340

> ℹ️ **ID allocation, checked 2026-09-29.** Allocated in sequence right after
> [`0339`](../0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (same filing; `0338` is
> held by toolkit prose in `.claude/` — see `0339`'s note). No task folder, no `## ID` hit, no `.claude/` hit.

## Sprint
Sprint 7

## Priority
3

> **Rank 3 is OWNER-RULED placement** — the owner's ruling of 2026-09-29 (see *Context*): *"a separate 'S3a
> enforce' build task after it"* (after the verify task, `0339`). It was **appended** at rank 13 (ADR-035:
> append, never insert) and then moved up to sit directly below `0339`, within the
> [Sprint 7 board](../../../sprints/plan-sprint-7.md)'s contiguous run of open rows, by that ruling. The board
> has no closed row, so none was renumbered. See the board's 2026-09-29 `0339`/`0340` addendum. ⛔ Not producer
> precedent for re-ranking.
>
> ⚠️ **Rank is position, not "ready".** This task cannot start until `0339`'s S2 exit is met **and** the owner
> has separately approved enforcing (see *Gate*). Until then the next open rows are worked around it.

> 📌 **2026-09-29, later — `0339` moved to Sprint 6; this task did NOT move.** On an OWNER RULING 2026-09-29, typed directly by the owner in the `fkit lead` session (the owner's own message, not an `AskUserQuestion` answer), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Owner, verbatim: *"Mov ethe 0339 into the Sprint 6 to the top of priorities."* (typo as typed; meaning: move `0339` into Sprint 6, at the top of its priorities). `0339` is now on [Sprint 6](../../../sprints/plan-sprint-6.md) (owner-ruled top priority, board rank 45). This task stays on Sprint 7 at rank 3, now directly below `0339`'s `➡️ Moved` row (not renumbered — ADR-035). **The gate is unchanged** — `0339`'s S2 exit plus a separate owner approval to enforce — it now waits on a task on another board. Where this brief says *"after the verify task"* or *"directly below `0339`"*, read it as the order of work, not board position.

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

1. **[`0339`](../0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md)'s S2 exit is met** —
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

- **Depends on:** [`0339`](../0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (hard — its S2
  exit) plus an explicit owner approval to enforce. `0325` (the S2 build, closed 2026-09-29) is built into the
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
