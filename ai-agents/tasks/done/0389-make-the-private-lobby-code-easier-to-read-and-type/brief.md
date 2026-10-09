# Make the private-lobby code easier to read and type

## ID
0389

> ℹ️ **ID allocation, checked 2026-10-04 before filing.** Highest task folder and highest `## ID` across `backlog/`,
> `done/` and `cancelled/`: `0388`. `0389` allocated in this run.

## Sprint
Sprint 7

## Priority
42

> ⚠️ **Priority 42 is append rank, NOT a merit ranking — flagged for owner confirmation.** The owner named the place
> (*"End of Sprint 7"*), not a rank. Appended after that board's highest (41, `0374`), never inserted (ADR-035).
> **On merit this belongs directly below `0374`**, because it is the least urgent of the private-lobby work on that
> board (`0382`'s link means most friends never type the code) and it should be built after `0380`, which is in progress
> on the same windows.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**OWNER RULING, relayed by `fkit-lead`; ⛔ not producer precedent.** Filed 2026-10-04 by a spawned `fkit-producer` with
no owner channel (ADR-021/037), on an owner ruling given live on 2026-10-04 via `AskUserQuestion` in the `fkit lead`
session, during plan approval of [`0380`](../../done/0380-yandex-build-invites-copy-the-lobby-code-and-stop-honouring-join-links/brief.md)
(its open question Q3 / brief question (b)):

- *"File a separate task to make the lobby code friendlier?"* → owner chose **"File a task"**.
- *"Where should the new task go?"* → owner chose **"End of Sprint 7"**.

`0380`'s plan records: *"a separate task, filed at the end of Sprint 7 by a producer. **Not part of this task; do not
absorb it.**"*

**Urgency, on merit: low.** Once [`0382`](../../done/0382-yandex-build-invite-link-via-the-sdk-portal-url-and-payload-consumed-once/brief.md)
ships, most friends open a link and never type the code. Typing matters for the code-only fallback (ADR-119 rule 3: no
SDK link → code only) and for a code read out by voice or over chat. The owner placed it on Sprint 7 anyway.

### What the code is today — checked against the code 2026-10-04 (find code by name)

- **The lobby id *is* the code.** `HostLobbyModal`'s create path calls `generateID()` (`src/core/Util.ts`) **in the
  client** and POSTs `create_game/<id>` to the worker that id hashes to.
- `generateID()`: 8 characters from a 58-character alphabet — digits `1–9`, lowercase without `l`, uppercase without
  `I` and `O`. **Mixed case, case-sensitive.**
- ⚠️ **Correction to the original description.** `0`, `O`, `I` and lowercase `l` are **already excluded**, so the
  `0/O` and `l/I` misreads cannot come from the generator. What is left: (1) **case** — `c/C`, `k/K`, `o`, `p/P`,
  `s/S`, `u/U`, `v/V`, `w/W`, `x/X`, `z/Z` look alike, and typing the wrong case fails; (2) a player who *reads* `1` and
  types `l` or `I` (or reads `o` and types `0`/`O`) gets a character that is not in the alphabet; (3) **Latin only** —
  players are mainly Russian-speaking, so typing letters means switching keyboard layout, and Cyrillic `А В Е К М Н О Р
  С Т Х` look identical to Latin letters but are different characters.
- **The schema is wider than the generator and is shared.** `ID` in `src/core/Schemas.ts` is `[a-zA-Z0-9]`, length 8.
  It validates **game ids and client ids** (and other player-id fields) alike. `generateID()` also makes client ids,
  worker message ids, single-player game ids and (server side, `generateGameIdForWorker`) public game ids.
- **The worker is a pure function of the id** — `workerIndex(gameID) = simpleHash(gameID) % numWorkers()`
  ([ADR-109](../../../knowledge-base/decisions/adr-109-worker-index-fixed-placement-contract-move-the-id.md)). The
  hash is **case-sensitive**: a code typed in the wrong case is routed to the **wrong worker**, not just "not found".
- **Join window:** `JoinPrivateLobbyModal.extractLobbyIdFromUrl()` pulls the id out of a pasted URL (`#join=` or
  `join/` forms) or passes the input through. It does no case or character clean-up.
- **Website build `#join=`:** `Main.handleHash()` honours `#join=<id>`. `0380` stops honouring it on the Yandex build
  only; the website build keeps it.
- ⚠️ **No collision guard.** The `create_game` route does not validate the path `id` against `ID`, and
  `GameManager.createGame()` does `games.set(id, …)` — **a second create with the same id silently replaces the
  first lobby.** Harmless at 58⁸; **not** harmless with a shorter code.
- **Guessing.** The worker rate limit is 20 requests/s/IP. A shorter code makes a live private lobby easier to find by
  guessing. Private lobbies are a citizen perk, not a security boundary — but this is a real tradeoff the owner should
  see (question 1).

### What breaks, and what does not

- **Live lobbies:** private lobbies live in worker memory, so a game deploy ends them all — *expected; the plan
  confirms it.* No old-format live lobby should meet the new server code.
- **Old cached clients** (a tab not reloaded since the deploy) keep generating old 8-character mixed-case codes. The
  server **must keep accepting** them, for create and join, or those hosts get an error.
- **Old `#join=` links on the website build** carry old 8-character codes. Their lobby is gone after the deploy anyway
  (see above), so they already end at "lobby not found". The format change must not make them fail any *earlier* or
  any differently — they must still parse.
- **Stored or archived game ids** (`Archive.ts`, `Master.ts` routes, game records) are old-format and must stay valid.
- **Client ids are out of scope** — they are never typed, and match-end XP participation is keyed by client id. Their
  format does not change.

## What to build

1. **Plan first, and put the owner questions in *Notes* to the owner before building.**
2. **A separate generator for private-lobby codes.** `generateID()` itself stays as it is, so client ids, message ids,
   single-player and public game ids do not change.
3. **Game-id validation accepts both forms** — the old 8-character form and the new one — everywhere a game id is
   checked: the join message, `Master.ts`'s routes, `Archive.ts`, and the `create_game` path id (validate it there;
   today it is not). Whether that is a wider shared `ID` or a separate game-id schema is the plan's call; ⚠️ widening
   the shared `ID` also loosens **client id** validation — the plan must say which it chose and why.
