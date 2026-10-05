# Plan — 0380: on Yandex, the invite copies the lobby code; `#join=` links stop working there

**Planning only. No files written.** Built on the current working tree, which includes 0354's uncommitted changes. This plan adds one new method to FlashistFacade and changes one line in Main.ts. Neither overlaps 0354's edits.

## Summary
- **Fact the owner needs before approving (open question Q1):** today the host window does **not** hide the code by default. `lobbyIdVisible` comes from the user setting `settings.lobbyIdVisibility`, which defaults to `true` (shown) (`HostLobbyModal.ts:632`, `UserSettings.ts:53`). The code is masked only if the player has switched on "Hidden lobby IDs" in Settings. The brief, ADR-119 and ruling (c) all assume it is masked by default.
- Copying never reveals the code. That is already true today: clicking the masked text copies without toggling. The plan keeps it that way.
- Size: about 60–90 lines of source plus tests. Nothing changes in `src/core/` or `src/server/`, and `location.search` is not touched.

## Steps

1. **New helper module `src/client/PrivateLobbyInvite.ts`.** Two pure functions, so the logic can be tested without `Main`, whose `Client` class is not exported:
   - `inviteCopyText(lobbyId, isYandexPlatform, windowOrigin)`: returns the bare `lobbyId` on Yandex. On standalone it returns exactly today's `` `${windowOrigin}#join=${lobbyId}` ``.
   - `lobbyIdFromJoinHash(decodedHash, isYandexPlatform)`: returns `null` on Yandex. Otherwise it returns today's logic: `substring(6)`, then `ID.safeParse`.
   - 0382 can extend this module later.

2. **`FlashistFacade.copyText(text): Promise<boolean>`.** This is the copy wrapper the brief suggests (report §4 B), and 0382 will reuse it.
   - If `yandexGamesSDK?.clipboard?.writeText` exists, call it **first, synchronously** (no `await` before it), wrapped in `Promise.resolve(...)`. Success returns `true`.
   - Otherwise, or if it rejects, fall back to `navigator.clipboard.writeText`. Success returns `true`.
   - If both fail, return `false`. It never throws.
   - Logs which path succeeded (`console.log`), so 0381 can see in the console whether the SDK or the native clipboard did the copy.
   - The doc comment states that it must be called from inside the user's click.

3. **`HostLobbyModal.copyToClipboard()`.**
   - Builds the text with `inviteCopyText(this.lobbyId, FlashistFacade.instance.yaGamesAvailable, FlashistFacade.instance.windowOrigin)`.
   - Calls `FlashistFacade.instance.copyText(text)` as its first action, with no wait before it.
   - On `true`: the existing ✓ tick shows for 2 s, and `copyFailed` is cleared.
   - On `false`: a new `@state copyFailed = true` shows a visible line under the code box, replacing today's silent `console.error`. The line's wording depends on Q2.
   - `reset()` clears `copyFailed`.
   - `lobbyIdVisible` is never touched by copying.
   - Platform test: `yaGamesAvailable` is set from the iframe template's `window.flashist_isYandexPlatform = true` in the facade constructor. So a Yandex boot where the SDK failed still copies the **code**, through the native fallback, and **never a URL**. This holds because the choice depends on the platform, not on whether the SDK is present.

4. **Hint, Yandex build only.** A short line under the code box: "Send this code to a friend — they enter it under «Join Lobby»". The standalone UI stays exactly as today, because there the copy is still a link.

5. **`Main.handleHash()`.** The `#join=` branch calls `lobbyIdFromJoinHash(decodedHash, FlashistFacade.instance.yaGamesAvailable)` and opens the join window only when the result is not `null`.
   - `strip()`, the other hash branches and `location.search` are unchanged.
   - On Yandex, a `#join=` hash is simply ignored, not stripped. That is the smallest change, and the brief forbids touching `strip()`.

6. **Localization, in both `en.json` and `ru.json`, under `host_modal`:**
   - `invite_code_hint`. RU draft: «Отправьте этот код другу — он введёт его в «Присоединиться к лобби».»
   - `copy_failed`. Wording per Q2.

7. **Tests:**
   - `tests/client/PrivateLobbyInvite.test.ts` covers:
     - the copy text on Yandex (bare code) and on standalone (today's link, exact string);
     - `#join=<valid id>` returns the id on standalone and `null` on Yandex;
     - an invalid id returns `null`.
   - `tests/client/FlashistFacade.test.ts`, using the existing `Object.create` pattern, covers:
     - the SDK clipboard is called first, and native is not called when the SDK succeeds;
     - when the SDK rejects, native is used;
     - with no SDK, native is used;
     - when both fail, it returns `false` and does not throw.
   - `tests/client/HostLobbyModalUrl.test.ts`:
     - The existing link test stays as the standalone case. Its mock has no `yaGamesAvailable`, so it covers standalone.
     - New cases:
       - On Yandex the copied text is the bare code.
       - `copyText` is called **synchronously**: it is checked before awaiting `copyToClipboard()`, so it runs inside the click.
       - On Yandex, copying while masked leaves `lobbyIdVisible === false`.
       - When the copy fails, the failure line renders and the tick does not.

8. **Checks before reporting done:** `npm test`, `npm run lint`, `npx tsc --noEmit`, and a `git diff` check that nothing changed in `src/core/` or `src/server/` and nothing touches `location.search`.

## Edge cases covered
- Yandex boot where the SDK failed: copies the code through native; never a URL.
- The SDK rejects after the click: native is tried after an `await`. Chrome's click permission lasts a few seconds, so this should still work, but **it is untested inside the iframe**. If it fails, the host sees the failure message and can still copy the code by hand.
- The Join window still accepts a pasted old `#join=` URL (`extractLobbyIdFromUrl`). That is fine: it only reads the code, it does not navigate anywhere.

## How this relates to the next two tasks (not absorbed)
- **0381** (verify in production): owner-run after deploy. Its steps match this build: code-only paste, old link ignored, standalone unchanged. Its step 2 should be read against the answer to Q1.
- **0382** (link part): reuses `copyText()` and `PrivateLobbyInvite.ts`, and changes what gets copied when the SDK can build a link. Nothing here builds a portal link or reads the payload.

## Not verified
- Whether native `navigator.clipboard` works inside the Yandex iframe. Only a live check (0381) can tell.
- That `ysdk.clipboard.writeText` returns a promise. The plan wraps it in `Promise.resolve`, so it works either way.

---

## Owner rulings at approval (2026-10-04, live via `AskUserQuestion` in the `fkit lead` session, `fkit-sprint-ship-loop`)

- **Plan: APPROVED** — the plan above, with these answers.
- **Q1 (code shown or hidden by default):** "Keep today" — code shown by default; players who turned on 'Hidden lobby IDs' in Settings see dots; the eye button still toggles; copying never reveals a hidden code. No change to the default.
- **Q2 (copy fails completely):** "Point to eye button" — message: "Couldn't copy. Show the code with the eye button and copy it by hand." (just "copy it by hand" when the code is already visible); a hidden code is never revealed automatically.
- **Q3 (friendlier lobby code):** "File a task" — a separate task, filed at the end of Sprint 7 by a producer. **Not part of this task; do not absorb it.**
