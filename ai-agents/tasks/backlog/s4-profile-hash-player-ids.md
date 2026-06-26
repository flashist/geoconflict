# Task — Profile Store: Pseudonymize Player Identity (store an irreversible hash, never the raw Yandex ID)

## Sprint
Sprint 4 — compliance-driven change to the Player Profile Store identity handling.

## Priority
**High — gates profile-store production go-live.** This replaces the old 152-ФЗ legal gate: per the
investigation decision, real raw Yandex IDs must not be persisted in production, so this must be in
place **before T6 credits real players** in prod. The profile box (T4) and DB/API (T5) just went live
with little/no real data, so the schema change is cheapest to make **now**, before real profiles
accumulate.

## Type
Engineering implementation of a locked compliance decision (not an investigation).

## Origin / context
Decision from the 152-ФЗ investigation (`s4-personal-data-compliance-investigation.md`, done):
**store an irreversible, unique hash of the Yandex player ID instead of the raw ID.** Full rationale
and the legal-alignment reasoning are in
`ai-agents/knowledge-base/personal-data-152fz-findings.md` — read it first. Pseudonymizing identity
at ingestion is what removes/reduces the Roskomnadzor notification + consent obligation.

## Where identity flows today (what this task changes)
- **Client (T3):** `FlashistFacade.getYandexUniqueId()` → `yandexPlayerId` in `ClientJoinMessage`
  (`src/core/Schemas.ts`). The client is the only place the Yandex SDK exposes the raw ID, so the raw
  value unavoidably *transits* client→server (TLS-protected).
- **Game server (T3):** `Worker.ts` stores `yandexPlayerId` on the `Client` object (`Client.ts`).
- **Profile store (T5, done):** profiles are keyed on the Yandex ID; the schema persists it.
- **Crediting (T6, next):** the game server credits match-end XP to the profile keyed by that ID.

**The change:** the raw Yandex ID is **hashed at a server trust boundary and never persisted or
logged**; the **hash becomes the profile key** everywhere the raw ID is used today.

## What to build

1. **Keyed hash helper (server-side).** `profileIdHash(rawYandexId)` = an HMAC-style construction
   (e.g. HMAC-SHA256) over the raw ID using a **secret server-side pepper**.
   - **Deterministic** (same raw ID → same hash) so returning players are recognized across
     sessions/devices — required for XP crediting and citizenship.
   - **Keyed, not plain.** A bare `sha256(id)` is brute-forceable over the ID space and is **not
     acceptable**. The pepper is a secret file / env on the backend — **never in git, never on the
     client**.
2. **Hash at the boundary; never store the raw ID.** Compute the hash where the raw ID is first
   received server-side and discard the raw value immediately. The raw Yandex ID must appear in **no**
   persisted form — DB rows, logs, backups, archival, or error payloads.
3. **Profile store keyed by hash (T5 schema change).** The identity column becomes
   `yandex_player_id_hash` (replacing the raw-ID column). Apply a migration on the live DB **now while
   it is effectively empty** — far cheaper than after real profiles exist.
4. **Crediting + reads use the hash (T6 + client read path).** Build T6 to credit by the hash from
   the start. The client profile-read path keys by the hash too.

### Key design decision to lock with the technical specialist
**Where is the hash computed, and how does the client read its own profile?** The client can't hold
the pepper. Recommended default: **the profile server owns the pepper and hashes every incoming raw
ID on receipt** (from both the game-server credit calls and client profile reads), persisting only
hashes — raw IDs transit to it over TLS but are hashed-on-receipt and never stored. Alternative: the
game server owns the pepper and the client routes profile reads through it. Lock one before coding;
keep the pepper in exactly one tier to avoid divergence.

## Out of scope / explicitly flagged
- **Display name handling — OPEN, possibly a separate task.** The original obligation was "Yandex IDs
  **+ display names**." This task pseudonymizes the **ID only**. If the profile store persists a
  display name, that is independently personal data and is **not** resolved here — see open item #1 in
  the findings doc. **Confirm with Mark/the lawyer** whether display names are stored and whether they
  need the same treatment; if so, scope it (here or a follow-up). Do not assume ID-hashing alone is
  full 152-ФЗ clearance.
- Consent flow / Roskomnadzor notification — avoided by the pseudonymization decision (per findings),
  not built here.

## Verification
1. **No raw Yandex ID at rest** — dump the profile DB and grep server/profile logs for any raw-ID
   pattern after a real login + match; expect **zero** occurrences. Only hashes present.
2. **Deterministic recognition** — the same player across two separate sessions/devices resolves to
   the **same** profile (XP accrues to one profile, not duplicates).
3. **Crediting works on the hash** — T6 match-end crediting writes XP to the hash-keyed profile.
4. **Pepper hygiene** — pepper is absent from git and the client bundle; it has a backup/rotation note
   (rotation re-keys all hashes → treat as long-lived).
5. No new analytics event is defined here.

## Sequencing
- **Gates profile-store production go-live** (real raw PII must not be persisted).
- **Must land before T6 ships real crediting to prod.** Ideally do the T5 schema migration immediately
  (DB ~empty now), then build T6 hash-keyed.
- Feeds the schema in `s4-player-profile-store-impl.md` (identity column) and interacts with the
  deferred archival (`s4-archive-s3-backed-citizen-gated.md` must also store only hashes).

## Notes
- `src/core/Schemas.ts` still carries the raw `yandexPlayerId` on `ClientJoinMessage` (client→server
  transit is unavoidable); the constraint is **at rest**, not in transit.
- No secrets/peppers/PII in this brief.
