# Verified login — check Yandex's signed player data at login and mint verified (`vfy:true`) sessions

## ID
0325

> ℹ️ **ID allocation, checked 2026-09-27 before filing.** Highest `## ID` on all three boards: `0323`.
> **`0324` was skipped on purpose:** step 3 of
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md) (`grep -rn 0324 .claude/`)
> finds it in upstream toolkit prose (`.claude/skills/fkit-task-done/SKILL.md`, which names a toolkit task
> `0324`). **`0325`:** no task folder, no `## ID` hit, no `.claude/` hit; repo-wide hits are `.svg` path
> coordinates only.

## Sprint
Sprint 6

## Priority
38

⚠️ **Priority 38 is append rank, NOT the placement the owner ruled — flagged for owner confirmation.**
**The owner ruled this task "directly above 0250"** (D3, 2026-09-27 — see *Context*). That rank could not be
written: `0250` sits near the top of the board, and **closed `➡️ Moved` rows lie between it and the bottom**
(the `0027` row and four rows moved to Sprint 7). Moving a row up past them would renumber closed rows, which
ADR-035 forbids even under an owner ruling, and a new row may never be inserted mid-board. So the row is
**appended**, and the owner's ordering is carried two other ways:
- **the dependency** — `0250`'s slice S3b hard-depends on this task (see *Notes*), so this task is worked
  before `0250` can finish;
- **this note** — **by owner ruling this task is worked directly after `0250`'s slice S1, ahead of every
  other open row on the board, whatever its rank number says.**

## Status
✅ Done (agent-closed — not owner-verified)

📌 **2026-09-29 — S0 PASSED; unblocked, ready to build.** The owner ran S0 live on 2026-09-29: **the key verifies Yandex's signed player data, via the decoded-JSON construction only**; the signed id equals `getUniqueID()`; `issuedAt` exists, in seconds. Full results: `worklog.md` § *2026-09-29 — S0 result* (written by `fkit-coder`). **Next step: the build (S2 shadow mode → S3a enforce)**, under the plan approved 2026-09-28 (owner ruling Q2, *"Test first, then build"*). Nobody is building it yet, so it is `🔲 Backlog`, not `🔄 In progress`. **Open for the build:** pin `algorithm`; `requestPayload` as a possible nonce (check Yandex docs); ~6.9 s signed-call latency (1 sample, a socket error was logged, retry likely). Recorded by a spawned `fkit-producer` from `fkit-lead`'s relay.

~~🚧 Blocked — waiting on the OWNER-run S0 test (plan approved 2026-09-28; helper `s0-hmac-check.mjs` written and self-tested; runbook in `worklog.md`). Driven by `/fkit-sprint-ship-loop` (fkit-lead).~~ *(Earlier value, superseded 2026-09-29.)*

## Owner
fkit-coder

⚠️ **Slice S0 needs the owner in person.** It is a spike run by the owner in the live Yandex iframe. The
coder builds the measuring code; only the owner can run it where Yandex serves real signed data.

## Context

### Why this task exists — owner ruling D3 on `0250`, 2026-09-27

**Filed 2026-09-27 by a spawned `fkit-producer` holding no owner channel, on OWNER RULINGS given live via
`AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead` (ADR-021/037). ⛔ Not producer
precedent.** Question D3 of the `0250` design report (where does verified login live?). Owner's answer,
verbatim: **"New task, above 0250 (Recommended)"**. Option text, verbatim: *"Its own build task in Sprint 6,
directly above 0250; 0250 waits on it. 0267 (the identity investigation) is closed or narrowed using this
report."* The full set of rulings (D1–D5) is recorded in the
[`0250` brief](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md), section *Owner rulings
(2026-09-27)*.

**Source report — read it first:**
[`2026-09-27-0250-authenticated-profile-read-design.md`](../../../knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md),
especially §2.1 (session and login today), §2.4–2.6 (signature code, the key, the unknowns), §6 (overlap)
and §8 slices **S0, S2, S3a** — the three slices this task owns.

