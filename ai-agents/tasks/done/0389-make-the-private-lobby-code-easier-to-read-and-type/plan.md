# Final plan — 0389: make the private-lobby code easier to read and type
Owner rulings 2026-10-05:
- 8 characters from the alphabet `23456789ABCDEFGHJKMNPQRSTVWXYZ`, typed in any case;
- shown in two groups (`K7M4 PCRX`);
- Latin only, no Cyrillic mapping;
- no filter on the Join box while the player types;
- private lobbies use the new format only.

**Summary**
- **Answer to point 1, checked:** the new alphabet is a subset of `ID`'s `[a-zA-Z0-9]`, and also of `generateID()`'s own alphabet. Every new 8-character code already passes `ID`. What that simplifies:
  - **No `GameIDSchema` union is needed.**
  - **The shared game-id fields need no change:** `GameStartInfoSchema`, `ClientJoinMessageSchema`, the `Master.ts` routes and `Archive.ts`.
  - **The earlier "matches would not start" finding (the game-start check at `GameServer.ts:557`) no longer applies.**
- **Strict, new code only, in three places:** the Join window, the website's `#join=` link, and a private `create_game`. That is one small `PrivateLobbyCodeSchema`: exactly 8 characters, all from the new alphabet.
- **Clean-up is one rule:** take the code out of a pasted link (existing code), remove spaces and dashes, upper-case. No length branches and no Cyrillic map.
- **Answer to point 2:** nothing relies on telling formats apart by length any more. Every length-based branch from the earlier plans is gone; details below.
- **Answer to point 3:**
  - The 8-character space makes an **accidental** clash practically impossible: about 1 in 13 billion per new lobby with 50 lobbies open.
  - The **server's `409` refusal is still worth keeping**. Today, anyone who knows a lobby's code can silently wipe that lobby by re-creating it. The refusal costs about 3 lines plus one test.
  - The **host's retry loop is now near-pointless**. Dropping it would differ from the brief (step 6), so it is put to the owner as Q1 below rather than decided here.
- `generateID()`, `simpleHash` and `workerIndex` are unchanged, so ADR-109 is not reopened.
- Spread across workers: 200,000 random new codes over 20 workers came out within ±2%.
- No new or changed text is planned, so `en.json`/`ru.json` are untouched.

## What keeps `generateID()` and the 8-character mixed-case format
- Public match ids: drawn by the master (`Master.ts:578/603`, created via `create_game` at `:670`) and by the worker (`generateGameIdForWorker`).
- Single-player ids: `Main.ts:879/948` and `SinglePlayerModal.ts:512`.
- All client/player ids, and worker message ids.
- All of these keep using `ID`, which also accepts every new code, so nothing on shared paths changes.

## Strict on private-only paths, and its limits
- The strict check is a **format** check, not proof that a code was made for a private lobby. About 1 in 195 `generateID()` ids contains only alphabet characters once upper-cased. This is harmless:
  - such an id behaves like any typed code: it either finds a live lobby or says "not found";
  - the Join window today accepts **any** id, so this is no new exposure.
- **A mixed-case `generateID()` id** typed into the Join window is upper-cased first, so it can never match its original game. It is then refused by the format check, or else simply not found.
- **On the server's private create** there is no upper-casing, so a mixed-case id is always refused with `400`.

## Steps
1. **New `src/core/PrivateLobbyCode.ts`.** It imports only `nanoid`. Putting this in `Util.ts` would make a circular import, because `Util.ts` already imports `Schemas.ts`.
   - `PRIVATE_LOBBY_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ"` and length 8.
   - `generatePrivateLobbyCode()`, built with `customAlphabet`, like `generateID`.
   - `cleanLobbyCode(text)`: remove whitespace and `-`, then upper-case.
   - `formatLobbyCodeForDisplay(code)`: `K7M4PCRX` is shown as `K7M4 PCRX`.
