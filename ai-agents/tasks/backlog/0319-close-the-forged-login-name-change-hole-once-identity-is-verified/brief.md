# Close the forged-login name-change hole (0067 residual (b)) once player identity is verified

## ID
0319

## Sprint
Backlog

## Priority
Unscheduled

**Producer's rank, if pulled into a sprint: Medium** — matches Codex's X4 rating in the `0307` review.
Not owner-ruled. It cannot be pulled before `0267` has a recommendation and that recommendation is
built (see `## Notes`).

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-27 by a spawned `fkit-producer` on an OWNER RULING given live in the `fkit lead`
session via `AskUserQuestion` and relayed by `fkit-lead` (ADR-021/037). Not producer precedent.**
Question put to the owner: *"An old hole is still open: someone who knows a player's Yandex id can log
in as them and read that player's pending name change. It was meant to be fixed by task 0014, but 0014
is already closed. What should happen?"* — Answer: **"File a small new task (Recommended)"** — *"so the
hole stays visible and gets fixed later. It's the same root problem as the unchecked Yandex login
signature."*

### The hole, in plain words

- `POST /v1/login` gives out a session token without checking the Yandex signature — the token is
  marked `vfy:false` (`src/profile-server/SessionToken.ts`, header comment).
- So anyone who knows a player's Yandex id can get a token **as that player**.
- With it they can:
  1. **Read** that player's pending, not-yet-approved `display_name` via `GET /v1/profile`
     (`src/profile-server/Routes.ts`, the `/v1/profile` handler). This is **0067 residual (b)**.
  2. **Act as** that player on the name-change routes — `POST /v1/profile/name-change-request` and
     `POST /v1/profile/name-change-cancel`. This half is **0067 residual (a)** (forged-id submission);
     today its only mitigation is the human moderator, who sees every name before it applies.
- Codex rated it **medium (X4)** in the `0307` security review.

### Why a new task — the old hand-off points at a closed task

- `0067`'s accepted residuals and the `0307` report both say this "closes with task `0014`" (signed
  identity).
- **`0014` is closed** (`✅ Done (agent-closed — not owner-verified)`, 2026-09-22). It was the Yandex
  console work; its brief records the per-game secret key as issued (2026-09-12) and on the profile box
  (2026-09-20). It never built identity checking.
