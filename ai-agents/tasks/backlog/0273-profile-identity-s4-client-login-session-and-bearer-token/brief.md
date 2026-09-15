# Profile identity S4 — Client: login once per load, Bearer token on every profile call, then remove the legacy fallback

## ID
0273

## Parent / Epic
[`0266-profile-identity-internal-player-id-platform-logins-login-endpoint`](../0266-profile-identity-internal-player-id-platform-logins-login-endpoint/brief.md)

## Sprint
Sprint 4

## Priority
High *(producer's rank — NOT owner-ruled)*

⚠️ Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs directly below `0272`**, because it follows S2 and gates `0253`'s rework; the
S1–S5 run as a whole belongs directly below `0217`. Appended at the bottom (ADR-035).

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-15 on OWNER RULINGS (`AskUserQuestion`, lead session, relayed by `fkit-lead`):** login
token in v1 (*"Token now, not later"*); ADR-113 accepted; build split into slices; monitoring before
go-live; alerts by email.

**Source of truth:** [`2026-09-15-profile-identity-design.md`](../../../knowledge-base/reports/2026-09-15-profile-identity-design.md)
§2 (refresh, caller resolution, the `NewsModal` inbox caveat), §4 (when the client logs in), §9 row
**S4**; [ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md).

⚠️ **Watch the inbox refresh from `NewsModal.ts`** — it may run **outside** the citizenship card switch,
so it must also carry the token (or not call) once the fallback is gone.

## What to build

Per design §9 S4:

1. **`src/client/ProfileSession.ts`** — log in **once per load**, after platform init, **only for
   authorized Yandex players**, **not** behind `CITIZENSHIP_CARD_ENABLED`; bounded timeout; fail-soft
   (the game always starts); token held **in memory only** (no cookie, no storage, never in a query
   string); exposes `grantChecks`; on `401` re-logs-in **once** and retries **once**.
2. **The six client callers in design §0:** five move to `Authorization: Bearer` with the Yandex id
   removed from bodies and queries — `PlayerProfileView` (card read), `Inbox` (incl. the `NewsModal`
   refresh), `NameChangeRequest`, `PaymentsApiClient` intent (via `CitizenshipPurchase`), and
   `TenureGrantClaim` if present. The sixth, WS join / `update_identity` in `Transport.ts`, **keeps**
   sending the Yandex id to the game server (the S3 path) — the token never goes to the game server.
3. **Login analytics events** — added to `flashistConstants.analyticEvents` and to
   `ai-agents/knowledge-base/analytics-event-reference.md` (`Category:Action` form, never inline).
4. **LAST STEP — only after the game deploy carrying steps 1–3 is verified live:** remove the legacy
   Yandex-id fallback from `resolveCaller` (`src/profile-server/Routes.ts`) — a separate **profile-box
   deploy**.

Any user-visible string added goes through `translateText` with `en.json` and `ru.json` both updated.

### Owner steps
1. **Game deploy** at an owner-chosen slot, carrying steps 1–3.
2. Verify live: a logged-in load makes one login call and profile calls carry a Bearer token
   (browser network tab).
3. **Profile-box deploy** carrying step 4, then verification step 6.

## Verification steps

1. Guest (not Yandex-authorized) load → **no** login call (client test).
2. Authorized load → **exactly one** login call per load.
3. Login fails or times out → card, inbox and game start all still work (client test + a manual run
   with the profile server stopped).
4. Every profile call carries a Bearer header and **no** Yandex id in body or query (client tests per
   caller).
5. A `401` → one re-login, one retry, **no loop** (client test with a server that always answers 401).
6. **After fallback removal:** a legacy-shaped request (Yandex id, no token) gets `401` — server test,
   then once on the box.
7. Analytics events present in the enum and in the reference doc.
8. `npm test` green; `npx tsc --noEmit` and `npm run lint` exit 0.

## Notes

- **Depends on:** [`0271`](../0271-profile-identity-s2-login-endpoint-and-session-token/brief.md) (S2)
- **Blocks:** [`0253`](../0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md) (its rework — route + client logic — starts after this), [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) (XP go-live)
- **Effort (design §9):** 1.5–2 days.
- ⚠️ **Cannot close inside one deploy:** it needs a game deploy, a live check, then a profile-box
  deploy. On the weekend-slot cadence that may be the longest calendar item in the epic.
- **Related:** [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) —
  `vfy:false` tokens never unlock paid state.
- 🔒 No secrets, hosts or player ids in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.