2. **`src/core/Schemas.ts`.** Add only `PrivateLobbyCodeSchema` (a regex over the alphabet, length 8). `ID` and every existing field stay unchanged.
3. **`src/server/Worker.ts` `create_game`.**
   - After the body is parsed, check the path id: a public create (which also carries the admin token) checks against `ID`; anything else checks against `PrivateLobbyCodeSchema`. A failing id gets `400`. Today the id is not checked at all.
   - Directly before the game is created, with **no `await` in between**, refuse an id that is already in use with `409 { error: "game_id_taken" }`.
   - The refusal goes through a new `GameManager.createGameIfAbsent()` that returns `GameServer | null`, so it can be unit-tested.
   - Because there is no `await` between the check and the create, two identical creates cannot both get past the check during the 10 ms settle wait.
   - Public creation in `pollLobby` is untouched.
4. **`src/client/HostLobbyModal.ts`.**
   - Creates lobbies with `generatePrivateLobbyCode()`.
   - Shows the code with `formatLobbyCodeForDisplay`.
   - `copyToClipboard`/`inviteCopyText` copy the ungrouped code (`K7M4PCRX`, or `…#join=K7M4PCRX` on the website).
   - The hidden-code mask (`••••••••`, still 8 dots), the eye button and `0380`'s behaviour are unchanged.
   - Retry on `409` only if Q1 = keep: at most 3 tries in total, each with a fresh code; any other error fails exactly as today.
5. **`src/client/JoinPrivateLobbyModal.ts`.**
   - Typing in the box is untouched: no filter, and the existing keyup trim and link extraction stay.
   - `joinLobby()`: code = `cleanLobbyCode(extractLobbyIdFromUrl(text))`.
     - Fails `PrivateLobbyCodeSchema` → the existing `private_lobby.not_found` line, with no request.
     - Passes → the clean code is written back into the box, so the player poll and the leave event use the same code that joined.
   - The worker path is computed from the clean code.
6. **`src/client/PrivateLobbyInvite.ts` `lobbyIdFromJoinHash`.** Clean up the code, then check `PrivateLobbyCodeSchema`; return null if it fails. Yandex still returns null.
7. **Tests.**
   - New `tests/core/PrivateLobbyCode.test.ts`:
     - The generator, over many draws: length 8, alphabet only, never `0 O 1 I L U`.
     - Clean-up: `k7m4-pcrx` and ` K7M4 PCRX ` both become `K7M4PCRX`.
     - Grouping for display.
     - Routing: `workerIndex(cleanLobbyCode("k7m4 pcrx")) === workerIndex("K7M4PCRX")`, using the real config.
   - `PrivateLobbyCodeSchema`:
     - accepts a new code;
     - rejects a mixed-case `generateID()`-style id, an excluded character (`0 O 1 I L U`), 7 or 9 characters, and lowercase.
   - `ID` (in `tests/ClientJoinMessageSchema.test.ts`): unchanged, and it accepts a new code as a gameID — the reason no union is needed.
   - New `tests/server/GameManagerCreate.test.ts`: a duplicate is refused, and the first lobby is still the same instance.
   - `tests/client/PrivateLobbyInvite.test.ts`:
     - `#join=` with a new code, and with a lowercase or grouped one → the clean code;
     - `#join=` with a mixed-case 8-character id → null;
     - Yandex → still null.
   - Join window, a new test on the `JoinPrivateLobbyModalLeave` harness:
     - typed `k7m4 pcrx` → the request goes to `/w<N>/api/game/K7M4PCRX/exists`;
     - pasted `http…#join=…` and `…join/…` links work;
     - a mixed-case `generateID()` id, or garbage → `not_found` with no request.
   - Host window, on the `HostLobbyOpen` harness:
     - the create URL carries a new-format code;
     - the display is grouped and the copied text is not;
     - if Q1 = keep retry: `409` then `200` → a second, different code, and the host joins; `409` three times → fails as today; `500` → no retry.
