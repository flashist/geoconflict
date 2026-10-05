# Plan: 0354, show private lobbies to testers by default and add an "everyone" flag

**Planning only. I wrote no files and no source.** (This is a spawned run with no plan-mode tool, so that promise is kept by me, not enforced by the runtime.)

## Summary
- **Small client-only change.** About 30 lines of source plus about 100 lines of tests. Three files change in code (`PrivateLobbyAccess.ts`, `FlashistFacade.ts`, two test files), plus comment-only edits and one knowledge-base doc. **No `src/server/` change.**
- **New rule for showing the row:** citizenship surfaces on **and** (the player is a tester **or** the everyone-flag = `enabled`).
- **Main effect on deploy day:** testers (`localStorage geoconflict_tester = "1"`) see the row with no console setup. Today nobody sees it (owner said on 2026-10-03 that it is switched off). Nobody else sees it until the owner sets the new flag.
- **One finding narrows question 3 (degraded boot).** On a degraded boot the `citizenship_ui` flag is missing, so citizenship surfaces read as off. The brief's own rule ("surfaces off, hidden in every combination") therefore already hides the row from testers too. Showing it to testers would mean letting testers skip the `citizenship_ui` kill switch.
- **Questions 1 to 4 stay open for the owner, as the brief requires.** The plan below is written for the recommended answers, and the "if the owner picks otherwise" notes say what changes.

## How this relates to 0380, 0377 (and 0376)
- Those tasks are release-gate items for **setting the everyone-flag in the console**. They do **not** gate this build. This task ships first, hidden (brief, Release gate: "This task itself is not gated").
- **`0377`** (gate item 4, ending abandoned unstarted private lobbies early): server only, inside `GameServer.phase()`. No overlap in files or behaviour. I do not touch lobby lifetime.
- **`0380`** (gate item 6, with `0382`; Yandex invite copies the code, `#join=` is ignored on Yandex): it adds a `copyText()` wrapper to `FlashistFacade.ts` and gates `Main.handleHash()`'s `#join=` branch.
  - We share files: `FlashistFacade.ts` (I touch the `experiments`/`testerMarker` constants area and the flag-getter area, a different region from theirs) and `Main.ts` (I change only the comment near line 530, not `handleHash`).
  - The overlap is textual only, so any merge conflict is trivial. The board order is `0354` first.
  - I do not touch invite copying, `#join=` handling, or the code format.
  - The brief notes that an invite link still opens the join window whatever the flags say. That stays exactly as it is here; `0380` changes it for the Yandex build.
- **`0376`** is this task's production check (gate item 2). No new verify task is needed (brief, Verification step 4).
- **Rank 37 is the producer's order, not owner-ruled.** Nothing in this plan depends on that rank.

## What I read
- `src/client/PrivateLobbyAccess.ts`: `start()` currently requires `isPrivateLobbiesEnabled() && isCitizenshipSurfacesEnabled()`, fails closed and runs once after `flashist_waitGameInitComplete()`.
- `src/client/flashist/FlashistFacade.ts`:
  - `experiments` constants, around line 342.
  - `testerMarker`, around line 365.
  - `readTesterClientFeatures()`, around line 398. It never throws; blocked storage means "not a tester".
  - `checkExperimentFlag()`, around line 1419. It is `true` for every flag in a dev build and needs an exact string match otherwise.
  - `isPrivateLobbiesEnabled()`, around line 1461.
  - `isCitizenshipSurfacesEnabled()`, around line 1480.
- `tests/client/PrivateLobbyAccess.test.ts` (it mocks the whole FlashistFacade module) and `tests/client/FlashistFacade.test.ts` (its 0302 block, around line 448).
- `Main.ts:530` and both HTML templates: they carry comments naming the `private_lobbies` switch.
- `GameServer.ts:927`: a comment only.
- Wiki: `citizenship_ui` = `enabled` in the production console (deploy window `0.0.154`; kill switch flipped off and on in `0238`). So on a healthy boot, a tester will in fact see the row.
- `analytics-event-reference.md`, lines 423 and around 693–697: these name the `private_lobbies` flag.

## Steps (for the recommended answers: Q1 marker, Q2 stop reading the old flag, Q3 hidden, Q4 `private_lobbies_all`/`enabled`)

**0. Owner pre-step (brief, What to build step 1).** The owner gives the exact current console values of `private_lobbies` (and confirms `citizenship_ui`). I record them in `worklog.md`.
- This does not block the build under the recommended Q2.
- It **does matter if the owner picks Q2 option C** (reuse the old flag): then any non-tester condition already set to `enabled` would show the row to those players on deploy.

