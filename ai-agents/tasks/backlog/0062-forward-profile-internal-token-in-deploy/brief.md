# `PROFILE_INTERNAL_TOKEN` is never forwarded to production — the profile client silently no-ops

## ID
0062

## Sprint
Sprint 4

## Priority
⚠️ **Confirmed Sprint 4 blocker.** Second only to `0063` on the config track — `0063` breaks something
for users *now*, this blocks `0017`/`0018` from ever working. Cheapest high-value item in the sprint:
the fix itself is one line.

## Status
🔲 Backlog

*(Filed to the Backlog board 2026-08-23 with the blocking claim marked **unverified**. Verified the
same day — it holds — and promoted into Sprint 4. The promotion follows the dependency, exactly as
`0057`'s did.)*

## Owner
fkit-coder

## Context

From §9 of the 2026-08-22 incident record (loose ends, unrelated to that outage):
[`ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md`](../../../knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md)

`.env.prod` defines `PROFILE_INTERNAL_TOKEN`, but **`deploy.sh` never sends it to the server.** The
remote env heredoc (`deploy.sh:279-308`) writes the production `.env` file, and it passes
`PROFILE_API_URL` (`deploy.sh:291`) — but there is no `PROFILE_INTERNAL_TOKEN` line anywhere in it.

**Verified 2026-08-23:** `grep -n "PROFILE_API_URL\|PROFILE_INTERNAL_TOKEN" deploy.sh` returns exactly
one hit, line 291, for `PROFILE_API_URL`. The token is genuinely absent.

The profile-backend client is **fail-soft by design** — `ProfileApiClient` is documented in
`src/server/Worker.ts` as a "no-op when `PROFILE_API_URL` / `PROFILE_INTERNAL_TOKEN` are unset". So
nothing crashes, nothing errors, and nothing logs. **The profile integration is simply switched off in
production and has been silently.**

### 🚨 VERIFIED 2026-08-23 — this blocks `0017` and `0018`. It is not a config nit.

This was filed as a *plausible* blocker with the tracing left as step 1. **The tracing was done and
the claim holds.** The full chain, each link with evidence:

1. `ProfileApiClient.isConfigured()` (`src/server/ProfileApiClient.ts:131-133`) requires **both**
   `baseUrl().length > 0` **and** `token().length > 0`.
2. `token()` (`:127`) reads `process.env.PROFILE_INTERNAL_TOKEN ?? ""` — and `deploy.sh` never
   forwards it, so it is `""` in production.
3. Therefore `isConfigured()` is **false in production**, and **every** profile call returns early:
   `upsertProfile()` (`:60-63`) and `creditMatch()` (`:86-89`).
4. Those are called on the live paths — `GameServer.ts:1217` (upsert at client join, via
   `upsertProfileForClient`, reached from `:274` and `:374`) and `GameServer.ts:1281` (credit at match
   end, via `creditMatchXp` from `:1189`).
5. The miss is logged at **`debug`** level (`logDisabledOnce`, `:140`) — effectively invisible in
   production.
6. **Independently, the profile server fails CLOSED on an empty token** (`src/profile-server/InternalAuth.ts:26`).
   So even if the game server did send, every request would be rejected. Two independent barriers.

**Net effect in production today: no profile row is ever created, and no XP is ever credited.**

**What that blocks:**

- **`0017` — Earned Citizenship.** Its brief requires the profile store live (`:19`) and fires
  citizenship server-side at match end as a side effect of `creditMatchXp()` (`:26`). No XP is
  credited, so **the 1,000 XP path can never trigger.**
- **`0018` — Paid Citizenship.** Needs a profile row, which `upsertProfile()` never creates.

**Why this is a blocker but not a live player-facing bug.** No player currently sees a broken XP
counter, because `0054` (Done) hides the citizenship card behind a client config flag defaulting
**OFF**. So the damage is entirely to *future* work — which is why `0063` outranks this one, and why
this still cannot wait until after `0017`/`0018` start.

### Same shape as `0061`

`0061` is also an env var not reaching production. Two independent instances suggest the real defect
may be in **how `.env.prod` and the deploy heredoc are kept in sync** — nothing checks that a variable
the application needs is actually forwarded. Worth considering a general guard, not just this one
variable. See step 4.

## What to build

1. ~~**Establish the blast radius first.**~~ **DONE 2026-08-23 — see the verified chain above.** The
   answer: `isConfigured()` is false in prod, `upsertProfile()` and `creditMatch()` both no-op, and
   `0017`/`0018` are both blocked. **Do not re-run this trace.** Two things are still worth confirming
   as you implement: whether any *other* caller depends on `ProfileApiClient`, and whether the
   `debug`-level miss log (`:140`) should be part of the step-3 change.

2. **Forward the variable.** Add `PROFILE_INTERNAL_TOKEN=${PROFILE_INTERNAL_TOKEN}` to the remote env
   heredoc in `deploy.sh`, alongside `PROFILE_API_URL` at `:291`. Match the surrounding style exactly.

3. **Make the silent no-op audible.** A fail-soft client that logs nothing is what let this go
   unnoticed. At startup, when `PROFILE_API_URL` is set but `PROFILE_INTERNAL_TOKEN` is not, log at
   **`warn`** that the profile integration is running unauthenticated and will no-op. Fail-soft is
   the right behavior; **silent** fail-soft is not.

4. **Consider a general guard, and recommend rather than build.** Something that fails or warns at
   deploy time when a variable the application reads is missing from the heredoc would have caught
   both this and `0061`. **Evaluate it and put the recommendation to the owner** — do not implement a
   deploy-time gate under this brief without approval. A deploy script that starts refusing deploys is
   a change with real operational consequences.

## Verification steps

1. ~~The blast-radius answer is written down.~~ **Already satisfied** by the verified chain in Context.
2. **The variable reaches the server.** After a deploy, the production `.env` file contains
   `PROFILE_INTERNAL_TOKEN` with a non-empty value. ⚠️ **Confirm it is non-empty** — the heredoc
   substitutes whatever the local shell has, so a variable that is forwarded but unset locally still
   arrives empty. That is exactly the failure mode suspected in `0061`.
3. **The application sees it.** A profile call that requires authentication succeeds in production.
   Not "the variable is present" — an actual authenticated call working end to end.
4. **The new warning fires when it should**, and does **not** fire when both variables are set.
5. **Nothing regressed for the unset case.** With `PROFILE_API_URL` unset (e.g. local dev), the client
   still no-ops cleanly and nothing crashes.
6. **The token is not printed anywhere** — not by the new warning, not by any log line, not in deploy
   output. Check `deploy.sh` does not echo the heredoc it writes.

## Notes

- **Depends on:** nothing. Ready to start now.
- **Blocks:** **`0017`** (Earned Citizenship) and **`0018`** (Paid Citizenship) — **verified
  2026-08-23, not speculative.** Both are marked `🚧 Blocked` on this task in `plan-sprint-4.md`.
  Neither can work in production until this ships.
- **Related:** `0061` (same shape: an env var not reaching prod), `0013` (profile store epic — its
  slices are complete, but the integration they feed is switched off in prod), `0060`, `0063`.

- **Placement.** Filed to Backlog 2026-08-23 with the blocking claim explicitly flagged unverified,
  then **verified the same day and promoted into Sprint 4.** The promotion follows the dependency:
  a confirmed blocker on two sprint tasks does not belong on an unranked, explicitly-unscheduled
  board. Same reasoning that moved `0057`.
- **Sequencing against `0063`.** Do `0063` first. Both are production config defects from the same
  sweep, but `0063` is broken for **users right now** while this blocks *future* work — `0054`'s flag
  (default OFF) hides the citizenship card, so no player currently sees a symptom of this one.
- **Do not modify the incident record.** Reference it.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact.** `PROFILE_INTERNAL_TOKEN` is a credential. It must never appear in a
  brief, worklog, finding, log line, commit, or deploy output — this task is *about* a credential, so
  the risk of pasting one while working on it is unusually high. `.env*` is gitignored; keep it that
  way.
