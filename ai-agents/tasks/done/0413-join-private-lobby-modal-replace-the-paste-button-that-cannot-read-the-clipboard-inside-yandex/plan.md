# Plan — 0413: Join-private-lobby modal paste fix (Part A) + error window copy button (Part B)

Planning only. No code or files were written.

## Summary
- **Part A:** the paste button in the join window checks whether this page is allowed to read the clipboard. When it can't, the player sees a short "how to paste" hint instead of a button that does nothing. A press that fails always ends with the hint and the cursor in the ID box, never silence like today.
- **Part B:** the error window's "copy" button copies through `FlashistFacade.copyText()`, the same path `0380` built for the host's invite. One handler change in `ClientGameRunner.ts`.
- Client only. No server, nginx or HTML-template changes. Deploy in the weekend slot.
- **3 owner decisions are needed at the gate:** option 1 or 2, where the hint goes, and the hint text. The plan below assumes my recommendations (option 1, a line under the box, the text that names both Ctrl and Cmd).
- **Not provable locally:** whether Yandex's iframe really reports "clipboard read blocked" before the first press. It almost certainly does in Chrome, but only the live check after deploy proves it. The failed-press safety net covers both cases.

## Goal
1. Inside Yandex Games the join window no longer offers a paste button that silently fails. The player is told how to paste by hand. Outside Yandex, where reading the clipboard works, the button behaves exactly as today.
2. Every "copy" in the game goes through `FlashistFacade.copyText` (Yandex SDK first, browser clipboard as fallback).

## What the code looks like today (checked 2026-10-08)
- `src/client/JoinPrivateLobbyModal.ts`
  - The paste `<button class="lobby-id-paste-button">` sits next to `#lobbyIdInput` (render, lines 69–95).
  - `pasteFromClipboard()` (lines 238–245) calls `navigator.clipboard.readText()` and on failure only does `console.error`. That is the bug.
  - `open(id)` (lines 138–144) calls `setLobbyId(id)` and then `joinLobby()`. `0382` will reuse this exact entry point, so its shape stays unchanged.
- `src/client/ClientGameRunner.ts`
  - `showErrorModal()` (module-private, starts line 1331) builds the error window. Its copy button calls `navigator.clipboard.writeText(content)` directly (line 1367).
  - The file already imports named exports from `./flashist/FlashistFacade`.
- `src/client/flashist/FlashistFacade.ts` — `copyText(text)`:
  - The SDK call is made synchronously.
  - When the SDK is missing (`this.yandexGamesSDK?.clipboard?.writeText` is undefined) it falls through to `navigator.clipboard.writeText`.
  - If `navigator.clipboard` is itself missing, the resulting TypeError is caught and it returns `false`.
  - It never throws.
  - **This means the degraded / early-error case already works:** no throw, and it still falls back. Confirmed by reading the code.
  - ⚠️ This file has uncommitted changes from other closed tasks. Part B does not edit it.
- A grep for direct `navigator.clipboard` in `src/client/` finds exactly 3 hits:
  - `JoinPrivateLobbyModal.ts:240` — `readText`. This is Part A; it stays as the outside-Yandex path.
  - `ClientGameRunner.ts:1367` — `writeText`. This is Part B; it is removed.
  - `FlashistFacade.ts:1990` — `writeText`. This is `copyText`'s own fallback and stays.
  - No other write call exists, so there is nothing extra to report to the owner. This list goes into the worklog.
- Styles: `.lobby-id-box` and `.lobby-id-paste-button` live in `src/client/styles.css` (lines 535–580).

## Part A — approach

