
# Plan — 0382: Yandex invite link through the SDK, payload opened once

**Mode:** plan only. Nothing written yet. I read the brief, ADR-119, the 0199 probe record, 0380's brief/worklog, 0383, 0412's plan, 0413's diff, and the code below.

## Goal (2 lines)
On the Yandex build, the host's copy button copies **this game's own Yandex Games link** (from the SDK) with `payload=<lobby code>`; the code stays shown (masked + eye button) as 0380 left it. On the friend's side, a valid payload opens the Join window **once**, whatever the private-lobby flags say. Anything that fails falls back to 0380's "copy the code" path.

## What exists today (checked in code)
- `src/client/PrivateLobbyInvite.ts` (0380): `inviteCopyText(lobbyId, isYandexPlatform, windowOrigin)` → bare code on Yandex, `#join=` link on standalone; `lobbyIdFromJoinHash()` → always null on Yandex.
- `FlashistFacade.copyText(text)` (0380): SDK clipboard first, called synchronously inside the click; native fallback; returns true/false; never throws.
- `HostLobbyModal.copyToClipboard()`: `copyText(inviteCopyText(...))` is the first call, nothing awaited before it; tick on success, red line on failure; `openGeneration` guard.
- `Main.handleHash()`: `#join=` → `this.joinModal.open(lobbyId)`; ignored on Yandex. No flag check (ruling (a) already holds for that path).
- `JoinPrivateLobbyModal.open(id)`: sets the code and joins. 0413 keeps this signature. The `<join-private-lobby-modal>` element sits outside 0412's tab panels in both templates, so it shows for players with no Private tab.
- `FlashistFacade.initLoadedYandexSdk()`: the single place `yandexGamesSDK` gets assigned — on a normal boot, on a late-recovered degraded boot, and after a background loader retry.
- `startClient()` (Main.ts): after `client.initialize()`, **auto-launches the tutorial for any player who never finished it** — see edge case E1, the most important finding of this plan.

## Design

### Host side — get the link before the click
1. **`FlashistFacade.loadPortalGameUrl(): Promise<string | null>`** (new, small, near `copyText`).
   - No SDK / no `features.GamesAPI` / `environment.app.id` not a positive whole number → `null`, no call.
   - Calls `GamesAPI.getGameByID(Number(environment.app.id))` (as ADR-119 says; the probe passed the string — see "Not verifiable").
   - Answer used only if `isAvailable === true` and `game.url` parses with the `URL` API as `https:`. Else `null`.
   - Bounded by a 5 s timeout → `null`.
   - **Memoized once per page**: a real answer (a URL, or `isAvailable: false`) is kept; an error, timeout or no-SDK result is **not** kept, so a later host-window opening retries (covers an SDK that arrives late).
   - The result is also stored in a field read synchronously: **`FlashistFacade.portalGameUrl: string | null`**.
   - No app id, no domain, no `getAllGames()`, nothing built from `ancestorOrigins`/`referrer`.
2. **When it is fetched: when the host window opens** (`HostLobbyModal.open()`, Yandex only, fire-and-forget). Why there and not at SDK start: only hosts need it (one SDK call per host, not per player), and the lobby create round trip gives it time to land before the code even exists. When it lands, the modal re-renders (same `openGeneration` guard) so the hint switches (step 5).
3. **`buildInviteLink(portalGameUrl, lobbyCode): string | null`** in `PrivateLobbyInvite.ts`: `new URL(portalGameUrl)`, `searchParams.set("payload", code)`, `toString()`. Keeps any existing query and hash; replaces an existing `payload`. Any throw → `null`. Never string concatenation.
4. **`inviteCopyText(...)` gains a 4th argument `portalGameUrl: string | null`.** Yandex: link when the URL is there **and** the lobby code is valid (`PrivateLobbyCodeSchema`); otherwise the bare code (0380, unchanged — includes "create still pending"). Standalone: unchanged, ignores the new argument.
5. **`copyToClipboard()`** passes `facade.portalGameUrl` (a sync read). `copyText()` stays the first call with nothing awaited before it — the click focus rule (P6/P7) is kept. Tick / failure line unchanged.
6. **Hint line (Yandex only)**: when the link is ready, show a new `host_modal.invite_link_hint`; until then, keep 0380's `invite_code_hint`. Draft wording (owner may change at approval):
   - EN: "The copy button copies an invite link for a friend. You can also just send the code — they enter it under “Join Lobby”."
   - RU: «Кнопка копирования копирует ссылку-приглашение для друга. Можно и просто отправить код — друг введёт его в «Присоединиться к лобби».»
   - The two `copy_failed*` lines stay as they are (they already say "copy the code by hand").

