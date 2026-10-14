# Worklog — 0454: a wrong private-lobby code shows "Lobby not found"

## 2026-10-14 — Build (fkit-coder, Build worker of `fkit-sprint-ship-loop`)

Built from the approved `plan.md` (blob `1d7128865de0dcc574a4205734b9bcce707bc377`, re-hashed before starting;
not edited). Owner approval was relayed by the driver (live `AskUserQuestion`, 2026-10-14) — trusted, not
verifiable from this context. Nothing committed; no status changed; no task moved, filed or cancelled.

### Change surface
- `src/client/JoinPrivateLobbyModal.ts` (the only source file)
  - `joinLobby()` reads `getServerConfigFromClient()` once, at the top of its `try`, and passes it to
    `checkActiveLobby()` (which lost its own config call; `pollPlayers()` keeps its own). Adds a type-only
    `ServerConfig` import from `core/configuration/Config`.
  - **Gate:** after the existing `joined` / `isClosedSince` check, `if (!config.archiveEnabled())` →
    `showJoinFailed(workerSaidNotFound)` and return. No archive request (`getApiBase()/game/<code>`) and no
    `/commit.txt` request while the flag is false.
  - New private helper `showJoinFailed(notFound)`: sets `private_lobby.not_found` / `private_lobby.error` and
    fires `JoinFailed:NotFound` / `JoinFailed:Error` together. Used by the gate, the archive `not_found`
    branch (`true`), the archive `error` branch and the `catch` (both `workerSaidNotFound`).
  - Comment at the `catch` names `0030` (an archive answer that is not a real one follows the worker's answer).
  - 0451's comment "Counting only — the player's message below is unchanged" corrected (it became false).
  - Untouched: bad-format path, live-join path, `Joined:*` dedupe, `isClosedSince`, joining marks,
    `checkArchivedGame()`, `archiveEnabled()`'s value, every lang file.
- `tests/client/JoinPrivateLobbyAnalytics.test.ts` — config mock now `{ workerPath, archiveEnabled: () => archiveOn }`
  (default off); every join-failed case asserts the `.message-area` text; new archiving-off cases (wrong code →
  not_found, no `/archive/` or `/commit.txt` fetch; worker 500 JSON / HTML / `200 {}` / network reject → error +
  Error, no archive fetch); `with archiving on` block (200 HTML after worker-false → not_found + NotFound;
  archive 500 → not_found; archive 404 → not_found; worker unknown + HTML → error + Error; version mismatch,
  replay spy and pending-archive close moved here). 0451's test that asserted the old bug (`private_lobby.error`)
  replaced.
- `tests/client/JoinPrivateLobbyModalLeave.test.ts` — `archiveEnabled: () => false` in the module mock and the
  `0389` `beforeEach`/`afterEach`; `(f2)` uses `mockResolvedValueOnce` with `archiveEnabled: () => true`;
  new `(f3)` (close while `/exists` pending, archiving off → no late message, no archive fetch); J2 now also
  asserts the not_found message, proving it settles through the gate, not a swallowed TypeError.
- `tests/client/JoinPrivateLobbyModalPaste.test.ts` — `archiveEnabled: () => false` added to the mock only.
- `ai-agents/knowledge-base/analytics-event-reference.md` (§4, owner decision "Fix the stale sentences") —
  `JoinFailed:NotFound` row: "Counting only: the player's message is not changed" → the player sees the
  matching not-found line (task 0454). Accepted-residuals bullet rewritten: no archive step while archiving is
  off; screen now matches the event; the "rare cost" sentence restated as the post-0030 behaviour. Trigger
  definitions untouched. (File was already non-Prettier-clean at HEAD; not reformatted.)

### Evidence
- Targeted: the three Join suites, 64/64 pass.
- **Negative control:** the same tests run against `HEAD`'s `JoinPrivateLobbyModal.ts` → 6 fail (wrong code
  not_found ×2, archive-request assertions ×2, 200-HTML-with-archiving-on, archive-500); restored the new file
  (`cmp` identical) → all pass. The tests catch the bug, not just pass.
- `npx eslint` on the 4 touched code files: clean. `npx tsc --noEmit -p .`: exit 0. Prettier: code files clean.
- Brief step 6: `git diff resources/lang/` empty. `grep -rn archiveEnabled src/`: definition `DefaultConfig.ts:316`,
  interface `Config.ts:68`, consumers `Archive.ts`, `LocalServer.ts`, the new `JoinPrivateLobbyModal.ts`, plus
  one doc comment in `Schemas.ts`. `DefaultConfig.ts` unchanged (still `false`).