4. **The Join window forgives typing.** Before looking up the lobby **and before computing the worker path** (ADR-109),
   turn what the player typed or pasted into the canonical code: trim spaces; ignore separators if the code is shown
   grouped; fold case; and, if the owner rules yes (question 2), map Cyrillic look-alikes and `0/O`, `l/I` to the code's
   own characters. **An old 8-character mixed-case code must still join unchanged** — the plan says how it tells the
   two apart (for example: a different length) and tests both. `extractLobbyIdFromUrl`'s URL forms keep working.
5. **The website build's `#join=`** goes through the same clean-up and still accepts old and new codes.
6. **Collision guard.** The server refuses a `create_game` for an id already in use (a clear error, not a silent
   replace), and the host window retries with a fresh code, a bounded number of times. This is a retry on *id taken*,
   **not** client-side rejection-sampling against worker health — so it does not reopen ADR-109.
7. **Display.** The host window shows the canonical code (grouped, if the owner rules so — question 1). The *Hidden
   Lobby IDs* setting, the eye button and `0380`'s copy behaviour are unchanged apart from the code they show/copy.
8. **Localization:** any new or changed text goes into both `en.json` and `ru.json`.
9. **Tests** (`src/core/` changes must be tested): the generator only emits the new alphabet and length; game-id
   validation accepts old and new and rejects garbage; client-id validation is unchanged (or changed only as the plan
   stated); clean-up of lowercase, spaces, separators and (if ruled) Cyrillic look-alikes; the worker path is computed
   from the **cleaned** code (a lowercase-typed code reaches the same worker as the canonical one); an old 8-character
   code still parses and routes as today; `extractLobbyIdFromUrl` with `#join=` and `join/` URLs; a duplicate
   `create_game` is refused and the first lobby survives; the host window retries on that refusal.