### A1. A "can this page read the clipboard?" check, by capability (brief §1)
These go in `JoinPrivateLobbyModal.ts`, kept small, with no new module.
- A module-level session memory, `clipboardReadBlocked = false`. It is not `localStorage`: it is a fresh guess every session.
- `clipboardReadAvailable()` returns `false` when any of these holds:
  1. `navigator.clipboard` or `navigator.clipboard.readText` is missing.
  2. The browser exposes a permissions-policy check and it says no. That is `document.permissionsPolicy?.allowsFeature("clipboard-read")`, or the older `document.featurePolicy?.allowsFeature(...)`. Chromium has this, so it covers Chrome, Edge and Yandex Browser, which is most players. Firefox and Safari do not expose it, so there the check simply doesn't answer.
  3. `clipboardReadBlocked` is `true` because an earlier press this session failed with a "not allowed" error.
- **No "inside Yandex ⇒ unavailable" rule.** Capability signals only, as the brief asks.
- `navigator.permissions.query({name: "clipboard-read"})` is deliberately not used. It is async, Firefox throws on that name, and "prompt" doesn't tell us anything.
- `resetClipboardReadMemoryForTests()` is exported, following the existing `resetStartScreenPresenceForTests` style.

### A2. The modal reacts to it (option 1, recommended)
- A `@state() pasteUnavailable`, worked out when the modal opens (in `open()`) and on first render.
- `requestUpdate()` is called explicitly, as the file already does, because of the test-build quirk.
- When `pasteUnavailable` is true:
  - the paste button is not rendered;
  - a hint line is shown under the ID box.
- When it is false, the window renders exactly as today.
- **Safety net on press:** `pasteFromClipboard()` becomes:
  - success → `setLobbyId(clipText)`, the same as today (an empty clipboard still clears the box, unchanged);
  - failure →
    - `console.warn` (not `error`) with a short reason;
    - if the error is `NotAllowedError` or `SecurityError`, set `clipboardReadBlocked = true`, so the button hides for the rest of the session;
    - show the hint;
    - focus `#lobbyIdInput`;
    - nothing is set as the lobby ID, and no unhandled rejection is possible.
  - Any other error also shows the hint and focuses the box, but keeps the button, because it may be a one-off.
- In Chrome inside Yandex the button is hidden from the first render, so `readText` is never called. Neither the `[Violation]` line nor the `NotAllowedError` line appears.
- In Firefox or Safari inside Yandex (if the policy blocks there too), the first press fails, the player gets the hint plus focus, and the button disappears for the rest of the session.
- **If the owner picks option 2 instead:** the button always stays. When `pasteUnavailable` is true, a press skips `readText`, focuses the box and shows the hint. The failed-press path is the same as above, minus hiding the button. It is roughly the same size of change.

### A3. Hint placement (recommended: a small line under the box)
- A new `<div id="lobby-id-paste-hint">` directly under `.lobby-id-box`, styled with Tailwind utility classes inline (small, muted, centred).
- No `styles.css` edit is needed. That keeps us clear of `0412`, which is restyling nearby right now.
- The hint is **separate from** `.message-area`, which carries join status ("checking…", "not found"). The two must not overwrite each other.
- The placeholder `private_lobby.enter_id` stays.
- The option of putting the hint next to the button as a tooltip is rejected, because `0415` is removing browser tooltips app-wide.

### A4. Text (brief §3)
- New key `private_lobby.paste_hint`, added to **both** `resources/lang/en.json` and `resources/lang/ru.json`, and used via `translateText()`.
- Proposed text, pending the owner's choice:
  - RU: "Вставьте ID: Ctrl+V / ⌘V или долгое нажатие"
  - EN: "Paste the ID: Ctrl+V / ⌘V or long-press"
- It goes in the `private_lobby` section. `0412` uses `main`, so the two don't collide.

### A5. Left unchanged (brief §4)
- Typing and keyboard paste work as before.
- The `@keyup` → `handleChange` path is unchanged.
- The `0389` code clean-up in `joinLobby()` is untouched.
- `open(id)`, so the seam with `0382` is unchanged.

