# Investigate verifying the player's platform identity (stop trusting the client-sent id)

## ID
0267

> ℹ️ **ID allocation, checked 2026-09-15 before filing** (same run as `0266`). `0267`: no folder, no
> `## ID` hit, no `.claude/` hit, no repo-wide hit (`.svg`/`.json` filtered).

## Sprint
Backlog

## Priority
Unscheduled

**Producer's rank, if pulled into a sprint: Medium** — not owner-ruled. The owner judged trusting the id
acceptable for now (single platform; forging to play as another player is rare), so this is not a
launch gate. It rises if abuse shows up in the monitoring that `0266` sets up, or when a second login
platform is added.

## Status
🔲 Backlog

## Owner
fkit-architect

## Context

**Filed 2026-09-15 by a spawned `fkit-producer` on an OWNER RULING given live in a design discussion in
the lead session and relayed by `fkit-lead`.** Owner's position, as relayed: **trusting the client-sent
id is OK for now** — there is one platform, and forging an id to act as another player is rare — **but
investigate the options.** Two were named by the owner as examples:

1. **Yandex signed player data**, verified on the server with the per-game secret key.
2. **A client-computed hash of the id** — harder to forge, but still forgeable, because it is computed
   on the client.

### What is known (records, not re-verified this turn)

- **ADR-103:** the profile system accepts a client-asserted Yandex id behind one trust funnel
  (`GameServer.getCreditableYandexId`); signed verification was deferred until the Yandex secret key
  exists.
- **The secret key waits on Yandex catalog approval** — `0014` (Sprint 4, `🚧 Blocked` on Yandex).
- **`0250`** (Backlog) — authenticated profile read; carries the earlier thinking on verified identity.
- **ADR-112** — the tenure grant's "claim on behalf of another account" risk exists because identity is
  trusted; `0268` (remove the claim ~60 days after release) closes that specific attack.
- **`0266`** (Sprint 4) — moves profiles to an internal id with platform logins and a login endpoint;
  the id stays trusted there. Whatever this investigation recommends lands at `0266`'s login endpoint.
- `src/profile-server/YandexSignature.ts` exists (payments signature checking) — a likely starting
  point; its relevance to player identity is **not established**.

## What to build

**Investigation only — findings report, no code.** Write
`ai-agents/knowledge-base/reports/YYYY-MM-DD-0267-platform-identity-verification-findings.md`:

1. **Yandex signed player data** — what the SDK exposes, what exactly is signed, how the server checks
   it, whether it needs the per-game secret key (and therefore `0014`), replay/expiry behaviour, and what
   `YandexSignature.ts` already does that can be reused.
2. **Client-computed hash** — state plainly what it defends against and what it does not (the hashing
   code ships to the client, so anyone can compute it). Is it worth anything beyond casual tampering?
3. **Other options** found (e.g. a server-issued session token after one verified login) and how each
   fits `0266`'s login endpoint.
4. **What changes for other platforms** (web, Gmail, Apple) — is there a common shape.
5. **Cost and prerequisite** per option, and which routes must be verified (the login endpoint, any
   route that still accepts a platform id, ADR-112's grant route while it exists).
6. **One recommendation** with its main tradeoff, put to the owner.

## Verification steps

1. The findings report exists at the named path and answers items 1–6, each claim with a source
   (SDK doc link or `file:line`).
2. Item 2 states explicitly whether a client-computed hash can be forged, and how.
3. The recommendation names its prerequisite (e.g. `0014`) and every route it must cover.
4. The owner's decision is recorded in the report with date and channel, or recorded as open.
5. No source file changed by this task.

## Notes

- **Depends on:** nothing — can run any time; its recommendation lands on the login endpoint from `0266`, so reading `0266`'s approved design first is advised, not required.
- **Blocks:** nothing
- **Related:** [`0266`](../0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md),
  [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md), `0014`, ADR-103, ADR-112,
  [`0268`](../0268-remove-tenure-xp-claim-logic-after-60-days/brief.md).
- No secrets in the report — never paste the secret key or a real player id.
