# Worklog — 0382

## 2026-10-08 — Build (fkit-coder, Build worker spawned by `fkit-sprint-ship-loop`)

Implemented the approved `plan.md` (blob `926b09c64ababc8cf06700a02ce0a177ca892119`, 16077 bytes — hashed
at the start of the run and again on resume, unchanged). `plan.md` and `brief.md` not touched. Nothing
committed, no status changed, no wiki write. Built on top of other tasks' uncommitted hunks
(0407/0408/0409/0412/0416/0417, and 0413 in flight at the start) — none touched or reverted; shared files
(`FlashistFacade.ts`, `en.json`, `ru.json`) edited with small targeted inserts only.

### Owner answers (recorded as relayed)

Given by the owner live via `AskUserQuestion` in the `fkit lead` session, 2026-10-08, relayed by
`fkit-lead` / `fkit-sprint-ship-loop` in this worker's spawn prompt:

- **Q1 tutorial — "Skip tutorial that load"**: skip the first-time tutorial auto-launch only on the page
  load where the invite opened the Join window. Yandex payload path only; the standalone `#join=` path is
  NOT changed.
- **Q2 sessionStorage blocked — "Don't auto-open"**: on `"no-storage"` the Join window is not opened.
- **Q3 tab switch — "No switch"**: no Private-tab switching.
- Hint wording from plan step 6 shown in the plan and not changed — used as written.
- The plan's decision not to use a `location.search` fallback stands (not overridden).

### Interruption and resume

The owner's Mac kernel-panicked and restarted (~20:17, 2026-10-08) while this run was in its full-`npm
test` stage. The owner chose (live `AskUserQuestion`, 2026-10-08, relayed by the driver) to have this
worker resume. On resume: plan re-hashed (unchanged); every touched file re-read and checked complete
(none half-written); the key mutation proofs re-run (same results, same restore hashes as before the
crash); targeted suites, `tsc`, lint re-run; full `npm test` run **once** with `--maxWorkers=2` per the
owner's low-CPU request.

### What changed

- **New `src/client/InvitePayload.ts`** (pure, injectable storage): `lobbyCodeFromInvitePayload()`
  (string only, ≤ 64 chars, `cleanLobbyCode` then `PrivateLobbyCodeSchema`); `claimInviteCode()` →
  `"claimed" | "seen" | "no-storage"` (sessionStorage key `geoconflict.privateLobby.handledInvites`, JSON
  list, last 20; plus an in-page set); `openInviteFromPayload({ readPayload, isBusy, openJoinWindow,
  storage? })` — opens only on `"claimed"` and not busy; busy → marked handled, not opened; **no flag
  input**; `shouldAutoLaunchTutorial(tutorialDone, openedInvite)`. Never touches `location` / `history`.
- **`src/client/PrivateLobbyInvite.ts`**: `buildInviteLink(portalGameUrl, code)` via the `URL` API
  (`searchParams.set("payload", …)`; query and hash kept, existing `payload` replaced; parse error → null).
  `inviteCopyText()` gains a 4th arg `portalGameUrl: string | null` — Yandex + URL + valid code → link;
  otherwise the bare code (0380). Standalone unchanged.
- **`src/client/flashist/FlashistFacade.ts`** (additive, next to `copyText`, plus one line in
  `initLoadedYandexSdk()`): `portalGameUrl` field; `loadPortalGameUrl()` —
  `GamesAPI.getGameByID(Number(environment.app.id))`, id must be a positive whole number, 5 s timeout,
  https only, real answers kept (URL or `isAvailable: false`), error/timeout/no-SDK not kept (retries);
  `getInvitePayload()`; `whenYandexSdkAvailable()` + `markYandexSdkAvailable()` (lazy resolver list).
- **`src/client/HostLobbyModal.ts`**: `open()` starts `loadPortalGameUrl()` on Yandex only
  (fire-and-forget, re-renders under the `openGeneration` guard); `copyToClipboard()` passes
  `facade.portalGameUrl` (sync read; `copyText` still the first call, nothing awaited before it); hint line
  shows `invite_link_hint` when the copy would be the link, else 0380's `invite_code_hint`.
- **`src/client/Main.ts`**: in `initialize()` right after `handleHash()`: startup read stored in
  `openedInviteAtStartup`; if no SDK yet, `whenYandexSdkAvailable().then(...)` reads again. Private
  `openInviteFromPayload()` passes `getInvitePayload`, `gameStop !== null`, `this.joinModal.open(code)`.
  `startClient()` auto-launches the tutorial only if `shouldAutoLaunchTutorial(...)`. `handleHash()` and
  `strip()` unchanged.
- **Localization**: `host_modal.invite_link_hint` in `en.json` and `ru.json` (plan wording).
- **Tests**: new `tests/client/InvitePayload.test.ts` (33), new `tests/client/InviteLinkLang.test.ts` (4);
  added to `tests/client/PrivateLobbyInvite.test.ts` (buildInviteLink, inviteCopyText with link, Main
  source guard), `tests/client/FlashistFacade.test.ts` (loadPortalGameUrl / getInvitePayload /
  whenYandexSdkAvailable), `tests/client/HostLobbyModalUrl.test.ts` (0382 suite); `tests/client/HostLobbyOpen.test.ts`
  facade mock gained `loadPortalGameUrl` (decision 4). Fake URLs/ids only (`https://portal.example/games/app/111111`).