**1. `src/client/flashist/FlashistFacade.ts`**
- Add exported `isTesterMarkerSet(): boolean`. It is `true` only when `localStorage[geoconflict_tester] === "1"`, never throws, and returns `false` when storage throws.
- Refactor `readTesterClientFeatures()` to call it. Its behaviour is unchanged, and the existing 0302 tests pin that.
- In `experiments`, add `PRIVATE_LOBBIES_ALL_FLAG_NAME: "private_lobbies_all"` and `PRIVATE_LOBBIES_ALL_ENABLED_VALUE: "enabled"`, with a comment saying:
  - it shows the row to non-testers;
  - it starts unset, and the owner sets it only after the six-item release gate;
  - it is visibility only, and the server's citizen check is the real protection.
- Add `isPrivateLobbiesForEveryoneEnabled()`, which calls `checkExperimentFlag()` exactly like its siblings.
- Remove `PRIVATE_LOBBIES_FLAG_NAME`/`_ENABLED_VALUE` and `isPrivateLobbiesEnabled()`. Nothing reads them after step 2, and the brief says not to leave two overlapping flags.

**2. `src/client/PrivateLobbyAccess.ts` → `start()`**
```ts
await flashist_waitGameInitComplete();
const facade = FlashistFacade.instance;
const isEnabled =
  (await facade.isCitizenshipSurfacesEnabled()) &&
  (isTesterMarkerSet() || (await facade.isPrivateLobbiesForEveryoneEnabled()));
```
- The surfaces check stays first and absolute, so a degraded boot leaves the row hidden for everyone.
- The marker is read when `start()` runs (after init), once per page load.
- Everything else is unchanged: fail-closed `catch`, the Create lock, live unlock, and Join always free.
- Update the class docstring to the new rule.

**3. Comment-only edits** in `Main.ts` (around line 530), `src/client/index.html` (around 202) and `src/client/yandex-games_iframe.html` (around 315). Both templates are changed, per the project's two-entry-points rule. The new rule reads "citizenship surfaces on AND (tester OR private_lobbies_all)".
- **`GameServer.ts:927` is left untouched**, to keep `git diff src/server/` empty as the brief asks. Its sentence ("the Yandex switch is never visible here") stays true. Only its flag *name* becomes historical. I will note this in the worklog rather than edit server code.

**4. Tests**
- `tests/client/PrivateLobbyAccess.test.ts`. The mock factory gains `isTesterMarkerSet: jest.fn()` and `isPrivateLobbiesForEveryoneEnabled`, and drops `isPrivateLobbiesEnabled`. New and changed visibility cases:
  - tester, everyone off → **shown**;
  - no tester, everyone off → **hidden**;
  - no tester, everyone on → **shown**;
  - surfaces off → **hidden** in all 4 tester × everyone combinations (`it.each`);
  - degraded boot (surfaces false, everyone false) with tester → **hidden** (this pins the Q3 ruling);
  - the everyone-flag read throws → hidden (fail closed);
  - the marker is read at `start()`, not at construction;
  - "does not decide before platform init" now checks the surfaces read.
  - The existing Create-lock, Join-free and dev-bypass tests stay unchanged; `beforeEach` sets the row to shown via everyone = true.
- `tests/client/FlashistFacade.test.ts`, in the 0302 block:
  - `isTesterMarkerSet`: true only for `"1"`; false for unset, `"true"`, `"0"`, or when storage throws.
  - `isPrivateLobbiesForEveryoneEnabled`: true only for exactly `private_lobbies_all: "enabled"`; false for missing, `""`, `"disabled"` and `"Enabled"`; false when the flags are undefined (degraded boot).
  - **The old flag no longer counts:** `{ private_lobbies: "enabled" }` → false. This guards against a leftover console value showing the row.
  - Remove the two `isPrivateLobbiesEnabled` tests.
  - Keep the existing `clientFeatures` tests, so the marker is still sent to `getFlags()` and any tester conditions on other flags keep working.
- Server: no change. The existing citizen-start test must still pass.

**5. Doc:** `ai-agents/knowledge-base/analytics-event-reference.md`
- Line 423 (`LockedFeature:Tap:PrivateLobby` "never fires while the row is hidden"): restate the new hidden conditions.
- The Experiment Events "flags that gate a feature" paragraph: replace `private_lobbies` with `private_lobbies_all` and note that testers see the row by marker, not by flag. (When the owner sets the flag, the cohort event `Experiment:private_lobbies_all:enabled` fires for everyone.)
- No new event constants. Wiki write-up goes to `fkit-wiki` after close, not me.