### The problem, in plain terms

Today **nobody proves who they are** to the profile server. `POST /v1/login` takes a Yandex id the client
*says* is its own, and hands back a session for that player. Every session is marked `vfy:false`
("not verified"). So anyone who knows a player's Yandex id can act as that player on every player-facing
route. The code already says so: a `vfy:false` session must never count as a proven owner.

Yandex offers a fix: `getPlayer({ signed: true })` returns the player data **signed by Yandex** with the
game's own secret key. If the server checks that signature at login, it can issue a **verified** session
(`vfy:true`) that a forger cannot get. This task builds that — and **only** that.

### What is already known (from the report, checked in the tree 2026-09-27)

- **The key is configured on the profile box and is correct** — it verifies real purchases (2026-09-26), and
  a read-only probe on 2026-09-27 confirmed the payments gate passes. (Report §2.5. Recorded as configured
  only — never its value.)
- **The signature-checking code exists** for purchases (`src/profile-server/YandexSignature.ts`). Its
  envelope split, two-way HMAC check and fail-closed posture can be shared; its purchase normalizer cannot
  (a player payload has no purchase fields). (Report §2.4.)
- **`resolveCaller`** (`src/profile-server/Routes.ts`) is the single place every player-facing route learns
  who is calling. Its own doc comment reserves it for this check. (Report §2.1.)
- **The session token's `vfy` claim is a strict `false` today** (`src/profile-server/SessionToken.ts`). A
  `vfy:true` token is *invalid* to today's server — which decides the deploy order below.
- **The client never asks for signed data today.** It calls plain `getPlayer()` at boot and logs in with the
  bare id (`src/client/ProfileSession.ts`, `src/client/flashist/FlashistFacade.ts`).

### 🚨 What is NOT known — and why S0 comes first

**No signed *player* payload has ever been verified by this code base.** Yandex's docs strongly imply the
same key signs player data, but they do not document the payload's fields. Unknown until S0:
1. whether the box's key verifies signed player data at all;
2. which of the two HMAC constructions matches (the same open point as `0309`/`0310` for purchases);
3. what the id field is called, and whether it has an issued-at time;
4. whether the signed id equals `getUniqueID()` — the id the profile server stores.

⛔ **Nothing may be enforced before S0 answers these.** If the key does not verify player data, **stop and
return to the owner** — this whole approach is then blocked.

### Conflicts and locked decisions this touches

- **ADR-103** (the game server trusts the client-sent Yandex id): this task is the **first half** of ADR-103's
  exit, not the exit. See *Out of scope*.
- **ADR-113** (internal player id and platform identities): this task changes what a session means. The ADR
  this task writes must update ADR-113's session notes.
- **`0267`** (investigate verifying player identity): the report answers its Yandex half. Closing or
  narrowing `0267` is a pending producer/owner step, **not** part of this task.

## What to build

Three slices, in ship order. **Each slice must deploy safely on its own.** The coder's plan decides the
*how*; the report's §8 is the starting outline.

### S0 — Spike: what the signed player payload really looks like (owner-run, no behaviour change)

- A dev-only path, or shadow telemetry (it can be the same code as S2), that records **only**: the key
  names and value types of the decoded payload, **which** HMAC construction matched, and **whether** the
  signed id equals `getUniqueID()`.
- ⛔ **Never record values, and never record the signature.** Key names and yes/no answers only.
- **The owner runs it in the live Yandex iframe.** The coder hands over exact steps.
- **Exit:** the four unknowns above are answered and written in the worklog. If the key does not verify
  player data, **stop and return to the owner.**

### S2 — Shadow mode: check the signature at login, change nothing else

- **Contract (`src/core/profile/`):**
  - the login request gains an **optional** `signature` field, with a length bound taken from S0;
  - the session claim `vfy` widens from "always `false`" to a boolean — **but the server still only mints
    `false` in this slice.** This makes the wider claim live *before* anyone relies on it, so rolling back a
    later slice cannot turn live verified tokens invalid.
