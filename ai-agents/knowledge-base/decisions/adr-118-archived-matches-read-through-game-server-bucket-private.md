# ADR-118: Players read archived matches through the game server — the archive bucket stays private

- **Status:** accepted (owner sign-off 2026-10-03, relayed by fkit-lead). Promoted `proposed` →
  `accepted` in place, per `decisions/README.md` § *Immutability starts at `accepted`*.
  - **The ruling:** live via `AskUserQuestion` in the `fkit lead` session, 2026-10-03, relayed by
    `fkit-lead` — the owner chose **"Accept as written"**. ⚠️ **Accepted on the owner's word; the owner did
    not review this text before accepting it.** The decision was owner-ruled; the wording was not
    owner-read.
  - *History, kept visible:* until 2026-10-03 this line read *"proposed — **the decision itself is
    owner-ruled** (2026-10-03, see *Deciders*); what is pending is the owner's sign-off on **this text**.
    Promote to `accepted` in place, per `decisions/README.md` § *Immutability starts at `accepted`*. Left
    `proposed` because the owner has not read these words, and a `proposed` body can still be corrected
    without a superseding ADR."*
- **Date:** 2026-10-03
- **Deciders:** Owner (Mark Dolbyrev). Ruled live via `AskUserQuestion` in the `fkit lead` session on
  2026-10-03, relayed by `fkit-lead`. Drafted by `fkit-architect` (spawned by `fkit-lead`); the architect
  heard no ruling first-hand — the ruling arrived by relay. Recorded in the task brief as ruling 3 under
  *"🗓️ OWNER RULINGS 2026-10-03"* in
  [`0030`](../../tasks/backlog/0030-archive-s3-backed-citizen-gated/brief.md).

## Context

Task [`0030`](../../tasks/backlog/0030-archive-s3-backed-citizen-gated/brief.md) builds S3-backed,
citizen-gated match archival, replacing the inherited archive path that
[ADR-104](adr-104-match-archiving-disabled-until-s3-citizen-gated.md) switched off. Its verification
item 2 — *"replays / history read back correctly from the bucket"* — needs a read path. That forced a
choice: does the browser fetch archived records from the bucket itself, or does the game server fetch
and hand them over?

What the code does today (working tree, read 2026-10-03):

