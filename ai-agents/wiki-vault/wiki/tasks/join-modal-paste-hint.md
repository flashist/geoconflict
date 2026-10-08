# Join-Private-Lobby Window: Replace the Paste Button That Cannot Read the Clipboard Inside Yandex, and Route the Error Window's Copy Through `copyText` (task 0413)

**Source**: `ai-agents/tasks/done/0413-join-private-lobby-modal-replace-the-paste-button-that-cannot-read-the-clipboard-inside-yandex/brief.md` (`plan.md`, `worklog.md`, `review.md` and `screenshots/` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 58 (ADR-035 append rank) / task `0413` (absorbed cancelled `0414` as Part B)

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-08 by `fkit-sprint-ship-loop`. Committed in `a555111`
> (2026-10-08, "Sprint push"); `git tag --contains a555111` → none ⇒ **committed, not deployed** (checked 2026-10-08).
> Weekend-slot deploy. Live look → `0420` ([[decisions/sprint-8]]); its Part B item is ruled **"not checked live"**.

## Goal

**Part A.** On production `0.0.157`, inside the Yandex iframe, the paste icon in the Join window did nothing: the
iframe's permissions policy blocks clipboard **reads** (`NotAllowedError` in `pasteFromClipboard`), for every player.
The Yandex SDK offers `clipboard.writeText` but no read. Found during `0398`'s live check
([[tasks/paid-citizen-ad-free-live]]). Typing or keyboard paste worked.

**Part B** (from `0414`, merged by owner ruling *"1. Merge."* — [[decisions/cancelled-tasks]]). The error window's
"copy" button called `navigator.clipboard.writeText` directly; move it onto `FlashistFacade.copyText()`, the SDK-first
path `0380` built ([[tasks/yandex-invite-copies-code]]). Not proven to fail before — done to put every copy on one path.

## Key Changes

**Owner answers at the plan gate (2026-10-08):** Q1 **option 1 — hide the button and show a hint** when paste is
unavailable · Q2 **a small line under the box** · Q3 RU **`Вставьте ID: Ctrl+V / ⌘V или долгое нажатие`** / EN **`Paste
the ID: Ctrl+V / ⌘V or long-press`** (key `private_lobby.paste_hint`, both lang files).

- `src/client/JoinPrivateLobbyModal.ts` — `clipboardReadAvailable()` decides **by capability, not by "are we in
  Yandex"**: missing `navigator.clipboard` / `readText` → no; `document.permissionsPolicy ?? document.featurePolicy`
  `.allowsFeature("clipboard-read")` → its answer where the browser has it; a remembered not-allowed failure this
  session → no. Unavailable ⇒ no button + the hint line. A press that fails (`NotAllowedError` / `SecurityError`)
  remembers it, hides the button, shows the hint and focuses the box — never silent. Success path unchanged.
  `open(id)` shape unchanged (the `0382` seam).
- `src/client/ClientGameRunner.ts` — the error window's copy calls `FlashistFacade.instance.copyText(content)` first in the
  click, nothing awaited before it; the text follows the result (`error_modal.copied` / `failed_copy`).
  `showErrorModal` now exported for tests. No direct `navigator.clipboard` write is left in `src/client/` outside
  `copyText`'s own fallback.
- New suites `JoinPrivateLobbyModalPaste.test.ts`, `ErrorModalCopy.test.ts`. **Review R1 (low, test-only):** the
  `permissionsPolicy` branch and its precedence over `featurePolicy` were untested — two cases added.

## Outcome

- Full `npm test` green on the first run (213 suites); tsc, lint clean; six mutation proofs.
- **Local checks (Playwright, RU):** normal page — paste works, no hint; permission denied — after the press the button
  is gone, hint shown, box focused and empty, still hidden after reopen; **a cross-origin iframe** with no `allow`
  attribute (the Yandex condition) — `allowsFeature('clipboard-read')` = `false`, no button, hint shown, `readText`
  never called. ⚠️ A control `readText()` there failed on focus, not policy, so the `allowsFeature` reading is the
  evidence. Error window — copy worked through the **browser fallback only**; the SDK path is **unverified** (no SDK
  locally).
- **Unverified until live:** that the real Yandex iframe reports `clipboard-read` as blocked, and the SDK copy path of
  the error window. Owner ruling on `0420` (2026-10-08): the error window is **"not checked live"** — no safe way to
  raise it in production.

## Related

- [[decisions/cancelled-tasks]] — `0414`, merged here as Part B
- [[tasks/yandex-invite-copies-code]] — task `0380`, `FlashistFacade.copyText`
- [[tasks/paid-citizen-ad-free-live]] — task `0398`, during whose live check the paste bug was found
- [[tasks/private-lobby-code-format]] — task `0389`, the code clean-up on join (unchanged)
- [[tasks/yandex-invite-sdk-link]] — task `0382`, the invite link that opens the same Join window
- [[tasks/start-screen-private-tab]] — task `0412`, which moved the Join button into the new tab
- [[tasks/private-lobby-citizen-perk]] — the private-lobby feature
- [[decisions/sprint-7]] — the board (rank 58)
- [[decisions/sprint-8]] — `0420`, the live-check checklist
