# Private lobbies: show "lobby not found" when a player enters a wrong code (production shows a generic error today)

## ID
0454

> ℹ️ **ID allocation, checked 2026-10-14 before filing.** `0453` was the highest existing ID across `backlog/`, `done/` and
> `cancelled/` (folder names and `## ID` fields agree). No `0454` reference in `ai-agents/tasks/`, `ai-agents/sprints/`
> or `.claude/`, and no `tasks/*/0454*` path in any branch's history.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-13, given live via `AskUserQuestion` in the `fkit lead` session** (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037);
> ⛔ **not producer precedent.** The question: *"In production, a player who types a wrong lobby code sees a generic
> "something went wrong" message instead of "lobby not found" (already true before 0451; caused by a lookup to a
> switched-off games archive). 0451 only fixes what gets counted. How should we handle what the player sees?"* Verbatim
> selection: **"Separate small task (Recommended)"** — option text: *"File a new Sprint 8 task to show 'not found' for a
> wrong code. 0451 stays analytics-only."*
> The owner ruled **that this is a separate Sprint 8 task**. The rank, the dependency on `0451`, and the fix direction
> below are the producer's / coder's calls and overturnable in one edit.

## Priority
48

⚠️ **Priority 48 is append rank, NOT a merit ranking — flagged for owner confirmation.**
**On merit this belongs directly below `0451`**, because it edits the same lines of `JoinPrivateLobbyModal.ts` that
`0451` is changing right now, must agree with `0451`'s `PrivateLobby:JoinFailed:NotFound` event, and — like `0451` — is a
Sprint 8 build task that `0426`'s Timing rule waits on. ADR-035 forbids inserting a new row above closed rows, so it
appends after the highest (47, `0453`).

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**What the player sees today, in production:** they type a lobby code that does not exist (a typo, a stale link, a
finished game) and get the generic line `private_lobby.error` — *"An error occurred. Please try again or contact
support."* — instead of `private_lobby.not_found` — *"Lobby not found. Please check the ID and try again."* The player
is told something broke when in fact they typed the wrong code. **This pre-dates `0451`.**

**Why it happens** (found by `0451`'s reviewer, finding R1 in `0451`'s `review.md`, with one read-only GET to production
on 2026-10-13; the code side re-verified by the producer 2026-10-14 — ⛔ **do not re-hit production to re-check it**):

1. `JoinPrivateLobbyModal.joinLobby()` first calls `checkActiveLobby()`, which asks our own worker
   `/<worker>/api/game/<code>/exists`. That route always answers **200 JSON** (`src/server/Worker.ts:393-397`). For a
   wrong code it says `exists: false`, so the flow falls through.
2. It then calls `checkArchivedGame()`, which fetches `${getApiBase()}/game/<code>` — the old match-archive read.
3. **Archiving is switched off everywhere**: `archiveEnabled()` is a hard `false` (`src/core/configuration/DefaultConfig.ts:316`),
   and the server side no-ops on it (`src/server/Archive.ts:18-23`). Nothing serves `/game/<code>`.
