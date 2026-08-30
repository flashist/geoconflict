# Prod `/api/env` Advertised `http` on a Raw IP

**Source**: `ai-agents/tasks/done/0063-prod-api-env-advertises-http-and-raw-ip/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — config-parity track (`0062` / `0063` / `0195`)

> ✅ **Closed 2026-08-29 by a spawned producer — agent-closed, not owner-verified.** The code and config are **deployed to production** (release commit `362a2f9`), and the headline value was measured live. ⚠️ **The deploy proof is PARTIAL against the six checks the coder listed** — read § Outcome before treating this as fully verified.

## Goal

Production's `/api/env` reported `publicProtocol`, `apiBaseUrl` and `jwtIssuer` as **`http` on a raw IP** while the site is served `https` on its domain. Filed from §9 of the 2026-08-22 incident record as a possible mixed-content hazard; an architect consult on 2026-08-23 traced it and found it was a **live authentication failure**, not a latent one. The owner reviewed that evidence and ruled it into Sprint 4.

**Why the client could not recover on its own.** `/api/env` (`src/server/Master.ts`) → cached into a module global (`src/core/configuration/ConfigLoader.ts` → `RuntimeConfig.ts`) → everything funnels through `getApiBase()` (`src/client/jwt.ts`). `ensureAbsoluteUrl` returns the value **unchanged** when it already matches `^https?://`, so the "upgrade to the preferred protocol" fallback **never fires** once the config already carries `http://`.

## Key Changes

**Config/deploy only — no application code.** The six `.env.prod` values moved from `http` on a raw IP to `https` on the apex domain. Deliberately *not* papered over in the client: rewriting schemes inside `getApiBase()` would hide a wrong source config and make the next misconfiguration invisible.

**The scope was reframed at plan time (2026-08-24, owner-accepted), and the reframe matters.** There is **no auth service in this deployment** — no login routes, no JWT signing, and the JWKS URL serves the SPA HTML. So no user ever held a token, the brief's headline user-visible symptoms could not actually have been occurring, and the 🚨 open question about a JWT issuer-claim mismatch is **resolved as vacuous**. The configuration was still wrong and was still fixed. **A formal review was skipped by owner ruling.**

Two things left in a deliberately known state:

- **`Matchmaking.ts` is still latent-broken and unreachable.** It builds `new WebSocket(\`${config.jwtIssuer()}/matchmaking/join\`)`; the WebSocket constructor requires `ws:`/`wss:`, so an `https://` value throws a synchronous `SyntaxError` just as the `http://` one did. No caller of `MatchmakingModal.open()` exists, so it is a trap for whoever wires that path up later — **recorded, not fixed**.
- **`JWT_AUDIENCE` still defaults to the upstream placeholder `"openfront.io"`** in `ProdConfig.ts` when unset. Flagged rather than silently changed, because changing an audience value can invalidate live tokens.

## Outcome

**Deployed.** The release landed in production as commit `362a2f9`, evidenced in the brief's close-out by `curl https://geoconflict.ru/commit.txt` returning `362a2f9`, equal to repo `HEAD` on `dev`. Live `GET https://geoconflict.ru/api/env` returned `publicProtocol: https`, `publicHost: geoconflict.ru`, `apiBaseUrl` on the apex domain. **Brief verification step 2 is met in production.**

⚠️ **What that proof does NOT cover.** The owner's review-skip ruling attached the condition *"the task stays open until all six deploy pendings are proven live"*. The close was made by an agent on partial proof, with no owner present:

| Pending | State at close |
|---|---|
| 1. `/api/env` shows all six new values | **Partial** — `publicProtocol`, `publicHost`, `apiBaseUrl` confirmed; `publicPort`, `jwtIssuer`, `jwtAudience` were elided by `…` in the captured response and are **not** evidenced there |
| 2. No mixed-content errors in the browser console | **Not evidenced** — no console sweep was run |
| 3. `/api/public_lobbies` still returns lobbies | **Discharged** — public lobbies live and filling |
| 4. Game connect + play a public lobby | **Substantially discharged** — lobbies filling implies clients connecting; not a targeted check |
| 5. Discord login button = clean same-origin dead end | **Not evidenced** |
| 6. Telemetry: OTEL `openfront.host` reports the domain | **Not evidenced** |

> 📌 The lead's live pass in the closing session did separately report `publicPort: 443` and `jwtIssuer` on the apex domain. That observation is **not** in the brief's captured response body, so pending 1 stays recorded as partial here rather than upgraded from a second-hand relay.

**Two follow-up briefs came out of the reframe, both filed to the Backlog board**: `0069` (auth strategy — build an auth service someday, or commit to Yandex-only and remove the dead surface) and `0070` (`TokenLoginModal`'s user-facing error is **commented out**, which is why a total login failure looked like nothing happening; its restore-vs-remove answer follows `0069`'s ruling).

**Position in the config-parity class.** `0063` is the one instance of the class that is now **fixed and deployed**. `0062` and `0195` are still open — and `0062` was deliberately left blank for this release, so citizenship stayed dark by design.

## Related

- [[decisions/config-parity-failure-class]] — the recurring class `0063` belongs to, and the `0064` guard that must land after all three
- [[systems/configuration]] — `/api/env`, the runtime-config fallback chain, and the `getApiBase()` consumer path
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — §9 of the incident record, where this was filed as a loose end
- [[decisions/windoworigin-url-join-defect]] — task `0198`, owner-ruled to ship in the same production deploy
- [[decisions/sprint-backlog]] — the board holding the `0069` / `0070` follow-ups
- [[decisions/sprint-4]] — the sprint board carrying this task

**Pages that cite this task's `362a2f9` deploy evidence** (the release also carried their code, so their "not deployed" posture was corrected against it):

- [[tasks/citizenship-name-change]] — task `0067`, deployed in the same release and still dark behind the card flag and the blank profile token
- [[tasks/citizen-verified-icon]] — task `0068`, deployed in the same release; no citizens exist in production to badge
- [[tasks/licensing-remediation]] — task `0066`, deployed in the same release, satisfying `0065`'s flip-ON gate on the deploy fact
- [[decisions/licensing-compliance]] — the licensing posture whose paid-IAP gate that deploy satisfies
- [[systems/architecture-overview]] — the survey whose post-2026-08-28 deploy notes refer to this release
