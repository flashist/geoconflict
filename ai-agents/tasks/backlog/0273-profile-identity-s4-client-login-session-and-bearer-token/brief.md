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
🚧 Blocked — **the legacy-fallback removal (ruling D1) is LIVE AND PROVEN on the box, 2026-09-17. The client is NOT deployed.** The owner ran `GET /v1/profile?yandexPlayerId=…` with **no Bearer token** against the public domain and got **401** — D1's removal is real on the deployed box, not just in tests. 🚨 **That is the server half only.** None of S4's **client** code is deployed, so the login flow, the session store, the Bearer-token call path and the analytics events have **zero production evidence**. ⚠️ **Loudest residual AR-2 is UNCHANGED by this deploy:** the login-button restart has **zero** production evidence and is **unobservable until `0054`** — the deploy moved it not at all. ⚠️ Also note the one-sided proof: a 401 with no token proves the fallback is gone; **nothing has proven a Bearer token is accepted** (see `0271`'s box proof record). ⇒ **Blocked on: the game deploy** (which carries the client), then this task's live check, plan §4.6. Residuals AR-1…AR-9 minus AR-7 still stand. No code. · earlier: 🚧 Blocked — **code complete, review closed out; waiting on deploys, not on work.** Built + reviewed
2026-09-16 (3 rounds, `Status: closed-out`, no confirmed defect open; mutation sweep 15/15; gates
`npm test` 130 suites / 1605 tests, `test:integration` 9/104 ⚠️ coder-reported only, `tsc` 0, `lint` 0).
**Blocked on, in order:** profile-box deploy 1 (S2 + S3 + the legacy-fallback removal) → `0275` Part B →
profile-box deploy 2 (`0274`, ruling D2) → the game deploy and its live check, which is this task's
close condition (plan §4.6). ⚠️ **Residuals AR-1…AR-9 stand, MINUS AR-7 — ✅ AR-7 CLOSED 2026-09-16 on
new owner evidence** (see the **D1 deploy-risk addendum** below; closed in the reviewer's ledger in
parallel). **The loudest residual is now AR-2 alone:** the login-button restart has **zero** production
evidence and is unobservable until `0054`. Also open: the `0274`-gating alert-delivery task `0277` is
unbuilt. · earlier: 🔄 In progress — driven from the lead session (/fkit-sprint-ship-loop) ·
**plan approved by the owner 2026-09-16** ([`plan.md`](plan.md) written, build worker running) ·
earlier: 🔄 In progress, started 2026-09-15 (plan step) · earlier: 🔲 Backlog

## Owner
fkit-coder

## ⬇️ FOUR OWNER RULINGS ON THE S4 PLAN — 2026-09-16

**Given live in the lead session and relayed by `fkit-sprint-ship-loop` to a spawned `fkit-producer`.
Read the authority before the outcome — these are OWNER rulings, not producer precedent.**
⛔ **The plan itself is NOT restated here** — [`plan.md`](plan.md) in this folder holds it.

- **D1 — the legacy fallback goes in THIS change set.** `resolveCaller`'s legacy branch
  (`src/profile-server/Routes.ts:406-425`) is removed **inside this task's change set** and ships with
  the **S2/S3 profile deploy**. ⛔ **There is NO second profile deploy for this task.** This supersedes
  *What to build* step 4, *Owner steps* 3 and the ordering in *Verification steps* 6 — all struck in
  place below, not deleted.
- **D2 — monitoring first.** `0274` (S5) monitoring must be **live before the S4 game deploy**.
- **D3 — no retry; restart instead.** ⛔ **No on-demand retry after a failed boot login.** Instead,
  pressing the login button on the **guest** citizenship card must **restart the game from scratch**
  (full page reload), guarded: **only** after a successful Yandex auth dialog, **never** during a
  match, **at most once** per page load.
- **Deploy count — TWO profile-box deploys, both before the game deploy:** (1) S2 + S3 + the fallback
  removal, (2) S5. Then the game deploy.

⚠️ **Consequence of D3 that this task does NOT cover — situation B:** a player who **is** logged into
Yandex but whose boot login failed sees the logged-in zero-state card (0 XP) with no login button and
no retry, for the whole page load. Ruled **out of this task** and filed as
[`0278`](../0278-missing-session-surface-on-the-logged-in-citizenship-card/brief.md), sequenced with
the citizenship-card launch (`0054`).

## ⬇️ ADDENDUM — the D1 deploy-risk caveat is CLOSED (2026-09-16)

**Recorded by a spawned `fkit-producer` on a finding the owner reported live in the lead session. This
records evidence; it rules nothing and changes no scope.** ⛔ **`## Status` is unchanged — this task
stays `🚧 Blocked`** (code complete, waiting on deploys).

**What was open.** [`plan.md`](plan.md) §4.6 (and `plan.md:334`) carried *"the hole that could not be
closed"*: the local kill-switch `CITIZENSHIP_CARD_ENABLED` only exists since `e4f01e6` (2026-08-21), so
a game build from the window between `45e7113` (2026-07-01, which introduced the legacy
`?yandexPlayerId=` profile read) and `e4f01e6` was gated **only** by the *remote* `citizenship_ui`
experiment flag in the Yandex Games console — a value **unreadable from the repo by any agent**. If that
remote flag had ever been on, a still-open tab from that window could hit the removed legacy path and
get a `401`.
⛔ **That caveat is NOT deleted or rewritten.** It stands verbatim in `plan.md` §4.6 and `:334`, and is
closed here, by new evidence — not retconned into never having existed.

**The closing chain, four legs, each with its provenance:**

| Leg | Evidence | Provenance |
|---|---|---|
| The **local** flag `CITIZENSHIP_CARD_ENABLED` was never `true` in any commit | `git log --all -S'CITIZENSHIP_CARD_ENABLED: true'` → no commits | **agent-measured** during S4 planning |
| The **remote** `citizenship_ui` console flag was **never set**, across the whole `45e7113` → `e4f01e6` window | owner, 2026-09-16, verbatim: *"I've just checked it - the flag never has been set in Yandex.Games Console."* | ⚠️ **OWNER-REPORTED, NOT agent-measured** — no agent can reach the Yandex Games console, so this leg is not independently verifiable from the repo |
| The profile database has **never held a row**, and only migration `006`'s tables exist | read-only check on the profile box, 2026-09-16 | **agent-measured** (the lead's read-only box check) |
| **Zero** browser-originated legacy requests across the full retained nginx log window (2026-09-06 → 2026-09-16) — the only two hits were our own `curl` probes | nginx access log, read-only | **agent-measured** (the lead) |