### Friend side — read the payload, open once
7. **`FlashistFacade.getInvitePayload(): string | null`** — `yandexGamesSDK?.environment?.payload` if it is a string, else `null`. Read only. Standalone has no SDK → always `null`.
8. **`FlashistFacade.whenYandexSdkAvailable(): Promise<void>`** — resolves at once if the SDK is already there; otherwise when `initLoadedYandexSdk()` assigns it (one new line there, plus a lazily-created resolver list like the existing `whenPlatformRecoveredLate`, because tests build facades with `Object.create`). This covers the late-recovery path **and** the background-retry path from one place. I do **not** reuse `whenPlatformRecoveredLate()`: it also waits for experiment flags and never fires if they fail, but the payload needs only the SDK.
9. **New `src/client/InvitePayload.ts`** (pure, injectable storage, same pattern as `PlatformDegradedAnalytics.ts`):
   - `lobbyCodeFromInvitePayload(payload: unknown): string | null` — string only, length cap (64) before cleaning, then `cleanLobbyCode` + `PrivateLobbyCodeSchema` (0389 rule: clean first). Anything else → `null` (another Yandex payload use, a typo, junk).
   - `claimInviteCode(code, storage)` → `"claimed" | "seen" | "no-storage"`. Remembers handled codes in `sessionStorage` under `geoconflict.privateLobby.handledInvites`: a short JSON list, last 20 codes. Also an in-page memory set, so the startup read and the SDK-ready read on the same page never open it twice. A storage read/write that throws → `"no-storage"` (handling: open question Q2; recommended = do not open).
   - `openInviteFromPayload({ readPayload, isBusy, openJoinWindow, storage }): boolean` — the one decision function Main calls. Valid code + not handled → mark handled, then open (or, if busy, mark handled and do not open — see E4). Returns whether it opened. **It takes no flag input at all** — ruling (a) holds by construction.
   - Never touches `location.search` or `history`.
10. **Main.ts wiring** (Main.ts is not touched by 0412/0413):
    - In `initialize()`, right after the `handleHash()` call: run `openInviteFromPayload(...)` once, synchronously, with `readPayload = () => facade.getInvitePayload()`, `isBusy = () => this.gameStop !== null`, `openJoinWindow = (code) => this.joinModal.open(code)`. Store the result as `this.openedInviteAtStartup`.
    - If the SDK was not there at startup: `facade.whenYandexSdkAvailable().then(() => openInviteFromPayload(...))` — the late-recovery read.
    - In `startClient()`: skip the tutorial auto-launch when the startup read opened the Join window (E1, Q1). Put as a tiny exported pure function `shouldAutoLaunchTutorial(tutorialDone, openedInvite)` so it can be tested.
    - `handleHash()` and its `strip()` are not changed. `hashchange`/`popstate` do not re-read the payload.
11. **Decision on the `location.search` fallback (brief asked the plan to decide): do NOT use it.** Reasons: undocumented and desktop-only evidence; the SDK value is the documented source; a boot whose SDK never arrives at all is rare and already broken in other ways, and the friend can still type the code (it is visible in the link they got); two sources can disagree and double the tests. Owner can override at approval.

