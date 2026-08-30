# Prod `/api/env` advertises `http` on a raw IP — login and profile fetch are broken for users today

## ID
0063

## Sprint
Sprint 4

## Priority
⚠️ **Highest of the four §9 follow-ups. Sprint 4 placement is an OWNER RULING (2026-08-23) — decided,
not a proposal.** Filed as a loose end; an architect consult found it is **already breaking
authentication in production**, and the owner reviewed that evidence and confirmed the placement.

## Status
✅ Done (agent-closed — not owner-verified) *(closed 2026-08-29 by a spawned producer on the production deploy proof recorded in "Close-out — production evidence" below. Built 2026-08-24, config-only; formal review skipped by owner ruling. The brief's JWT issuer-claim open question was RESOLVED 2026-08-24 — no auth service exists in this deployment, mismatch vacuous; see worklog. ⚠️ The proof is partial against the worklog's six deploy pendings — read the close-out section before treating this as fully verified)*

## Owner
fkit-coder

## Context

From §9 of the 2026-08-22 incident record (a loose end, unrelated to that outage's cause):
[`ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md`](../../../knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md)

Production's `/api/env` reports `publicProtocol`, `apiBaseUrl` and `jwtIssuer` as **`http` on a raw
IP**, while the site is served over **`https` on its domain**. The incident record filed this as a
possible mixed-content hazard and noted it could not tell whether it was new.

### ⚠️ It is not a hazard. It is a live, user-facing failure — and it is silent

The producer could not judge severity without knowing what consumes those values, so **`fkit-architect`
was consulted (2026-08-23)** to trace them. Its finding, with evidence:

`/api/env` (`src/server/Master.ts:181-197`) → client caches into a module global
(`src/core/configuration/ConfigLoader.ts:29-53` → `RuntimeConfig.ts:14-16`) → **everything funnels
through `getApiBase()` at `src/client/jwt.ts:88-124`.**

The critical detail: `ensureAbsoluteUrl` (`jwt.ts:49-57`) returns the value **unchanged** when it
already matches `^https?://`. So the "upgrade to the preferred protocol" logic **never fires** once
the config already carries `http://`. `getApiBase()` hands back the literal `http://<ip>` no matter
what scheme the page is on.

**What is broken right now, for real users:**

| Symptom | Path | Evidence |
|---|---|---|
| **Discord / token login never completes** | `Main.ts:622,641` opens `TokenLoginModal` after the OAuth redirect → `TokenLoginModal.ts:82` → `tokenLogin()` → the fetch is mixed-content-blocked | `jwt.ts:182-184` |
| …and the user is **never told** | The modal retries up to 3× (`TokenLoginModal.ts:70-76`) then closes; the user-facing alert is **commented out** (`TokenLoginModal.ts:73`), the error only reaches `console.error` (`:91`) | — |
| **Returning logged-in users lose their profile on every page load** | `Main.ts:422-428` calls `getUserMe()` when `isLoggedIn()`; blocked the same way, so it degrades to the "not authorized" branch every time | `jwt.ts:361` |
| **Logout and player lookup fail** | `AccountModal.ts:316,324` | `jwt.ts:213-221`, `jwt.ts:392-394` |

**One more consumer, found by the producer while verifying `0062` (2026-08-23) — not in the consult:**
`src/client/jwt.ts:260` computes `const expectedIssuer = getApiBase().replace(/\/$/, "")` and compares
it against a token claim **client-side**. That is a *second* issuer comparison fed by the same broken
`getApiBase()`, independent of the server-side one at `src/server/jwt.ts:27-34`. **Trace it as part of
step 1** — a fix that corrects the server issuer but not this could leave the client rejecting tokens
the server accepts, or vice versa.

Unaffected and confirmed so: `/api/public_lobbies` (fetched relative/same-origin, `Master.ts:200-202`),
all **server-side** consumers (`src/server/jwt.ts:27,55`, `Archive.ts:32,63`, `Worker.ts:486` — Node,
not a browser, so mixed-content policy does not apply), and `discordLogin()` (`jwt.ts:178`), which is a
top-level **navigation** — browsers block active subresource loads, not navigations.

**Why this matters for Sprint 4 specifically:** this is the citizenship and payments sprint. Login is
the gateway to citizenship. `0017`/`0018` cannot work for users who cannot complete a login.

### Two more things the consult surfaced — do not lose them

**1. ⚠️ A straight `http`→`https` swap does NOT fix every call site.**
`src/client/Matchmaking.ts:55` builds `new WebSocket(\`${config.jwtIssuer()}/matchmaking/join\`)`. The
WebSocket constructor requires a `ws:`/`wss:` scheme — an `http://` URL throws a **synchronous
`SyntaxError`**, which is a *harder* failure than a mixed-content block, and swapping the config to
`https://` leaves it equally broken. It is **currently unreachable** (no caller of
`MatchmakingModal.open()`, `Matchmaking.ts:97`, exists in the client), so it is latent — but it is a
trap laid for whoever wires that path up later.

**2. 🚨 OPEN QUESTION — a third, potentially worse hazard nobody can close from this repo.**
`src/server/jwt.ts:27-34` passes `config.jwtIssuer()` to `jose.jwtVerify()` as the `issuer` option —
an **opaque string comparison** against the token's `iss` claim. If the external token-minting service
signs tokens with a **domain-based** `iss` while `JWT_ISSUER` is `http://<ip>` server-side, then
**every token fails validation on issuer mismatch** — wholesale, and entirely independent of mixed
content.

The architect had no visibility into the minting service and explicitly could not confirm or rule this
out. **Resolving this is step 1 of this task, and its answer may change the fix and the priority.** Do
not assume it is fine because login "sort of works" — the two failure modes produce similar
user-visible symptoms and would mask each other.

## What to build

**This is a config/deploy fix, not application code.** Resist the urge to normalize in the client —
see step 4.

1. **Answer the open question above first.** Determine what `iss` the token-minting service actually
   signs, and what `JWT_ISSUER` is set to server-side in production. If they disagree, that is a
   separate and more severe defect — report it before continuing, because it changes the fix.

2. **Correct the deployed values** to domain-based `https` — `https://geoconflict.ru` /
   `https://api.geoconflict.ru`-shaped — for `PUBLIC_PROTOCOL`, `API_BASE_URL` and `JWT_ISSUER`.
   Fix **all three**: `DefaultConfig.apiBaseUrl()` (`DefaultConfig.ts:141-150`) falls back to
   `jwtIssuer()` when unset, so today they carry the same value and fixing one appears to work — but
   they are independently configurable and will diverge.
   ⚠️ `.env*` is **gitignored**, so the change likely lives on the server or in `deploy.sh`
   (`deploy.sh:287-292` forwards `PUBLIC_PROTOCOL`, `API_BASE_URL`, `JWT_ISSUER`). Record where you
   changed it.

3. **Check `JWT_AUDIENCE` while you are there.** `ProdConfig.ts:18-28` defaults `jwtAudience()` to
   the hardcoded string `"openfront.io"` when unset — an upstream-project placeholder in *our*
   production auth path. The architect flagged it as worth a second look. **If it is wrong, report it;
   do not silently change an audience value** — that can invalidate live tokens.

4. **Do NOT paper over this in the client.** `getApiBase()`'s protocol-upgrade fallback
   (`jwt.ts:90,93-94`) deliberately does not engage once a scheme is present. Making it rewrite
   schemes would hide a wrong source config and make the next misconfiguration invisible. If you
   believe client normalization is warranted anyway, raise it as a proposal — do not just do it.

5. **Raise the silent-failure problem as a separate concern.** `TokenLoginModal.ts:73` has its
   user-facing error **commented out**, which is why a total login failure looks like nothing
   happening. That is arguably a worse defect than the config itself — it is the reason this went
   unnoticed. **Put it to the owner as its own brief**; do not fold a UX decision into a config fix.

## Verification steps

1. **The open question is answered in writing**, with the actual `iss` value and the deployed
   `JWT_ISSUER`. A "looks fine" is not an answer.
2. **`/api/env` in production returns `https` and the domain** for all three values.
3. **Discord/token login completes end to end in production** — the real OAuth redirect flow, in a
   browser, on the live https site. Not a local run: the failure is environment-specific.
4. **A returning logged-in user keeps their profile across a page reload** — `getUserMe()` succeeds
   (`Main.ts:422-428`), and the UI shows the authorized branch.
5. **Logout and player lookup work** (`AccountModal.ts:316,324`).
6. **No mixed-content errors in the browser console** on the live https site, across login, reload,
   and logout.
7. **Server-side token validation still works** after any `JWT_ISSUER` change — this is the
   dangerous edge: changing the issuer to fix the client can break `jose.jwtVerify()`
   (`src/server/jwt.ts:27-34`) for existing tokens. **Test that existing sessions survive, or state
   plainly that they will not and that it is accepted.**
8. **`/api/public_lobbies` still works** — it does not go through `getApiBase()` and must not regress.
9. **`Matchmaking.ts:55` is left in a known state.** Either fixed to build `ws`/`wss`, or explicitly
   recorded as still-broken-and-unreachable. Do not leave it silently wrong.

## Notes

- **Depends on:** nothing.
- **Blocks:** plausibly `0017`/`0018` for any user who cannot complete a login — unverified, but the
  login path is demonstrably broken today.
- **Related:** `0060`, `0061`, `0062` (the other three §9 items), `0062` especially (also a
  production config value not matching what the app needs).

- **Placement — OWNER-RULED 2026-08-23, Sprint 4. Settled; do not re-open without the owner.**
  The default expectation was the Backlog board, alongside the other §9 items. The producer proposed
  Sprint 4 instead on the strength of the architect consult — this is not a latent hazard but a **live
  authentication failure in production**, in the sprint whose headline feature is gated on login. The
  owner reviewed that reasoning and **confirmed it**.
- **Severity vs `0062`.** Both are production config defects found in the same sweep. This one ranks
  **higher**: it breaks something for **users right now** (login, profile on reload), whereas `0062`
  blocks *future* work (`0017`/`0018`) without a current player-visible symptom — the citizenship card
  is hidden behind `0054`'s flag, default OFF. Do this one first.
- **Severity classification (architect, 2026-08-23):** **(c) already broken in production for users.**
- **Do not modify the incident record**, including its uncertainty about whether this is new. That
  question is still open and does not need answering to fix it.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact.** This task touches auth configuration and JWT issuers. Tokens, signing
  keys, and `.env*` contents must never appear in a worklog, finding, log line, or commit. `.env*` is
  gitignored; keep it that way.

## Close-out — production evidence (2026-08-29)

**What discharged the gate.** The only thing holding this task open was deploy proof of the six live
values. The production deploy landed as commit **`362a2f9`** — verified by
`curl https://geoconflict.ru/commit.txt` returning `362a2f9`, equal to repo HEAD on `dev`.

**Measured live, 2026-08-29, by the lead in the closing session.** `GET https://geoconflict.ru/api/env`
returned:

```
{"publicProtocol":"https","publicHost":"geoconflict.ru","apiBaseUrl":"https://geoconflict.ru",...}
```

That is exactly what this task built: the six `.env.prod` values moved from `http` on a raw IP to
`https` on the apex domain. **Brief verification step 2 — "`/api/env` in production returns `https`
and the domain" — is met in production.**

**Supporting evidence from the same pass (context, not the acceptance criterion):** public lobbies
live and filling; worker quorum reached 18/20 at 15:44:20.644 and 20/20 within 80 ms; zero
readiness-deadline or give-up markers across 3 hours.

### ⚠️ What this proof does NOT cover — read before treating this as fully verified

The owner's 2026-08-24 review-skip ruling (worklog, Decision log) attached the condition **"the task
stays open until all six deploy pendings are proven live."** This close is made on partial proof, by
an agent, with no owner present. Against the worklog's six pendings:

| Pending | State |
|---|---|
| 1. `/api/env` shows all six new values | **Partial.** `publicProtocol`, `publicHost`, `apiBaseUrl` confirmed in the measured body. `publicPort`, `jwtIssuer`, `jwtAudience` were elided by the `...` in the captured response and are **not** evidenced here. |
| 2. No mixed-content errors in the browser console (load / login attempt / logout) | **Not evidenced.** No browser-console sweep was reported in this pass. |
| 3. `/api/public_lobbies` still returns lobbies | **Discharged** — public lobbies live and filling. |
| 4. Game connect + play a public lobby (WS regression) | **Substantially discharged** — lobbies filling implies clients connecting and playing; not a targeted check. |
| 5. Discord login button = clean same-origin dead end | **Not evidenced.** |
| 6. Telemetry: OTEL `openfront.host` reports the domain | **Not evidenced.** |

Verification steps 3, 4, 5 and 7 of this brief were rescoped as unsatisfiable by the owner-accepted
reframe of 2026-08-24 (no auth service exists in this deployment — no user can hold a token). Step 9
(`Matchmaking.ts:55`) was discharged by the "explicitly recorded" arm: still latent-broken and
unreachable, recorded in the worklog's Known-state records.

**If the owner wants the four unevidenced pendings actually checked, this row should be reopened or a
small follow-up filed.** Nothing in this close-out asserts they passed.