**Conclusion recorded: no released game build could ever have reached the legacy path.** The deploy risk
D1's fallback removal was weighed against does not exist in the field.

⚠️ **Two limits on that conclusion, stated so nobody over-reads it.** (1) The decisive leg — the remote
flag — rests on the owner's own check of a console no agent can see; it is a report, not a measurement.
(2) The nginx window is the **retained** log window only (2026-09-06 → 2026-09-16), not all of history —
it corroborates, it does not by itself cover the July–August window.

**Reviewer ledger:** residual **AR-7** (*"the plan §4.6 D1 deploy hole"*) is closed in parallel by the
reviewer in this folder's `review.md`. ⛔ This producer did **not** edit that file; it is referenced, not
touched.

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
4. ~~**LAST STEP — only after the game deploy carrying steps 1–3 is verified live:** remove the legacy
   Yandex-id fallback from `resolveCaller` (`src/profile-server/Routes.ts`) — a separate **profile-box
   deploy**.~~ 📌 **SUPERSEDED BY RULING D1 (2026-09-16), struck not deleted.** Remove the legacy
   branch (`src/profile-server/Routes.ts:406-425`) **in this change set**; it ships with the **S2/S3
   profile deploy**, not a second one of its own.
5. **Guest-card login button restarts the game (ruling D3).** Pressing login on the **guest**
   citizenship card performs a **full page reload** after a successful Yandex auth dialog. Guards:
   **never during a match**, **at most once per page load**, and only on auth success. ⛔ **No
   on-demand login retry** anywhere.

Any user-visible string added goes through `translateText` with `en.json` and `ru.json` both updated.

### Owner steps
1. **Profile-box deploy #1** — S2 + S3 + the fallback removal (ruling D1).
2. **`0274` (S5) monitoring live** — ruling D2, **before** the game deploy. That is **profile-box
   deploy #2**.
3. **Game deploy** at an owner-chosen slot, carrying steps 1–3 and 5.
4. Verify live: a logged-in load makes one login call and profile calls carry a Bearer token
   (browser network tab).
5. ~~**Profile-box deploy** carrying step 4, then verification step 6.~~ 📌 **SUPERSEDED BY D1** —
   there is no third deploy; verification 6 runs against deploy #1.

## Verification steps

1. Guest (not Yandex-authorized) load → **no** login call (client test).
2. Authorized load → **exactly one** login call per load.
3. Login fails or times out → card, inbox and game start all still work (client test + a manual run
   with the profile server stopped).
4. Every profile call carries a Bearer header and **no** Yandex id in body or query (client tests per
   caller).
5. A `401` → one re-login, one retry, **no loop** (client test with a server that always answers 401).
6. **Fallback removed:** a legacy-shaped request (Yandex id, no token) gets `401` — server test, then
   once on the box **after profile-box deploy #1** (per ruling D1 — no separate deploy).
7. **Guest-card login button (ruling D3):** on auth success the page reloads **once**; a second press
   in the same page load does nothing; the reload never fires during a match (client tests).
8. Analytics events present in the enum and in the reference doc.
9. `npm test` green; `npx tsc --noEmit` and `npm run lint` exit 0.

## Notes

- **Depends on:** [`0271`](../../done/0271-profile-identity-s2-login-endpoint-and-session-token/brief.md) (S2), [`0274`](../0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) (S5 — ruling D2: monitoring live before the S4 game deploy)
- **Blocks:** [`0253`](../0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md) (its rework — route + client logic — starts after this), [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) (XP go-live), [`0278`](../0278-missing-session-surface-on-the-logged-in-citizenship-card/brief.md) (the situation-B surface, built on this task's restart path)
- **Effort (design §9):** 1.5–2 days.
- ⚠️ **Cannot close inside one deploy — and the shape changed on 2026-09-16 (D1 + D2).** ~~it needs a
  game deploy, a live check, then a profile-box deploy.~~ The order is now **profile-box deploy #1
  (S2 + S3 + the fallback removal) → profile-box deploy #2 (S5 monitoring) → the game deploy → the live
  check.** On the weekend-slot cadence this may still be the longest calendar item in the epic.
- **Related:** [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) —
  `vfy:false` tokens never unlock paid state.
- 🔒 No secrets, hosts or player ids in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.
