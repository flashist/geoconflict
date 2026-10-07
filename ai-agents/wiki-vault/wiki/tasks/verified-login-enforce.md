# Verified Login S3a — Mint Verified (`vfy:true`) Sessions at Login (task 0340)

**Source**: `ai-agents/tasks/done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md` (what was built: the same folder's `worklog.md` and `review.md`)
**Status**: done (agent-closed — not owner-verified) — **closed as BUILT and REVIEWED only** · 🆕 **DEPLOYED 2026-10-07 via `0395`** *(was: ~~NOT deployed~~)*
**Sprint/Tag**: Sprint 7, rank 16 (append rank; on merit the top of Sprint 7's open work) / task `0340`

> 🆕 **2026-10-07 sync — S3a IS LIVE.** The owner deployed `71efd10` mid-week on **2026-10-07 at 07:10:45Z** as profile
> **`0.0.156-profile.3`** (tagged on `71efd10`; profile only, alone — `0250` S3b kept out). Owner's live check:
> **`vfy: true`**. Its verify task `0395` closed the same day — see [[tasks/verified-login-enforce-live]]. ⚠️ The
> owner's call on the numbers and the approval to enforce (*"Yes to both"*) came **after** the deploy. Rollback target
> `0.0.156-profile.2` (never pre-S2). The ADR-113 note is applied ([[decisions/adr-113-internal-player-id]]). The
> 🚨 block and the *Outcome* gate list below are kept as history — they were true until this deploy.
>
> ✅ Done (agent-closed — not owner-verified), closed 2026-10-06; code committed in **`71efd10`** (*"0340: login mints
> vfy:true for a verified signature; resolveCaller reports verified (S3a)"*).
>
> 🚨 **CLOSING THIS TASK DOES NOT MEAN VERIFIED SESSIONS ARE LIVE.** By owner ruling Q1 at the plan gate (2026-10-05,
> *"Split it (Recommended)"* — *"Close 0340 once it's built and reviewed. A new task 'verify 0340 live' covers the
> deploy, the live check and the ADR-113 note."*), the deploy, the live check, the one-way rollback rule and routing
> the ADR-113 note all moved to task **`0395`** (Sprint 7, rank 45). The 2026-10-06 profile deploy carried `0391`
> **only** — `71efd10` is **not** in it. Until `0395` is done, **no player in production is verified.**

## Goal

The third slice of the verified-login design ([[decisions/adr-116-verified-login]]; S0 and S2 were
[[tasks/verified-login-shadow-mode]], `0325`). After S2 the profile server *checked* Yandex's signed player data at
every login but still handed every player an unverified session. S3a makes the check count: a genuine, fresh,
same-player signature gets a **verified** session that a forger cannot get. **Nothing a player sees changes**; it only
makes "is this the proven owner?" answerable for the tasks that need it — `0250` S3b, `0319`, `0332`, `0323`.

## Key Changes

- **Step 13 — the login route mints `vfy:true`** (`src/profile-server/Routes.ts`): the S2 classification's `verified`
  result (true only for outcome `ok`) is passed into the session-token mint; a throw leaves it `false`. Status, body
  and `no-store` unchanged. Resolving by the signed id is satisfied by the asserted id, because since ADR-121 the
  classifier returns `verified: true` only when the two are equal.
- **Step 14 — `resolveCaller` reports `verified`:** a new pure `callerFromSession` maps a checked session to
  `{ playerId, verified }` (strictly `vfy === true`). **No route reads `verified` in this task.**
- **Step 15 — comments only** across the profile server, `src/core/profile/` contracts and `src/client/ProfileSession.ts`.
  A review round fixed which comments point at `0250` S3b vs `0319` (the payments intent is gated by neither).
- **Fail behaviour unchanged (ADR-116):** every failure falls back to a `vfy:false` login; login never refuses because
  of the signature.
- **Tests:** forgery with distinct internal players (a valid note for A sent as B → `vfy:false`, B's player), tampered,
  stale (30 h old, 10 min ahead), no secret / bad / no signature → `vfy:false` that still reads the profile; creation
  switch off; parity tests showing a `vfy:true` token gets the same answer as `vfy:false` on every route; one
  real-Postgres integration case. Mutation checks bit.
- **Test runs:** 5 full `npm test` runs — runs 1–2 had 3 failures in **different untouched supertest suites** (known
  flake shapes, re-run green in isolation; `0197` segfault ruled out); runs 3–5 all green. ⚠️ The worklog notes 3 flake
  hits in 5 runs is above CLAUDE.md's ~4–7 % on a small sample — not investigated.
- ⚠️ **Left for a later pass:** the `outcome` counter's runtime description string in `Telemetry.ts` still says
  "(shadow mode)" (metric metadata; the plan ruled out metric changes).

## Outcome

- **The deploy gate** (ADR-122, carried by `0395`): `0391` live (**met** 2026-10-06) · the owner's look at the
  post-`0391` login numbers via `0392` (**open**) · a separate explicit owner approval to enforce (**open**). Earliest
  target: the 10/11 Oct slot. Architect advice: deploy it **alone, not with `0250` S3b**.
- ⛔ **Rollback rule (carried to `0395`): never roll S3a straight back to a pre-S2 build** — every live verified token
  would turn invalid. S3a → S2 is safe; the rollback target is the `0391` image (`0.0.156-profile.2`).
- **The ADR-113 note** (point 5, point 9, re-raise list, key rotation — see [[decisions/adr-113-internal-player-id]])
  is applied by `fkit-architect` **only after S3a is live** — now `0395`'s job.
- `0250` S3b, `0319`, `0332`, `0323` keep `Depends on: 0340` for their **builds**; each brief carries a dated note
  *"deploy only after `0395` confirms `vfy: true` live"* — a note, not a dependency (owner: *"Note only
  (Recommended)"*).

## Related

- [[decisions/adr-116-verified-login]] — the design; S3a is its Decision 6 step
- [[decisions/adr-121-login-signature-24h-window]] — the window S3a enforces (24 h, id first)
- [[decisions/adr-122-stale-login-gate-owner-judgment]] — this task may be built now; only its deploy is gated
- [[tasks/verified-login-shadow-mode]] — task `0325`, S0 + S2
- [[tasks/verified-login-live-check]] — task `0339`, the failed S2 exit this chain answered
- [[tasks/stale-login-fix-decision]] — task `0373`
- [[tasks/login-signature-24h-window]] — task `0391`, deployed first
- [[tasks/authenticated-profile-read]] — task `0250`, whose S3b is the first reader of `verified`
- [[decisions/adr-113-internal-player-id]] — the note that waits for S3a in production
- [[decisions/adr-103-identity-trust-seam]] — the game-server seam stays client-asserted until `0332`
- [[systems/player-profile-store]] — the login route and session token
- [[decisions/sprint-7]] — the board (rank 16; `0395` at rank 45)
- [[decisions/sprint-8]] — `0395` was filed there (rank 9) before moving to Sprint 7
- [[systems/weekend-deploy-window]] — the next profile deploy, after `0391`'s mid-week one
- [[tasks/verified-login-enforce-live]] — task `0395`, which deployed this and confirmed `vfy: true` live (2026-10-07)
- [[tasks/post-24h-window-login-read]] — task `0392`, the post-`0391` numbers the owner looked at (stale 3.25 %)
- [[tasks/session-verified-status-line]] — task `0397` (2026-10-06): shows the player whether S3a's `vfy` session is verified; must deploy only after `0395` confirms verified logins live