- **The client read** goes to the shared API root, not to any bucket:
  `src/client/JoinPrivateLobbyModal.ts:300` — `fetch(`` `${getApiBase()}/game/${lobbyId}` ``)` inside
  `checkArchivedGame()`. `getApiBase()` resolves from the runtime config's `apiBaseUrl` or `jwtIssuer`
  (`src/client/jwt.ts:88-98`). It is not behind `archiveEnabled()`; task
  [`0292`](../../tasks/backlog/0292-client-archive-read-bypasses-archive-enabled-flag/brief.md) tracks
  repointing it. *(Line drift: `0292`'s brief cites `:245`; the call is at `:300` today.)*
- **The server write** posts to the same API root: `src/server/Archive.ts:32` builds
  `` `${config.jwtIssuer()}/game/<id>` `` and POSTs, behind the `archiveEnabled()` early return at
  `src/server/Archive.ts:21`. A server-side reader, `readGameRecord()` at `src/server/Archive.ts:55-63`,
  GETs the same root and has **no caller** in `src/` or `tests/`.
- **The storage slots** exist but have no caller outside `src/core/configuration/`:
  `Config.ts:48-51`, `DefaultConfig.ts:213-224`, forwarded by `deploy.sh:383-386`. There is no region
  slot yet (`0030`'s brief, architect consult 2026-10-03).
- **The config-parity allowlist** carries the four `STORAGE_*` names twice
  (`scripts/config-parity-allowlist.json`): as **game-pipeline `optional`** entries (`:102-127`, blank
  allowed on a prod deploy because nothing reads them) and as **client-pipeline `server-only`** entries
  (`:186-211`, *"Must NOT be substituted by DefinePlugin"*; the key entries add *"A server secret:
  substituting it would publish it in the browser bundle"*).
- **The domain constraint:** Yandex Games allows one main domain for an iframe game, so everything
  routes through subdomains of it (owner, 2026-09-04; recorded in project memory). A browser-direct
  bucket read would add a further origin outside that pattern.

Related rulings from the same session, **cited as context — they are not separate decisions of this
ADR** (all recorded in `0030`'s brief, *"🗓️ OWNER RULINGS 2026-10-03"*):

- a **new dedicated archive bucket** with **its own key scoped to that bucket** — not the
  profile-backup bucket;
- **30-day retention enforced by our own code**, because the current S3 provider appears to have no
  lifecycle setting (unconfirmed for a new bucket);
- **prod only** — dev `STORAGE_*` stays blank.

## Decision

**Players read archived matches through the game server.** The game server fetches the record from the
archive bucket with its own credentials and returns it to the client.

- The archive bucket stays **private**. There is **no browser-direct access** to it.
- **No presigned URLs. No CORS** configuration on the bucket.
- The S3 access key and secret **never leave the server** — never in the browser bundle, never in a
  response, never in a URL handed to the client.

The exact route, its path, and how the reader's citizenship is established are `0030`'s design, not this
ADR's — see *Open points*.

## Options considered

- **(a) Proxy through the game server — chosen.** Keys stay server-only; no CORS setup on the bucket; it
  keeps every browser request inside the one-main-domain pattern Yandex Games requires for iframe games;
  the bucket stays fully private, so access control lives in our code, where the citizen check already
  lives (`src/server/GameServer.ts:950-973`, `creatorMayStartPrivateLobby`, gated at
  `src/server/Worker.ts:274-283`).
- **(b) Browser downloads straight from the bucket via short-lived presigned URLs — rejected.** Saves
  game-server bandwidth and CPU, but needs CORS configured on the bucket, sends the browser to an origin
  outside the one-main-domain pattern, and makes the bucket reachable from the browser (bounded by URL
  lifetime, but reachable). The server would still need an endpoint and a citizen check to mint the URL,
  so the server-side work is not avoided — only the byte transfer is.

## Consequences

- **Positive:**
  - The S3 key and secret stay on the server. The client-pipeline `server-only` entries in the parity
    allowlist stay true by construction.
  - No CORS to configure, verify or keep in step across environments.
  - One origin pattern for the browser; nothing new to clear against the Yandex Games domain rule.
  - The bucket can stay private with no public or presigned surface.
- **Negative / costs:**
  - **Game-server bandwidth and CPU for history reads.** Every archived-match read is downloaded by a
    game-server worker and re-sent to the browser. The workers also run the live turn relay; history
    reads now share their network and event loop. Not measured — record sizes and read volume are
    unknown today (`0030`'s *"size against real compressed record sizes"* still applies).
  - **The server needs a read endpoint plus a citizen check.** Today no HTTP route serves archived
    records: `GET /api/game/:id` (`src/server/Worker.ts:336-342`) serves **active**-game info only, and
    `readGameRecord()` has no caller. The existing citizen check is tied to a client already connected
    to a running game (`GameServer.ts:950-973`), so a history read — which has no live game — needs its
    own way to know who is asking.
  - **The client-side `STORAGE_*` entries in `scripts/config-parity-allowlist.json` (`:186-211`) must
    stay `server-only`.** This is distinct from the **game-pipeline `optional`** entries (`:102-127`),
    which `0030` must remove once its code reads the values — that is a separate deploy-order trap,
    recorded in `0030`'s brief, and it means the bucket and key must exist before `0030` deploys.
- **Residual risks / "re-raise only if":** reopen this decision only if **one** of these holds:
  - measured history-read traffic materially degrades the game workers' turn relay (a measurement, not a
    projection — the cost above is already accepted);
  - the Yandex Games domain rule changes so that a second origin for downloads is allowed **and** the
    server-side cost has become a real problem;
  - archived records stop being citizen-gated (no access check needed), which removes most of the
    reason the server has to be in the path.
  A review finding of *"the server is proxying bytes it could hand off with a presigned URL"* is this
  ADR's accepted tradeoff — **closeout, not a new defect.**

## Open points (for `0030`'s design — not decided here)

1. **How the history-read endpoint identifies the reader and checks citizenship.** There is no connected
   game client on a history read. Candidates bear on
   [ADR-103](adr-103-identity-trust-seam-client-asserted-yandex-id.md) (client-asserted identity) and
   [ADR-116](adr-116-first-verified-identity-yandex-signed-player-data-at-login.md) (signed player data
   at login). Which trust level a history read needs is an owner question.
2. **Route and path.** `GET /api/game/:id` is already taken by active-game info
   (`src/server/Worker.ts:336`). Whether archived reads get a separate route, and how the client's
   `checkArchivedGame()` call is repointed, is `0292` / `0030` work.
3. **Whose archived records a citizen may read** (own matches only, or any match ID). Product scope, not
   architecture.

## Related

- Task brief: [`0030-archive-s3-backed-citizen-gated`](../../tasks/backlog/0030-archive-s3-backed-citizen-gated/brief.md)
  — *"🗓️ OWNER RULINGS 2026-10-03"*, ruling 3.
- Task brief: [`0292-client-archive-read-bypasses-archive-enabled-flag`](../../tasks/backlog/0292-client-archive-read-bypasses-archive-enabled-flag/brief.md)
- [ADR-104](adr-104-match-archiving-disabled-until-s3-citizen-gated.md) — archiving disabled behind
  `archiveEnabled()` until this work ships.
- [ADR-103](adr-103-identity-trust-seam-client-asserted-yandex-id.md),
  [ADR-116](adr-116-first-verified-identity-yandex-signed-player-data-at-login.md) — identity trust
  levels a citizen-gated read must pick from.
- Code: `src/client/JoinPrivateLobbyModal.ts:296-300`, `src/client/jwt.ts:88-98`,
  `src/server/Archive.ts:21,32,55-63`, `src/server/Worker.ts:274-283,336-342`,
  `src/server/GameServer.ts:950-973`, `src/core/configuration/Config.ts:48-51`,
  `src/core/configuration/DefaultConfig.ts:213-224`, `deploy.sh:383-386`,
  `scripts/config-parity-allowlist.json:102-127,186-211`.