## Edge cases (handled unless marked as a question)
- **E1 — new players get the tutorial instead of the lobby (important).** A friend opening an invite in a fresh/incognito window is a first-time player. Today `startClient()` then auto-starts the tutorial, which sends its own `join-lobby` and races/replaces the private-lobby join. That would break 0383 step 3 (incognito friend). Plan: skip the auto-tutorial on the page load where the invite opened the Join window. Owner question Q1. (Standalone `#join=` has the same race today; not changed unless the owner picks Q1 option B.)
- **E2 — payload comes back after a match (P8).** Match exit reloads the page with the same query; the code is already in the handled list → nothing opens. Mandatory, tested.
- **E3 — a new invite in the same tab.** A different code is not in the list → opens. Matches 0383 step 5.
- **E4 — SDK arrives late while the player is already busy** (in a lobby, a match, or the tutorial). Mark it handled and do not open — never pull a player out of what they chose. Rare (needs a degraded boot + late SDK + already busy).
- **E5 — stale invite** (link opened hours later, lobby already played). Same as typing an old code or an old `#join=` today: the Join window says "not found", or for a finished game starts its replay (existing upstream behaviour of joining by code, not changed). Consume-once stops it repeating.
- **E6 — sessionStorage blocked** (private mode / strict iframe storage). Cannot remember across the post-match reload. Owner question Q2.
- **E7 — invalid / foreign payload.** Ignored; not stored.
- **E8 — no SDK on the host** (degraded boot, `isAvailable: false`, error, timeout). Copies the code only. Never a `geoconflict.ru` URL, never a self-built Yandex URL.
- **E9 — host copies before the link has loaded.** Copies the code (0380 path); the hint still says "code". Next copy after it lands copies the link.
- **E10 — copy fails.** 0380's red line, unchanged.
- **E11 — standalone build.** No SDK → no payload, no link; `#join=` and the standalone link exactly as today.
- **E12 — reconnect banner at the same time.** Can show next to the Join window, same as `#join=` today. Not changed.
- **E13 — non-tester friend** (no Private tab, flags off). Join window still opens (ruling (a)); the modal lives outside the tab panels.

## Files
| File | Change |
|---|---|
| `src/client/InvitePayload.ts` | **new** — parse + validate + consume-once + the open decision |
| `src/client/PrivateLobbyInvite.ts` | `buildInviteLink()`; `inviteCopyText()` 4th arg |
| `src/client/flashist/FlashistFacade.ts` | additive only, small: `loadPortalGameUrl()` + `portalGameUrl`, `getInvitePayload()`, `whenYandexSdkAvailable()` + one line in `initLoadedYandexSdk()`. No edit to other tasks' hunks. |
| `src/client/HostLobbyModal.ts` | prefetch in `open()`; pass `portalGameUrl` in `copyToClipboard()`; hint switch |
| `src/client/Main.ts` | startup + late payload read; tutorial skip; `shouldAutoLaunchTutorial()` |
| `resources/lang/en.json`, `ru.json` | `host_modal.invite_link_hint` in both |
| tests (below) | new + updated |

**Not touched:** 0412's files (`StartScreenTabs*`, `PrivateLobbyAccess.ts`, both HTML templates, `main.*` keys), 0413's files (`JoinPrivateLobbyModal.ts`, `ClientGameRunner.ts`, `private_lobby.paste_hint`), `src/core/`, `src/server/`, `location.search`, `handleHash()`. Size: ~180–230 lines of source + tests.

## Order of work
1. `InvitePayload.ts` + its tests. 2. `buildInviteLink` / `inviteCopyText` + update 0380's tests. 3. Facade methods + tests. 4. HostLobbyModal + tests. 5. Main wiring + tutorial skip + tests. 6. Lang keys. 7. Full checks.

