# ADR-123 — The Post-0391 Login Numbers Are Monitored, Not a Deploy Gate

**Date**: 2026-10-07
**Status**: accepted

> Project ADR-123 — see [[decisions/adr-numbering-two-series]]. ⚠️ **Vault slug abbreviated** from the knowledge-base
> counterpart (the vault's standing style, not drift).
> **Accepted 2026-10-07** on an owner ruling given live in session and relayed to `fkit-architect`, which drafted it
> and heard the ruling by relay only.
> **Amends [[decisions/adr-122-stale-login-gate-owner-judgment]]** — supersedes its Decision 2 *as a per-deploy gate*,
> its *Consequences* sentence that the owner's look should be repeated before each deploy that reads `verified`, and
> the re-raise bullet built on that look. ADR-122 Decisions 1, 3 and 4, its "counters restart at each profile deploy"
> caveat, its "do not deploy `0340` and `0250` S3b in one slot" advice and its other re-raise condition **stand**;
> ADR-122 stays `accepted`. [[decisions/adr-116-verified-login]] Decision 6 is unchanged.
>
> Source: `ai-agents/knowledge-base/decisions/adr-123-post-0391-login-numbers-are-monitored-not-a-deploy-gate.md`
>
> 📌 **2026-10-07 (later) sync — canonical ADR annotated only:** every `0332`/`0323` mention now carries *"(`0323`
> cancelled 2026-10-07)"*; no decision changed. `0332` was then built and closed the same day without a numbers look,
> as this ADR allows ([[tasks/join-token-identity-vouch]]; its ADR is [[decisions/adr-124-join-token]]). `0323` was
> cancelled — see [[decisions/cancelled-tasks]].

## Context

[[decisions/adr-122-stale-login-gate-owner-judgment]] replaced the fixed *"≤ 5 % over 7 days"* bar with the owner's
look at whatever post-`0391` data exists, and its *Consequences* turned that look into a **per-deploy** step before
every deploy that reads `verified`: `0250` S3b (verify task `0396`), `0248`, `0319`, `0332` / `0323`.

What happened since (per the ADR):
- **`0391`** (24 h window, id checked first — [[tasks/login-signature-24h-window]]) shipped. Before it, `0373`'s data
  put the server-side stale share at about 34 %, worst at 20–23 UTC (42–52 %) ([[tasks/stale-login-fix-decision]]).
  The owner judges that `0391` cut this tail drastically ([[tasks/post-24h-window-login-read]]: stale 3.25 %).
- **`0340`** (S3a: login mints `vfy:true`) deployed alone on 2026-10-07 as `0.0.156-profile.3`; `0395` confirmed
  `vfy: true` live ([[tasks/verified-login-enforce-live]]).
- **The `0340` deploy commit did not change how logins are classified** — the ADR records its edits to
  `src/profile-server/LoginVerification.ts` and `src/profile-server/Telemetry.ts` as comment-only. So the post-`0391`
  outcome counts (`stale`, `ok`, `id_mismatch`, `bad_payload`, …, counted as `geoconflict.profile.login.verification`)
  still mean the same thing after `0340`; only what `ok` *buys* the player changed.

**The ruling, verbatim (owner, live in session, 2026-10-07):** *"I made a decision that we no longer wait for those
numbers. Monitor them as planned and after a few days we will check them again to make better decisions but they no
longer block us so the point is that we already improved this tail numbers drastically and we can move forward"*.

## Decision

1. **The post-`0391` login numbers are not a gate** for any deploy that reads `verified` — `0250` S3b (`0396`),
   `0248`, `0319`, `0332` / `0323`, or any later one. No owner look at the numbers is required before these deploys.
2. **The numbers keep being monitored** (the existing server counters). **The owner re-reads them in a few days** to
   inform later decisions — information, not a gate. Filed as task `0402` (Sprint 7, append rank 52, non-blocking;
   see [[decisions/sprint-7]]). The ADR does not set what that re-read must show.
3. **ADR-122 otherwise stands:** no fixed window or threshold (D1); counters restart at each profile deploy, so never
   compare a cumulative value across one; `0394` is not a gate (D4). The separate-slot advice is already met
   (`0340` deployed alone; S3b has not deployed).
