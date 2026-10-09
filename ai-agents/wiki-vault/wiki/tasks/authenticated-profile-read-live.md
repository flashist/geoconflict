# Verify 0250 S3b Live — Deploy the Verified Owner View and Confirm It in Production (task 0396)

**Source**: `ai-agents/tasks/done/0396-verify-0250-s3b-live-deploy-the-verified-owner-view-and-confirm-it-in-production/brief.md` (the record: the same folder's `worklog.md`; the owner's Console steps: the same folder's `snippets.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 49 (append rank, not a merit rank; moved in from Sprint 8 rank 10 on 2026-10-06) / task `0396`

> ✅ Done (agent-closed — not owner-verified), closed **2026-10-08** by a spawned `fkit-producer` via `/fkit-task-done`,
> on the owner's ruling given live in the `fkit lead` session, verbatim *"Close them"* (one ruling closed `0396`, `0398`
> and `0401`). The owner ran the deploys and the live checks; the close itself is agent-run, hence the marker.
>
> 🟢 **S3b IS LIVE IN PRODUCTION.** Profile server **`0.0.156-profile.4`** (commit `55598f2`) deployed by the owner on
> **Thu 2026-10-08, deploy record 06:41:41Z** — first; then, after the owner's DevTools check, game client **`0.0.157`**
> (commit `c12cd8e`, container started 06:56:17Z), carrying `0397`, `0248`, `0301`, `0332`'s game side and `0404`. A
> **verified paid** account now reads `is_paid_citizen: true`; an **unverified** session still gets the S1 view.
>
> ⚠️ **Mid-week exception, owner's call** — not a weekend slot (same kind as `0391` and `0340`). The owner asked for the
> walkthrough: *"I am ready for making the release. Walk me through the steps"*.

## Goal

Everything after `0250`'s S3b slice was built ([[tasks/authenticated-profile-read]]): pass the gates, deploy the S3b
profile server, and prove in production that a player whose login was **verified** (`vfy:true`) sees their own true
data — including `is_paid_citizen` — while every other session keeps the S1 "equalized" view, where a paid and an
earned citizen look the same. Filed 2026-10-06 at `0250`'s close under the owner's build/verify-split rule
(2026-09-29). Nothing in source.

## Key Changes

Nothing in source. The record, by Verification step:

1. **Gates.** (1) `0340` in an earlier, separate slot — met 2026-10-07T07:10:45Z ([[tasks/verified-login-enforce-live]]).
   (2) `0395` confirmed `vfy: true` live — met 2026-10-07. (3) The owner's look at the post-`0391` login numbers —
   **removed** by owner ruling 2026-10-07 ([[decisions/adr-123-login-numbers-monitored-not-gate]]); for information only,
   `0402`'s pre-deploy read at ~06:29Z showed stale **2.96 %** (237 / 7,998) over 23.3 h. (4) Weekend slot — the
   mid-week exception above. S3b was committed by the owner as `6f4ab77`.
