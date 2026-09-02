# Prod `/api/env` Advertised `http` on a Raw IP

**Source**: `ai-agents/tasks/done/0063-prod-api-env-advertises-http-and-raw-ip/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4 — config-parity track (`0062` / `0063` / `0195`)

> ✅ **Closed 2026-08-29 by a spawned producer — agent-closed, not owner-verified.** The code and config are **deployed to production** (release commit `362a2f9`), and the headline value was measured live.
>
> ✅ **EVIDENCE NOW COMPLETE (2026-08-30) — but read the ordering, it is the honest record.** At the moment of closing, **four of the owner's six deploy pendings were unevidenced**. All four were proven afterwards, 2026-08-29 and 2026-08-30. The owner's condition is **now satisfied; it was not satisfied when this task closed**. The `(agent-closed — not owner-verified)` marker stays, because the *close itself* was still made with no owner reviewing the work. § Outcome carries the state-at-close vs final-state table.

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

⚠️ **The close was made on PARTIAL proof, and the gap was closed AFTERWARDS.** The owner's review-skip ruling attached the condition *"the task stays open until all six deploy pendings are proven live"*. **Two columns, deliberately — the ordering must not be flattened into "it was always fine."** At the close (2026-08-29) two pendings were discharged and a third substantially so; **four were unevidenced**, and the task moved to `done/` anyway, by an agent, with no owner present.

| # | Pending | State at close (2026-08-29) | Final state |
|---|---|---|---|
| 1 | `/api/env` shows all six new values | **Partial** — only `publicProtocol`, `publicHost`, `apiBaseUrl` visible; `publicPort`, `jwtIssuer`, `jwtAudience` elided by `…` in the captured response | ✅ **Discharged 2026-08-29** — the full body was fetched: `gameEnv`, `deploymentId`, `publicHost`, `publicProtocol`, `publicPort`, `apiBaseUrl`, `profileApiUrl`, `jwtIssuer`, `jwtAudience`, every one on `https` and the apex domain, none on a raw-IP host value |
| 2 | No mixed-content errors in the browser console | **Not evidenced** | ✅ **Discharged 2026-08-29 — OWNER-VERIFIED.** The owner opened the live game and reported no console errors. **The only pending in this table a human actually checked** |
| 3 | `/api/public_lobbies` still returns lobbies | ✅ Discharged — public lobbies live and filling | ✅ Unchanged |
| 4 | Game connect + play a public lobby | ✅ Substantially discharged — lobbies filling implies clients connecting; not a targeted check | ✅ Unchanged |
| 5 | Discord login button = clean same-origin dead end | **Not evidenced** | ✅ **Vacuous, owner-confirmed 2026-08-29** — no Discord buttons are shown in the product at all, so there is no button whose behaviour could be checked |
| 6 | Telemetry: OTEL `openfront.host` reports the domain | **Not evidenced** | ✅ **Discharged 2026-08-30** in Uptrace — see below |

**Pending 6 — the telemetry evidence.** Measured by the lead in Uptrace by grouping log entries on the **`openfront_host`** attribute (OTEL normalizes the dot in `openfront.host` to an underscore):

- Over **2026-08-30** alone the only groups returned are **`geoconflict.ru`** and `<null>`. No raw-IP host value appears.
- Over the wider **2026-08-24 → 2026-08-31** window **a raw-IP host group is also present**, ~433k entries, forming a continuous band from Aug 24 through Aug 29 and then stopping.
- Newest-first, that group's **last entry is `Aug 29 2026 15:43:27.876` — 19 seconds before the new master booted at 15:43:46.**

So the host attribute **flips from the raw IP to the apex domain exactly at the deploy cutover**, and the raw IP never appears again. That is the deploy taking effect in telemetry, not a sampling artifact.

> 🔒 The raw IP value itself is deliberately **not written here or anywhere in this vault**. The attribute name and the timestamps are enough to re-run the query.

**Nothing needs reopening.** The earlier instruction on this page — *"if the owner wants the four unevidenced pendings actually checked, this row should be reopened or a small follow-up filed"* — is **superseded**: they were checked and they passed. What does **not** change is the marker: no human reviewed the code, so `(agent-closed — not owner-verified)` stands.

**Still rescoped, not proven:** brief verification steps 3, 4, 5 and 7 were ruled **unsatisfiable** by the owner-accepted 2026-08-24 reframe (no auth service exists in this deployment — no user can hold a token). Step 9 (`Matchmaking.ts`) was discharged by the "explicitly recorded" arm: still latent-broken and unreachable.

**Two follow-up briefs came out of the reframe, both filed to the Backlog board**: `0069` (auth strategy — build an auth service someday, or commit to Yandex-only and remove the dead surface) and `0070` (`TokenLoginModal`'s user-facing error is **commented out**, which is why a total login failure looked like nothing happening; its restore-vs-remove answer follows `0069`'s ruling).

**Position in the config-parity class.** `0063` is the one instance of the class that is now **fixed and deployed**. `0062` and `0195` are still open — and `0062` was deliberately left blank for this release, so citizenship stayed dark by design.

## Related

- [[decisions/config-parity-failure-class]] — the recurring class `0063` belongs to, and the `0064` guard that must land after all three
- [[systems/configuration]] — `/api/env`, the runtime-config fallback chain, and the `getApiBase()` consumer path
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — §9 of the incident record, where this was filed as a loose end
- [[systems/telemetry]] — where pending 6 was measured; carries the `openfront.host` → `openfront_host` attribute-name gotcha
- [[decisions/windoworigin-url-join-defect]] — the durable URL-join rule behind task `0198`, owner-ruled to ship in the same production deploy
- [[tasks/private-lobby-start-url]] — task `0198` itself, closed 2026-08-30 out of that same release
- [[decisions/sprint-backlog]] — the board holding the `0069` / `0070` follow-ups
- [[decisions/sprint-4]] — the sprint board carrying this task

**Pages that cite this task's `362a2f9` deploy evidence** (the release also carried their code, so their "not deployed" posture was corrected against it):

- [[tasks/citizenship-name-change]] — task `0067`, deployed in the same release and still dark behind the card flag and the blank profile token
- [[tasks/citizen-verified-icon]] — task `0068`, deployed in the same release; no citizens exist in production to badge
- [[tasks/licensing-remediation]] — task `0066`, deployed in the same release, satisfying `0065`'s flip-ON gate on the deploy fact
- [[decisions/licensing-compliance]] — the licensing posture whose paid-IAP gate that deploy satisfies
- [[systems/architecture-overview]] — the survey whose post-2026-08-28 deploy notes refer to this release
- [[tasks/licensing-asset-audit]] — task `0025`, whose V1/A1 production checks were run against this release
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, the next item on the same owner-ruled config-track order; unlike this one it has no production evidence at all
