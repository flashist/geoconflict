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

- ~~**The archive task is unblocked in principle but still depends on this.**~~ ⚠️ **CORRECTED
  2026-09-22 — struck, not deleted.** The *"still depends on this"* half is **wrong** and was
  downgraded by owner ruling (see `## Notes`): **`0030` does NOT depend on this task.** The rest of
  the bullet stands: `adr-104` records that match archiving is switched off behind one
  `archiveEnabled()` flag until S3-backed, citizen-gated archival ships. Part of why that was parked
  was not knowing where archives were meant to go — and the brief's own words say so: *"Now we do."*
  That was **destination ambiguity, now discharged**, not a dependency on self-hosting. The arrow in
  fact points the **other way**: `0030`'s job is to replace `Archive.ts:32`'s `jwtIssuer()` POST with
  an S3 write, which **removes** the archive leg from this task's scope rather than waiting on it.
  Direction of the "eventually, your own infrastructure" ruling is unchanged for identity,
  entitlements and matchmaking.
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

   > 📊 **PARTIAL DATA POINT AGAINST THIS ITEM — recorded 2026-09-22. ⛔ FINDING 1 IS *NOT*
   > DISCHARGED.** Read the ceiling before using it.
   > **Measured by `fkit-lead`:** a read-only `GET /api/env` against the **live production
   > deployment** — the route at `src/server/Master.ts:178` that serves the client its runtime config
   > — classified **`apiBaseUrl` → OWN INFRA (a geoconflict domain)** and **`jwtIssuer` → OWN INFRA (a
   > geoconflict domain)**, with `gameEnv` `prod` and `publicProtocol` `https`.
   > 🔒 **CLASSIFICATION ONLY, DELIBERATELY.** No endpoint, hostname, domain or URL from that response
   > was printed, logged, retained, or written here — host strings were classified by substring
   > in-process and discarded. ⛔ **Keep it that way when you write the findings report**; this item's
   > own instruction above says the same thing.
   > **What it gives you:** one environment (**prod**) and **two fields**, from the live box rather
   > than the working tree. It **raises the ceiling** on the earlier `.env.prod` classification, which
   > was read from the tree with the explicit caveat that a deployed box could differ and
   > `JWT_ISSUER` is resolved at runtime — **that caveat is discharged for these two fields.**
   > ⚠️ **What it does NOT give you, stated plainly so it is not over-read:** it is **one reading at
   > one moment**, not continuous proof, and a deployed box's configuration can change. **Dev and
   > preprod are unmeasured.** And it says **nothing** about the *other* concerns — **identity,
   > cosmetic entitlements and matchmaking remain entirely open**, which is most of item 2's work.
   > **Still answer this item properly.** The one place it is already conclusive is the archive
   > concern's destination — see the note under item 2 and task `0292`.