## Part B — approach
- `ClientGameRunner.ts`: add `FlashistFacade` to the existing import from `./flashist/FlashistFacade`.
- Replace the click handler with:
  ```ts
  button.addEventListener("click", async () => {
    let copied = false;
    try {
      copied = await FlashistFacade.instance.copyText(content); // first call, nothing awaited before it
    } catch {
      copied = false; // copyText never throws; belt-and-braces so the click can never leave an unhandled rejection
    }
    button.textContent = translateText(
      copied ? "error_modal.copied" : "error_modal.failed_copy",
    );
  });
  ```
- Uses the existing keys. No new text.
- Add `export` to `function showErrorModal`, so the test can call it directly. It is a one-word change with no behaviour change. Comment: "exported for tests".

## Files touched
| File | Change |
|---|---|
| `src/client/JoinPrivateLobbyModal.ts` | capability check, session memory, `pasteUnavailable` state, hint line, safer `pasteFromClipboard()` |
| `src/client/ClientGameRunner.ts` | error-window copy uses `FlashistFacade.copyText`; `showErrorModal` exported |
| `resources/lang/en.json`, `resources/lang/ru.json` | `private_lobby.paste_hint` |
| `tests/client/JoinPrivateLobbyModalPaste.test.ts` (new) | Part A tests + lang key check |
| `tests/client/ErrorModalCopy.test.ts` (new) | Part B tests |

- **Not touched:** `0412`'s files (`StartScreenTabs*`, `PrivateLobbyAccess.ts`, the templates, `main.*` keys, `tests/client/PrivateLobbyLang.test.ts`, which has uncommitted `0412` edits), `FlashistFacade.ts`, and `styles.css`.

## Tests

**`JoinPrivateLobbyModalPaste.test.ts`** (jsdom, same mocks as `JoinPrivateLobbyModalLeave.test.ts`)
1. `navigator.clipboard` is absent → no paste button, hint shown.
2. `readText` is absent → same as 1.
3. The policy check says no (stub `document.featurePolicy.allowsFeature` → false for `clipboard-read`) → same as 1, and `readText` is never called.
4. Read is available but the press fails with a `NotAllowedError` (a rejected `DOMException`) →
   - hint shown;
   - `document.activeElement` is `#lobbyIdInput`;
   - box value unchanged;
   - no unhandled rejection;
   - after the re-render the button is gone;
   - a reopened modal still has no button (session memory).
5. Read is available but the press fails with some other error → hint shown and box focused, button still there.
6. Read is available and works → the box gets the clipboard text through the same `setLobbyId` path, including a full `#join=` link reduced to the ID as today; no hint.
7. `open("K7M4PCRX")` still fills the box and starts the join with paste unavailable (guards the `0382` seam).
8. Lang: `private_lobby.paste_hint` is non-empty in both `en.json` and `ru.json`, matches the approved text, and does not name the game (same rule as the `0302` lang test).
- Each test resets the session memory and restores `navigator.clipboard` / `document.featurePolicy`.

**`ErrorModalCopy.test.ts`** (jsdom; reuses `ClientGameRunnerTeardown.test.ts`'s mock set; the `FlashistFacade` mock adds `FlashistFacade.instance.copyText`)
1. Clicking the copy button calls `copyText` once, with the window's full text, **before anything is awaited** (checked synchronously right after `click()`, the same style as `0380`'s `HostLobbyModalUrl.test.ts`).
2. Resolves `true` → button reads `error_modal.copied`.
3. Resolves `false` → button reads `error_modal.failed_copy`.
4. Rejects (defensive) → `error_modal.failed_copy`, no unhandled rejection.
5. `navigator.clipboard.writeText` (a spy) is never called from the error window.
- If loading `ClientGameRunner.ts` under jsdom proves brittle, fallback: move the button wiring into a tiny helper inside the same file and test that. Same behaviour; I'll note it in the worklog if used.

**Gate:** `npm test` and `npm run lint` both pass. Known flakes are judged by the `CLAUDE.md` rules; any re-run is stated as a re-run.

