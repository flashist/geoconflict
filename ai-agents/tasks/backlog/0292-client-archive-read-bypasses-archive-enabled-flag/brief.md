# The client-side archive read bypasses `archiveEnabled()` — `0159`/ADR-104 darkened the server leg only

## ID
0292

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**FILED 2026-09-22** by a spawned `fkit-producer` with **no owner channel of its own** (ADR-021), on an
**OWNER RULING given live in the `fkit lead` session** and relayed by `fkit-lead`. Asked what to do
with a finding a spawned `fkit-architect` turned up while resolving an unrelated contradiction between
`0009` and `0030`, the owner chose **"File it separately"**.
⚠️ **The owner ruled ONLY *that this be filed separately*.** The **board**, the **rank**, and the
**severity framing** are the producer's call and are overturnable in one edit. ⛔ **Not producer
precedent.**

**The finding, in one line: `0159`/ADR-104 switched off the *server* archive write, and left a *client*
archive read running that the same flag does not cover.**

- [`0159-reduce-archive-telemetry-noise`](../../done/0159-reduce-archive-telemetry-noise/brief.md)
  (`✅ Done`) and [`adr-104-match-archiving-disabled-until-s3-citizen-gated`](../../../knowledge-base/decisions/adr-104-match-archiving-disabled-until-s3-citizen-gated.md)
  record archiving as switched off behind **one** flag, `archiveEnabled()`.
- That flag is a hard `false` (`src/core/configuration/DefaultConfig.ts:315`) with **no override
  anywhere** — not in `ProdConfig` / `PreprodConfig` / `DevConfig`, and not from the environment.
- **It has exactly two consumers**, both of which early-return while it is false:
  `src/server/Archive.ts:21` (the write) and `src/client/LocalServer.ts:271`.
- **`src/client/JoinPrivateLobbyModal.ts:245` is not one of them.** It does
  `fetch(`` `${getApiBase()}/game/${lobbyId}` ``, …)` — the **read** side of the very endpoint
  `Archive.ts:32` stopped POSTing to — and **nothing gates it**.

**Reached from `:190`**, inside the private-lobby join flow: the user types a lobby ID, `:186`
`checkActiveLobby()` asks the local worker (`/${workerPath}/api/game/<id>/exists`, same-origin,
**not** affected), and **only when that returns false** does `:190` fall through to
`checkArchivedGame()` and fire the outbound read.

⚠️ **PRODUCER'S CORRECTION TO THE HANDOVER, stated so it is not repeated:** the finding reached this
brief worded as *"it fires on every private-lobby-ID entry today."* **That is over-stated.** Verified
at `src/client/JoinPrivateLobbyModal.ts:186-190`: an ID that **is** an active lobby returns at `:187`
and never reaches the read. It fires on every private-lobby-ID entry **that is not currently an active
lobby** — a typo'd ID, a stale link, a finished game. Lower volume than stated; the defect is
unchanged.

**Impact today: benign, and this brief does not pretend otherwise.** The endpoint is not served, the
response is a 404, and `:262` handles 404 as `"not_found"` → the user sees the ordinary
`private_lobby.not_found` message. **No user-visible breakage, no error group, no data leaves on the
request** beyond the lobby ID in the path. ⛔ **Do not write this up as an incident or a user-facing
bug.** What makes it worth a task is two things that are not about today:

1. **It is live outbound traffic that ADR-104 intended to stop.** The ADR's own framing is one flag,
   archiving off. A reader of the ADR, or of `0009`, will conclude the archive path is dark. It is not:
   the read half is live. That gap is the kind that quietly invalidates a later finding.
   ⚠️ **Read this reason as ACCURACY, not exposure** — measured on the live production deployment
   2026-09-22, the request reaches **our own infrastructure**, so nothing leaves our estate. See
   *"✅ ANSWERED 2026-09-22"* below.
2. **`0030` must eventually repoint this exact call.**
   [`0030-archive-s3-backed-citizen-gated`](../0030-archive-s3-backed-citizen-gated/brief.md)'s
   verification item 2 is *"replays / history read back correctly from the bucket"* — and **this line
   is the only client read there is**. `0030` cannot satisfy that item without changing it.

### ✅ ANSWERED 2026-09-22 ON THE LIVE PRODUCTION DEPLOYMENT — IT POINTS AT OUR OWN INFRASTRUCTURE

