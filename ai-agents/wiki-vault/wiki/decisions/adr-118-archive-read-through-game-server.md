# ADR-118: Players Read Archived Matches Through the Game Server — the Archive Bucket Stays Private

**Date**: 2026-10-03
**Status**: accepted

> Source: `ai-agents/knowledge-base/decisions/adr-118-archived-matches-read-through-game-server-bucket-private.md`.
> Accepted by owner sign-off 2026-10-03 (*"Accept as written"*, live via `AskUserQuestion` in the `fkit lead`
> session, relayed by `fkit-lead`), promoted from `proposed` in place. ⚠️ **Accepted on the owner's word; the owner
> did not review the text before accepting it** — the decision was owner-ruled, the wording was not owner-read.
> Drafted by `fkit-architect`, who heard no ruling first-hand. The ruling is also ruling 3 of the
> *"🗓️ OWNER RULINGS 2026-10-03"* block in task `0030`'s brief.

> ⏸️ **The task this ADR serves is POSTPONED INDEFINITELY.** Later the same day (2026-10-03) the owner ruled
> *"we will pospone the Archive Matches tasks, move the tasks related to it to the backlog."* `0030` moved from
> Sprint 7 to the Backlog board (unranked). **The decision still stands** — it applies whenever `0030` restarts. See
> [[decisions/sprint-backlog]], [[decisions/sprint-7]].

## Context

Task `0030` builds S3-backed, citizen-gated match archival, replacing the inherited path that
[[decisions/adr-104-archiving-disabled]] switched off. Its check *"replays / history read back correctly from the
bucket"* needs a read path, which forced the choice: does the browser fetch archived records from the bucket, or does
the game server fetch them and hand them over?

What the code does today (the ADR's reading of the working tree, 2026-10-03; find code by name):

- **The client read** (`checkArchivedGame()` in `src/client/JoinPrivateLobbyModal.ts`) fetches
  `` `${getApiBase()}/game/${lobbyId}` `` from the shared API root — not from any bucket — and is **not** behind
  `archiveEnabled()`. Task `0292` tracks repointing it.
- **The server write** (`src/server/Archive.ts`) POSTs to the same root behind the `archiveEnabled()` early return. A
  server-side reader, `readGameRecord()`, exists but **has no caller** in `src/` or `tests/`.
- **The storage slots** (`Config.ts`, `DefaultConfig.ts`, forwarded by `deploy.sh`) have no caller outside
  `src/core/configuration/`, and **there is no region slot yet**.
- **The config-parity allowlist** carries the four `STORAGE_*` names twice: as game-pipeline **`optional`** entries
  (blank allowed, since nothing reads them) and as client-pipeline **`server-only`** entries (*"Must NOT be
  substituted by DefinePlugin"* — a server secret in the browser bundle would be published).
- **The domain constraint:** Yandex Games allows one main domain for an iframe game, so everything routes through
  its subdomains. A browser-direct bucket read would add a further origin outside that pattern.

**Same-session owner rulings, cited as context — NOT decisions of this ADR** (all in `0030`'s brief): a **new
dedicated archive bucket** with **its own key scoped to it** (not the profile-backup bucket); **30-day retention
enforced by our own code** (the current S3 provider appears to have no lifecycle setting — ⚠️ unconfirmed for a new
bucket); **prod only** — dev `STORAGE_*` stays blank.

## Decision

**Players read archived matches through the game server.** The game server fetches the record from the bucket with
its own credentials and returns it to the client.

- The bucket stays **private** — **no browser-direct access**, **no presigned URLs**, **no CORS** on the bucket.
- The S3 key and secret **never leave the server** — not in the browser bundle, not in a response, not in a URL.
- The route, its path, and how the reader's citizenship is established are **`0030`'s design**, not this ADR's.

**Options:** **(a) proxy through the game server — chosen** (keys server-only; no CORS; stays inside the
one-main-domain pattern; access control lives in our code next to the existing citizen check). **(b) browser
downloads straight from the bucket via short-lived presigned URLs — rejected**: saves server bandwidth/CPU but needs
CORS, a second origin, and a browser-reachable bucket — and the server would still need an endpoint plus a citizen
check to mint the URL, so only the byte transfer is saved.

## Consequences

- **Positive:** the client-pipeline `server-only` allowlist entries stay true by construction; no CORS to keep in
  step; nothing new to clear against the Yandex domain rule; no public or presigned surface.
- **Costs (accepted):**
  - **Game-server bandwidth and CPU for history reads.** Workers also run the live turn relay, so history reads
    share their network and event loop. ⚠️ **Not measured** — record sizes and read volume are unknown.
  - **A new read endpoint plus a citizen check is needed.** `GET /api/game/:id` (`src/server/Worker.ts`) already
    serves **active**-game info, and the existing citizen check (`creatorMayStartPrivateLobby` in
    `src/server/GameServer.ts`) is tied to a client connected to a running game — a history read has no live game.
  - **Two different allowlist entries, two different fates:** the client-pipeline `server-only` entries **stay**;
    the game-pipeline `optional` entries **must be removed** once `0030`'s code reads the values — a deploy-order
    trap recorded in `0030`'s brief: **the bucket and key must exist before `0030` deploys**, or the parity guard
    refuses a prod deploy with blank values.
- **Re-raise only if:** measured history-read traffic materially degrades the turn relay (a measurement, not a
  projection); **or** the Yandex domain rule changes to allow a second origin **and** the server cost has become a
  real problem; **or** archived records stop being citizen-gated. ⛔ A review finding of *"the server proxies bytes it
  could hand off with a presigned URL"* is this ADR's accepted tradeoff — **closeout, not a new defect**.

### Open points (for `0030`'s design — not decided here)

1. **How the history-read endpoint identifies the reader and checks citizenship** — there is no connected game
   client. The trust level (client-asserted per [[decisions/adr-103-identity-trust-seam]], or signed per
   [[decisions/adr-116-verified-login]]) is an **owner question**.
2. **Route and path** — `GET /api/game/:id` is taken; a separate route and the repoint of `checkArchivedGame()` are
   `0292` / `0030` work.
3. **Whose records a citizen may read** (own matches only, or any match ID) — product scope.

## Related

- [[decisions/adr-104-archiving-disabled]] — the switch this ADR's task will eventually replace
- [[decisions/archive-archival-strategy]] — the 2026-06-01 two-phase split; this ADR settles phase 2's read path
- [[decisions/adr-103-identity-trust-seam]] — trust level candidate for the history-read citizen check (open point 1)
- [[decisions/adr-116-verified-login]] — the signed-identity alternative for open point 1
- [[decisions/config-parity-failure-class]] — the parity guard behind the `STORAGE_*` deploy-order trap
- [[systems/match-logging]] — what is recorded per match, and the still-live ungated client read (`0292`)
- [[decisions/sprint-backlog]] — where `0030` and `0292` now sit (archiving postponed indefinitely 2026-10-03)
- [[decisions/sprint-7]] — the board `0030` left on 2026-10-03
