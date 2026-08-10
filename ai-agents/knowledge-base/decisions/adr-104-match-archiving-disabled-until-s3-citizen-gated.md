# ADR-104: Match archiving is disabled behind one config switch until S3-backed, citizen-gated archival ships

- **Status:** accepted
- **Date:** 2026-08-08 (retro-recorded; decision made **2026-06-01**, shipped in commit `c2bc236`
  "s4c-reduce-archive-telemetry-noise")
- **Deciders:** Owner (Mark Dolbyrev). Written up the same day in
  `../plan-fix-archive-endpoint.md` ("Status: Decision recorded 2026-06-01").

## Context

The fork inherited OpenFront.io's archive **client** but never stood up a matching **endpoint**.
`archive()` POSTs the finished game record to `${config.jwtIssuer()}/game/:id`; in production
`jwtIssuer()` resolves to the game host itself, which has no such route. Upstream had an external
Cloudflare Worker at `api.openfront.io/game/:id`; Geoconflict does not.

The result was the noisiest error family in telemetry — roughly **26.6 errors/minute** across three
groups (Uptrace window 2026-05-07, `../telemetry-error-priorities-2026-05-07.md`):

| Error | Rate | Leg |
|---|---|---|
| `error archiving game record: Not Found` | 16.29/min | server → archive backend |
| `TypeError: Failed to archive singleplayer game: Failed to fetch` | 9.64/min | client → worker |
| `PayloadTooLargeError` on `/api/archive_singleplayer_game` | 0.64/min | client → worker |

Two root causes beyond the missing endpoint, both verified and worth keeping: browsers cap
`keepalive` request bodies at **64 KB**, so large singleplayer records throw before leaving the
client; and for a gzip body, `express.json()`'s 100 KB default is enforced on the **decompressed**
size.

The decisive fact is a product one: **archived records have no consumer.** Game history is a
*citizen* feature, and citizenship was not implemented. The project was paying its loudest telemetry
group to populate a store nothing read.

## Decision

Add **one** boolean config switch, `archiveEnabled()`, returning `false`, and short-circuit both legs
behind it — keeping the surrounding structure intact so re-enabling is a one-line flip:

```
src/core/configuration/Config.ts:68            archiveEnabled(): boolean;
src/core/configuration/DefaultConfig.ts:311-318  return false;   // the switch + its rationale
src/server/Archive.ts:17-23                     server leg: early return
src/client/LocalServer.ts:268-273               singleplayer client leg: skip the upload
```

The follow-up — S3-backed archival gated to citizen games — is scoped in
`ai-agents/tasks/backlog/s4-archive-s3-backed-citizen-gated.md`. The intended sink is the S3 config
the project **already exposes** (`storageEndpoint` / `storageBucket` / `storageAccessKey` /
`storageSecretKey`, `DefaultConfig.ts:213-225`), which currently has **zero consumers in `src/`**.

## Options considered

- **A single `archiveEnabled()` switch, default off (chosen)** — removes all three error groups at
  once, on both legs and both game types, without building any storage. Costs nothing that anyone is
  using, and makes the eventual re-enable a one-line change rather than a re-implementation.
- **Demote the failure logs from `error` to `warn`** — rejected as insufficient. It hides the symptom
  while still making ~16 futile HTTP requests per minute and still uploading records the server
  discards. Silencing a call that should not happen is not the same as not making it.
- **Disk-on-master: add `POST/GET /game/:id` to `Master.ts`, persist JSON under `data/game-records/`**
  — **rejected, and explicitly marked "do not re-propose"** in `../plan-fix-archive-endpoint.md`.
  Reasons: unbounded disk growth with no retention on a single VPS (multi-MB records × ~16 game-ends
  per minute); it diverges from the S3 architecture the project already carries config for; and it
  would have needed raised `express.json` limits on **both** Worker and Master, plus auth and
  rate-limit exemptions — a lot of new surface for a store that should not exist.
- **Build S3 archival immediately** — rejected as sequencing, not as direction. S3 archival is the
  correct destination, but it is only worth building once citizenship exists to gate it; gating is
  what keeps volume and cost sane, since archiving every game is not the intent.
- **Delete the archive code entirely** — rejected. The feature is wanted, just not yet. Removing it
  would mean re-deriving the record format and both call paths later.

## Consequences

- **Positive:** the loudest telemetry group went to ~0 with no storage built. Wasted network calls and
  wasted client uploads stopped. The re-enable path is a one-line config flip plus the real sink.
- **Negative / costs:** **no game records are being retained at all.** Any match played while this is
  off is unrecoverable — there is no replay, no dispute resolution, no post-hoc analysis of a live
  incident from a record. That gap is permanent for the disabled period; flipping the switch later
  does not backfill it.
- **Two live consequences that look like bugs and are not:** `archive()` returns immediately for
  finished multiplayer *and* singleplayer games; and the `storageEndpoint`/`storageBucket`/
  `storageAccessKey`/`storageSecretKey` accessors have no callers anywhere in `src/`.
- **Residual risks / "re-raise only if":**
  - **The citizenship / game-history feature ships** and needs records — then implement
    `s4-archive-s3-backed-citizen-gated.md` and supersede this ADR. This is the expected exit.
  - **A consumer of archived records appears for a different reason** (anti-cheat, dispute
    resolution, balance analysis on real matches).
  - **The absence of records blocks a live incident investigation** — that is the empirical trigger
    to re-price the cost above.

  Absent those, a review finding of the form "archiving is dead code", "`archiveEnabled()` always
  returns false", "the S3 config accessors are unused", or "game records are never stored" is
  **closeout of this ADR, not a new defect.**

  Two things are **not** covered by this ADR and remain genuine findings if raised: the destination
  when re-enabled is an HTTP POST to `jwtIssuer()`, **not** S3 (the S3 write is still unwritten); and
  when uploads resume the singleplayer ingest route needs an explicit bounded `express.json` limit,
  remembering it applies to the **decompressed** size.

## Related

- `../plan-fix-archive-endpoint.md` — the full analysis, the phase split, and the rejected
  disk-on-master alternative
- `../report-archive-endpoint-task-split-2026-06-01.md`
- `../telemetry-error-priorities-2026-05-07.md` — the error rates quoted above
- `ai-agents/tasks/backlog/s4-archive-s3-backed-citizen-gated.md` — the follow-up
- `../architecture.md` §9 ("Two features that are present but switched off"), §13 open question 1
  (whether `jwtIssuer()` is a live third party — this bears on the re-enable path)
