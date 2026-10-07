# Verified Login — Shadow Mode: Check Yandex's Signed Player Data at Login (task 0325)

**Source**: `ai-agents/tasks/done/0325-verified-login-check-yandex-signed-player-data-and-mint-verified-sessions/brief.md`
**Status**: done (agent-closed — not owner-verified) — **closed as the S2 build only**
**Sprint/Tag**: Sprint 6, rank 38 (append rank; owner ruled it *"directly above 0250"*) / task `0325`

> 🆕 **2026-10-07 sync — S3a is now LIVE.** `0340` was deployed 2026-10-07 (`0.0.156-profile.3`) and the owner's live
> check returned `vfy: true` — [[tasks/verified-login-enforce-live]] (`0395`). The post-`0391` stale share the owner
> looked at first was **3.25 %** (was ≈ 34 %) — [[tasks/post-24h-window-login-read]] (`0392`). The note below was true
> until then.
>
> 📌 **2026-10-06 sync — S3a is BUILT, not live.** `0340` closed 2026-10-06 (agent-closed — not owner-verified) as
> **built and reviewed only** (commit `71efd10`); its deploy and live check moved to `0395`
> ([[tasks/verified-login-enforce]]). The freshness window this task shipped (900 s) is now **24 h with the id checked
> first** — [[decisions/adr-121-login-signature-24h-window]], built in `0391` and **deployed 2026-10-06**
> ([[tasks/login-signature-24h-window]]). The fixed S2-exit bar is gone: the owner judges the data at hand
> ([[decisions/adr-122-stale-login-gate-owner-judgment]]).
>
> ✅ **Closed 2026-09-29** `(agent-closed — not owner-verified)` on an owner ruling, **"Split it
> (Recommended)"**. This task shipped **S0 (the spike) and S2 (shadow mode)**. **S3a — actually minting
> verified sessions — moved to task `0340`**; the live proof of S2 moved to task `0339`. Both sit on
> [[decisions/sprint-7]].
>
> 🆕 **Deployed 2026-09-29** (telemetry → game → profile), per the runbook record in
> [[systems/weekend-deploy-window]]. The profile server with S2 came up that evening, and the new login
> metric exists in Uptrace. ⚠️ **The first minutes showed `ok` and `stale` roughly half each** — minutes of
> data, not a conclusion; clock skew on the profile box was ruled out. That watch belongs to `0339`.
>
> 🚨 **2026-10-01 — `0339` closed as a FAILED verification: the S2 exit was NOT met** — over ≈ 40 h, ≈ 68 % `ok`
> and ≈ 32 % `stale`, not falling. This task is **not** reopened; `0340` is **not** started and now waits on **`0366`**
> (measure how old the `stale` signatures are). See [[tasks/verified-login-live-check]].

## Goal

Today **nobody proves who they are** to the profile server: `POST /v1/login` takes the Yandex id the client
*says* is its own, and every session is marked `vfy:false`. Anyone who knows a player's Yandex id can act as
that player on every player-facing route. Yandex's `getPlayer({ signed: true })` returns player data signed
with the game's secret key; checking that signature at login lets the server issue a **verified** session a
forger cannot get. The task was filed on owner ruling D3 on `0250` (*"New task, above 0250 (Recommended)"*).

## Key Changes

- **S0 — the spike, owner-run live in the Yandex iframe on 2026-09-29.** Field names and yes/no only:
  - the box's existing key **does** verify signed player data;
  - **only the decoded-JSON HMAC construction matched**, not the base64-payload one;
  - the signed id equals `getUniqueID()`; `issuedAt` exists, in seconds;
  - one signed call took **about 6.9 s** with a socket error logged (**one sample**; a retry is likely, not
    proven).
- **S2 — shadow mode (built, reviewed, now deployed):**
  - **Contract** (`src/core/profile/`): the login request gains an optional `signature` field with a length
    bound; the session claim `vfy` widens from "always false" to a boolean, **but the server still mints only
    `false`**. This makes the wider claim live before anyone relies on it, so a later rollback cannot turn live
    verified tokens invalid.
  - **Server:** one shared HMAC-envelope check for purchases and players; at login it classifies the signature
    and records one bounded metric, `geoconflict.profile.login.verification`, with 7 outcomes
    (`absent | no_secret | bad_signature | bad_payload | stale | id_mismatch | ok`) — **and changes nothing
    else**. The same key serves payments and identity; no new env var.
  - **Client:** asks for the signed player data once per page load and sends the signature in the login body.
    If the signed call fails, it logs in without it — **login is never blocked or refused**.
  - 🔒 **The signature is a credential:** never logged, never stored, never in analytics. The other signed
    fields (public name, avatar and more) are dropped unread.
