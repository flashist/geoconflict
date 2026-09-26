# Epic — Profile Identity: Internal Player Id, Platform Logins, and a Login Endpoint

**Source**: `ai-agents/tasks/done/0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 5 (moved from Sprint 4 on 2026-09-23) · epic `0266` · children `0270`–`0274` · High (label owner-ratified)

> ⚠️ **Closed 2026-09-26 by a spawned `fkit-producer` on an owner ruling** given live in the
> `fkit lead` session (*"… all 5 slices S1–S5 are now Done. Close the epic?"* → **"Close it"**); no owner
> channel in the spawn ⇒ **`(agent-closed — not owner-verified)`**. **Every slice close is agent-closed,
> so nothing in this epic is owner-verified.** The epic closes **with the slices' residuals**, which stay
> in their own close notes — it does not discharge them.

## Goal

Give profiles **our own internal id**, store each login as **platform + platform id** linked to it, use
only the internal id inside the system, and add a **login endpoint** (find-or-create) called on every
game load by a logged-in player. Filed 2026-09-15 on owner rulings in a design discussion, **before XP
go-live** — while the profile database held no player rows, so re-keying cost no real-player migration.
Decision record: [[decisions/adr-113-internal-player-id]].

**Owner direction, recorded as given:** linking several logins to one profile is **designed for, not
built**; the platform id is **trusted for now** (verification research is backlog task `0267`); **no
per-IP rate limit on login — monitoring instead** (an accepted, monitored risk: an unlimited
find-or-create route can be used to create junk profile rows).

## Key Changes

**Design rulings, 2026-09-15:** design approved **with the login token in v1** (*"Token now, not
later"*); ADR-113 accepted and ADR-112 amended the same day ([[decisions/adr-112-free-xp-grants]]); build
**"Split into 4"**, with monitoring added as a fifth slice under *"Yes, before go-live"*; alerts by
email; account linking recorded in ADR-113, not built.

| Slice | Task | What | State at epic close |
|---|---|---|---|
| **S1** | `0270` | Database + re-keying (migration `006`) | done, agent-closed |
| **S2** | `0271` | `POST /v1/login` + 24 h session token | done, agent-closed |
| **S3** | `0272` | Game server: resolve at join, credit by `playerId` | done 2026-09-26, agent-closed |
| **S4** | `0273` | Client login session + Bearer; legacy fallback removed | done 2026-09-26, agent-closed |
| **S5** | `0274` | Monitoring + login-creation switch | done 2026-09-19, agent-closed |

**Order:** S1 → (S2 ∥ S3) · S2 → (S4 ∥ S5) · S4 → `0253`'s rework · all five deployed and verified →
`0217` sets `PROFILE_INTERNAL_TOKEN`.

⚠️ **The epic's slice table is hand-maintained and nothing checks it** — the status tool reads boards,
not epic tables. On 2026-09-17 three rows were stale behind a clean drift report. The briefs are the
source of truth.

## Outcome

Closed 2026-09-26, after the weekend window put every slice into production: profile deploy
2026-09-17 (S2 + S3 server half + fallback removal + S5), game deploy 2026-09-26 (S3 game half + S4
client). Close criterion (all five child slices closed) checked from the record: all five sit in
`tasks/done/` with `✅ Done (agent-closed — not owner-verified)`.

🚩 **Residuals carried by the slices, not discharged here:**

- **S4 (`0273`)** — Bearer on the other profile callers proven by client tests only while the card is
  off; **AR-2** (login-button restart) unobservable until the card flip; one load of each kind observed.
- **S3 / `0217`** — watch item **F-B** (two slow `resolve` calls; W15's `failed after retries` count must
  stay 0) kept in the runbook.
- **S5 (`0274`)** — closed with named monitoring gaps: **one of six alert rules exists**.

## Related

- [[decisions/adr-113-internal-player-id]] — the decision the epic implements
- [[decisions/adr-112-free-xp-grants]] — amended the same day ("account" became the internal id)
- [[decisions/adr-103-identity-trust-seam]] — the client-asserted identity the epic keeps trusting
- [[tasks/profile-identity-s1-database-rekeying]] — S1, task `0270`
- [[tasks/profile-identity-s2-login-and-session-token]] — S2, task `0271`
- [[tasks/profile-identity-s3-game-server-resolve-and-credit]] — S3, task `0272`
- [[tasks/profile-identity-s4-client-login-session]] — S4, task `0273`
- [[tasks/profile-identity-s5-monitoring-and-creation-switch]] — S5, task `0274`
- [[tasks/profile-p2-wire-game-server]] — task `0217`, the XP go-live the epic had to precede
- [[tasks/tenure-xp-grant]] — task `0253`, whose redesign waited on this epic's login reply
- [[systems/player-profile-store]] — the backend re-keyed by the epic
- [[decisions/sprint-5]] — the board that tracked its close
- [[systems/weekend-deploy-window]] — the 2026-09-26 window that put the last slices live