**6. `worklog.md`** (written by the build worker):
- The console values from step 0.
- The decision log.
- The **owner run-sheet** (brief, What to build step 7):
  - **Tester setup:** in DevTools, select the **game iframe** context, run `localStorage.setItem("geoconflict_tester","1")`, then reload.
  - **Pre-flip checklist (all six gate items):**
    - `0354` done;
    - `0376` passed;
    - `0228` fixed if proven, otherwise dropped from the gate;
    - `0377` done;
    - `0301` shipped;
    - `0380` and `0382` built, and `0381` and `0383` passed.
  - **Flip:** in the Yandex Games console add flag `private_lobbies_all` = `enabled` with no condition. Check that a browser without the marker, inside Yandex, sees the row after a reload.
  - **Kill switch:** delete the flag or set any other value. Non-testers lose the row on their **next page load**, because flags are read once per page load and players already on the page keep the row until they reload.
  - **Hide it from testers too:** `citizenship_ui` off, which hides every citizenship surface, or testers clear their own marker.
  - **Cleanup:** delete `private_lobbies` from the console whenever convenient.

**7. Verify:** `npm test` (the full run includes the shell harnesses and is slow), `npm run lint`, `npx tsc --noEmit`. Confirm `git diff --stat src/server/` is empty.
- The live check (marker shows the row; no marker hides it; flag unset) belongs to `0376`, per the build-vs-verify split.
- **Not verifiable here:** real Yandex flag behaviour. The dev build forces every flag to `true`, so local runs always show the row.

## Edge cases and risks
- **Storage blocked or throwing** (private mode, iframe policy) → not a tester → hidden. This fails closed.
- **The marker is public.** Anyone who reads the code can set it and see the row. That is acceptable because Create stays locked for non-citizens and the server refuses non-citizen starts (0302).
- **The marker lives in the iframe's own storage.** Setting it on the top-level `yandex.ru` page does nothing, so the run-sheet says "game iframe context".
- **A degraded boot that recovers late does not re-evaluate the row.** That is today's behaviour too, because `start()` decides once. It is out of scope and I am not changing it.
- **`getFlags()` timing out** → flags undefined → surfaces off → hidden for everyone, testers included.
- **The dev build** makes `checkExperimentFlag()` always true, so the row always shows locally. That is unchanged.
- **The tester `clientFeatures` sent to `getFlags()` is unchanged**, so existing console conditions on other flags still work.

## If the owner picks a different answer
- **Q1, server-side id list:** this stops being a small client task. It needs a new server or profile-backend endpoint and an `fkit-architect` consult. I would return `NEEDS-DECISION` and re-plan rather than build it here.
- **Q2 B, keep `private_lobbies` as a kill switch:** the rule becomes surfaces && `private_lobbies` && (tester || everyone).
  - The owner must set `private_lobbies` = `enabled` for testers **now**, and for everyone on flip day. That contradicts request item 1 ("no console setup needed").
  - Keep `isPrivateLobbiesEnabled()`; add an "old flag off hides it even for testers" test.
- **Q2 C, reuse `private_lobbies` as the everyone-flag:** no new constant; the rule becomes surfaces && (tester || `private_lobbies`). This depends on step 0 showing no non-tester condition set to `enabled`.
- **Q3 "testers see it":** testers would bypass the `citizenship_ui` flag, keeping only the local `CITIZENSHIP_CARD_ENABLED`. The citizenship kill switch would then no longer hide the row from testers. It also contradicts brief Verification 1 bullet 4.
- **Q4 another name:** only the constant and the docs change.

---

## Owner rulings at approval (2026-10-04, live via `AskUserQuestion` in the `fkit lead` session, `fkit-sprint-ship-loop`)

- **Plan: APPROVED** — the plan above, with these answers.
- **Q1 (who is a tester):** owner's words, verbatim: *"I don’t think we need to make anything special, I can run some code in console when I test it, e.g. to enable the features that are not enabled for other players yet"* — read as: the existing browser marker (`localStorage.setItem("geoconflict_tester","1")` run in the console); nothing new built. The approval question stated this reading and the owner approved it.
- **Q2 (old `private_lobbies` flag):** Stop reading it.
- **Q3 (degraded boot):** Hidden for testers too.
- **Q4 (flag name):** `private_lobbies_all` = `enabled`.
- **Q5 (current console values):** owner will send them later; not given at approval. Record in `worklog.md` as "not yet given by the owner — needed before deploy".
