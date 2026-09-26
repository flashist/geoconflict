# One-Time Tenure XP Grant for Existing Players — Research, Rule, Build

**Source**: `ai-agents/tasks/done/0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md` (plus `plan.md`, `plan-redesign.md`, `worklog.md`, `review.md`, and the parked `v1-tenure-grant-old-design.patch` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 · task `0253` · rank and label owner-ruled (Medium)

> 🚨 **READ THIS FIRST — BUILT AND REVIEWED LOCALLY; NEVER RUN IN A BROWSER OR IN PRODUCTION.**
> Closed **2026-09-24** by a spawned `fkit-producer` at the close step of `/fkit-sprint-ship-loop`,
> **no owner present** (ADR-033 §5) ⇒ **`(agent-closed — not owner-verified)`**.
> - ⛔ **No login and no claim has happened anywhere real.** There is no Yandex login outside the
>   iframe, so the flow cannot run locally; the modal was rendered in jsdom only.
> - 📌 **UPDATE 2026-09-26 — the route IS on the box.** The weekend window ran; runbook **W3** deployed
>   it, and `POST /v1/profile/tenure-grant` answered **400** on an empty body (lead's read-only check).
>   ⇒ 🚨 **the claim-on-behalf risk is OPEN from 2026-09-26**; `0268` closes it. W12's game deploy
>   (release `0.0.152`) carried the client code, inert while `CITIZENSHIP_CARD_ENABLED` is `false`. ⛔ **No
>   real claim has been observed** — the "never run in production" line above still holds for the flow.
> - 🚨 **The claim-on-behalf risk opens when the ROUTE reaches the profile box, not at the citizenship
>   flip.** `POST /v1/profile/tenure-grant` is wired in `src/profile-server/Server.ts` and answers as
>   soon as it is deployed; `CITIZENSHIP_CARD_ENABLED` hides only the client popup. Owner rulings
>   2026-09-24: the route goes out with the **next profile-box deploy, before `0065`'s flip, no special
>   hold** (Q2), and *"Yes, ship it Saturday"* — it rides runbook **W3** if the 2026-09-26 window runs.
>   `0268` is the task that closes the risk.

## Goal

Citizenship is earned at 100 XP, 1 XP per qualifying match ([[decisions/adr-111-xp-economy-rescale]]),
and XP only accrues once `0217` wires the game server — so a long-time player opens the card and sees
`0 / 100`. The owner wanted a one-time "thank you" grant, and a rule future free grants follow. The
server holds **no pre-launch history**; the only tenure evidence is on the player's device
(`localStorage` `daysPlayed` and `game-records`). The server cannot verify a claim — it can only bound
the harm of a false one. The rule itself is recorded as [[decisions/adr-112-free-xp-grants]].

Three steps, each gated: (1) research the evidence (findings report
`ai-agents/knowledge-base/reports/2026-09-14-0253-tenure-xp-grant-findings.md`), (2) the owner rules the
rule, (3) build.

## Key Changes

**Built to the owner-approved `plan-redesign.md` (2026-09-24, decisions D1–D4), implementing ADR-112 as
amended 2026-09-15:**
- **Core:** `TENURE_XP_PER_DAY = 1`, `TENURE_XP_CAP = 50`, `TENURE_MIN_DAYS = 3`; `TenureGrantContract.ts` holds the schemas and `tenureGrantForEvidence`. zod strips any client-sent amount or id — **the server computes and clamps the amount**.
- **Repository:** `recordTenureCheck` in one transaction — lock the player row, insert the check row (`ON CONFLICT DO NOTHING`), add XP only if above 0, run the citizenship grant, commit. Returns `granted | below_minimum | duplicate | not_found`. **The check is final even at 0 XP** (a 1–2-day player never gets it later), per ADR-112.
- **Route:** `POST /v1/profile/tenure-grant` — CORS, then a 503 if the tenure surface is absent, then parse (400), then caller resolution (401/503). **No rate limiter** (monitoring instead, per ADR-112). A `tenureClaim` metric records one outcome per request.
- **Client:** `readTenureEvidence` (returns null only when storage cannot be read — D1: unreadable storage must not burn the one-time check); `maybeClaimTenureGrant()` runs **once per page load**, only when the card gate is on **and** the login reply says the tenure check is `pending`, and **stores nothing on the device** (the server row is the marker). `TenureGrantModal` opens only on `granted` with more than 0 XP, showing XP only — no day count. Tag added to **both** HTML templates.
- **Copy** in `en.json` + `ru.json` (the 2026-09-14 approved strings, reused per owner Q1). **Analytics:** three events, `Citizenship:TenureGrant:{Claimed, Rejected:{BelowMinimum|Duplicate}, ClaimFailed}` — count them by **unique users** (see [[systems/analytics]]).
- Tests: eight new suites incl. the integration suite `TenureGrant.it`; 17/17 mutation proofs killed plus an integration mutation. Final gates: `npm test` 146 suites / 2088 tests; `npm run test:integration` 11 suites / 129 tests.

## Outcome

**Residuals the plan accepted, carried unchanged:**
- **A lost ack after commit gets no popup, ever.** A timeout / dropped connection / unreadable 200 *after* the server committed leaves the row in place; the next login says `done`, so there is no retry. `ClaimFailed` without `Claimed` therefore does **not** mean ungranted (review R7 corrected four places that said otherwise).
- The popup can open over another modal or the match-start screen.
- **Claim-on-behalf** (≤ 50 XP, once per player, and it pre-empts that player's own final check) exists while the route is deployed — owner-accepted; closes with `0268` (~60 days after release).
- A 0-XP check row lets a scripted junk profile survive `0274`'s cleanup. Corrupt `game-records` loses that signal.
- Not tried: removing the row lock (the primary key alone still gives one row; no test isolates the consistency the lock buys).

**History worth keeping.** The first-plan (v1) build (2026-09-14/15) was **reworked, not shipped**: the
2026-09-15 redesign (login-then-claim, server-side finality, internal `player_id` per ADR-113) replaced
it. A 2026-09-23 correction claiming the v1 claim code sat in `src/` was **itself half wrong** — `src/`
held only the seams `0270`/`0271`/`0274` built (`hasXpGrant`, the login reply's `grantChecks`, the
`tenureClaim` hook); v1 lived only in the parked patch. Sprint 4 rescope (2026-09-23): **Q1 = (a)** this
task no longer gates the `PROFILE_INTERNAL_TOKEN` set at the window; its binding deadline is **before
`0065`'s flip**. **Q6 = (a)** broke up the `0217 → 0266 → 0272 → 0273 → 0253` reading-order group.

## Related

- [[decisions/adr-112-free-xp-grants]] — the rule this task researched and then built
- [[decisions/adr-113-internal-player-id]] — the internal `player_id` the grant is keyed on
- [[decisions/adr-111-xp-economy-rescale]] — the 1 XP / 100 XP economy it grants into
- [[decisions/adr-101-fail-soft-xp-crediting]] — why the server row, not a local marker, is the one-time marker
- [[tasks/profile-identity-s1-database-rekeying]] — task `0270`, which created the grant table and absorbed the v1 collision
- [[tasks/profile-identity-s2-login-and-session-token]] — task `0271`, the login reply the claim waits on
- [[tasks/profile-identity-s5-monitoring-and-creation-switch]] — task `0274`, the `tenureClaim` metric this task finally feeds
- [[tasks/citizenship-earned]] — task `0017`, the earned-citizenship grant the tenure XP can trigger
- [[systems/player-profile-store]] — the store the check rows live in
- [[systems/analytics]] — the three tenure-grant events
- [[systems/weekend-deploy-window]] — W3 carries the route; W12 carries the inert client code
- [[decisions/sprint-4]] — the board it closed on
- [[tasks/profile-identity-s4-client-login-session]] — task `0273`, the client login session whose `grantChecks` the claim reads
- [[tasks/profile-identity-epic]] — epic `0266`, whose login reply this task's redesign waited on
