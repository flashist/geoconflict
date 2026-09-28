# 0327 — worklog (build, 2026-09-28)

Built by `fkit-coder` as the **Build worker** of `fkit-sprint-ship-loop` (driven by `fkit-lead`), under
the declared-approval marker: approved plan = `plan.md` (blob `6d626935a9e80a0436293a545449b550a91b8df3`,
16189 bytes, re-hashed with `git hash-object` before building — match). `plan.md` and every status were
left untouched. Nothing committed. 0322's uncommitted server/profile changes in the tree were not touched.

## Owner rulings (quoted verbatim from `plan.md`)

2026-09-28, live via `AskUserQuestion` in the `fkit lead` session, relayed by fkit-lead:

- **Q1 (what closing the host's lobby window does):** "Host leaves cleanly (Recommended)" — Same fix now: host leaves, background refresh stops. Friends see the host drop and stay in a lobby that can't start — same as today, just visible. Client-only, small. ⇒ §2 (host window) applies; no follow-up task filed.
- **Plan approval:** "Approve (Recommended)" — Build it, extra fix included. ⇒ step 1c (close during "checking…") is kept.

## Step 1 — findings (read from the tree, before the fix)

Confirmed by reading the code; the full file:line trace is `plan.md` §0. Summary:

**Join window**

| Close route | Reaches `leave-lobby` before the fix? | Notes |
|---|---|---|
| ✕ | **No** | Only `OModal.close()` runs; the component's `close()` is not called. Poll keeps running, `hasJoined` stays true. |
| Click outside | **No** | Same as ✕. |
| Escape | **No** | Window-wide listener calls the component's `close()` — clears input + poll, no leave. Fires even with the window hidden (incl. in a match). |
| Hash change (`onHashUpdate`) | Yes, by direct `handleLeaveLobby()` call | Already correct; unchanged. |
| Match-start close list / `onJoin` | n/a — programmatic | Must stay silent; still silent. |

- `closeAndLeave()` had no caller; its `detail.lobby` was always empty (read after `close()` cleared the
  input). Nothing reads that detail (`Main.handleLeaveLobby` ignores its argument). **Deleted.**
- Extra bug confirmed: after join + close, `hasJoined` stayed true, so the Join button never came back
  until a page reload (red test (g) proves it).
- Consequence 2 (0303's restart popup never shows) confirmed in a test harness (red test (h)).

**Host window**

| Close route | Before the fix |
|---|---|
| ✕ / click outside | No leave; the 1 s player poll keeps running (red host test "✕ stops the player poll"). |
| Escape | No leave; poll cleared. Unconditional, like the join window. |
| Successful Start / match-start list | Programmatic; silent before and after. |

- The host is not pulled into anything (only the host modal has Start). Open connection + skipped
  cleanup are the real gap, fixed per Q1.

## Live two-window reproduction (§5) — NOT RUN

**Not run, before or after the fix.** Reason: §5 needs two browser windows with separate identities (one
private/incognito) driven by hand against `npm run dev`. That is not something this spawned worker can do
non-interactively. Nothing here claims it.

What is therefore **unverified live** and left for the owner:
- that B is actually pulled into A's match before the fix (step 1 is code-reading + unit tests only);
- that after the fix B drops off A's list within ~1 s and A's Start leaves B on a usable start screen;
- the same for Escape and a click outside, the Join button coming back on reopen, the restart popup
  (§5 step 5 console snippet), and the host side (§5 step 6);
- the `Main.ts` glue — test (h) copies `handleLeaveLobby`'s gate and `onBackOnStartScreen` call rather than
  executing `Main.ts` (`Client` is not exported and imports half the app).

## Tests — red, then green

New files:
- `tests/client/JoinPrivateLobbyModalLeave.test.ts` — tests (a)–(h) from the plan, plus (f2) for the
  archive-check path of step 1c.
- `tests/client/HostLobbyModalLeave.test.ts` — host tests from the plan, plus "✕ stops the player poll",
  "a successful Start closes without a leave", and "closing while a Start's ad is showing starts nothing".
- `tests/client/support/litAccessors.ts` — test helper (not a test).

**Harness note.** Both suites use the **real** `o-modal`, so ✕ and the outside click are its real shadow-DOM
handlers — the plan's fallback (calling `o-modal.close()` directly) was **not** needed. It did need one
workaround: under the jest/SWC build, class fields are defined on the instance and shadow Lit's
`@state`/`@query` accessors (so `@query` returned `undefined` and `isModalOpen` did not re-render).
`exposeLitAccessors()` deletes those own properties so the prototype accessors work, as in the browser
build. No jest config change.

**Red run** (source unchanged, both new suites): `Tests: 13 failed, 4 passed, 17 total`.
- Join: (a) (b) (c) (f) (f2) (g) (h) failed, each on its behaviour assertion (0 leaves / a late
  `join-lobby` / a late message / 3 poll fetches after close / popup not shown). (d) and (e) passed —
  **guard tests, green today by design** (before-join closes and programmatic closes never left).
- Host: ✕ / outside / Escape leave, poll stop, close-before-create, close-during-ad failed; programmatic
  close and successful-Start-no-leave passed (guards).

**Green run** (after the fix): new suites + `HostLobbyModalUrl`, `CitizenshipRestartOffer`,
`PrivateLobbyAccess`, `PrivateLobbyLang`: `Test Suites: 6 passed; Tests: 90 passed`.

**Mutation check on the Escape guard.** Test (e) as first written would pass even without the
`isModalOpen` guard (a programmatic close already clears `hasJoined`). Tightened (e) and the host
equivalent to assert that Escape with the window hidden does not run the close funnel at all
(`modal-close` never fires). Temporarily removing the guard turned (e) red; restored → green.

**Full checks**
- `npx tsc --noEmit`: exit 0.
- `npm run lint`: 1 error, **not ours** — the known untracked 0325 helper
  (`ai-agents/tasks/backlog/0325-…/s0-hmac-check.mjs`, "not found by the project service"). `eslint` on
  every file this task touched: exit 0. `prettier --check` on them: clean.
- Full `npm test`: first run `170 suites / 2966 tests passed`, exit 0, no supertest flake, no re-run. A
  second full run on the final tree (after the tightened guard assertions and prettier):
  `170 suites / 2966 tests passed`, exit 0, no flake, no re-run.

## Decision log

- **Plan followed as approved.** Join window: `@modal-close` funnel → `handleModalClose` (capture id +
  `hasJoined`, `reset()`, one `leave-lobby` if joined); programmatic `close()` = `reset()` then
  `modalEl.close()`; Escape guarded on `isModalOpen` and routed through `modalEl.close()`;
  `closeAndLeave()` deleted; step 1c via `closeGeneration`. Host: same pattern with `hasJoinedLobby`,
  `reset()` bumps `openGeneration`, `createLobby().then` skips the join if closed since this open.
- **Kept `e.preventDefault()` unconditional on Escape** — the plan says "keep `e.preventDefault()`, but only
  close when …"; read as preserving today's preventDefault exactly and gating only the close.
- **Host `createLobby` chain:** merged the two `.then`s into one so the generation check covers both the
  `lobbyId` assignment and the `join-lobby` dispatch. Why it qualifies: same order of effects as before;
  also stops a superseded opening's late result overwriting the current `lobbyId` — within the plan's
  "skip the join if the window was closed since this open" intent.
- **Leave detail for the join window** uses the input value, as the plan specifies (nothing reads it).
- **Step 1c in `checkArchivedGame`:** the stale check sits just before the `join-lobby` dispatch and returns
  `"error"`; the value is never used because `joinLobby()` checks the generation right after the await and
  returns first.
- **Fixes applied without asking / obvious-winner calls outside the plan: none.**

## Residuals

- **0228 window** (unchanged, not folded in): a close in the gap between `hasJoined = true` and
  `handleJoinLobby` setting `gameStop` (three awaits, under ~1 s) sends a leave that `handleLeaveLobby`
  drops, and the join then completes invisibly. Points to `0228`.
- **0252:** a leave on this route now runs `gameStop`, so Transport's leaked bus listeners (0252) are
  reachable here too — same as the public-lobby leave route today; not new in kind.
- **Orphan private lobby if the host closes before `createLobby` answers.** The lobby is created on the
  server but never joined. The server keeps an unstarted private lobby in `Lobby` phase until max game
  duration (`GameServer.ts` phase logic) — the same lifetime an abandoned private lobby has today (e.g.
  reopening Create today already orphans the previous one). Not new in kind; not fixed here.
- **After a successful host Start**, `isStarting` stays true (the close bumps `openGeneration`, so
  `startGame`'s `finally` skips its reset). Harmless: the window is closed and the next `open()` resets it.
- **Live reproduction not run** — see above.

## 2026-09-28 — Close (fkit-producer, spawned by `fkit-sprint-ship-loop`)

Closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`. No owner channel in this close;
nothing below was verified by a human. Grounds as relayed by `fkit-lead`: plan owner-approved 2026-09-28
(Q1 *"Host leaves cleanly"*; step 1c kept; live via `AskUserQuestion`, relayed); built test-first (red
13/4, then green); full `npm test` 170 suites / 2966 tests, run twice. Review round 1: R1 and R2 are
owner-ruled **known bugs**, each with its own follow-up brief (`0334`, `0333`); the four plan leftovers are
owner-ruled residuals, investigation in `0335`; R3 closed by the reviewer as informational. Ledger
`review.md` reads `Status: closed-out`. **Its *Coder response* table is empty on purpose:** every finding
was disposed of by owner ruling or reviewer disposition, and no code was changed in response to review.
Nothing committed.

**Owner-run checks still owed:**
- **The live two-window check (plan §5) was NOT RUN** — before and after: the pull-in, the Join button
  returning, and the restart popup. It is the only live evidence for the `Main` glue; everything else is
  unit tests and code reading.
- **Follow-ups on Sprint 7:** `0333` (R2), `0334` (R1), `0335` (the four leftovers).
