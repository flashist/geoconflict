# Profile Identity S4 — Client: Login Once per Load, Bearer Token on Every Profile Call, Legacy Fallback Removed

**Source**: `ai-agents/tasks/done/0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 5 (moved from Sprint 4 on 2026-09-23) · task `0273` · slice S4 of epic `0266` · High (label owner-ratified)

> ⚠️ **Closed 2026-09-26 by a spawned `fkit-producer` on an owner ruling** given live in the
> `fkit lead` session (closed together with `0217`, `0272`, `0220`); no owner channel in the spawn ⇒
> **`(agent-closed — not owner-verified)`**. The close condition was the owner's own live browser check
> — **one observation of each kind, not a sample** — and two residuals stay unobservable while the
> citizenship card is off.

## Goal

Make the client use the login endpoint of [[tasks/profile-identity-s2-login-and-session-token]]: log in
**once per page load** for authorized Yandex players, carry the returned session token as
`Authorization: Bearer` on every profile call, stop sending the Yandex id to the profile server, and
remove the server's legacy Yandex-id fallback. See [[decisions/adr-113-internal-player-id]].

## Key Changes

1. **`src/client/ProfileSession.ts`** — log in once per load, after platform init, **only for authorized
   Yandex players**, **not** behind `CITIZENSHIP_CARD_ENABLED`; bounded timeout; fail-soft (the game
   always starts); token held **in memory only** (no cookie, no storage, never in a query string);
   exposes `grantChecks`; on a `401`, re-logs-in **once** and retries **once**.
2. **Five profile callers move to Bearer** with the Yandex id removed from bodies and queries (card read,
   inbox incl. the news-modal refresh, name-change request, payments intent, and the tenure-grant claim "if present" per the brief). The
   sixth — the WebSocket join / `update_identity` in `Transport.ts` — **keeps** sending the Yandex id to
   the **game** server (the S3 path); the token never goes to the game server.
3. **Login analytics events** in `flashistConstants.analyticEvents` and the event reference — see
   [[systems/analytics]].
4. **Legacy fallback removed from `resolveCaller`** in this change set (**ruling D1**), shipping with the
   S2/S3 profile deploy — no separate deploy.
5. **Guest-card login button restarts the game (ruling D3)** — a full page reload after a successful
   Yandex auth dialog; never during a match; at most once per page load. ⛔ No on-demand login retry.

**Four owner rulings on the plan, 2026-09-16:** D1 (fallback removal in this change set), D2 (`0274`
monitoring live **before** this task's game deploy), D3 (restart, not retry), and a deploy count of two
profile-box deploys before the game deploy — later collapsed by the owner into **one** profile deploy,
run 2026-09-17. ⚠️ D3's gap — a logged-in player whose boot login failed sees a zero-state card with no
way to retry for that page load — was ruled out of scope and filed as backlog task `0278`.

**The D1 deploy-risk caveat was closed by evidence on 2026-09-16** (not retconned): the local card flag
was never `true` in any commit; the remote console flag was never set (⚠️ **owner-reported** — no agent
can see that console); the profile DB had never held a row; and zero browser-originated legacy requests
appeared in the retained nginx log window. ⇒ no released build could have reached the removed path.

## Outcome

**Timeline.** Server half live and proven 2026-09-17: a legacy-shaped request with no Bearer token got
**401** — the fallback is really gone (⚠️ one-sided: that says nothing about a Bearer token being
accepted; S2's own box proof showed that). The **client** stayed undeployed until the game deploy.

✅ **2026-09-26 — client deployed (W12, release `0.0.152`), and the close condition met:**

- Real logins landing: profile DB **0 → 41 players / 41 identities** (W13).
- **Owner-run browser check** (DevTools → Network, filter `login`, on the live Yandex game): a
  logged-in load → **exactly one** `POST /v1/login` (200) ⇒ verification step 2 ✅; a guest load
  (incognito) → **zero** login calls ⇒ verification step 1 ✅ (prod half; the client-test half was green
  at build).

🚩 **Residuals shown to the owner at close:**

1. **Bearer acceptance on the other profile callers rests on client tests only** — with the citizenship
   card off, production makes no other profile calls to inspect.
2. **AR-2 — the login-button restart — stays unobservable until the card flip** (`0054` / `0065`).
3. **One logged-in load and one guest load were observed** — a single observation of each, not a sample.
4. The other accepted review residuals (AR-1…AR-9, minus AR-7, which D1's evidence closed) stand as
   recorded in the task's `review.md` — not re-assessed at close.

## Related

- [[tasks/profile-identity-epic]] — epic `0266`, the parent
- [[tasks/profile-identity-s2-login-and-session-token]] — task `0271` (S2), the endpoint and token this client uses
- [[tasks/profile-identity-s5-monitoring-and-creation-switch]] — task `0274` (S5), live before this task's game deploy (D2)
- [[tasks/profile-identity-s3-game-server-resolve-and-credit]] — task `0272` (S3), the game-server path the WebSocket join still feeds
- [[tasks/profile-p2-wire-game-server]] — task `0217`, deployed in the same game deploy
- [[tasks/tenure-xp-grant]] — task `0253`, whose claim waits on this login's tenure check
- [[tasks/feedback-telegram-delivery-failure]] — task `0061`, which closed on this task's game deploy
- [[decisions/adr-113-internal-player-id]] — the decision this slice implements
- [[systems/analytics]] — the login events this slice added
- [[systems/player-profile-store]] — the backend whose public routes now require the token
- [[systems/weekend-deploy-window]] — W12–W13, where the client shipped and was checked
- [[tasks/profile-identity-s1-database-rekeying]] — S1, task `0270`, the schema under the login
- [[decisions/sprint-5]] — the board that tracked its close