### Verification

- **Targeted (after resume)**: InvitePayload, PrivateLobbyInvite, InviteLinkLang, HostLobbyModalUrl,
  FlashistFacade, HostLobbyOpen, HostLobbyPoll, HostLobbyModalLeave — 8/8 suites, 258/258 tests.
- **`npx tsc --noEmit`**: exit 0. **`npm run lint`**: exit 0. Prettier clean on every touched file.
- **Full `npm test -- --maxWorkers=2`** (after resume, once): exit 0 — **215/215 suites, 4377 passed,
  1 skipped**, 55.8 s. The skip is the Docker-probed `docker-secret-boundary` shell harness (Docker
  daemon down) — **skipped, not passed**. No supertest flake, no SIGSEGV.
- **Pre-crash full runs (honest record)**: run 1 — 1 failure, `HostLobbyOpen.test.ts` C4, **caused by
  this change** (its facade mock lacked `loadPortalGameUrl`; `open()` threw on Yandex) → fixed
  (decision 4). Run 2 — only failure `ShellHarnesses` → `tests/profile-checks.sh` killed at its 150 s
  deadline (default worker count, ~202 s suite; a shell harness this task does not touch). The machine
  kernel-panicked shortly after. The post-resume 2-worker run passed it.
- **Mutation proofs** (break → red → restore, shasum before = after; first run pre-crash, the three
  starred ones re-run after resume with identical results):
  - ★ consume-once (storage "seen" check removed) → 3 red (same code on later page, typed differently, busy-then-later).
  - ★ no-storage opens (`!== "claimed"` → `=== "seen"`) → 2 red (missing / throwing storage).
  - ★ flags-off: decision function consults `isPrivateLobbiesForEveryoneEnabled()` → 6 red, incl. "opens
    with every private-lobby flag off" and the source guard.
  - flag import alone → source guard red.
  - HostLobbyModal: no re-render when link lands → hint-switch test red; awaiting the link before
    `copyText` → both synchronous-click tests red; copy ignores the portal link → link test red.
  - Facade: failed fetch memoized → 5 "not kept" tests red; `markYandexSdkAvailable()` removed → late-SDK
    waiter test red; id passed as string → 2 "as a number" tests red.
  - Main: late read removed → source guard red; tutorial condition ignores the invite → source guard red.
- **Diff checks**: no app id, no `yandex.<tld>` literal, no `games/app/<real id>` in `src/`, `resources/`
  or tests; no write to `location.search` / `history` added (`handleHash()` untouched). `src/core`,
  `src/server` untouched.

### Not verifiable locally (stays for `0383`)

From the plan, unchanged: real `environment.payload` / `getGameByID` behaviour in our build and
`Number(app.id)`; SDK copy inside the iframe click, mobile, other portal domains; `sessionStorage` inside
the Yandex iframe on all browsers; the tutorial race (E1) is from reading code, not reproduced. The Main
wiring is guarded by source-text tests only (`Client` is not exported) — its runtime behaviour is 0383's.

### Decision log (unattended calls — obvious winners within the plan's intent; no review fixes applied)

1. **`shouldAutoLaunchTutorial()` lives in `InvitePayload.ts`, not `Main.ts`.** Plan step 10 wants a tiny
   exported pure function "so it can be tested"; every test mocks `Main.ts` (it boots the app on import),
   so a Main export is untestable. Same function, same call site in `startClient()`.
2. **Lang test is a new file `tests/client/InviteLinkLang.test.ts`**, not an edit to
   `PrivateLobbyLang.test.ts`, which carries 0412's uncommitted hunk — keeps tasks' hunks apart.
3. **Hint shows "link" exactly when the copy would be the link** (`copiesInviteLink()` reuses
   `inviteCopyText`), so before the lobby code exists the hint stays "code" (E9 consistency).
4. **`HostLobbyOpen.test.ts` mock gained `loadPortalGameUrl: resolves null`** — the real facade always has
   the method; the mock predates it. Fixes the C4 failure this change caused; C4's meaning (no link →
   bare code) unchanged.
5. **Memo detail**: an in-flight fetch is shared (two opens → one SDK call); an unparsable/non-https URL
   in a resolved answer counts as a real answer (kept), per "a real answer is kept"; a non-numeric /
   missing app id is not kept (no call is made, retry costs nothing).
6. **Unreadable stored list** (bad JSON) counts as empty and is overwritten — not "no-storage"; only a
   throwing or missing storage is "no-storage" (Q2).