2. **What calls it at runtime, and does anything reach the network in production?** Trace **four**
   concerns separately — identity, **cosmetic entitlements (`flares`)**, archive, matchmaking —
   because they may have different answers. The entitlements path (`Worker.ts:359-411` →
   `ApiSchemas.ts:53`) was discovered late and is the one with monetization consequences; do not
   fold it into "identity". Distinguish *configured* from *actually called*. Evidence, not inference: if you cannot
   tell from code, say what telemetry or log query would settle it.

   > 📌 **NOTE ON CONCERN 3 (archive) — RETIRED BY `0030`, NOT WAITING ON IT. Added 2026-09-22 by
   > owner ruling; recorded so a later reader does not investigate something already handled.**
   > ⛔ **This is a NOTE ONLY. Nothing was re-scoped:** the four concerns are unchanged and
   > unrenumbered, and this task's `## Status` and `## Priority` are untouched. The archive concern
   > **stays in this task's findings scope** — still answer it.
   > What changed is the *conclusion you should expect*, not the work: `0030-archive-s3-backed-citizen-gated`
   > replaces `src/server/Archive.ts:32`'s `config.jwtIssuer()` POST with an S3 write, so the archive
   > leg leaves this task's scope **when `0030` ships** rather than being something this task must
   > self-host. Read the same way at item 4 (*what self-hosting each would require*) and item 6
   > (*recommended sequence*): the honest answer for archive is likely **"do not self-host it —
   > `0030` removes it"**, and the remaining self-hosting question is identity, entitlements and
   > matchmaking. ⚠️ Still verify it rather than copying this note: `0030` has not shipped, and until
   > it does, `Archive.ts:32` is real code pointing at the shared root — it is simply **inert**,
   > since `archiveEnabled()` is a hard `false` (`src/core/configuration/DefaultConfig.ts:315`).
   > ⚠️ **A live CLIENT-side read survives that flag** — see task
   > [`0292-client-archive-read-bypasses-archive-enabled-flag`](../0292-client-archive-read-bypasses-archive-enabled-flag/brief.md),
   > filed 2026-09-22. `src/client/JoinPrivateLobbyModal.ts:245` fetches `${getApiBase()}/game/<id>`,
   > is **not** behind `archiveEnabled()`, and fires today whenever a private-lobby ID is entered that
   > is **not** a currently-active lobby. **Factor it into concern 3's answer: the archive leg is NOT
   > fully dark.**
   > ✅ **Where that read goes IS now established, for prod:** `getApiBase()` (`src/client/jwt.ts:88`)
   > prefers `runtime.apiBaseUrl` then `runtime.jwtIssuer` (`:93-95`), and **both classify as OWN
   > INFRA** on the live production deployment (measured 2026-09-22 — see the 📊 data point under item
   > 1). ⇒ **The archive concern's destination question is ANSWERED: it is our own infrastructure, not
   > a third party, so there is NO 152-ФЗ question on this path.** ⛔ Do not re-investigate it, and
   > ⛔ do not generalize it — **identity, entitlements and matchmaking are NOT covered by that
   > reading**, and dev and preprod are unmeasured.

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
- **Blocks:** 0008; and any cosmetics monetization work gated by `PrivilegeChecker` (Task 9 flags,
  Task 9a territory patterns). ⚠️ **Both of these were re-checked on 2026-09-22 and stand** —
  `0010` and `0011` both cite this task as the entitlement origin, so the coupling is genuine. Only
  the archive item was downgraded; see below.
- **Related / touches (NOT a blocker):** `0030` replaces `Archive.ts:32`'s `jwtIssuer()` POST with an
  S3 write, removing the archive leg from this task's scope. Not a blocker.
- ~~**Blocks** ... the S3-backed citizen-gated archive task (`0030-archive-s3-backed-citizen-gated`,
  which has its own separate blockers — profile store, citizenship, S3 infra)~~ — **struck, not
  deleted: DOWNGRADED TO "Related" ON 2026-09-22 BY OWNER RULING.** Authority: a spawned
  `fkit-architect` investigated the contradiction between this line and `0030`'s two-blocker
  dependency list and returned **NO — this claim is stale; `0030` does not depend on `0009`; `0030`'s
  two-blocker count is correct.** The owner accepted that verdict and chose *"Downgrade to Related"*
  the same day. ⛔ **Do not restore this as a Blocks item.** Why it was wrong, so it is not
  re-derived: the claim traces to `ai-agents/knowledge-base/architecture.md:898-902` §13 open
  question 1, which is phrased **conditionally** (*"This determines whether R2 and the archive task
  are blocked on an external party"*) and was flattened into "Blocks"; the determination was never
  run. The discriminator is that citizen-gating reads `is_citizen` from the **profile server**
  (`src/server/GameServer.ts:1336-1337` via `ProfileApiClient.resolvePlayer`), **not** from upstream
  flares / `PrivilegeChecker` — had it keyed off the latter, the dependency would have been real.
  ⚠️ **Confidence, stated honestly: ~90% on the technical verdict** (each step is a read line),
  **~70% on intent** — code cannot establish what "Blocks" meant to its author on 2026-08-09.
  ⛔ **`architecture.md` was NOT corrected** — the owner was offered that and declined; the stale
  conditional still stands there by choice.

- Authority: owner ruling 2026-08-09 — "to be self-hosted eventually".
- Related: `adr-104` (archiving disabled behind one flag), `adr-103` (the identity-trust seam and
  client-asserted Yandex IDs). Read both before starting; the identity concern here and the identity
  seam in `adr-103` are adjacent but **not** the same thing, and conflating them would produce a
  confused report.
- **Escalate immediately, mid-investigation, if finding 3 turns up personal data leaving RU
  infrastructure.** Do not save it for the write-up.