**Supersedes the 🚩 open question this section used to carry**, which asked whether `getApiBase()`
resolves to the upstream OpenFront service (⇒ live third-party traffic, with a 152-ФЗ question) or to
our own box (⇒ a harmless 404), and said the severity was not decidable until it was read. **It has
been read. It is our own infrastructure.**

**Measured 2026-09-22 by `fkit-lead`** — a read-only `GET /api/env` against the **live production
deployment**, the route at `src/server/Master.ts:178` that serves the client its runtime config:

| Runtime field | Classification |
|---|---|
| `apiBaseUrl` | **OWN INFRA — a geoconflict domain** |
| `jwtIssuer` | **OWN INFRA — a geoconflict domain** |
| `gameEnv` | `prod` |
| `publicProtocol` | `https` |

🔒 **CLASSIFICATION ONLY, DELIBERATELY — and this is a standing rule, not a one-off.** No endpoint,
hostname, domain or URL from that response was printed, logged, retained, or written here; host
strings were classified by substring in-process and discarded. ⛔ **Do not add one.** This file is
git-tracked — see [[decisions/vps-credential-leak-response]].

**What it settles:**
- ✅ **Severity stays BENIGN, and NO 152-ФЗ question arises.** The 404s reach our own infrastructure,
  not a third party.
- ✅ **THE BACKLOG BOARD IS CONFIRMED CORRECT.** This brief's `## Notes` carried an explicit escape
  condition — *"if the open question resolves to 'it points upstream', re-raise the board with the
  owner"*. **That condition was checked and DID NOT FIRE.** ⛔ **Do not re-open the board question on
  this ground** — it has been tested, not merely left unexamined.
- ✅ **Reason (2) in `## Context` is now the only substantive reason this task exists** — `0030` must
  repoint this call to satisfy its verification item 2. Reason (1) still stands, but as **accuracy**
  (ADR-104 reads as though the whole archive path is dark, and it is not), no longer as traffic
  leaving our estate.

⚠️ **CEILING — read it; do not overstate this.** It is **one reading, at one moment, of two fields.**
It is **not** continuous proof, and a deployed box's configuration can change. And it says **nothing**
about the other concerns in `0009` finding 1: **identity, entitlements and matchmaking are untouched
by it and remain open.** ⛔ **`0009` finding 1 is NOT discharged** — this is a *partial* data point
against it, and it is recorded there as explicitly partial.

📌 **One caveat it does raise the ceiling on:** the architect's §2b classified `.env.prod` from the
**working tree**, noting that a deployed box could differ and that `JWT_ISSUER` is read at runtime.
**That specific caveat is now discharged for `apiBaseUrl` and `jwtIssuer`** — this reading came from
the live deployment, not the tree.

*(Retained, because it is why the measurement is the right one: `getApiBase()`
(`src/client/jwt.ts:88`) prefers `runtime.apiBaseUrl`, then `runtime.jwtIssuer` (`:93-95`) — both fed
from the deployed runtime config (`src/core/configuration/RuntimeConfig.ts`, `ConfigLoader.ts:49,51`),
which is exactly what `/api/env` serves. So the two measured fields are the ones resolution actually
uses, and the host-derived fallback at `:100-123` is not reached in production.)*

## What to build

**One behavioural change: make the client archive read obey the same switch as the server archive
write.**

- Gate `checkArchivedGame()` — or its call site at `src/client/JoinPrivateLobbyModal.ts:190` — on the
  **existing** `archiveEnabled()` config accessor. ⛔ **Do not introduce a second flag.** ADR-104's
  whole design is *one* switch; a parallel client-only flag recreates this defect one layer over.
- **Preserve today's user-visible behaviour exactly.** With archiving off, a non-active lobby ID must
  still land on `private_lobby.not_found` — the same message the 404 produces now. The user should not
  be able to tell the difference; **only the network request disappears.**
  ⛔ Do not add a new "archiving is disabled" message or translation key.
- **Leave `checkActiveLobby()` alone.** It is same-origin (`:211`), unaffected by the flag, and is the
  path that actually joins live private lobbies. Breaking it breaks private lobbies outright.
- **Leave `archiveEnabled()`'s value alone** — it stays a hard `false`. Flipping it is `0030`'s job,
  and `DefaultConfig.ts:315`'s comment already names `0030` as the task that does it.
- **Record the destination answer** if you obtain it while working (see the open question above) — in
  the worklog, **variable names and a description only, never an endpoint value**; this file is
  git-tracked.