- Brief step 8: no endpoint, hostname, real code or credential in added lines (grep). Tests use fake `K7M4PCRX`.
- **Full `npm test`, one run, via the npm script** (no other jest run, no lock held beforehand): 3m34s,
  **226/227 suites, 4687/4688 tests; 1 failure — `tests/profile-server/SessionRoutes.test.ts` › "an expired
  token → 401 session_expired": `socket hang up`.** That is a `supertest` suite this task does not touch
  (`git diff` of `src/profile-server` / `tests/profile-server` empty). No `SIGSEGV` in the log, no new
  `node-*.ips` report → not `0197`. `socket hang up` is the *seen, never traced* shape in `CLAUDE.md`'s flake
  table — likely the known flake, not proven. **Re-ran that suite alone (targeted, not a second full run —
  the brief allows one): 124/124 pass.** The three Join suites and `ShellHarnesses.test.ts` passed in the full run.
- **Local browser check (brief step 5), `npm run dev` equivalent** (same two commands, `webpack serve` without
  `--open` so no tab popped on the owner's screen), Playwright:
  - Made-up valid code, Russian (default): "Лобби не найдено. Пожалуйста, проверьте правильность ID и
    попробуйте ещё раз." — requests for the code: only `/w0/api/game/<code>/exists`; no `/game/<code>`, no `/commit.txt`.
  - Same, English (`localStorage.lang = "en"`, reload): "Lobby not found. Please check the ID and try again." —
    same request result.
  - Live code: second tab opened `host-lobby-modal`, its 8-char code typed into the first tab's Join window →
    "Joined successfully! Waiting for game to start..." and one `join-lobby` dispatched.
  - Console errors: only the intentional `/flags/*.svg` 404s.
  - Torn down: browser closed, dev task stopped; ports 3000/3001/3002/9000 free; no webpack/server process left.
  - Not checked: the host side listing the guest (not in the brief's step 5).

### Decision log (unattended calls — ADR-019 / ADR-032 A4 audit)
No review findings were processed in this step (Build worker). Calls made without asking, each inside the
approved plan's intent:
1. **Corrected 0451's in-code comment** ("Counting only — the player's message below is unchanged") instead of
   leaving it. What changed: comment text only. Why it qualified: the plan makes that sentence false; mechanical,
   localized, same intent as the owner-approved §4 doc fix.
2. **Ran the `dev` script's two commands without `--open`.** Why: same servers; avoids opening a tab in the
   owner's browser. Obvious winner, no behaviour difference for the check.
3. **`(f2)` uses `mockResolvedValueOnce`** rather than set/restore in the test. Why: the config is read exactly
   once per join, so the one-shot value is consumed deterministically and cannot leak into later tests.
4. **J2 gained a message assertion** (not_found). Why: the plan asks to "re-check that J2 settles through the
   gate"; an assertion makes that check permanent. Test-only, in plan.
5. **Flaky suite re-run as a targeted run, not a second full run.** Why: the spawn says exactly one full run;
   the flake rule says re-run and say so. A targeted re-run of the failing suite satisfies both.
6. **Left `analytics-event-reference.md`'s pre-existing Prettier drift alone.** Why: unrelated formatting.

## Process review, round 1 (Process-review worker, `fkit-sprint-ship-loop`, standing approval)

Findings R1, R2 (`review.md`), both verified CORRECT, low, in plan. Doc and tests only; `src/` unchanged this round.

### Evidence
- Targeted: the three Join suites, 64/64 pass (run again after the negative check: 64/64).
- `npm run lint`: clean. Prettier on the Leave test: clean.
- Negative check for R2: forced the archiving-off gate on in `JoinPrivateLobbyModal.ts`; old (f2) passed, new (f2) failed; source and test restored (`cmp` identical).
- No full `npm test`: the source is byte-identical to the one the Verify step's full run passed; only a test file and a doc changed, and the changed test file was run.

### Decision log (unattended calls — ADR-019 / ADR-032 A4 audit)
1. **R1 → doc row `PRIVATE_LOBBY_JOIN_FAILED_NOT_FOUND`.** Changed: removed "the site's HTML page — the last is what production answers today, archiving being off"; added that while archiving is off there is no archive step and production decides on the worker's answer alone. Why it qualified: verified CORRECT (the gate returns before the archive lookup), a mechanical one-clause fix, inside the owner's §4 ruling "Fix the stale sentences". Trigger text unchanged.
2. **R2 → (f2) in `tests/client/JoinPrivateLobbyModalLeave.test.ts`.** Changed: one assertion that the `/api/game/<code>` request was made. Why it qualified: verified CORRECT (shown by the negative check above), test-only, localized, in plan (the plan says (f2) "still proves the close guard on the archive path").
3. **R2 → (f3), same file.** Changed: test name and comment only; no assertion change. Why it qualified: verified CORRECT (the close returns at `isClosedSince` before the gate, so it would pass on HEAD too), wording-only. Obvious winner over deleting it: it still guards the close with archiving off, which the plan asked for.
