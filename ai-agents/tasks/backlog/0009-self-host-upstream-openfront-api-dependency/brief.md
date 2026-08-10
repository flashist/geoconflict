# Self-host the upstream OpenFront API dependency (identity, archive, matchmaking)

## ID
0009

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-architect

## Context

`jwtIssuer()` still points identity, archive, and matchmaking at an **external OpenFront-style
service** inherited from upstream. The owner's ruling on 2026-08-09: this is **infrastructure to be
self-hosted eventually** — not a dead leftover to rip out, and not a service you intend to keep
depending on permanently.

That ruling resolves an ambiguity that has been blocking other work, and it has consequences worth
stating plainly:

- **The archive task is unblocked in principle but still depends on this.** `adr-104` records that
  match archiving is switched off behind one `archiveEnabled()` flag until S3-backed, citizen-gated
  archival ships. Part of why that was parked was not knowing where archives were meant to go. Now we
  do: eventually, your own infrastructure.
- **There may be a live third-party call in production right now.** Nobody has confirmed whether
  anything actually reaches the upstream service at runtime, or whether the configuration is inert.
  ⚠️ **If it is live, it is also a 152-ФЗ question** — the compliance position rests on all
  infrastructure being RU-resident (`PROJECT.md`), and an external identity service would sit outside
  that. This is not an accusation that it is live; it is the first thing this task must determine.

## ⚠️ Scope raised 2026-08-09 — this blocks monetization, not just the archive

Discovered after this brief was first written: **cosmetic entitlements come from the upstream API.**
`Worker.ts:377` reads `flares = result.player.flares`, sourced from the upstream OpenFront user API
(`ApiSchemas.ts:53`) — not Geoconflict's profile server, not Yandex.

That makes this task materially more important than "tidy up an inherited config":

- **You cannot sell a cosmetic whose entitlement lives on someone else's server.** Any Yandex IAP for
  flags (Task 9), patterns (Task 9a), or anything else gated by `PrivilegeChecker` needs the
  entitlement to originate here. This blocks the cosmetics monetization path.
- **Ad suppression already depends on it.** `GutterAds.ts:35` hides ads for any player whose flares
  contain a `pattern:` entry — so the primary revenue source is already gated on upstream-supplied
  data.
- Task `0008` (fail-closed privileges) now depends on these findings.

**Priority note, honestly stated:** the backlog board is unranked by design, so there is no rank to
raise. The owner's ruling (2026-08-09) is that this should be **pulled into a sprint ahead of any
cosmetics monetization work**. That ordering takes effect when it is pulled, not from a number here.

**Investigation-first, deliberately.** The owner said "eventually", which sets direction but not
scope. Writing an implementation brief for self-hosting three services before knowing whether any of
them is even called would be scoping on a guess. So phase 1 is findings; the build is briefed after.

## What to build

**Phase 1 — findings only.** A document in `ai-agents/knowledge-base/reports/` answering:

1. **What does `jwtIssuer()` actually resolve to** in each environment (dev, preprod, prod)? Give the
   config path and the effective value per environment. **Do not paste secrets or private endpoints
   into the report** — name the variable and describe the target, do not publish it.

2. **What calls it at runtime, and does anything reach the network in production?** Trace **four**
   concerns separately — identity, **cosmetic entitlements (`flares`)**, archive, matchmaking —
   because they may have different answers. The entitlements path (`Worker.ts:359-411` →
   `ApiSchemas.ts:53`) was discovered late and is the one with monetization consequences; do not
   fold it into "identity". Distinguish *configured* from *actually called*. Evidence, not inference: if you cannot
   tell from code, say what telemetry or log query would settle it.

3. **If anything is live: what data crosses the boundary?** Specifically whether any personal data
   (Yandex IDs, display names) leaves RU-resident infrastructure. **Flag this loudly and immediately
   if so** — it changes the 152-ФЗ picture recorded in `PROJECT.md`, and it would outrank the rest of
   this task.

4. **What would self-hosting each of the three actually require?** Rough shape and size per concern.
   They may be very different jobs; do not average them into one estimate.