## Tests (brief step 8, all covered)
- **`tests/client/InvitePayload.test.ts` (new):** valid code opens; lowercase/dashes/spaces cleaned (0389); invalid, wrong alphabet, wrong length, non-string, empty, very long → ignored and not stored; same code a second time (new "page", same storage) → not opened; different code → opens; list capped at 20; in-page double read opens once; storage throwing / missing → per Q2; busy → not opened and marked handled; **flags off** (PrivateLobbyAccess / flag check mocked to deny) → still opens (ruling (a)); source guard: the file never writes `location.search` or `history`.
- **`tests/client/PrivateLobbyInvite.test.ts`:** link from a URL without a query; with an existing query (kept); with an existing `payload` (replaced); with a hash (kept); bad URL → null; `inviteCopyText` Yandex+URL+valid code → link; Yandex+null URL → code; Yandex+URL+empty/invalid code → code; standalone unchanged. Fake URLs only (`https://portal.example/...`), fake ids — no real domain or app id.
- **`tests/client/FlashistFacade.test.ts`:** `loadPortalGameUrl` — success → URL, one call only (memo), called with a **number**; `isAvailable: false` → null and memoized; reject → null, not memoized (second call retries); no SDK / no GamesAPI / non-numeric id → null, no call; non-https or unparsable URL → null; hang → null after 5 s (fake timers). `getInvitePayload` — string, missing SDK, non-string. `whenYandexSdkAvailable` — resolves at once with SDK; resolves when the SDK is assigned later.
- **`tests/client/HostLobbyModalUrl.test.ts`:** Yandex + link ready → copies the link, `copyText` still called synchronously in the click; link not ready → bare code; standalone unchanged; `open()` starts the fetch on Yandex only; hint switches when the link lands; hidden code stays hidden.
- **Main wiring:** `shouldAutoLaunchTutorial` unit test; source-text guard (same style as 0380 R2, since `Client` is not exported) that Main calls `openInviteFromPayload` at startup and on `whenYandexSdkAvailable`, passes `this.joinModal.open`, and passes no flag check.
- **Lang:** new key present in `en.json` and `ru.json` (existing lang test pattern).
- Expect the `jose` test stub (0380 decision 3) for new test files that import `Schemas`.

## Verification (matches the brief)
1. All tests above pass. 2. `git diff`: no app id, no `yandex.<tld>` literal building a link, no write to `location.search` / `history` query. 3. Both lang files carry the new key. 4. `npm test`, `npm run lint`, `npx tsc --noEmit` green (supertest flake rule applies; re-runs reported). 5. Live check is `0383` — not held open for it.

## What cannot be verified locally (stays for 0383)
- That `environment.payload` and `getGameByID` behave in our build as in the console probe; that `Number(app.id)` works (the probe passed the string; Yandex docs type it as a number).
- That the SDK copy of a link works inside the iframe click; mobile; domains other than .ru/.com.
- Whether `sessionStorage` works inside the Yandex iframe on all browsers.
- The tutorial race (E1) is from reading the code, not reproduced.
- **0383 consistency:** 0383 step 3 uses a fresh/incognito friend — that is exactly E1. If Q1 is not "skip", 0383 step 3 will likely fail. Steps 1–2 (link shape, portal follows host), 4 (once only), 5 (new invite opens) map to E2/E3 and the host-side design. Suggest 0383 also records whether the friend was a first-time player.

## Out of scope
Changing the code format; the standalone build; `handleHash()`; any Private-tab switching (unless Q3 says so); analytics events for invites (none exist today; could be a follow-up task if the owner wants usage numbers); asking Yandex support (dropped by owner ruling).

## Deploy note
Client-only change. Ships with the normal game build in a weekend slot. No server, profile, env or nginx change. Ship together with 0380 (already done) so the host copy and the friend read go out at once; then run 0383. Nothing committed without the owner's ask.

## Seams with in-flight work
- 0413: we call `JoinPrivateLobbyModal.open(code)` as-is; no edit to that file.
- 0412: the payload path does not consult `PrivateLobbyAccess`; no tab switching (Q3).
- `FlashistFacade.ts`: additive methods only, away from other tasks' hunks.
