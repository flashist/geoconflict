# Worklog — 0354 Show private lobbies to testers by default, and add an "everyone" flag

Brief: [brief.md](./brief.md) · Plan: [plan.md](./plan.md)

## 2026-10-04 — build (fkit-coder, Build worker of `fkit-sprint-ship-loop`)

**Provenance.** Built by a spawned `fkit-coder` under the sprint loop's declared-approval marker. The plan was
approved by the owner live on 2026-10-04 via `AskUserQuestion` in the `fkit lead` session, with rulings Q1–Q4
(see `plan.md`, last section). Nothing here is owner-verified.

### Step 0 — current console values (Q5)

- `private_lobbies`: **not yet given by the owner — needed before deploy.**
- `citizenship_ui`: **not yet given by the owner — needed before deploy.**
- Owner-attested 2026-10-03 (brief): *"the lobbies are switched off, nobody can use them"*. Exact values still to
  record here.
- Why it still matters under Q2 "stop reading it": it does not change what this build shows (the old flag is no
  longer read), but `citizenship_ui` must be `enabled` for testers to see the row at all.

### What changed

- `src/client/flashist/FlashistFacade.ts`
  - New exported `isTesterMarkerSet()` (true only for `localStorage.geoconflict_tester === "1"`; never throws).
  - `readTesterClientFeatures()` now calls it; behaviour unchanged (0302 tests still pass).
  - New `experiments.PRIVATE_LOBBIES_ALL_FLAG_NAME = "private_lobbies_all"`,
    `PRIVATE_LOBBIES_ALL_ENABLED_VALUE = "enabled"`, and `isPrivateLobbiesForEveryoneEnabled()`.
  - Removed `PRIVATE_LOBBIES_FLAG_NAME` / `_ENABLED_VALUE` and `isPrivateLobbiesEnabled()` (Q2: stop reading it).
- `src/client/PrivateLobbyAccess.ts` — `start()` rule is now
  `surfaces && (isTesterMarkerSet() || everyoneFlag)`. Surfaces first, so a degraded boot hides it from testers too
  (Q3). Docstring updated.
- Comment-only: `src/client/Main.ts`, `src/client/index.html`, `src/client/yandex-games_iframe.html`.
- Tests: `tests/client/PrivateLobbyAccess.test.ts`, `tests/client/FlashistFacade.test.ts`.
- Doc: `ai-agents/knowledge-base/analytics-event-reference.md` (the `LockedFeature:Tap:PrivateLobby` row and the
  Experiment Events "flags that gate a feature" paragraph).
- **No `src/server/` change.** `GameServer.ts`'s comment naming the `private_lobbies` switch is left untouched on
  purpose (plan step 3): its point — the server never sees Yandex flags — is still true; only the flag name is now
  historical.

### Decision log (unattended calls)

- **none** — no obvious-winner calls and no review fixes. Everything built is as the plan says.
  - Wording only, inside plan step 5: the doc paragraph also notes that a leftover `private_lobbies` console value
    still fires an `Experiment:private_lobbies:*` cohort event (every returned flag does), which now gates nothing.

### Owner run-sheet