4. In production `getApiBase()` resolves to the game's own origin (measured 2026-09-22 for `0292`, and again 2026-10-13
   by `0451`'s reviewer — classification only, no host value is recorded anywhere). So the GET lands on the Master's SPA
   catch-all `app.get("*")` (`src/server/Master.ts:739`), which answers **200 `text/html`** (the game's `index.html`).
5. `checkArchivedGame()` only treats `404` as not-found; a `200` passes, and `archiveResponse.json()`
   (`src/client/JoinPrivateLobbyModal.ts:~458`) **throws** on the HTML. `joinLobby()`'s `catch` shows
   `private_lobby.error`.

**Locally it is the same symptom by a different path:** `0451`'s worklog records the archive lookup going to a local
port with nothing listening (connection refused) → the same `catch` → the same generic line. So a wrong code shows the
generic error in local dev too.

### ⚠️ Overlap with backlog task `0292` — flagged, not acted on

[`0292-client-archive-read-bypasses-archive-enabled-flag`](../../cancelled/0292-client-archive-read-bypasses-archive-enabled-flag/brief.md)
(Backlog board, `🔲 Backlog`, unranked) already scopes **gating this exact archive read on `archiveEnabled()`**.
Two things follow:

- **`0292`'s premise is wrong for production.** It says the read is *"benign — the 404 is handled as `not_found`, the
  user sees the ordinary not-found message"*. Production never answers 404 (point 4 above), so the user sees the
  generic error. `0292`'s severity framing ("no user impact, not a user-facing bug") does not hold. The same claim is in
  the wiki page `wiki/tasks/archive-endpoint-failures.md`. **Neither is edited by this filing** — the wiki is
  `fkit-wiki`'s exclusively (ADR-005), and `0292`'s brief is outside this filing's write surface.
- **If this task's fix gates the archive read on `archiveEnabled()` (the recommended direction below), it does all of
  `0292`'s work.** Whether `0292` is then cancelled as absorbed (via `/fkit-task-cancelled`) or kept is the **owner's**
  call — ~~open question in `## Notes`~~ ✅ **answered 2026-10-14: cancel `0292` when `0454` closes, if this task gated
  the read** (OWNER RULING; see the *At close* bullet in `## Notes`). Since 2026-10-14 `0292`'s brief carries a dated
  note correcting its *"benign"* premise.

## What to build

**One player-visible change: a wrong private-lobby code shows `private_lobby.not_found`, in production and locally, and
nothing else about the join flow changes.**

- **Use the existing text.** `private_lobby.not_found` already exists in both `resources/lang/en.json` and
  `resources/lang/ru.json`, through `translateText`. ⛔ **No new translation key and no new message** (no "archiving is
  disabled" line) — the player should simply see the ordinary not-found message.
- **Fix direction — the coder's plan decides, but this is the producer's recommendation:** when `archiveEnabled()` is
  false, **skip the archive lookup entirely** and go straight to the not-found result. Reasons: it removes a request that
  can only ever fail today; it matches ADR-104's design of **one** switch for archiving; it fixes local dev as well as
  production; and it leaves the archive path intact for `0030` to switch back on. ⛔ **Reuse `archiveEnabled()` — never
  add a second flag.** ⛔ **Leave its value a hard `false`** (flipping it is `0030`'s job). The modal already calls
  `getServerConfigFromClient()` in `checkActiveLobby()`, and `LocalServer.ts:271` already reads the flag client-side;
  confirm the right handle in the plan rather than assuming.
- **Also decide, in the plan, what an archive answer that is not a real archive answer means** — a `200` that is not
  JSON (the production symptom), or a body that fails to parse. Today it throws into the generic error. Whether that
  should read as not-found or stay an error matters only once archiving is on (`0030`), but the plan must say which, so
  the behaviour is chosen rather than accidental.
- **Real failures stay errors.** If our own worker's `/exists` lookup fails (network down, a non-OK answer, a body that
  is not JSON), the player must still see `private_lobby.error` — a broken server must not be shown as "you typed it
  wrong". (`0451`'s review R2 notes `checkActiveLobby()` does not check `response.ok` today; reuse whatever `0451` lands
  for that rather than redoing it.)
- **Analytics must agree with the screen.** Whenever the player sees `private_lobby.not_found` for a lookup that said
  the lobby does not exist, `PrivateLobby:JoinFailed:NotFound` fires once; whenever they see `private_lobby.error`,
  `PrivateLobby:JoinFailed:Error` fires once — matching however `0451` resolves its R1 (it may classify `NotFound` on
  the worker's `exists: false` before the archive step). ⛔ Do not add or rename events here; this task only makes the
  screen match the event `0451` defines. Update `ai-agents/knowledge-base/analytics-event-reference.md` only if the
  firing point actually moves.
- **The early bad-format path is already right** — a code that fails `PrivateLobbyCodeSchema` already shows
  `not_found` (`JoinPrivateLobbyModal.ts:~331`). Leave it.
- **Leave alone:** a live code still joins through `checkActiveLobby()` exactly as today; the replay/version-mismatch
  branches stay reachable when `archiveEnabled()` is true; the close-while-in-flight guards (`isClosedSince`, task
  `0327`) and the joining mark (tasks `0336`/`0374`) behave as today.
- **Tests:** the archive mocks must stop pretending production answers 404. `0451`'s review notes
  `tests/client/JoinPrivateLobbyAnalytics.test.ts` mocks the archive with `status: 404`, a reply production never
  gives. Cover at least: wrong code with archiving off (no archive request made, if the gate is chosen); a `200
  text/html` archive answer; a live code; a failing `/exists`.

## Verification steps

1. **Unit tests, realistic mocks.** With `archiveEnabled()` false, a code whose `/exists` answers `exists: false` ends
   with the message `private_lobby.not_found`, `PrivateLobby:JoinFailed:NotFound` fired exactly once, `JoinFailed:Error`
   not fired — and (if the gate is chosen) **no** fetch to `${getApiBase()}/game/<code>`.
2. **The production shape is tested directly:** a mocked archive answer of `200` with an HTML body does **not** produce
   `private_lobby.error` through an uncaught `.json()` throw; the outcome is the one the plan chose, asserted explicitly.
3. **Real failures stay errors:** `/exists` rejecting, answering non-OK, or answering non-JSON shows `private_lobby.error`
   and fires `JoinFailed:Error` once, never `NotFound`.
4. **A live code still joins:** `join-lobby` dispatched, `PrivateLobby:Joined:{Link|Code}` fired once, as before.
5. **Local check in the browser** (`npm run dev`): type a made-up valid-format code → the not-found line shows, in
   English and in Russian (switch language); the Network tab shows no archive request (if the gate is chosen). Type a
   live lobby's code from a second tab → it joins.
6. **No new text:** `git diff resources/lang/` is empty. **No second flag:** `grep -rn "archiveEnabled" src/` still shows
   one definition (`DefaultConfig.ts`) and one interface line (`Config.ts`), and `archiveEnabled()` still returns
   `false`.
7. `npm test` passes, **run through the npm script, one full run at a time** (project lock, task `0427`; ~5 min at 1
   worker). Judge a lone `Exceeded timeout of 5000 ms` by the `supertest` flake rule in `CLAUDE.md`.
8. No endpoint, hostname, lobby code, or credential value appears in the brief, worklog, tests' comments, or the diff.
9. **Production proof is NOT part of this task** (build/verify split rule, owner ruling 2026-09-29): it needs a deploy
   and an owner check (a wrong code on the live game shows the not-found line). File a verify task at close; its sprint
   is the owner's call then.

## Notes

- **Depends on:** 0451
- **Why after `0451`, not with it:** `0451` is in progress and is editing the same `joinLobby()` /
  `checkArchivedGame()` lines right now (its working-tree changes add the `JoinFailed` calls there), and its review R1
  is about to decide where `NotFound` fires. Building this in parallel means two coders on the same lines and a guess
  about the event this task's screen must agree with. Building it after means a one-place change on settled code, and
  `0451` stays analytics-only as the owner ruled.
- **Blocks:** 0426 — by `0426`'s Timing rule (it waits on every Sprint 8 build task that rides the final Sprint 8
  deploy). This one is **player-visible**, so the news entry may mention it ("a wrong lobby code now says the lobby was
  not found").
- **Related, not blockers:**
  - [`0292`](../../cancelled/0292-client-archive-read-bypasses-archive-enabled-flag/brief.md) — overlap described in `## Context`;
    the recommended fix does its whole job.
  - [`0030`](../../backlog/0030-archive-s3-backed-citizen-gated/brief.md) — switches archiving back on someday; whatever this task
    decides for a non-JSON archive answer is what `0030` inherits. Whoever does `0030` should read this brief.
  - ADR-104 (archiving disabled until S3 + citizen gating) — this task completes its client-read leg if the gate is
    chosen.
- **Effort:** small — one client file plus its tests.
- ~~🚩 **Open question for the owner:** if this task gates the archive read (recommended), `0292` is fully absorbed —
  cancel `0292` as absorbed by `0454` when `0454` closes, or keep it?~~ ✅ **Answered 2026-10-14** — see the next bullet.
- 📌 **At close: cancel `0292` as absorbed by `0454`** — ⚠️ **CONDITIONAL, read the condition first.**
  - **Authority.** OWNER RULING, 2026-10-14, given live via `AskUserQuestion` in the `fkit lead` session (driver of
    `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037);
    ⛔ **not producer precedent.** Question: *"Backlog task 0292 (from September) plans to switch off the same useless
    archive lookup that 0454 will switch off. If 0454 does it, 0292 has nothing left to do. What should happen to
    0292?"* Verbatim selection: **"Cancel when 0454 closes (Recommended)"** — option text: *"When 0454 closes, a
    producer cancels 0292 as 'absorbed by 0454', with that reason recorded."*
  - **Condition.** The cancel applies **only if `0454`'s shipped change actually puts the client archive read
    (`checkArchivedGame()` / its call site) behind the existing `archiveEnabled()` flag** — no archive request while the
    flag is false, no second flag. **If `0454`'s approved plan, or what it ships, does not do that** (for example it only
    re-reads a `200 text/html` answer as not-found and still sends the request), **`0292` is NOT absorbed: do not cancel
    it — put the question back to the owner.**
  - **Who and how.** Whoever closes `0454` (a producer — the movers are producer-only) checks the condition against the
    diff / worklog, then runs `/fkit-task-cancelled` on `0292` with a reason naming `0454` and this ruling, e.g. *"absorbed
    by 0454 — 0454 put the client archive read behind archiveEnabled(); owner ruling 2026-10-14 'Cancel when 0454
    closes'"*, plus `(agent-closed — not owner-verified)` if the owner is not present. Do it in the same act as the
    `0454` close, not later. `0292` is on the Backlog board ([`backlog.md`](../../../sprints/backlog.md)); the mover
    updates that row.
- 📌 **Flagged for `fkit-wiki`, not acted on:** `wiki/tasks/archive-endpoint-failures.md` (and possibly
  `wiki/decisions/adr-104-archiving-disabled.md`) say the client archive read is benign because the 404 maps to
  not-found. Production returns 200 HTML, so that is wrong. ⛔ Never edit `ai-agents/wiki-vault/` from this task.
