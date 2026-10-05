# Worklog — 0389: make the private-lobby code easier to read and type

## 2026-10-05 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` / `fkit-lead`)

Built on the approved `plan.md` (blob `fb6d4ed7`, read unaltered) with the owner rulings in its last section.
**The host-window retry was not built** (owner: "Drop the retry"); a `409` takes the existing create-failed path.
Built on top of the uncommitted `0354`/`0380`/`0377`/`0353`/`0374` changes; none of them reverted. Nothing committed.

### What changed

| File | Change |
|---|---|
| `src/core/PrivateLobbyCode.ts` (new) | Alphabet `23456789ABCDEFGHJKMNPQRSTVWXYZ`, length 8; `generatePrivateLobbyCode()` (`customAlphabet`, like `generateID`); `cleanLobbyCode()` (drop whitespace and `-`, upper-case); `formatLobbyCodeForDisplay()` (groups of 4: `K7M4 PCRX`). Imports only `nanoid`. |
| `src/core/Schemas.ts` | Adds `PrivateLobbyCodeSchema` only (regex built from the alphabet, length 8). `ID` and every existing field unchanged. |
| `src/server/GameManager.ts` | New `createGameIfAbsent()` → `GameServer \| null`; synchronous. |
| `src/server/Worker.ts` (`create_game`) | After the admin-token check: id must pass `ID` for a public create, `PrivateLobbyCodeSchema` otherwise → `400 {"error":"Invalid game ID"}`. Create goes through `createGameIfAbsent()` with no `await` between check and create → `409 {"error":"game_id_taken"}` on a duplicate. `pollLobby`'s public creation untouched. |
| `src/client/HostLobbyModal.ts` | Creates with `generatePrivateLobbyCode()`; shows the code grouped; copy path unchanged (copies `lobbyId`, ungrouped). Mask still `••••••••`. No retry. |
| `src/client/JoinPrivateLobbyModal.ts` | `joinLobby()`: code = `cleanLobbyCode(extractLobbyIdFromUrl(input.trim()))`; fails `PrivateLobbyCodeSchema` → `private_lobby.not_found`, no request; passes → written back into the box (poll and leave use it), worker path from the clean code. Typing untouched (no filter). |
| `src/client/PrivateLobbyInvite.ts` | `lobbyIdFromJoinHash`: clean, then `PrivateLobbyCodeSchema`; null otherwise. Yandex still null. |

No text added or changed → `en.json`/`ru.json` untouched. `generateID`, `simpleHash`, `workerIndex`, `ID` unchanged
(`git diff src/core/Util.ts src/core/configuration` is empty).

### Tests

- New `tests/core/PrivateLobbyCode.test.ts` (29): generator over 5000 draws (length, alphabet, never `0 O 1 I L U`,
  passes both schemas); clean-up; Cyrillic look-alike is not mapped and fails; grouping; routing with the real prod and
  dev configs (`workerIndex(cleanLobbyCode("k7m4 pcrx")) === workerIndex("K7M4PCRX")`, plus 200 random grouped
  lowercase codes); schema accepts/rejects (mixed-case, lowercase, 7/9 chars, each excluded char, space, empty); no
  `generateID()` id with a lower-case letter is ever accepted.
- `tests/ClientJoinMessageSchema.test.ts`: `ID` unchanged; a join message carries a new code as `gameID`.
- New `tests/server/GameManagerCreate.test.ts` (3): duplicate refused, first lobby is the same instance.
- `tests/client/PrivateLobbyInvite.test.ts`: `#join=` new / lowercase / grouped / dashed → clean code; mixed-case ids →
  null; Yandex → null. **Changed:** 0380's "valid `#join=`" cases used `AbC12345`, which is now refused by ruling
  (new format only) — switched to `K7M4PCRX`.
- `tests/client/JoinPrivateLobbyModalLeave.test.ts`: **changed** the shared `LOBBY_ID` from `LOBBY123` (contains
  `O`, `1`, `L`, so now refused) to `K7M4PCRX`; new block (8) with the real prod worker hash: typed `" k7m4 pcrx "` →
  `/w<N>/api/game/K7M4PCRX/exists`, join, poll and leave all carry the code; `k7m4-PCRX`; pasted `#join=` and `join/`
  links; mixed-case id, garbage, Cyrillic, 7 chars → `not_found`, no request.
- `tests/client/HostLobbyOpen.test.ts`: new block (6): create URL carries a new-format code; display grouped; copied link
  (standalone) and bare copy (Yandex) ungrouped; hidden mask still 8 dots; a `409` is one create, no join, window open.

### Verification