**Tester setup (no console change needed).**
1. Open the game on Yandex Games. In DevTools, pick the **game iframe** context in the console's context menu
   (the marker lives in the iframe's own storage; setting it on the top-level `yandex.ru` page does nothing).
2. Run `localStorage.setItem("geoconflict_tester","1")`, then reload.
3. The private-lobby row shows only if `citizenship_ui` is on. To stop being a tester:
   `localStorage.removeItem("geoconflict_tester")`, then reload.

**Pre-flip checklist — the everyone-flag stays unset until ALL six are true (owner ruling 2026-10-03):**
1. `0354` done (this task).
2. `0376` passed (a real citizen hosts inside Yandex, a friend joins, the match starts and ends).
3. `0228` fixed if proven by a real repro; otherwise dropped from the gate.
4. `0377` done (abandoned unstarted private lobbies end early, not after 3 hours).
5. `0301` shipped (the citizenship popup).
6. `0380` and `0382` built, and their production checks `0381` and `0383` passed.

**Flip (for everyone).**
1. Yandex Games console → flags: add `private_lobbies_all` = `enabled`, **no condition**.
2. Check: a browser **without** the marker, inside Yandex, reload → the row shows.

**Kill switch.**
- Delete `private_lobbies_all`, or set it to any other value. Non-testers lose the row on their **next page load** —
  flags are read once per page load, so players already on the page keep it until they reload.
- To hide it from testers too: set `citizenship_ui` off (this hides every citizenship surface), or testers clear
  their own marker.

**Cleanup.** Delete the old `private_lobbies` flag from the console whenever convenient — nothing reads it now.

### Verification (plan step 7)

Run 2026-10-04 on the working tree, by the build worker:

- `npm test` (full, shell harnesses included): **188/188 suites, 3466/3466 tests passed**, exit 0, ~163 s. One run,
  no flake, no re-run.
- Targeted: `PrivateLobbyAccess.test.ts` + `FlashistFacade.test.ts` — 69/69 passed.
- `npm run lint`: exit 0. `npx tsc --noEmit`: exit 0. Prettier check on the changed TS files: clean.
- `git diff --stat src/server/`: **empty**.
- No leftover reference to `isPrivateLobbiesEnabled` / `PRIVATE_LOBBIES_FLAG_NAME` in `src/` or `tests/`.

**Not verified here:** real Yandex flag behaviour (the dev build forces every flag to `true`, so local runs always
show the row). The live check — marker shows the row, no marker hides it, flag unset — belongs to `0376`.

## 2026-10-04 — process review, round 1 (fkit-coder, Process-review worker of `fkit-sprint-ship-loop`)

**Provenance.** Spawned `fkit-coder` under the sprint loop's declared-approval marker; the standing approval is the
owner-approved `plan.md`. Ledger: [review.md](./review.md) — one finding, R1. Nothing here is owner-verified.

### Decision log (unattended calls)

- **R1 — fix applied without asking.**
  - *Finding:* the only fail-closed test rejects the everyone-flag read (the last read in `start()`); nothing rejects
    the first read, `isCitizenshipSurfacesEnabled()`. At `HEAD` the throw test hit the first read, so this change
    quietly dropped that case.
  - *What changed:* one new test in `tests/client/PrivateLobbyAccess.test.ts` ("stays hidden when the
    citizenship-surfaces read throws — fail closed, even for a tester"): surfaces read rejects, tester marker true,
    everyone-flag true → row hidden, `isVisible()` false. No source change; no existing test changed.
  - *Why it qualified:* verified `CORRECT` against the code (and against `HEAD`); mechanical and localized (one test
    in one file); inside the approved plan (step 4, tests — the fail-closed and "surfaces off → hidden in every
    combination" rules). No obvious-winner calls.

### Verification

- Mutation check: temporarily changed the source to swallow the surfaces rejection as `true` → the new test failed
  (1 failed / 30 passed); source restored, `git hash-object` identical before and after.
- Targeted `PrivateLobbyAccess.test.ts` + `FlashistFacade.test.ts`: **70/70 passed**.
- `npx eslint` + `npx prettier --check` on the test file: clean. `npm run lint`: exit 0. `npx tsc --noEmit`: exit 0.
- `npm test`, run 1: **1 failed** — `tests/profile-server/NameChangeRoutes.test.ts` (1 of 3467 tests; a `supertest`
  suite, outside this task's files). The failure message was not captured, so its shape is **untraced**. No
  `node-*.ips` crash report from today (newest is 2026-10-01), so not `0197`'s segfault. Likely the known supertest
  flake (CLAUDE.md), not certain. **Re-ran:** the suite alone 51/51 passed; full `npm test` run 2 **188/188 suites,
  3467/3467 tests**, exit 0.
- `git diff --stat src/server/`: empty.