7. **No-storage still records the code in the in-page set**, so a second read on the same page cannot
   open it either.

## Verify (independent re-run)

2026-10-08, sprint-ship-loop Verify worker, current working tree, no file edited except this note.

- **Named suites** (`--maxWorkers=2`): `InvitePayload`, `InviteLinkLang`, `PrivateLobbyInvite`,
  `FlashistFacade`, `HostLobbyModalUrl`, `HostLobbyOpen`, `HostLobbyPoll`, `HostLobbyModalLeave` —
  **8/8 suites, 258/258 tests pass**.
- **Other suites that import/mock these modules or read `Main.ts` source** (grep of `tests/`):
  `LocalServer`, `CitizenshipCard`, `CitizenshipRestartModal`, `ClientGameRunnerTeardown`, `Cosmetics`,
  `ErrorModalCopy`, `JoinLobbyReconnectSession`, `JoinPrivateLobbyModalLeave`, `JoinPrivateLobbyModalPaste`,
  `PreStartModals`, `StaleBuildModal`, `TenureGrantModal` — **12/12 suites, 312/312 tests pass**.
- `npx tsc --noEmit` exit 0; `npm run lint` exit 0.
- **Lang**: `host_modal.invite_link_hint` present in `en.json` and `ru.json`, text identical to the plan's
  draft (step 6); both files parse; `host_modal` key sets match (27 = 27, no extras either side).
- **Diff checks** (added lines of the 4 modified source files + new `InvitePayload.ts`): no `yandex.<tld>`
  literal, no hard-coded app id (`appId` comes only from `yandexGamesSDK.environment.app.id` at runtime),
  no 5+-digit literal, no URL literal, no `location.search` / `history` / `pushState` / `replaceState`
  write added. `Main.ts`'s only removed lines are the old tutorial guard; `handleHash()` body unchanged.
- **Not run**: full `npm test` (owner asked for low CPU after today's kernel panic); no browser. Runtime
  behaviour inside Yandex stays `0383`'s, as above.

## Process review — Round 1 (fkit-coder, Process-review worker spawned by `fkit-sprint-ship-loop`)

2026-10-08. Ledger: `review.md` Round 1, one finding (R1). Standing approval = the owner-approved plan.

### Decision log (fixes applied without per-fix owner approval)

1. **R1 — late-SDK payload read treated a join/tutorial in setup as "not busy".** Verified `CORRECT`
   (defect, severity medium, derived — see `review.md` § Coder response). **What changed:**
   `src/client/Main.ts` — `isBusy` in `Client.openInviteFromPayload()` is now
   `this.gameStop !== null || this.tutorialStarting || !isOnStartScreen()`; new private
   `tutorialStarting` flag, set first thing in `startTutorial()` and cleared in a `finally` once the
   tutorial's `join-lobby` is dispatched (its body moved verbatim into `dispatchTutorialJoin()` to avoid a
   60-line re-indent). `isOnStartScreen` imported from `StartScreenPresence` (that module unchanged).
   Tests: `tests/client/PrivateLobbyInvite.test.ts` source guard updated to the new `isBusy` form + a new
   guard on the flag in `startTutorial`; `tests/client/InvitePayload.test.ts` new test with the real
   `StartScreenPresence` (join in setup → not opened and handled; another code opens afterwards).
   **Why it qualified:** verified `CORRECT`; mechanical and localized (one predicate, one flag, one file of
   source); inside the approved plan — E4 "SDK arrives late while the player is already busy (in a lobby,
   a match, or the tutorial) → mark handled, don't open"; the fix only makes "busy" match E4's meaning.
   Not done (judgment, deliberately avoided): counting the tutorial's pre-join wait in
   `StartScreenPresence` itself, which would change 0336/0397/0404's consumers.

### Verification
- Mutation proofs (break → red → restore, `shasum` before = after): M1 `isBusy` back to `gameStop` only →
  guard red; M2 never set `tutorialStarting` → new guard red; M3 `StartScreenPresence` ignores joins in
  setup → new behavioural test red. All three restored byte-identically.
- Targeted (`--maxWorkers=2`): InvitePayload, PrivateLobbyInvite, InviteLinkLang, HostLobbyModalUrl,
  FlashistFacade, HostLobbyOpen, HostLobbyPoll, HostLobbyModalLeave, StartScreenPresence — **9/9 suites,
  274/274**. Other suites that read or mock `Main.ts` (LocalServer, ClientGameRunnerTeardown,
  JoinPrivateLobbyModalPaste/Leave, StaleBuildModal, ErrorModalCopy, JoinLobbyReconnectSession, Cosmetics,
  HostLobby*) — **12/12 suites, 181/181**.
- `npx tsc --noEmit` exit 0; `npm run lint` exit 0; Prettier clean on touched files.
- **Not run:** full `npm test` (owner: low CPU after kernel panics); no browser. The race itself is from
  reading the code, not reproduced — runtime stays `0383`'s.
