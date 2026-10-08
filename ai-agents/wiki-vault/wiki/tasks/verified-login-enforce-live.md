# Verify 0340 Live — Deploy S3a and Confirm Verified Logins in Production (task 0395)

**Source**: `ai-agents/tasks/done/0395-verify-0340-live-deploy-s3a-and-confirm-verified-logins-in-production/brief.md` (the record: the same folder's `worklog.md`; `ai-agents/knowledge-base/weekend-deploy-slot-runbook.md` § *2026-10-07 — profile deploy `0340`*)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 45 (append rank, not a merit rank; moved in from Sprint 8 rank 9 on 2026-10-05) / task `0395`

> 📌 **2026-10-07 (later) sync — the `vfy: true` this task confirmed is now relayed to the game server in code.**
> `0332` ([[tasks/join-token-identity-vouch]], [[decisions/adr-124-join-token]]) was designed and built the same day, committed `077c9e3`, **not deployed**; 📌 *2026-10-08 lint: deployed since — profile side in `0.0.156-profile.4`, game side in game `0.0.157`, both 2026-10-08 (`0396` worklog); live read still owed — `0405`.* its deploy precondition
> *"only after `0395` confirms `vfy: true` live"* is met by this task.
>
> ✅ Done (agent-closed — not owner-verified), closed **2026-10-07** by a spawned `fkit-producer` via `/fkit-task-done`,
> routed by `fkit-lead`, on the owner's choice of an option reading *"0395 gets its record and closes"*.
>
> 🟢 **VERIFIED LOGINS ARE LIVE IN PRODUCTION.** `0340` (S3a) was deployed by the owner on **Wed 2026-10-07 at
> 07:10:45Z** as profile **`0.0.156-profile.3`** (commit `71efd10`, tagged); the owner's live check returned
> **`vfy: true`** for a session issued after the deploy. The ADR-113 note was applied the same day.
>
> ⚠️ **Gate-timing deviation, stated plainly:** the owner's call on the numbers and the approval to enforce (*"Yes to
> both"*) were given **after** the deploy, not before it as the brief's Verification step 1 required. The content of
> both gates is on record; the order did not happen.
>
> ⚠️ **Only ~3 minutes of post-deploy data were watched** (15 logins) — enough to show nothing broke at start, **not**
> that the `ok` share held.

## Goal

Everything after `0340` was built: decide it is OK to turn on, deploy it, prove in production that real logins come
back verified (`vfy:true`), and record the consequence in ADR-113. Split out of `0340` by the owner's Q1 ruling at its
plan gate (*"Split it (Recommended)"*), per the 2026-09-29 build/verify rule. Nothing a player sees changes.

## Key Changes

Nothing in source. The record, by Verification step:

1. **Gates.** (1) `0391` live — met 2026-10-06T08:09:49Z ([[tasks/login-signature-24h-window]]). (2) The owner's call
   on the post-`0391` numbers — via `0392` ([[tasks/post-24h-window-login-read]], stale 3.25 %). (3) The separate
   approval to enforce. (2) and (3) are the one answer *"Yes to both"* — **after** the deploy.
2. **Mid-week deploy — an owner exception** to the weekend-slot rule (owner, verbatim: *"I can deploy the profile server
   now, if needed, wihout waiting for the weekend slot"*). Same kind of exception as `0391`'s Tuesday deploy (ADR-122).
3. **Delta check (before the deploy, read-only git):** `0aef613` (the `0391` deploy) → `71efd10` is **exactly one
   commit, `0340` only**. `dev` HEAD carries `0250` S3b profile code (`6f4ab77`); deploying from `71efd10` kept it out —
   the brief's *"alone, not with `0250` S3b"*. Nothing unexpected.
4. **Deploy:** owner-run, profile server only, alone; outside the 02:00–03:15 UTC backup window; the owner returned to
   `dev` with a clean tree.
5. **Watch (~07:13–07:14Z, read-only):** `/health` reports `0.0.156-profile.3`; `/ready` 200; `profile-api` healthy,
   0 restarts, 0 error lines; `postgres` untouched. Logins on `.3`: `ok` 14 · `stale` 1 · `id_mismatch` 0. `/v1/login`
   2xx only — no 4xx/5xx; no `sessionRejected`. A steady ~6/min of `/v1/messages` 4xx **pre-dates** this deploy.
   Expected, not a fault: old `vfy:false` tokens stay valid, so the verified share grows over ~24 h as players log in
   again.
6. **Owner's live check: `vfy: true`** — the token's issue time is after the deploy, so `.3` minted it. ⚠️ The owner
   pasted the session token into the lead's chat, against the brief's *"never pasted"* rule; it is in no artifact. Owner
   ruling *"Let it expire (Recommended)"* — it expires on its own about 24 h later; there is no per-token revoke, and
   rotating the session secret would log out every player.
7. **ADR-113 note applied** by `fkit-architect` 2026-10-07 — see [[decisions/adr-113-internal-player-id]] and
   [[decisions/adr-116-verified-login]].
8. **Runbook rollback-target note appended** — see [[systems/weekend-deploy-window]].

## Outcome

- **⛔ Rollback is one-way.** Target: **`0.0.156-profile.2`** (the `0391` image) — keeps the 24 h window; its image was
  confirmed still present on the profile box (read-only, 2026-10-07). S3a → S2 is safe (any image after the 2026-09-29
  S2 deploy parses `vfy:true`). **Never roll S3a back to a pre-S2 build** — every live verified token would turn
  invalid and every client would log in again once. An older S2 image (`0.0.156-profile.1`) is token-safe but brings
  back the 900 s window and its ~32 % stale share.
- **Counters restarted at 07:10:45Z** — never compare cumulative values across it.
- **The four `verified` readers** — `0250` S3b, `0319`, `0332`, `0323` — carry a *"deploy only after `0395` confirms
  `vfy: true` live"* note (a note, not a dependency, by owner ruling). Per `fkit-lead`, that note refers to the live
  check, which is now recorded; their briefs were not edited beyond link repair. **At `71efd10` no route reads
  `verified` yet** — S3b ([[tasks/authenticated-profile-read]], verify `0396`) is the first, still **not deployed**. 📌 *2026-10-08 lint: S3b deployed since — profile `0.0.156-profile.4`, 2026-10-08; owner's live check passed both halves (`0396`).*
- Next in the chain: `0396` (S3b), then `0398` / `0400` / `0401` — see [[decisions/sprint-7]].

## Related

- [[tasks/verified-login-enforce]] — task `0340`, the S3a build this deploys
- [[tasks/post-24h-window-login-read]] — task `0392`, the numbers behind gate 2
- [[tasks/login-signature-24h-window]] — task `0391`, gate 1 and the rollback target
- [[decisions/adr-116-verified-login]] — the design; its ADR-113 subsection is now marked applied
- [[decisions/adr-113-internal-player-id]] — the note this task triggered
- [[decisions/adr-122-stale-login-gate-owner-judgment]] — the owner-judgment gate this task applied
- [[decisions/adr-103-identity-trust-seam]] — the game server stays client-asserted; exit `0332`
- [[tasks/authenticated-profile-read]] — task `0250`, whose S3b is the first reader of `verified`
- [[tasks/session-verified-status-line]] — task `0397`, whose live check `0400` gates on this task
- [[systems/player-profile-store]] — the profile server now at `0.0.156-profile.3`
- [[systems/weekend-deploy-window]] — the 2026-10-07 mid-week deploy record and rollback target
- [[decisions/sprint-7]] — the board (rank 45)
- [[decisions/sprint-8]] — filed there (rank 9) before moving to Sprint 7
- [[decisions/adr-121-login-signature-24h-window]] — the 24 h window that now decides `vfy:true`
- [[systems/analytics]] — the `Citizenship:Status:*` caveat that still waits on `0396`
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`, whose forged-id case still waits on `0332`
- [[tasks/stale-login-fix-decision]] — task `0373`, the decision that led to the 24 h window
- [[tasks/verified-login-live-check]] — task `0339`, the failed S2 check this chain answered
- [[tasks/verified-login-shadow-mode]] — task `0325`, S0 + S2 — the slices before S3a
- [[decisions/adr-123-login-numbers-monitored-not-gate]] — 2026-10-07, after this deploy: the login numbers stop gating later `verified` deploys
- [[decisions/adr-124-join-token]] — ADR-124 (2026-10-07): the join token; this task's live check was its precondition
- [[tasks/join-token-identity-vouch]] — task `0332`, built 2026-10-07 (not deployed) 📌 *2026-10-08 lint: deployed since — profile side in `0.0.156-profile.4`, game side in game `0.0.157`, both 2026-10-08 (`0396` worklog); live read still owed — `0405`.*
- [[tasks/authenticated-profile-read-live]] — task `0396` (2026-10-08): the next deploy in the chain — S3b live
- [[tasks/session-verified-status-line-live]] — task `0400` (2026-10-08): this task was its gate 1