- **Server:**
  - share one HMAC-envelope check between purchases and players; add a player-payload check that returns the
    signed id (and issued-at time if S0 finds one) or nothing;
  - at login, when a signature is present, verify it and record a bounded metric with the outcomes
    `absent | ok | bad_signature | id_mismatch | stale | no_secret` (same low-cardinality rule as the
    existing session-rejected metric), **and change nothing else**;
  - 🔒 **the signature is a credential: never log it, never store it.** (Unlike a purchase payload, which is
    stored.)
- **Client:**
  - get `getPlayer({ signed: true })` once per page load, inside the existing platform-init deadline;
  - hold the signature in memory only, like the session token, and send it in the login body;
  - if the signed call fails, **log in without it** — it must never block login.
- **Exit:** the metric shows `ok` for the large majority of real logins over a window **the owner picks**.
  **The owner approves moving on to S3a.**

### S3a — Enforce: mint verified sessions

- Mint `vfy:true` **only if** verification is `ok` **and** the signed id equals the id the client asserted.
  Resolve the player by the **signed** id. If S0 found an issued-at time, apply a freshness window (the value
  is a plan decision).
- `resolveCaller` returns `{ playerId, verified }` so any route can ask "is this the proven owner?".
- **Every failure falls back to today's `vfy:false` login. Login never refuses because of the signature,**
  and no read turns into an error because of it.
- ⛔ **This slice changes no response.** What a verified caller *sees* is `0250`'s slice S3b; which routes
  *require* a verified caller is `0319`'s.

### The ADR — the first verified identity in the system (owner sign-off pending)

This is an unanticipated architecture decision: the first time the system proves who a player is. **Write an
ADR** in `ai-agents/knowledge-base/decisions/` (next free number at write time) recording:
- the mechanism (Yandex signed player data, checked once at login, carried as `vfy:true` in the session);
- the fail behaviour (verification failure ⇒ unverified session, never a refused login);
- the accepted residuals from the report §9: a verified session is a 24-hour bearer credential with no
  revocation; a Yandex payload change silently makes everyone unverified (the S2 metric makes it visible);
  the signed data may carry the player's public name and avatar, which transit the server and **must not be
  stored** (152-ФЗ context, `0048`);
- that it **updates** ADR-103's "re-raise only if" (the key is now issued) and ADR-113's session notes.

⚠️ **The ADR's status stays "proposed — owner sign-off pending" until the owner signs it off.** The task does
not close without that sign-off, or an owner ruling that it may.

### Out of scope — named so it is not absorbed

- ⛔ **The equalized projection and the verified-only view of paid state** — that is
  [`0250`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md) (slices S1 and S3b).
- ⛔ **Gating the name-change routes on a verified caller** — that is
  [`0319`](../../backlog/0319-close-the-forged-login-name-change-hole-once-identity-is-verified/brief.md).
- ⛔ **The game server trusting the id (ADR-103), and `0322`'s forged-id case.** The game server learns the id
  from the WebSocket join and never sees the profile session. Closing that needs a **second step on top of
  this task**: the client sends its session token in the join, and the game server asks the profile server
  to vouch for it. **That step is not part of this task and is not filed yet.**
- ⛔ **Refusing unverified logins or reads.** A Yandex outage or payload change would then empty every
  player's card.
- ⛔ **Other platforms** (web, email, Apple) — `0267` item 4.
- ⛔ **An alert on the `ok` ratio** — a later task, if the owner wants one (report §9 item 3).

## Verification steps

1. **S0:** the worklog states the payload's id field name, whether an issued-at time exists, whether the
   signed id equals `getUniqueID()`, and which HMAC construction matched — **key names and yes/no only, no
   values.** The owner ran it. If the key did not verify, the task stopped and the owner was told.