5. **Is the profile server the natural home for any of it?** `src/profile-server/` already exists as
   a standalone RU-hosted service with its own Postgres, its own deploy pipeline, digest pinning, a
   health gate, and rollback. Identity in particular may belong there rather than in a new service.
   **Reuse before building** — recommend explicitly.

6. **Recommend a sequence and a trigger.** Which concern to self-host first, and what event should
   make it due. If the honest recommendation is "not yet, and here is the condition that changes
   that", say so — "eventually" is a valid answer to hold for a while, provided the condition is
   written down.

## Three wiki claims this task's findings must settle

The wiki carries three statements that hinge on the production-liveness question this task answers.
One was corrected on 2026-08-09; **two were deliberately left wrong** rather than guessed at, because
the same evidence settles all three. **When findings land, route these to `fkit-wiki`** — the
exclusive write gateway for the vault — as a targeted correction:

1. ✅ **Already corrected** — `wiki/systems/player-infrastructure.md`, Monetization bullet: claimed
   the flares path was dead. It is live; the page now says so, with the production-liveness question
   marked unverified.
2. ⬜ **`wiki/systems/player-infrastructure.md`, Architecture → Identity bullet** — says the inherited
   Discord/email/JWT account system "is effectively dead in production". But `flares` arrive via
   `getUserMe(clientMsg.token, config)`, which **is** the upstream account API, and the same response
   carries `user.discord` and `user.email` (`ApiSchemas.ts:45-52`). "Geoconflict does not serve those
   routes" can be true while the client still calls someone else's.
3. ⬜ **Same page, Architecture → Cosmetics bullet** — says purchase **and entitlement** flows
   inherited from OpenFront are dead in the Yandex build. The purchase half is undisputed; the
   entitlement half is known live — that is exactly what `PrivilegeChecker.isAllowed(flares, refs)`
   does. One sentence, two different verdicts.

⚠️ **Do not correct 2 and 3 by inference from this brief.** They were left standing on purpose. Fix
them from findings, or leave them and say why.

## Verification steps

1. The findings document exists in `ai-agents/knowledge-base/reports/`, dated.
2. Each of the four concerns — identity, cosmetic entitlements, archive, matchmaking — is answered
   **separately**; none is silently folded into another.
3. For each, the document states configured-vs-actually-called with evidence (`file:line`, a
   telemetry query, or an explicit "could not determine, here is what would settle it").
4. The personal-data question is answered explicitly, with a clear yes/no/unknown on whether data
   leaves RU-resident infrastructure.
5. Reuse of `src/profile-server/` is evaluated and recommended for or against, per concern.
6. It ends with a recommended sequence and a written trigger condition.
7. **No secrets or private endpoints** appear in the document — it goes to a public repo.
8. No source code changed — `git diff` shows only the new report.
9. The two outstanding wiki claims (Identity bullet, Cosmetics bullet) are each either **corrected via
   `fkit-wiki`** or **explicitly left standing with a stated reason** — not silently ignored. Never
   edit `ai-agents/wiki-vault/` directly; that is `fkit-wiki`'s exclusively.

## Notes

- **Depends on:** nothing
- **Blocks:** 0008; the S3-backed citizen-gated archive task
  (`s4-archive-s3-backed-citizen-gated.md`, which has its own separate blockers — profile store,
  citizenship, S3 infra); and any cosmetics monetization work gated by `PrivilegeChecker` (Task 9
  flags, Task 9a territory patterns)

- Authority: owner ruling 2026-08-09 — "to be self-hosted eventually".
- Related: `adr-104` (archiving disabled behind one flag), `adr-103` (the identity-trust seam and
  client-asserted Yandex IDs). Read both before starting; the identity concern here and the identity
  seam in `adr-103` are adjacent but **not** the same thing, and conflating them would produce a
  confused report.
- **Escalate immediately, mid-investigation, if finding 3 turns up personal data leaving RU
  infrastructure.** Do not save it for the write-up.