- **Owner rulings at build (2026-09-29), all recorded in [[decisions/adr-116-verified-login]]:** the server
  reads `data.uniqueID` only; `issuedAt` is required, fresh for 15 min back / 5 min ahead; `algorithm` is
  ignored; `requestPayload` is not used as a nonce; **D1 — no normal time limit on the signed call**, only a
  60 s hang safety net; **D2 — four client analytics events** (`Profile:Login:Signature:{Ready|Waited|Timeout|Failed}`,
  see [[systems/analytics]]).
- **The ADR — ADR-116, accepted 2026-09-29** by the owner (*"Accept as written (Recommended)"*). It amends
  ADR-103 (dated note applied the same day); its note to ADR-113 waits for S3a in production.

## Outcome

- **Evidence at close:** full `npm test` green on run 3 (179 suites / 3221 tests; run 1 failed on the known
  supertest flake family, run 2 on `0197`'s V8 segfault plus the supertest timeout shape); lint and
  `tsc --noEmit` clean; review round 1 had three low documentation findings, all fixed.
- ⚠️ **Not committed and not deployed at close** — both happened afterwards (committed in the sync window,
  deployed 2026-09-29). No browser or live run was done by the build; whether the real SDK behaves, and
  whether the metric and the four events arrive, is `0339`'s to prove.
- **What moved out:**
  - `0339` — verify S2 live: the deploy order, the metric's outcomes, the four client events, the owner's S2
    exit call. ~~🔄 In progress on Sprint 7 since 2026-09-30~~ → **closed 2026-10-01 as FAILED (S2 exit not
    met)** — [[tasks/verified-login-live-check]].
  - `0340` — S3a enforce: mint `vfy:true` only when the signature verifies, the signed id equals the asserted
    one and it is fresh. Gated on `0339`'s exit **plus** an explicit owner approval. *(2026-10-01: that exit was not
    met; the gate now waits on `0366` first.)*
- **Blocks, now repointed to `0340`:** `0250` slice S3b (verified-only paid state), `0319` (gate the
  name-change routes on a verified caller), `0323` (mark a server-confirmed name) and `0332` (the join token).
- **Still open, by design:** the game server still trusts the client-sent id (ADR-103); that closes only with
  `0332`.

## Related

- [[decisions/adr-116-verified-login]] — the decision this task built; S0 results, rulings, residuals
- [[decisions/adr-103-identity-trust-seam]] — its key-issued trigger fired; amended, not superseded
- [[decisions/adr-113-internal-player-id]] — the session and `resolveCaller`; its note waits for S3a (`0340`)
- [[decisions/adr-115-approved-name-in-matches]] — its residual 1 closes with `0332`, which builds on this
- [[systems/player-profile-store]] — the profile server, login and session token
- [[tasks/profile-identity-s2-login-and-session-token]] — task `0271`, the login and `vfy:false` token this widens
- [[tasks/profile-identity-s4-client-login-session]] — task `0273`, the client login this extends
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`, whose forged-id case waits on `0332`
- [[tasks/yandex-payments-implementation]] — the purchase signature check this shares
- [[systems/analytics]] — the four `Profile:Login:Signature:*` events
- [[systems/weekend-deploy-window]] — the 2026-09-29 deploy that shipped S2
- [[decisions/sprint-6]] — the board that closed it
- [[decisions/sprint-7]] — where `0339` and `0340` live
- [[systems/flashist-init]] — the facade that pre-fetches the signed player data at boot
- [[tasks/verified-login-live-check]] — task `0339`, the live S2 check that FAILED 2026-10-01 (S2 exit not met)
- [[tasks/stale-login-signature-age]] — task `0366`: counts how old this check's `stale` signatures are (done 2026-10-01, not deployed)
- [[tasks/stale-login-client-diagnostics]] — task `0372`: client diagnostics on this check's `stale` logins (signature age by boot kind, second-call check, held ms on `Ready`); committed, not deployed
- [[tasks/verified-login-enforce]] — task `0340`, S3a (built 2026-10-05, not deployed; deploy in `0395`)
- [[decisions/adr-121-login-signature-24h-window]] — the 24 h window that replaced this task's 900 s
- [[tasks/login-signature-24h-window]] — task `0391`, the window change (deployed 2026-10-06)
- [[tasks/authenticated-profile-read]] — task `0250`, whose ruling D3 filed this task; its S3b reads `verified`
- [[tasks/verified-login-enforce-live]] — task `0395`: S3a deployed 2026-10-07, `vfy: true` confirmed live
- [[tasks/post-24h-window-login-read]] — task `0392`: the post-`0391` stale share (3.25 %)