8. **Verify.**
   - `npm test`, `npm run lint` and `npx tsc --noEmit` all pass.
   - `git diff` shows `generateID`, `simpleHash` and `workerIndex` unchanged, and no change to the shared `ID` fields.
   - Local `npm run dev`:
     - host a lobby → shown as `XXXX XXXX`;
     - a friend types it in lowercase with a space and joins;
     - a **public** match still starts and can be joined;
     - a second private `create_game` with a live code → `409`, and the first lobby keeps its players;
     - a private `create_game` with a mixed-case 8-character id → `400`.
   - The production check is a separate verify task, not filed now.
   - **Change from the brief, to be told to the owner:** the brief's verification step 4, *"a hand-built old-format 8-character id can still be joined"*, is obsolete under the new-format-only ruling. The public-match check and the mixed-case `400` replace it.

## Point 2 — nothing relies on length any more
- Removed from the earlier plans:
  - the 6-versus-8 branch in clean-up;
  - "8 characters means keep case";
  - the `GameIDSchema` union;
  - the 6-versus-8 schema tests.
- Old and new codes are now told apart by **character set** only. That matters only on the three strict paths above.
- The hidden-code mask was already 8 dots and still matches.

## A page left open from before the deploy (still acceptable: private lobbies are tester-only today, per `0354`'s brief; the live remote-flag value is not checked)
- **Create:** sends a mixed-case id → `400` → its existing create-failed path runs. Reloading the page fixes it.
- **Join, typing a new code exactly in capitals:** works. The hash is unchanged, and `ID` accepts the code.
- **Join, typing a new code in lowercase:** the old page has no clean-up, so it reaches the wrong worker → "not found".
- **`#join=`:** the old page accepts new codes, because they pass `ID`.
- **Public and single-player play:** unaffected.

## Not verified, or not covered by unit tests
- The `400`/`409` answers inside `Worker.ts`'s `create_game` route have no unit test. The route lives inside `startWorker()`, and no test drives it. The refusal logic is unit-tested in `GameManager`; the route itself is proven only by the local checks.
- "Private lobbies never worked in production" is the owner's statement; I did not verify it.
- The clash and guessing figures assume about 50 private lobbies open at once; the real number is unknown. With 8 characters, a nonstop guesser at about 400 tries a second would find some open lobby roughly once a year.
- **Task `0382`** (not built yet): because it is built second, it must use `PrivateLobbyCodeSchema` and `cleanLobbyCode`. I did not re-read 0382's brief to confirm it says so.
- After the task closes, `fkit-wiki` should ingest it. The wiki page `systems/match-logging.md` stays correct for public games.

---

## Owner rulings at approval (2026-10-05, live in the `fkit lead` session, `fkit-sprint-ship-loop`)

- **Plan: APPROVED** — the final plan above (approved via `AskUserQuestion`).
- **Private lobbies: new format only** — owner, verbatim: *"'Old 8-character codes still work.' - what's the point of that? If it's done for back-compatibility, then it doesn't make sense, because the old lobbies never worked in our prod, so we can redo them the way we want (if needed)."*
- **Code length: 8 characters** (the owner's own idea), alphabet `23456789ABCDEFGHJKMNPQRSTVWXYZ`, typed in any case.
- **Display: two groups** — `K7M4 PCRX`; copying gives the ungrouped code.
- **Latin only, no Cyrillic mapping** — owner, verbatim: *"If by "excuse" you mean that we should treat cyrillic letters as if it was latin letters, then no. Our codes should be latin-only. Make the implementation simple!"*
- **No input filter on the Join box** — owner, verbatim: *"Ok, then no need to implement the filter for the input field, users can input whatever they want."* Existing link extraction stays.
- **Host-window retry on `409`: DROPPED** ("Drop the retry"). The server's `409 game_id_taken` refusal STAYS. So step 4's retry loop and the retry tests in step 7 (`409`→`200`, `409`×3, `500` no-retry) are **not built**; a `409` takes the host window's existing create-failed path.
- **Brief deviation accepted by the approval:** brief verification step 4 ("a hand-built old-format 8-character id can still be joined") is obsolete.