4. **Unchanged:** any approval a consumer task needs for reasons *other than* the login numbers — e.g. ADR-116
   Decision 6's approval to enforce (already given for `0340`, per `0395`), or rules the owner set inside
   `0332` / `0323`. Only the numbers gate is removed.

Rejected: **keep ADR-122's per-deploy look** — it holds back each `verified` consumer for a look the owner expects to
change nothing.

## Consequences

- **Positive:** `0396`, `0248`, `0319`, `0332` / `0323` are no longer held back by the login numbers.
- **Costs, accepted knowingly (the ADR's own list):**
  - **A stale login now costs a paid citizen something, with no look before the deploy that makes it so.** Any
    non-`ok` login gets a `vfy:false` session. Once S3b ships, that paid citizen sees the S1 view for the session (no
    `is_paid_citizen: true`) — [[tasks/authenticated-profile-read]]; once `0248` ships they also see the interstitial
    ads they paid to remove — [[tasks/paid-citizen-ad-free]]. Later, `0319` refuses their name change, and
    `0332` / `0323` apply whatever the owner's rules in those briefs say for an unverified session. (This is the cost
    order ADR-122 first listed; ADR-123 is now the one place that carries it.)
  - **The data the owner judged on is weekday-only** — no weekend evening, 20–23 UTC, the worst window in `0373`'s
    data. The stale share paid citizens meet on a weekend evening is **not yet measured** after `0391`.
  - 🚨 **Nothing now stops a deploy if the numbers get worse.** The re-read in a few days (`0402`) is the only planned
    look, and it is tied to no deploy.
- **Residual:** an agent asked *"are the numbers good enough to deploy?"* answers that under ADR-123 they are not a
  deploy gate; it reports the numbers and the caveats above if asked, and **does not hold a deploy on them**.
- **Re-raise only if:** the owner reinstates a numbers look or a fixed bar (e.g. after the planned re-read); **or how
  logins are classified changes** (the outcome checks or freshness window in `src/profile-server/LoginVerification.ts`,
  or how they are counted — a new classifier makes `0391`'s numbers stale evidence); **or** a paid citizen is shown to
  have lost a paid benefit because of a non-`ok` login after S3b or `0248` ships, and the owner asks to revisit.
  Otherwise *"`0396` / `0248` / `0319` / `0332` / `0323` deployed with no owner look at the stale-share numbers on
  record"* is **closeout of this ADR, not a new defect.**
- ⚠️ **Not checked by the vault:** ADR-122's appended note says removing the per-task "owner looks at the numbers"
  steps from the briefs is a producer's job. The Sprint 7 board (2026-10-07 addendum) records dated notes added to
  the `0396`, `0319`, `0332` and `0323` briefs; those backlog briefs were not ingested here (backlog — premature).

## Related

- [[decisions/adr-122-stale-login-gate-owner-judgment]] — amended by this ADR (Decision 2 as a per-deploy gate superseded)
- [[decisions/adr-121-login-signature-24h-window]] — the `0391` fix whose numbers this ADR stops gating on; unchanged
- [[decisions/adr-116-verified-login]] — Decision 6 (approval to enforce) unchanged
- [[decisions/adr-numbering-two-series]] — the ADR number bands
- [[decisions/sprint-7]] — the board: 2026-10-07 addendum, `0402` filed at rank 52, `0396` gate 3 removed
- [[tasks/post-24h-window-login-read]] — task `0392`: the post-`0391` read (stale 3.25 %) the ruling rests on
- [[tasks/verified-login-enforce-live]] — task `0395`: `0340` deployed alone, `vfy: true` confirmed
- [[tasks/verified-login-enforce]] — task `0340`, S3a
- [[tasks/authenticated-profile-read]] — task `0250`, whose S3b deploy (`0396`) is no longer held by the numbers
- [[tasks/paid-citizen-ad-free]] — task `0248`, no longer held by the numbers
- [[tasks/login-signature-24h-window]] — task `0391`, the fix
- [[tasks/stale-login-fix-decision]] — task `0373`, the weekend-evening data behind the caveat
- [[systems/player-profile-store]] — the profile box whose counters are monitored
- [[decisions/adr-124-join-token]] — ADR-124 (2026-10-07): `0332`'s design; its deploy is not held by the login numbers
- [[tasks/join-token-identity-vouch]] — task `0332`, built and closed 2026-10-07 (not deployed)
