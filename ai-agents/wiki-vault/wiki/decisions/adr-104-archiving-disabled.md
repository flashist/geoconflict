# ADR-104 — Match archiving disabled behind one switch until S3-backed, citizen-gated archival ships

**Date**: 2026-08-08
**Status**: accepted

> Project ADR-104 — see [[decisions/adr-numbering-two-series]].
> Retro-recorded 2026-08-08; decision made **2026-06-01** and written up the same day.
>
> Source: `ai-agents/knowledge-base/decisions/adr-104-match-archiving-disabled-until-s3-citizen-gated.md`

## Context

The fork inherited OpenFront.io's archive **client** but never stood up a matching **endpoint**. The archive call POSTs the finished game record to a route the production host does not serve. Upstream had an external worker service for it; Geoconflict does not.

The result was the noisiest error family in telemetry — roughly **26.6 errors/minute** across three groups (Uptrace window 2026-05-07): a server-side "Not Found" on archiving (16.29/min), a client-side failure to archive singleplayer games (9.64/min), and a payload-too-large error on the singleplayer ingest route (0.64/min).

Two root causes beyond the missing endpoint, both verified and worth keeping: browsers cap `keepalive` request bodies at **64 KB**, so large singleplayer records throw before leaving the client; and for a gzip body, the JSON body-parser's 100 KB default is enforced on the **decompressed** size.

The decisive fact is a product one: **archived records have no consumer.** Game history is a *citizen* feature, and citizenship was not implemented. The project was paying its loudest telemetry group to populate a store nothing read.

## Decision

Add **one** boolean config switch, `archiveEnabled()`, returning `false`, and short-circuit both legs behind it — the server leg and the singleplayer client leg — keeping the surrounding structure intact so re-enabling is a one-line flip.

The follow-up is S3-backed archival gated to citizen games, scoped as a backlog task. The intended sink is the S3 config the project **already exposes** (`storageEndpoint` / `storageBucket` / `storageAccessKey` / `storageSecretKey`), which currently has **zero consumers** in `src/`.

**Options rejected:** demoting the failure logs from `error` to `warn` (hides the symptom while still making ~16 futile requests per minute — silencing a call that should not happen is not the same as not making it); **disk-on-master persistence — explicitly marked "do not re-propose"** (unbounded disk growth with no retention on a single VPS, diverges from the S3 architecture the project already carries config for, and would need raised body limits on two processes plus auth and rate-limit exemptions); building S3 archival immediately (rejected as *sequencing*, not direction — it is only worth building once citizenship exists to gate it, and gating is what keeps volume and cost sane); and deleting the archive code (the feature is wanted, just not yet).

## Consequences

- **Positive** — the loudest telemetry group went to ~0 with no storage built. Wasted network calls and client uploads stopped. The re-enable path is a one-line config flip plus the real sink.
- **Negative** — **no game records are being retained at all.** Any match played while this is off is unrecoverable: no replay, no dispute resolution, no post-hoc analysis of a live incident from a record. That gap is permanent for the disabled period; flipping the switch later does not backfill it.
- **Two live consequences that look like bugs and are not:** the archive call returns immediately for finished multiplayer *and* singleplayer games; and the four S3 config accessors have no callers anywhere.
- **Re-raise only if:** the citizenship / game-history feature ships and needs records (the expected exit); a consumer appears for another reason (anti-cheat, dispute resolution, balance analysis on real matches); or the absence of records blocks a live incident investigation. Absent those, a finding of the form *"archiving is dead code"*, *"`archiveEnabled()` always returns false"*, *"the S3 config accessors are unused"*, or *"game records are never stored"* is **closeout of this ADR, not a new defect**.
- **Two things this ADR does *not* cover, and which remain genuine findings:** when re-enabled the destination is still an HTTP POST to the JWT issuer, **not** S3 (the S3 write is still unwritten); and when uploads resume the singleplayer ingest route needs an explicit bounded body limit, remembering it applies to the **decompressed** size.

## Related

- [[decisions/archive-archival-strategy]] — the phase split this ADR formalizes
- [[tasks/archive-endpoint-failures]] — the Sprint 4c cleanup task that shipped the switch
- [[systems/match-logging]] — what is recorded per match and what cannot be retrieved
- [[systems/telemetry]] — where the error rates were measured
- [[systems/architecture-overview]] — §features switched off, open question 1
- [[decisions/adr-numbering-two-series]] — the ADR number bands