⚠️ **Reaching the flag from the client is the one thing to check before planning.** `LocalServer.ts:271`
already reads it as `this.lobbyConfig.serverConfig.archiveEnabled()`, so a client-side read is
demonstrably possible — but `JoinPrivateLobbyModal` is a modal with no `lobbyConfig`, and it already
calls `getServerConfigFromClient()` at `:210`. **Confirm which handle is correct there rather than
assuming**; if the flag genuinely cannot be reached without threading new plumbing through the modal,
**stop and report it** — that is a bigger change than this brief scopes and the owner should see it
before it is built.

## Verification steps

1. With `archiveEnabled()` false (its current and unchanged value), entering a lobby ID that is **not**
   an active lobby produces **no outbound request** to `${getApiBase()}/game/<id>` — confirmed in the
   browser Network tab, not inferred from the code.
2. That same entry still shows the `private_lobby.not_found` message, **identical** to today's
   behaviour. No new message, no new translation key, no console error.
3. Entering the ID of a **live** private lobby still joins it normally — `checkActiveLobby()`'s
   same-origin path is untouched.
4. `grep -rn "archiveEnabled" src/` lists `JoinPrivateLobbyModal.ts` alongside the existing
   `Archive.ts:21` and `LocalServer.ts:271` consumers, and **still shows exactly one definition**
   (`DefaultConfig.ts:315`) and one interface line (`Config.ts:68`) — proving no second flag was added.
5. `archiveEnabled()` still returns a hard `false`; `git diff` shows `DefaultConfig.ts:315` unchanged.
6. `npm test` passes. ⚠️ Budget ~22–25 s, not ~3 s — the shell harnesses are in the gate (see
   `CLAUDE.md`). A red run touching `nginx.conf` / `setup*.sh` assertions is unrelated to this change.
7. No endpoint, bucket name, key or credential value appears in the brief, the worklog, or the diff.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Related / touches (NOT blockers, in either direction):**
  - [`0030-archive-s3-backed-citizen-gated`](../0030-archive-s3-backed-citizen-gated/brief.md) — will
    eventually repoint this same call at the S3 bucket to satisfy its verification item 2. **Order is
    free:** doing this first leaves `0030` a single clean gate to flip; doing `0030` first makes this a
    no-op it absorbs. ⚠️ Whoever does `0030` **must read this brief** — the client read is easy to miss
    because ADR-104 reads as though the whole path is already dark.
  - [`0009-self-host-upstream-openfront-api-dependency`](../0009-self-host-upstream-openfront-api-dependency/brief.md)
    — shares the destination question above with its finding 1, and its concern 3 (archive) carries a
    pointer to this task. **Neither gates the other.**
  - [`0159-reduce-archive-telemetry-noise`](../../done/0159-reduce-archive-telemetry-noise/brief.md)
    (`✅ Done`) and ADR-104 — the work this completes. ⛔ **Do not reopen `0159`**; it is closed and did
    what it was scoped to do. This is the leg its scope did not reach.
- **Effort:** small — one guard in one client file, if the flag is reachable there (see the ⚠️ in
  `## What to build`).
- **Board rationale, producer's call and not owner-ruled — ✅ NOW CONFIRMED BY MEASUREMENT:** filed on
  the unranked **Backlog** board because there is **no observed failure and no user impact**, and the
  owner's stated focus is core citizenship / profile work.
  ~~*"If the open question above resolves to 'it points upstream', that is new information — re-raise
  the board with the owner, because live third-party traffic carries a 152-ФЗ question that an
  unranked backlog row does not serve."*~~ **Struck, not deleted: that escape condition was CHECKED
  ON THE LIVE PRODUCTION DEPLOYMENT on 2026-09-22 AND DID NOT FIRE** — `apiBaseUrl` and `jwtIssuer`
  both classify as **own infrastructure**, so there is no third-party traffic and no 152-ФЗ question.
  See *"✅ ANSWERED 2026-09-22"* above. ⛔ **Do not re-open the board question on that ground.**
  ⚠️ **The other tradeoff is UNCHANGED and still accepted knowingly:** this board has a demonstrated
  hold-forever failure mode, so a benign task can sit here indefinitely. That is a reason the owner
  may still move it — the *severity* argument for moving it is what died, not every argument.
- 📌 **Flagged, not acted on:** `wiki/decisions/adr-104-archiving-disabled.md`,
  `wiki/decisions/archive-archival-strategy.md` and `wiki/systems/match-logging` may describe archiving
  as fully disabled, which this finding shows is incomplete. Those are `fkit-wiki`'s exclusively
  (ADR-005), for a later sync. ⛔ Never edit `ai-agents/wiki-vault/` from this task.
