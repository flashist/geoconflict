# Join-private-lobby modal: replace the paste button that cannot read the clipboard inside Yandex Games

## ID
0413

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree) is `0412`, so this is `0413` (and its split sibling `0414`).
> `grep -rn '0413\|0414' ai-agents/tasks ai-agents/sprints`: no hits before this filing.

> 🔀 **MERGED 2026-10-08 — this task now also carries the former `0414` (the error window's copy button). Two parts:
> Part A = the paste fix (below, unchanged), Part B = the error window's copy button.** OWNER RULING, 2026-10-08, typed
> directly by the owner in the `fkit lead` session, relayed verbatim by `fkit-lead` to a spawned `fkit-producer` with no
> owner channel (ADR-021/037); ⛔ not producer precedent. `fkit-lead` asked, verbatim: *"keep 0413/0414 split or merge
> them? And file the app-wide "no browser tooltips" task, and where?"* Owner, verbatim: *"1. Merge. 2. Brief a task to
> the backlog."* `0414` was cancelled by `/fkit-task-cancelled` as merged here; its ID stays used. The H1 and folder
> name still name only Part A — kept on purpose (a folder is never renamed); **read Part B as equal scope.**

## Sprint
Sprint 7

> 📌 **OWNER RULING, 2026-10-08, typed directly by the owner in the `fkit lead` session**, relayed verbatim by
> `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
> *"brief a task for "How it could be fixed" and add it to the current sprint."* Never filed on the Backlog board.
> The owner did **not** say this ships today — the weekend-slot deploy rule (2026-09-29) applies unless the owner says
> otherwise; the same-day exception for `0407`–`0409` does not extend to it.

## Priority
58

⚠️ **Priority 58 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 append position after
[Sprint 7](../../../sprints/plan-sprint-7.md)'s highest (57, `0412`); the owner named the sprint, not a rank.
**On merit this belongs directly below `0412`** anyway, because it blocks nothing, nothing in Sprint 7 waits on it, a
working workaround exists (type or paste into the box), and the private-lobby row is still shown only to testers or
behind the `private_lobbies_all` flag (`0354`), so few players can reach the dead button today.

> 🔀 **After the 2026-10-08 merge:** rank stays **58**. `0414`'s row keeps its 59 as a `⛔ Cancelled` row (closed rows
> are never renumbered); nothing moved up. The merit statement above still holds for the merged task — Part B is small
> and only matters when a player hits the error window.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

### What was found (2026-10-08, production game `0.0.157`, inside the Yandex Games iframe, owner's session)

In the "Присоединиться к приватному лобби" modal, pressing the paste (clipboard) icon next to the "Введите ID лобби" box
does nothing. The owner's console (screenshot), verbatim:

- `[Violation] Permissions policy violation: The Clipboard API has been blocked because of a permissions policy applied to the current document.`
- `Failed to read clipboard contents: NotAllowedError: Failed to execute 'readText' on 'Clipboard': The Clipboard API has been blocked because of a permissions policy applied to the current document.` (thrown in `pasteFromClipboard`)

Typing into the box, or pasting with the keyboard (Cmd+V / Ctrl+V), works — that workaround was given to the owner.
Found during the live check of `0398`.

### Why it can never work inside Yandex Games (checked in code by `fkit-lead`, 2026-10-08)

- `src/client/JoinPrivateLobbyModal.ts` — `pasteFromClipboard()` (around line 238) calls `navigator.clipboard.readText()`
  and only `console.error`s on failure. The button sits next to `#lobbyIdInput` (render, around lines 69–95).
- The Yandex Games iframe's permissions policy blocks clipboard **reads** for the game's document, so `readText()`
  throws `NotAllowedError` for **every** player inside Yandex — this is not a per-player or per-browser problem.
- The Yandex SDK offers `clipboard.writeText` but **no read** method, so there is no SDK route around it either.
- Outside Yandex (the standalone `index.html` page) the browser's clipboard read may still work, so the button need
  not disappear there.

### Owner ruling — scope (2026-10-08, typed live in the `fkit lead` session)

`fkit-lead` listed, verbatim: *"1. Hide the paste button inside Yandex, and show a hint like "Вставьте ID (Ctrl+V /
долгое нажатие)". That's my recommendation: it's simple and honest. 2. Keep the button, but when pressed, put the cursor
in the box and show that hint. 3. Plus: move the error window's copy button to Yandex's clipboard method, like 0380 did
for the host's copy button."*

Owner, verbatim: *"brief a task for "How it could be fixed" and add it to the current sprint."*

⇒ Scope is the paste-button fix (Part A) **plus** item 3 (the error window's copy button, Part B). Item 3 was first
filed as its own task `0414` and **merged back into this task by owner ruling 2026-10-08** (*"1. Merge."* — see the
merge note under `## ID`). **The owner did not choose between options 1 and 2** — that is this task's one open point,
for the coder's plan gate (below). Part B has no open point.

### Part B context — the error window's copy button (from `0414`, checked by `fkit-lead` 2026-10-08)

- The **copy** side was already fixed for the host's invite: task `0380` added `FlashistFacade.copyText()`
  (`src/client/flashist/FlashistFacade.ts`, around lines 1952–1990) — the Yandex SDK `clipboard.writeText` first,
  called inside the click before any `await`, then `navigator.clipboard.writeText` as a fallback; it returns `true`/
  `false` and never throws. `src/client/HostLobbyModal.ts` (around line 1060) uses it.
- **The remaining gap:** the error window built in `src/client/ClientGameRunner.ts` (around lines 1363–1367) has a
  "copy" button (`error_modal.copy_clipboard`) that still calls `navigator.clipboard.writeText` **directly**. Inside the
  Yandex iframe the clipboard is blocked by the permissions policy (the owner's console showed it for the read), so this
  button **may** fail there too.
- ⚠️ **Not proven that it fails today** — nobody has pressed it inside Yandex. Worth doing either way: it puts every
  copy in the game on the one path `0380` built.
- ⚠️ `0380`'s own live check is still open: the wiki records it as **not verified in the Yandex iframe** whether the SDK
  clipboard or the fallback actually copies there — that is verify task `0381` (Backlog board). Part B inherits that
  unknown; it does not add a new one, and it does not wait on `0381`.

### Dependencies and conflicts

- No conflict with a locked decision found. `0380` / ADR-119 settled the **copy** side (SDK `writeText` inside the
  click); nothing settled the paste side. Part B follows ADR-119 / `0380` exactly.
- `0412` (Sprint 7) moves the private-lobby **buttons** into a new start-screen tab; the join **modal** this task edits is
  unchanged by it. No wait either way — they can ship in either order.

## What to build

Client-only. Two parts: **Part A** (§1–§4) centres on `src/client/JoinPrivateLobbyModal.ts`, plus lang keys and tests;
**Part B** (§5) is the error window's copy button in `src/client/ClientGameRunner.ts`. The parts touch different files
and can be built and tested separately inside this one task.

### 1. Decide whether this page may read the clipboard — by capability, not by "are we in Yandex"

- Treat clipboard read as **unavailable** when any of these holds: `navigator.clipboard` or `readText` is missing; the
  browser reports that the permissions policy disallows `clipboard-read` (where the browser exposes such a check); or a
  `readText()` call has already failed with a permissions/not-allowed error this session.
- Do **not** hard-code "inside Yandex ⇒ unavailable" where a capability check works. A platform check may be used only
  as an extra signal where no capability check answers (state it in the plan if used).
- Note for the plan: no capability check may answer before the first press in some browsers. Whatever option is chosen,
  **a press that fails must still end in the hint**, never in silence (today's bug) — so the hint path is the safety net
  even when the up-front check said "available".
- Outside Yandex, where reading works, the button keeps working exactly as today.

### 2. When clipboard read is unavailable — the open point (owner confirms at the plan gate)

| Option | What the player sees | Recommendation |
|---|---|---|
| **1** | The paste button is **hidden**; a short hint tells the player how to paste by hand. | **`fkit-lead` recommends 1** — *"simple and honest"*: no button that cannot work. |
| **2** | The button stays; pressing it puts the cursor in the ID box and shows the same hint. | — |

- The coder recommends one at the plan gate; the owner confirms. Do not pick silently.
- Where the hint lives (a line under the box, the box's placeholder, or next to the button) is part of the same plan
  gate — say which and why. The existing placeholder "Введите ID лобби" (`private_lobby.enter_id`) stays unless the plan
  proposes otherwise.

### 3. Hint text — RU + EN, part of the same open point

- Lead's RU draft: **"Вставьте ID (Ctrl+V / долгое нажатие)"**. The coder proposes the EN text (e.g. "Paste the ID
  (Ctrl+V / long-press)"); the owner confirms both.
- ⚠️ Worth raising at the gate: Mac players paste with **Cmd+V** (the owner did), not Ctrl+V; "долгое нажатие" covers
  phones. Whether the hint names Cmd too is the owner's call.
- Through `translateText()`; new key(s) under `private_lobby` in **both** `resources/lang/en.json` and
  `resources/lang/ru.json`. No hardcoded user-visible text.

### 4. Leave everything else unchanged

- Typing and keyboard paste into the box keep working; the task-`0389` code clean-up of whatever was typed or pasted is
  untouched.
- No new analytics event is required by this task. If the coder thinks one is worth adding (e.g. a paste-fallback
  count), raise it at the plan gate; if added, use the enum and update
  `ai-agents/knowledge-base/analytics-event-reference.md`.

### 5. Part B — the error window's "copy" button copies through `FlashistFacade.copyText` (from `0414`)

- The error window's copy button copies through `FlashistFacade.copyText(content)` instead of
  `navigator.clipboard.writeText`.
- **Inside the click, nothing awaited before the call** — `copyText` must start the SDK copy synchronously within the
  user's click (the SDK fails with "Document is not focused" otherwise; see `copyText`'s own comment).
- Button text follows `copyText`'s result: `true` → `error_modal.copied`, `false` → `error_modal.failed_copy` (the
  existing keys; no new text needed).
- The error window can appear early or while the SDK is degraded — `copyText` already falls back to the browser's
  clipboard when the SDK is absent; confirm in the plan that reaching the facade from `ClientGameRunner.ts` works in
  that state too (no throw, still falls back).
- Grep for any other direct `navigator.clipboard` call in `src/client/` and list it in the worklog. The paste (read)
  side is Part A; any other **write** call found is reported to the owner, not changed silently.

## Verification steps

1. **Unit tests** for `JoinPrivateLobbyModal` (new test file if none exists):
   - **read unavailable** (`navigator.clipboard` absent, or `readText` absent, or the policy check says no) → per the
     chosen option: option 1 → no paste button rendered and the hint shown; option 2 → button shown, a press focuses
     the ID box and shows the hint, and `readText` is not relied on.
   - **read available but the press fails** (`readText` rejects with a `NotAllowedError`) → the hint is shown and the
     box is focused; nothing is set as the lobby id; no unhandled rejection.
   - **read available and works** → the press fills the box with the clipboard text exactly as today (same
     `setLobbyId` path); no hint shown.
2. **Localization:** the hint key(s) exist in both `en.json` and `ru.json` with the owner-approved text; no hardcoded
   text.
3. **Local check, both pages:** on `index.html` in a normal browser tab the paste button still works; with clipboard
   read blocked (e.g. the Yandex template or a browser setting that denies it) the chosen behaviour shows. Screenshot
   both into the worklog, RU.
4. **Part B unit test** for the error window's copy button:
   - pressing it calls `copyText` with the window's content, and the SDK path is reached without an earlier `await`
     (same style of assertion as the `0380` tests in `tests/client/FlashistFacade.test.ts` / the host-lobby tests);
   - `copyText` resolves `true` → button reads the "copied" text; resolves `false` → "failed to copy" text; no
     unhandled rejection;
   - `navigator.clipboard.writeText` is no longer called directly from `ClientGameRunner.ts`.
5. **Part B grep:** every remaining direct `navigator.clipboard` call in `src/client/` is listed in the worklog, each
   with a one-line reason it stays (Part A's `readText` may legitimately stay for outside Yandex; no direct
   `writeText` remains in `ClientGameRunner.ts`).
6. `npm test` and `npm run lint` pass.
7. **Live checks — left OPEN, not filed now.** After the deploy, inside the Yandex Games iframe: (A) the join modal
   shows the chosen behaviour, and no `NotAllowedError` from `pasteFromClipboard` appears in the console; (B) force the
   error window (any safe way the coder documents) and press "copy": the text lands on the clipboard. Per the owner's
   build/verify split rule (2026-09-29), if this needs a deploy + owner check it becomes its own verify task at the top
   of the next sprint; **no verify task is filed now**.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Merged from two tasks by owner ruling (2026-10-08).** The owner's "How it could be fixed" covered this paste fix
  **and** the error window's copy button (lead's item 3). The producer first filed them as two tasks under the skill's
  smallest-shippable-unit rule — this one and
  [`0414`](../../cancelled/0414-error-modal-copy-button-copies-through-flashistfacade-copytext/brief.md). The owner then ruled,
  verbatim, *"1. Merge."* — so `0414`'s scope is Part B here and `0414` is cancelled as merged. The owner's ruling beats
  the skill's split rule on this point.
- Related: `0380` (the copy-side fix, `FlashistFacade.copyText`), `0381` (`0380`'s open live check), `0302` / `0354`
  (private lobbies and who sees them), `0412` (Sprint 7 — moves the private-lobby buttons into a new tab; the join modal
  is unchanged by it, no wait), `0398` (found during its live check), `0389` (code clean-up on join — unchanged).
- ⚠️ **Overlap to watch:** `0415` (Backlog board, filed 2026-10-08) removes native browser tooltips app-wide by
  renaming the `title` property of `o-modal` / `o-button` — it will touch `JoinPrivateLobbyModal.ts`'s `<o-modal>` and
  `<o-button>` too. No wait either way; whichever lands second rebases on the other.
- Deploy: weekend slot (owner rule 2026-09-29) unless the owner says otherwise.
- No ids, hosts, URLs or secrets belong in this brief or its follow-ups (the browser's bug-tracker link in the console
  line was deliberately left out).
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner ruling relayed by `fkit-lead`. ⛔ Not producer precedent.