- The code already names the real verification point as **`0267`** (`SessionToken.ts`: *"gives one
  later verification point (0267)"*; `Routes.ts` also cites `0267`). So the root fix lives in `0267`,
  not `0014`.
- ⚠️ **Unverified here:** whether the payments secret key that `0014` delivered is the same key needed
  to check Yandex's signed player data. That is `0267`'s item 1 to establish — do not assume it.

### Relation to `0267` — not a duplicate

`0267` is an **investigation** (owner `fkit-architect`, findings report only, no code). It decides
*how* identity gets verified. This task is the **narrow follow-through**: once verified identity exists,
make sure this specific hole is actually shut on the routes that matter, and that the "accepted
residual" wording in the code stops being true only when it really is.

## What to build

Only after verified login exists (a token that proves the player — e.g. `vfy:true` — per `0267`'s
recommendation and whatever task builds it):

1. **Read side** — `GET /v1/profile` returns the caller's pending `display_name` / name-change state
   **only** to a verified token. Decide with the owner what an unverified token sees (the pending name
   hidden, or the whole read refused) — this is a product call, not the coder's.
2. **Write side** — `POST /v1/profile/name-change-request` and `POST /v1/profile/name-change-cancel`
   refuse an unverified token.
3. **Check every other route that reads or changes a player's name** against the `0307` report's path
   table, and list any that still accept an unverified token (fix, or name them as out of scope with
   the owner's agreement).
4. **Update the residual wording in code** — the `ACCEPTED RESIDUAL` comments in
   `src/core/profile/NameChangeContract.ts` (the forged-id one and the "publicly readable" one) and the
   `vfy:false` notes in `SessionToken.ts` / `Routes.ts` — so they no longer point at `0014` and no
   longer describe as open what is now closed. Say exactly what is closed and what (if anything) stays
   open.
5. **Tests** for both sides: an unverified token is refused on each covered route; a verified token
   for player A cannot read or act on player B's name change.

If `0267` recommends something other than a verified session token, re-scope this brief with the
producer before building — the route list above still stands, the mechanism may not.

## Verification steps

1. With an **unverified** token for a player, `GET /v1/profile` does not return that player's pending
   name (or is refused — per the owner's ruling in item 1); proven by a test.
2. With an unverified token, both name-change POST routes are refused; proven by tests.
3. With a verified token for player A, no request reads or changes player B's name-change state;
   proven by a test.
4. `NameChangeContract.ts`, `SessionToken.ts` and `Routes.ts` no longer cite `0014` as the fix for this
   hole, and their residual wording matches what the tests prove.
5. The worklog lists every name-reading/-changing route from the `0307` path table with its verdict
   (covered / out of scope + owner ruling).
6. `npm test` green (per `CLAUDE.md`, re-run and say so if a known supertest flake shows).

## Notes

- **Depends on:** 0340 (verified sessions — `0325`'s slice S3a, split into its own task 2026-09-29; see the 2026-09-29 note at the end of *Notes*). *Repointed 2026-09-29, kept as written:* ~~0325 (verified login — filed 2026-09-27, see the dated note at the end of *Notes*).~~ *Earlier text, kept:* ~~0267 (the identity-verification investigation and its owner-approved recommendation) — and on the implementation task that builds verified login from it, which is not filed yet.~~
- **Blocks:** nothing
- **Related:**
  - [`0267`](../0267-investigate-verifying-platform-player-identity/brief.md) — the root fix (investigation).
  - [`0067`](../../done/0067-name-change-citizens-only/brief.md) — origin; see its
    [`review.md`](../../done/0067-name-change-citizens-only/review.md) *Accepted residuals*.
  - [`0307`](../../done/0307-security-review-of-every-player-name-path-injection-and-validation/brief.md)
    — [`review.md`](../../done/0307-security-review-of-every-player-name-path-injection-and-validation/review.md)
    and the report
    [`2026-09-26-0307-player-name-path-security-review.md`](../../../knowledge-base/reports/2026-09-26-0307-player-name-path-security-review.md)
    (§2 "0067 residual (b) — STILL OPEN", table row 11, §8 hand-offs).
  - [`0014`](../../done/0014-yandex-catalog-registration/brief.md) — closed; the old, now-stale hand-off target.
  - `0250` (authenticated profile read), `0266` / `0273` (login endpoint and client session), ADR-103.
- No secrets, hostnames or real player ids in any artifact of this task.
- 📌 **2026-09-27 — dependency now filed (append-only).** Added by a spawned `fkit-producer` on OWNER RULING
  D3 on `0250` (live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ADR-021/037).
  The *"implementation task that builds verified login … not filed yet"* in *Depends on* above **is now
  [`0325`](../../done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md)** — it
  mints `vfy:true` sessions and makes `resolveCaller` report `verified`. **This task depends on `0325`**; it
  then gates its routes on `verified`. `0267`'s Yandex half is answered by the `0250` design report, so `0267`
  no longer stands between this task and the fix.
- 📌 **2026-09-29 — dependency repointed from `0325` to `0340` (append-only; the note above is kept as
  written).** Added by a spawned `fkit-producer` at `fkit-lead`'s request, on an OWNER RULING given 2026-09-29
  live via `AskUserQuestion` in the `fkit lead` session (ADR-021/037): **"Split it (Recommended)"** — *"Close
  0325 as the S2 build (agent-closed). File a 'verify S2 live' task … at the top of Sprint 7, and a separate 'S3a
  enforce' build task after it."* `0325` closed as the S2 build: it checks the signature at login but still
  mints only `vfy:false`, and `resolveCaller` does not yet report `verified`. Both now come from
  [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (S3a, enforce), ~~which waits on
  [`0339`](../../done/0339-verify-0325-s2-live-the-login-signature-check-in-production/brief.md) (verify S2 live) and an
  explicit owner approval~~ *(stale — struck 2026-10-05: `0340` no longer waits on any task; it may start now and only its deploy is gated, ADR-122 — see the 2026-10-05 note at the end)*. **This task now depends on `0340`.**

## 📌 2026-10-05 — deploy step: the owner looks at the post-`0391` login numbers first (appended; the stale *"`0340` waits on `0339`"* wording above is struck, not deleted, ADR-035)

**Provenance.** OWNER RULING given 2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
*"Yes, add the note (Recommended)"*. Design record: [ADR-122](../../../knowledge-base/decisions/adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md) (accepted 2026-10-05; supersedes ADR-121 Decision 4).

- **Before this task's deploy:** the owner looks at the post-`0391` login-signature numbers that exist at the time (stale share,
  `ok`, `id_mismatch`, `bad_payload`, read from the first post-`0391`-deploy point) and decides whether to deploy or
  wait longer. No fixed window, no fixed bar. Record the window, the numbers and the owner's call in this task's
  worklog. The read is read-only, done the same way as [`0392`](../0392-read-the-post-0391-login-numbers-before-the-0340-deploy/brief.md) (which covers only `0340`'s deploy and closes after it).
- **Unchanged:** this task still depends on [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (verified
  sessions). `0340` itself no longer waits on any task — it may start now (`🔄 In progress` 2026-10-05); its own deploy
  needs the owner's look plus a separate, explicit owner approval to enforce. The owner's look here is **not** an
  approval of anything beyond this task's deploy.
- No status, sprint or rank changed by this note. No mover run.

## 📌 2026-10-05 — deploy only after `0395` confirms `vfy: true` live (appended; nothing above edited, ADR-035)

**Provenance.** OWNER RULING given 2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
*"Note only (Recommended)"*.

- **Deploy this task only after [`0395`](../0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md) confirms `vfy: true` live** in production. `0340` now closes once built
  and reviewed (owner ruling, 2026-10-05); verified sessions are live only after `0395`'s deploy and the owner's
  DevTools check. Until then no player is verified, so a route that reads `verified` would see none.
- **This is a note, not a dependency.** The `Depends on` line is unchanged (it names `0340`, which covers the
  **build**); no link to `0395` was added, by the owner's ruling. When `0340` closes, the board will stop showing this
  task as waiting — that is about building, not deploying.
- No status, sprint or rank changed by this note. No mover run.