## How to check it locally (the clipboard only fails inside a cross-origin iframe)
1. **Normal page:** `npm run dev`, open `index.html` in Chrome, copy a lobby code, press paste → the box fills (allow Chrome's permission prompt). No hint.
2. **Blocked by permission (tests the failed-press safety net):** Chrome site settings → Clipboard → Block, then press paste → hint shown, cursor in the box, button disappears.
3. **Blocked by policy (reproduces the Yandex condition):** make a throwaway wrapper page outside the repo, in the scratchpad, containing `<iframe src="<local dev URL>/yandex-games_iframe.html">` with no `allow` attribute. Serve it from a *different* origin (another port or host name). A cross-origin iframe without `allow="clipboard-read"` is blocked by default, which is what Yandex does.
   - Inside the frame, `document.featurePolicy.allowsFeature('clipboard-read')` should print `false`.
   - The join window should show no button, just the hint.
   - If the dev server refuses to be framed, I'll note that and rely on steps 1–2 plus the unit tests.
4. **Error window:** trigger one locally (for example, stop the dev server's worker mid-match, or call the now-exported `showErrorModal` from the console in a dev build). Press copy → "copied", and the text is on the clipboard.
5. Take RU screenshots of steps 1, 3 (or 2) and 4 for the worklog.

## Edge cases considered
- **Safari outside Yandex:** `readText` shows a native "Paste" bubble. If the player dismisses it, we get `NotAllowedError` → the button hides for the rest of the session and the hint shows. That is acceptable (the hint still tells them how), but it is a small behaviour change outside Yandex. Noted, not worked around.
- **Mobile:** focusing the box after an async failure may not open the on-screen keyboard on iOS, because a gesture is needed. The hint still shows. Long-press paste does not fire `keyup`, so a pasted full link is not tidied in the box until Join. `joinLobby()` cleans it anyway (unchanged; outside this task).
- **The `0382` invite opening the window with a code while paste is unavailable:** the hint is visible but harmless, and the join runs as today.
- **The error window appearing before or without the SDK:** `copyText` falls back to the browser clipboard and returns `false` if that fails too → "failed to copy". No throw.
- **Overlap with `0415`** (removes the `title` property on `o-modal` / `o-button`): it touches the same `<o-modal>` / `<o-button>` lines. Whichever lands second rebases on the other; no change here.
- **Overlap with `0412`:** none planned. If `0412` ends up editing `styles.css` near `.lobby-id-box`, my use of Tailwind classes avoids the conflict.

## Analytics
None added. Few players can reach this window today (testers / the `private_lobbies_all` flag), so a paste-fallback count would carry little signal. If the owner wants one anyway, it goes through `flashistConstants.analyticEvents` and `analytics-event-reference.md`.

## Out of scope
- Any SDK clipboard *read*. None exists.
- Changing the placeholder.
- `@keyup` → `@input`.
- `0381`'s open question (whether the SDK copy works in the iframe). Part B inherits it and adds nothing new.
- `0382`'s invite link.

## Deploy + verification after deploy
- Client-only build. Weekend slot (owner rule 2026-09-29) unless the owner says otherwise.
- **Live checks stay open, as the brief says:**
  - (A) inside the Yandex iframe, the join window shows the chosen behaviour and no `NotAllowedError` from `pasteFromClipboard` appears. In Chrome that should be zero clipboard console lines at all; in Firefox or Safari one warning may appear on the first press.
  - (B) force the error window and press copy → the text lands on the clipboard.
- Per the build/verify split rule, these become a verify task at the top of the next sprint, filed at close time, not now.

## Unverified until live
- That Yandex's iframe makes `document.featurePolicy` / `permissionsPolicy` report `clipboard-read` as blocked. This is expected, because the console showed a permissions-policy block, but it is not proven. If it does not report it, the first press fails into the hint and the button hides. That is worse-looking, but never silent.
- The Yandex mobile app / webviews: untested, as with `0380`.