**Do not:** change `workerIndex` / `simpleHash` or how the worker count is used (ADR-109); change client ids or
public-lobby ids; change `0380`'s or `0382`'s invite behaviour beyond the code they carry.

## Verification steps

1. Every test in *What to build* step 9 passes.
2. `npm test`, `npm run lint`, `npx tsc --noEmit` green.
3. `git diff` shows `generateID()` unchanged and no change to `workerIndex` / `simpleHash`.
4. **Local run (`npm run dev`):** host a private lobby → the window shows a code in the new format; in a second
   browser, type it **in lowercase** (and with a space in the middle) → the friend joins the same lobby; a hand-built
   old-format 8-character id (created via `create_game`) can still be joined by typing it exactly.
5. **Local collision check:** a second `create_game` with a live lobby's id gets the new error, and the first lobby is
   still there with its players.
6. **After the game deploy:** a lobby hosted in production shows the new code and a friend joins by typing it.
   Per the build/verify rule (owner ruling 2026-09-29), if this needs a deploy plus an owner check, close this build
   task and file the live check as its own verify task at the top of the next sprint. **Not filed now.**

## Notes

- **Depends on:** [`0380`](../../done/0380-yandex-build-invites-copy-the-lobby-code-and-stop-honouring-join-links/brief.md)
  — in progress on the same host/join windows and the copy path; build this after it lands, not alongside.
- **Blocks:** nothing.
- **Why one brief.** The generator, the validation, the Join-window clean-up and the collision guard only make sense
  together and ship in one game deploy (client and server together). Shipped alone, the validation or clean-up does
  nothing visible, and the new generator without them would break joins. Nothing in it ships usefully alone.
- **Related:**
  - [`0381`](../../backlog/0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored/brief.md)
    — `0380`'s production check. Format-neutral; if this ships first, its check simply sees the new code.
  - [`0382`](../../done/0382-yandex-build-invite-link-via-the-sdk-portal-url-and-payload-consumed-once/brief.md) — its
    `InvitePayload` validates the code carried in the link. **Whichever of the two is built second must make that
    validator accept the new format** and run the payload through the same clean-up.
  - [`0383`](../0383-verify-0382-in-production-a-yandex-invite-link-opens-the-join-window-once-on-the-friends-portal/brief.md)
    — `0382`'s production check.
  - [`0376`](../../backlog/0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md)
    — the private-lobby production test; if this ships before it runs, that test covers the new code too.
  - [`0377`](../../done/0377-end-abandoned-unstarted-private-lobbies-after-a-short-idle-time-not-3-hours/brief.md) — shorter
    life for idle lobbies means fewer live codes at once, which helps a shorter code (fewer collisions, fewer targets
    to guess).
  - ADR-119 (Yandex invite = SDK link plus the code); ADR-109 (worker index is a pure function of the id).
- **Open questions for the owner — the coder puts these in the plan; do not decide them:**
  1. **Code format — length and characters.** Producer's lean (not owner-ruled): **6 characters, capital letters and
     digits only, with every look-alike removed (no `0 O 1 I L`, and similar pairs the plan lists), typed in any
     case.** About 30 characters ⇒ ~700 million codes: plenty, and still hard to guess. Main alternative: **6 digits
     only** — easiest for Russian players (no layout switch, easy to say aloud), but only 1 million codes, so a live
     lobby is far easier to find by guessing at the 20 requests/s limit. Also asked here: show it grouped (`ABC DEF`)
     or as one block?
  2. **Forgive Cyrillic look-alikes and `0/O`, `l/I/1` mistakes in the Join window?** Recommended: **yes** — players
     are mainly Russian-speaking and `А/A`, `С/C`, `О/O` are invisible mistakes; mapping them costs a small table and
     tests.
- 📌 *(Added 2026-10-05.)* **The live check after deploy (Verification step 6) lives in
  [`0376`](../../backlog/0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md)**,
  step 3's lobby-code check — no separate verify task is filed. **OWNER RULING 2026-10-05**, given live via
  `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent: the owner chose
  **"Add to 0376"**.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