2. **S2, nothing changed:** with a valid, invalid or missing signature, login returns the same response and
   a `vfy:false` token as before; tests cover each outcome of the metric.
3. **S2, rollback-safe:** a server with the widened claim accepts a `vfy:false` token minted by the old
   server, and the old claim shape still parses. Test both directions.
4. **S3a, positive:** a valid signature whose signed id equals the asserted id ⇒ `vfy:true`, and
   `resolveCaller` reports `verified: true`.
5. **S3a, forgery:** a **valid** signature for player A sent with player B's id ⇒ `vfy:false`, and the
   session resolves to no one it should not. A tampered signature ⇒ `vfy:false`. A stale one (if issued-at
   exists) ⇒ `vfy:false`.
6. **S3a, fail-open for login:** no secret configured, a bad signature, or the client's signed call failing
   ⇒ login still returns 200 with a `vfy:false` session, and the citizenship card still loads. Both
   branches tested.
7. **No credential leaks:** a test or grep proves the signature is never logged or persisted.
8. **Deploy order followed** (report §8): server S2 → client S2 → server S3a. Recorded in the worklog.
9. **The ADR exists** with status *proposed — owner sign-off pending*, or signed off by the owner (date and
   channel recorded).
10. **Tests are mandatory** for the `src/core/profile/` contract changes (CLAUDE.md). `npm test` green; if a
    known supertest flake shows, re-run and say so.
11. **No secret, key value, real player id, signature, token, host or IP** in any committed artifact.
    Fixtures use synthetic keys, as the purchase tests do.

## Notes

- **Depends on: nothing on the boards.** Slice S0 needs the **owner** in the live Yandex iframe — a person,
  not a task. Soft ordering: the report ships `0250`'s slice S1 first; nothing here needs it.
- **Blocks:** [`0250`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md) (its slice S3b only —
  hard) and [`0319`](../../backlog/0319-close-the-forged-login-name-change-hole-once-identity-is-verified/brief.md) (hard).
- **Second step on top of this, not filed:** the session token in the WebSocket join, which is what
  [`0322`](../../done/0322-game-server-shows-a-citizens-approved-name-in-multiplayer-matches/brief.md)'s forged-id
  case and ADR-103's exit need. See *Out of scope*.
