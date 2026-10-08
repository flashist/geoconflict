# Yandex Build: the Invite Copies the Game's Own Yandex Games Link (from the SDK) with the Lobby Code as `payload`, Opened Once (task 0382)

**Source**: `ai-agents/tasks/done/0382-yandex-build-invite-link-via-the-sdk-portal-url-and-payload-consumed-once/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 60 (ADR-035 append rank; moved in from the Backlog board 2026-10-08) / task `0382`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-08 by `fkit-sprint-ship-loop`. Committed in `a555111`
> (2026-10-08, "Sprint push"); `git tag --contains a555111` → none ⇒ **committed, not deployed** (checked 2026-10-08).
> ⚠️ **Nothing here is proven inside Yandex** — the live check is **`0383`** (Sprint 7 rank 61, still `🔲 Backlog`).

## Goal

"The link part" of [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] (option A of the architect's evaluation),
built on top of `0380` ([[tasks/yandex-invite-copies-code]]). On the Yandex build the host's invite copies **this game's
own Yandex Games URL, taken from the SDK**, with the lobby code as `?payload=`; the friend's game reads the payload and
opens the Join window **once**. The code stays shown, as `0380` left it.

Facts from the owner's live probe of 2026-10-04 ([[tasks/yandex-invite-link-decision]]) that shaped the build:
`environment.payload` returns the value on `.ru` and `.com`; `getGameByID(app.id)` returns the game's URL **on the
current portal** (nothing hardcoded; `getAllGames()` does not list this game); the payload is also in our iframe's
`location.search`, which must **never** be rewritten (the `sdk` parameter trap, [[tasks/match-exit-keeps-query-string]]);
the SDK copy only works inside a real click; the payload **comes back after a match** — so consume-once is mandatory.

## Key Changes

**Owner rulings.** (a) *"Yes, link always lets them in"* (2026-10-04) — a friend who is not in the private-lobby flag
cohort still gets the Join window. At the 2026-10-08 plan gate: Q1 *"Skip tutorial that load"* (no first-time tutorial
auto-launch on the load where the invite opened Join; Yandex payload path only) · Q2 *"Don't auto-open"* when
`sessionStorage` is blocked · Q3 *"No switch"* (no Private-tab switch). No `location.search` fallback (plan decision,
not overridden). The 2026-10-04 "ask Yandex support" step was dropped by owner ruling (*"Yes, drop it"*).

- **New `src/client/InvitePayload.ts`** (pure, storage injectable) — `lobbyCodeFromInvitePayload()` (string ≤ 64 chars,
  cleaned with `cleanLobbyCode`, validated with `PrivateLobbyCodeSchema` — the `0389` format,
  [[tasks/private-lobby-code-format]]); `claimInviteCode()` → `"claimed" | "seen" | "no-storage"` (session key
  `geoconflict.privateLobby.handledInvites`, last 20); `openInviteFromPayload()` opens only on `"claimed"` and not busy,
  **with no flag input**; `shouldAutoLaunchTutorial()`. Never touches `location` / `history`.
- **`src/client/PrivateLobbyInvite.ts`** — `export function buildInviteLink` builds the link with the `URL` API
  (`searchParams.set("payload", …)`, query and hash kept); `inviteCopyText()` takes the portal URL as a 4th argument:
  Yandex + URL + valid code → link, otherwise the bare code (`0380`).
- **`FlashistFacade`** — `loadPortalGameUrl()` (`getGameByID(Number(app.id))`, 5 s timeout, https only; real answers
  kept, errors/timeouts retried), `getInvitePayload()`, `whenYandexSdkAvailable()` / `markYandexSdkAvailable()` for the
  late-recovery read.
- **`HostLobbyModal`** — starts the URL fetch on `open()` (Yandex only, before any click); the copy stays the click's
  first action, synchronous; new hint `host_modal.invite_link_hint` (both `en.json` and `ru.json`) when the copy is the
  link.
- **`Main.ts`** — reads the payload at startup **and** again on late SDK recovery; `handleHash()` unchanged.
- **Review R1 (medium, fixed):** the late read's "busy" check looked only at `gameStop`, so a join or tutorial still being
  set up counted as idle — on a degraded boot a first-time friend could get two concurrent joins. Now
  `this.gameStop !== null || this.tutorialStarting || !isOnStartScreen()`, with a new `tutorialStarting` flag in
  `startTutorial()`. `StartScreenPresence.ts` itself unchanged.

## Outcome

- Verified locally only: 9/9 targeted suites 274/274 after the review fix; full `npm test -- --maxWorkers=2` once after
  the resume, 215/215 suites (one Docker-probed harness **skipped**, not passed); tsc and lint clean. Mutation proofs for
  consume-once, no-storage, flags-off, the late read and the busy fix. Diff checks: no app id, no `yandex.<tld>` literal,
  no write to `location.search` / `history`.
- The build ran across a **kernel panic** of the owner's Mac (2026-10-08 ~20:17); the worker resumed and re-checked
  every touched file. The verify step did not run a full `npm test` (owner asked for low CPU).
- **Not verifiable locally — all `0383`'s:** real `environment.payload` / `getGameByID` in our build; the SDK copy in the
  iframe; mobile and other portal domains; `sessionStorage` in the Yandex iframe; the tutorial race (read from code, not
  reproduced). The `Main.ts` wiring is guarded only by source-text tests (`Client` is not exported).
- Ends `0380`'s accepted residual R3 (a non-tester friend had no path in) — once deployed and checked.
- Release-gate item 6 for private lobbies ([[tasks/private-lobby-citizen-perk]]) is now **built** on both halves; it is
  met only when `0381` and `0383` also pass in production.
- ⚠️ The invite link is useless in production until `0416` ([[tasks/worker-route-query-string]]) ships: no private lobby
  could start there.

## Related

- [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] — the decision this builds (the link half)
- [[tasks/yandex-invite-copies-code]] — task `0380`, the code half this builds on
- [[tasks/yandex-invite-link-decision]] — task `0199`, the owner's probe and ruling
- [[tasks/private-lobby-code-format]] — task `0389`, the code format the payload validator accepts
- [[tasks/private-lobby-citizen-perk]] — the six-item release gate (item 6)
- [[tasks/private-lobby-tester-default]] — task `0354`, whose gate lists this task
- [[tasks/match-exit-keeps-query-string]] — task `0331`, why `location.search` is never rewritten
- [[tasks/worker-route-query-string]] — task `0416`, the Start 403 that blocked private lobbies in production
- [[tasks/join-modal-paste-hint]] — task `0413`, the same Join window's paste fix, built the same day
- [[systems/flashist-init]] — the facade's late SDK recovery that the second payload read hooks into
- [[decisions/sprint-7]] — the board (rank 60)