2. **Delta check (read-only git, before the deploy).** Profile paths from `71efd10` (the `0340` deploy) to the deployed
   commit carry **two commits**: `6f4ab77` (S3b — projection, routes, login contract, profile type) and `077c9e3`
   (`0332`'s join-token vouch). The deployed commit `55598f2` adds only a worklog. **No migration changed.** `0332`'s
   profile side rode along — expected, its own verify is `0405`. **Nothing unexpected.**
3. **Pre-flight.** Config parity `--enforce` exit 0 · `npm run lint` exit 0 · `npm test` 4190/4191 — one fail in
   `tests/profile-server/Routes.test.ts`, `socket hang up` (supertest flake family, no `SIGSEGV`); that file re-ran
   64/64 — **re-run stated, not hidden.** `test:integration` **not run**.
4. **Deploy order: profile server first, then game client** — required by the owner's `0397` Q4 ruling once `0397`
   rode in the same deploy ([[tasks/session-verified-status-line]]). Profile deploy outside the 02:00–03:15 UTC backup
   window.
5. **Watch (read-only, ~07:00Z and ~07:02Z).** Profile: `/health` reports `0.0.156-profile.4`; `/ready` 200;
   `profile-api` healthy, 0 restarts; postgres untouched; 0 `error` / 0 `warn` log lines. Logins on `.4` over ~18 min:
   `ok` 196 · `stale` 11 (5.3 % — tiny sample) · no `id_mismatch` · no `bad_*`. Counters restarted at 06:41:41Z — this
   starts `0402`'s second window. `0332`'s vouch counter: `verified` 43 · `absent` 84 · no rejected outcome (early sign
   only; the real read is `0405`). Game: 0 restarts, 0 `failed after retries`, 0 `dropped`, 0 `error`; the restart-minute
   `warn`s (*"Invalid message before join"*) are **pre-existing** (thousands a day before the deploy), now logged with the
   message type because of `0332`. First `credited` line at 07:02:06Z — credits flow on the new image.
6. **Owner's live check (DevTools).** Verified **paid** account → `is_paid_citizen: true` — ✅. Extra: verified
   **earned** account → `is_paid_citizen: false` — ✅ (paid and earned are now told apart). **Unverified** session →
   S1 view, no `is_paid_citizen` key — ✅, run by the owner with `snippets.md` Check 2 at ~07:28Z.

## Outcome

- **The first reader of `verified` is live.** ADR-116 Decision 4 holds in production: an unverified read is still served,
  without paid facts ([[decisions/adr-116-verified-login]]).
- **⛔ Rollback rules (written out in the worklog).** Server S3b → `0.0.156-profile.3` (the `0340` image, still on the
  profile box) is safe for the server — **but** with the `0397` client live, a server rollback must also roll the game
  client back **or** switch `citizenship_ui` off, otherwise every logged-in citizen sees *"We couldn't confirm your
  account this time…"*. A client rollback (to `0.0.156`, registry only — pruned from the box) rolls back **every** task in
  the image and also needs `citizenship_ui` off or a server rollback. **Never roll back past S2** (ADR-116).
- ⚠️ **Carried, not resolved:** the owner's first Console attempt ran the snippet with its placeholder unreplaced, and the
  server **created a new, empty player row** under that placeholder text (0 XP, no citizenship, not a real player). Left
  in the production DB — removing it is a DB write and the owner's call.
- ⚠️ **The runbook was not updated in this window** — `ai-agents/knowledge-base/weekend-deploy-slot-runbook.md` still
  ends at the 2026-10-07 deploy; the rollback targets above come from this task's worklog. See
  [[systems/weekend-deploy-window]].
  📌 *2026-10-08 sync: now history — the runbook gained an appended 2026-10-08 section (`bf5a9a1`) that records this
  deploy, the same rollback targets and rules, and the empty row; summarised on [[systems/weekend-deploy-window]].*
- Unblocked the same sitting: `0398` ([[tasks/paid-citizen-ad-free-live]]), `0400`
  ([[tasks/session-verified-status-line-live]]) and `0401` ([[tasks/citizenship-explainer-popup-live]]).

## Related

- [[tasks/authenticated-profile-read]] — task `0250`, the S3b build this deploys
- [[tasks/verified-login-enforce-live]] — task `0395`, gates 1 and 2 (`vfy: true` live)
- [[tasks/verified-login-enforce]] — task `0340`, S3a; the rollback target's build
- [[tasks/paid-citizen-ad-free-live]] — task `0398`, whose gate 1 is this task's pass
- [[tasks/session-verified-status-line-live]] — task `0400`, same slot, server first (Q4)
- [[tasks/citizenship-explainer-popup-live]] — task `0401`, which hard-depended on this task
- [[tasks/session-verified-status-line]] — task `0397`, whose Q4 ruling set the server-first order and the rollback pairing
- [[tasks/join-token-identity-vouch]] — task `0332`, whose profile and game sides rode along (verify `0405`)
- [[tasks/long-session-refresh-popup]] — task `0404`, in the same game image (verify `0406`)
- [[decisions/adr-116-verified-login]] — Decision 4; *never roll back past S2*
- [[decisions/adr-123-login-numbers-monitored-not-gate]] — removed gate 3
- [[systems/player-profile-store]] — the profile server now at `0.0.156-profile.4`
- [[systems/weekend-deploy-window]] — the 2026-10-08 mid-week deploy
- [[decisions/sprint-7]] — the board (rank 49)
- [[decisions/sprint-8]] — filed there (rank 10) before moving to Sprint 7
- [[tasks/paid-citizen-ad-free]] — task `0248`, the ad gate that reads S3b and waited on this task
- [[tasks/citizenship-explainer-popup]] — task `0301`, which rode in the same game deploy
- [[tasks/paid-citizen-thank-you-line]] — task `0407`, whose live check needed this one first
- [[tasks/post-0340-login-reread]] — task `0402`, the post-`0340` login-numbers re-read (closed 2026-10-09, ≈2.6 % stale, no weekend read)