- 📌 **2026-09-28 — blocks widened, and the second step is now filed (append-only; the two bullets above are
  kept as written).** Added by a spawned `fkit-producer` at `fkit-lead`'s request.
  - **Now also blocks [`0323`](../../backlog/0323-mark-a-server-confirmed-approved-name-in-matches/brief.md)** (hard), in
    addition to `0250` slice S3b and `0319` — by an owner ruling on `0323` given 2026-09-28 live via
    `AskUserQuestion` in the `fkit lead` session (*"Wait for verified login (Recommended)"*, recorded verbatim in
    the `0323` brief).
  - **The second step is filed as [`0332`](../../backlog/0332-join-token-game-server-has-the-profile-server-vouch-for-a-verified-session/brief.md)** (Sprint 7, owner ruling 2026-09-28: *"File it, end of Sprint 7
    (Recommended)"*). It is the follow-up that closes ADR-103's forged-id risk and
    [ADR-115](../../../knowledge-base/decisions/adr-115-approved-name-in-matches-runs-at-adr-103-trust-level.md)'s
    residual 1. Where this brief says that step is *"not filed"* (above, and in *Out of scope*), read `0332`.
- **Related:** [`0267`](../../backlog/0267-investigate-verifying-platform-player-identity/brief.md) (this task builds its
  Yandex half; closing or narrowing `0267` is a pending producer/owner step) ·
  [`0014`](../../done/0014-yandex-catalog-registration/brief.md) (the key) ·
  [`0065`](../../done/0065-citizenship-paid-live-verification/brief.md) (the key verifies real purchases) ·
  `0309` / `0310` (which HMAC construction) · [`0266`](../../done/0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md)
  / [`0273`](../../done/0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md) (login and
  session) · ADR-103, ADR-112, ADR-113.
- **Effort (report §3.1):** server ~2 days, client ~0.5 day, plus the S0 spike ~0.5 day. An estimate, not a
  measurement.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

## 📌 Added 2026-09-27 — accepted residuals from `0250` slice S1 that this task's ADR must record

**Source:** owner ruling **Q3**, 2026-09-27, live via `AskUserQuestion` in the `fkit lead` session, relayed by
fkit-lead — verbatim: *"Accept as known risk (Recommended)"* — *"Record it next to the other accepted
'watching' risk, in the verified-login design note."* Recorded verbatim in
[`0250`'s `plan.md`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/plan.md), section *Owner rulings*.
The residual list is that plan's **§8** (*Left for the owner*) and the
[`0250` `worklog.md`](../../backlog/0250-authenticated-profile-read-for-paid-entitlement/worklog.md) (2026-09-27 build,
*Left open*).

**What the ADR must do.** Next to **L5** (the polling hole — accepted by owner ruling D4 on `0250`, which already
says it must be recorded in this task's ADR), the ADR records these three residuals as **accepted**:

1. **The "exactly 100 XP" hint — probabilistic only.** S1 shows a citizen's XP as at least 100. A citizen shown
   at exactly 100 is therefore somewhat more likely to be a paid citizen than an earned one. It is a bias, not
   proof. Accepted under Q3.
2. **"Played a match, but the shown XP did not move."** An observer with outside knowledge — for example, one
   who knows the player just finished a match — can see that the displayed XP stayed at 100 and infer the real
   XP is below 100, which suggests a paid citizen. Still present even after Q1 (hiding `updated_at` from
   unverified callers).
3. **The rollback caveat (plan §3).** If the **profile server** is rolled back after S1, old client bundles that
   stored `""` under the **old** analytics storage prefix during S1 could fire a **false**
   `Citizenship:Earned:XP` event. New clients are not affected: they use the new `_v2` prefix.

These sit beside, not instead of, the report §9 residuals already listed under *The ADR* above.

**2026-09-27 (later, `0250` S1 review round 1) — items 1 and 2 are CLOSED by owner ruling Q-A; item 3 still
stands.** Q-A, given live via `AskUserQuestion` in the `fkit lead` session and relayed by fkit-lead, verbatim:
*"Every citizen = exactly 100 (Recommended)"* — *"All citizens show exactly 100 everywhere (including the
tenure-bonus reply) until verified login. Closes it fully (also removes the 'exactly 100' hint). Cost: earned
citizens see '100 / 100' on their own card instead of their real XP until 0325 + part 2 ship."* S1 now shows
**every** citizen's XP as exactly 100 to an unverified caller (profile, login, tenure reply), so there is no
"exactly 100" bias (item 1) and no XP that could fail to move (item 2). The ADR therefore needs to record only
item 3 here, beside L5 — plus the new accepted cost: **an earned citizen's own card reads 100 / 100 until
verified reads ship (this task + `0250` S3b).** Items 1 and 2 are kept above as history, not deleted.
Source: `0250`'s `review.md`, findings R1 and R3, and its `worklog.md` (round-1 process-review entry).

## 📌 Closed 2026-09-29 as the S2 build — S3a and the live check moved to two new tasks

**Closed `(agent-closed — not owner-verified)`** by a spawned `fkit-producer`, on an OWNER RULING given 2026-09-29
live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`: **"Split it (Recommended)"**. What
this brief calls **S3a** (and verification steps 4–6) is now
[`0340`](../../backlog/0340-0325-s3a-enforce-mint-verified-sessions/brief.md); the live proof of S2 and the deploy
order (verification step 8) is now
[`0339`](../../backlog/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md). **At close, S2
was not committed and not deployed.** The tasks this brief says it *Blocks* (`0250` S3b, `0319`, and `0323`) now
depend on `0340`. Evidence: `worklog.md` § *2026-09-29 — Closed as the S2 build*.