- `npx tsc --noEmit` → exit 0. `npm run lint` → exit 0. Prettier clean on every touched file.
- `npm test`:
  - Run 1: `HostLobbyModalUrl.test.ts` **failed to run — my bug**: the grouping call threw on an `undefined` `lobbyId`
    (that suite's mocked create answers `{}`), crashing the jest worker. Fixed with `this.lobbyId ?? ""` at the display
    call. Not a flake.
  - Runs 2–4: each failed one or three **different untouched supertest suites** — `MasterFeedbackRoutes` (Telegram
    call missing), `LoginVerificationRoutes` (unexpected `404`), `LoginRoutes`/`AlertRoutes`/`InternalPathCase`
    (`Exceeded timeout of 5000 ms`). Checked for `0197`: no `SIGSEGV` in any log, newest `node-*.ips` is 2026-10-01
    (none from today). Matches the known supertest flake family (timeout shape confirmed; `404` and the missing call
    are untraced shapes). **Re-ran** each flaked suite alone — all passed (MasterFeedbackRoutes 5/5 runs). Machine load
    average was 7–9 during these runs.
  - Run 5: **194/194 suites, 3580/3580 tests passed**, exit 0.
- **Local server checks** (`npm run start:server-dev`, ports 3000–3002 were free; stopped afterwards, ports confirmed
  free):
  - private `create_game/K7M4PCRX` on its worker → `200`; on the other worker → `400 Worker, game id mismatch`.
  - private `create_game/AbCd2345` (mixed-case 8 chars) → `400 Invalid game ID` on both workers; `k7m4pcrx` → `400`.
  - a websocket client joined `K7M4PCRX`; a second `create_game/K7M4PCRX` → `409 {"error":"game_id_taken"}`; the lobby
    still listed that player afterwards.
  - a **public** match (master-scheduled, mixed-case id e.g. `vXg8Pbm6`, through `create_game` with the admin token)
    was created, joined by a websocket client, and started (`prestart`, `start`, turns flowing).
- **Not run: the browser checks** (host shows `XXXX XXXX`; a friend types it in lowercase with a space and joins).
  `npm run dev` could not start the client: port `9000` is held by **another project's** webpack dev server
  (`pixel-dungeon`, running for 13 days), which I did not stop. Covered only by the jsdom tests above (real
  `HostLobbyModal`/`JoinPrivateLobbyModal`/`o-modal`, mocked network).

### Notes

- **Correction to a figure in the plan (behaviour unchanged).** The plan says about 1 in 195 `generateID()` ids passes
  the format "once upper-cased". The 1-in-195 figure, `(30/58)^8`, is for the id **with its case kept** — that is the
  server's private `create_game`, which does not upper-case. **After upper-casing** (the Join window and `#join=`)
  about **42%** of `generateID()` ids pass the format, `(52/58)^8`. Harmless for the plan's own reason: the upper-cased
  id is a different game id, so it can only find a private lobby that happens to have that code, or "not found".
- **Consequence the plan already accepts, spelled out:** the Join window no longer opens an *archived* replay by a
  `generateID()` id (public/single-player game ids are mixed-case). `AccountModal.viewGame` also routes replays through
  `#join=`, but `<account-modal>` is placed in neither HTML template, so it is unreachable today.
- Task `0382` (built second) must use `PrivateLobbyCodeSchema` and `cleanLobbyCode` for its payload — not checked
  against its brief here.

### Decision log

- **Obvious winner — guard the display against a missing `gameID` (`this.lobbyId ?? ""`).** Answers my own run-1 test
  crash, not a review finding. Before 0389 an `undefined` id rendered as nothing; the new grouping call threw. One
  expression in `HostLobbyModal.render()`; within the plan's display step; restores the old tolerance.
- **Obvious winner — test `C6` (a `409` is one create, no join).** The ruling dropped the retry *tests*; this one
  instead pins the ruling (no second try). Test-only, within intent.
- **Obvious winner — `trim()` before `extractLobbyIdFromUrl` in `joinLobby()`.** The Join box's keyup already trims;
  the clipboard-paste path did not, and a leading space would stop a pasted link being recognised. One call, inside
  step 5's clean-up.
- **Mechanical test updates forced by the ruling** (new format only): `LOBBY_ID` in the Join harness and 0380's
  `#join=` example id changed to a new-format code. No assertion weakened.
- **Display grouping written as "a space after every 4 characters"** rather than a length-8 branch, so an empty code
  (before create answers) shows nothing. Same output for every real code.
- No review fix applied (no review yet): `none`.

## Browser check — 2026-10-05

Verify-only worker (`fkit-coder`), spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`). This is the browser check
the build owed (port 9000 was busy then). No source written. Node `v24.13.0`.

**Setup.** Ports 3000–3002 and 9000 checked free first. I ran `npm run dev`'s two commands under `GAME_ENV=dev`
(`webpack serve --node-env development` + `npm run start:server-dev`) **without webpack's `--open`**, so no browser window
opened on the desktop. Headless Chromium (Playwright), one fresh browser context per player, `tutorialCompleted` preset,
served page at `localhost:9000/` (standalone build: copy gives a website link). Scripts are in my scratchpad only.

⚠️ **How the host window was opened:** as in `0353`, Create is a locked citizen perk for a local non-citizen (`0302`),
so the script called `document.querySelector("host-lobby-modal").open()`, the `open()` the Create tap ends in. The
Create-tap path (`PrivateLobbyAccess`, `openHostLobbyFromStartScreen`) was not driven. The Join side used the real
`#join-private-lobby-button` click (visible locally), the real input box and the real Join button.

**Run 1, host side**
- One `POST /w1/api/create_game/ZPMVP2H2?…`. The code `ZPMVP2H2` is 8 characters, all from `23456789ABCDEFGHJKMNPQRSTVWXYZ`.
- Shown as **`ZPMV P2H2`**: two groups of 4, matching the code once the space is removed.
- Real click on the shown code → clipboard = **`http://localhost:9000/#join=ZPMVP2H2`**, ungrouped. Copy tick shown (1).
- Run 2's host got `HS42JCR9`, shown `HS42 JCR9`, with the same checks passing.

**Run 1, join side**
- **Friend 1 typed `zpmv p2h2`** (key by key, lowercase, with a space) → box rewritten to `ZPMVP2H2`, request
  `GET /w1/api/game/ZPMVP2H2/exists`, then "Joined successfully! Waiting for game to start...". Polls go to
  `/w1/api/game/ZPMVP2H2` (the same worker as the create). **Host player list 1 → 2** (`Anon6896`, `Anon1233`). The
  friend's own list shows the same 2.
- **Friend 2 pasted `http://localhost:9000/#join=ZPMVP2H2`** into the box → box `ZPMVP2H2`, the same `/w1/…/exists`,
  joined. **Host list 2 → 3.**
- `pageerror` count: 0 on every page.

**Garbage → "Lobby not found…" with no game request** (run 2, typed into the box). Inputs: `hello world!`, `ab0def1l`,
`AbCdEf0O`, `ЛОББИ123`, `ZPMVP2H2X` (9 chars), `K7M4PCR` (7 chars), and the link `http://localhost:9000/#join=nonsense!`.
**7/7 gave `not_found`, and 0 requests went to `/api/game/`, `/game/` or `commit.txt`.** The only traffic was the start
screen's own `/api/public_lobbies` poll.

**Notes (not failures of the asked checks)**
- `AbCd2345` is **not** garbage under this build: upper-cased it becomes `ABCD2345`, a valid code, so a lookup was sent
  (`/w0/api/game/ABCD2345/exists`). This matches the build's note that about 42% of `generateID()` ids pass once
  upper-cased. The message was "An error occurred…" rather than "not found", because locally the archived-game lookup
  `GET /game/<id>` is answered by webpack's HTML page (200 `text/html`) and the JSON parse fails. `0389` does not touch
  `checkArchivedGame`, so this is a local-dev behaviour of any unknown well-formed code.
- ⚠️ **Address-bar `#join=` with a space is ignored.** `#join=abcd2345`, `#join=ABCD-2345` and `#join=ABCD2345` open the
  join window with `ABCD2345` and send the lookup. **`#join=abcd%202345` and `#join=ABCD%202345` do nothing** (no window,
  no request). Cause: the upstream `getToken()` in `src/client/jwt.ts:126-145` (not changed by `0389`) rebuilds the hash
  through `URLSearchParams` at startup, so the space becomes `+` (`location.hash` read back as `#join=abcd+2345`).
  `cleanLobbyCode` strips only spaces and dashes, so `+` fails the format and the hash is dropped. The plan expected "a
  grouped `#join=` → the clean code", and the unit test passes a literal space straight to `lobbyIdFromJoinHash`, so it
  does not see this. Real impact looks small: copied invites are ungrouped, and Yandex ignores `#join=` entirely (`0380`).
  Only a person hand-typing the link with a space hits it. Not fixed (verify-only).

**Teardown.** All processes I started (webpack, game server and its 2 workers, wrappers) were stopped. Ports 3000, 3001,
3002 and 9000 had 0 listeners afterwards, and no dev process remained.

## Process review — 2026-10-05

Process-review worker (`fkit-coder`), spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`) under its declared-approval
marker; approved `plan.md` blob `fb6d4ed7` confirmed this turn. Ran `fkit-process-stateful-review` steps 0–7, owner
per-round gate replaced by the loop's standing approval. No source written. Nothing committed.

- `review.md`: reviewer round 1 has **no findings**, so no *Coder response* rows. Its validation gate (browser checks)
  is met by § *Browser check — 2026-10-05* above.
- Added one **accepted residual** (owner ruling) and set the ledger to `Status: closed-out`.

### Decision log

- **Owner ruling recorded — "Accept and note it"** (2026-10-05, live `AskUserQuestion` in the `fkit lead` session,
  relayed by the driver). Answers the browser check's ⚠️ note "Address-bar `#join=` with a space is ignored", not a
  reviewer finding. What changed: `review.md` § *Accepted residuals* gained "Hand-typed grouped `#join=` link ignored on
  the website build" in What / Why / Re-raise-only-if shape. Cause re-checked this turn: `getToken()` in
  `src/client/jwt.ts` re-serialises the hash via `URLSearchParams` (space → `+`), unchanged by `0389`;
  `cleanLobbyCode` strips only whitespace and `-`. **No code change.**
- Re-raise conditions written: a player report of a hand-typed grouped link failing; the website build starting to copy
  or show grouped `#join=` links; or `getToken()`'s hash rebuild changing. The third one is mine, beyond the driver's
  suggested two — it names the condition under which the cause itself goes away or moves.
- Fixes applied without asking: **none**. Obvious-winner calls: **none**.
