# Error window: the "copy" button copies through `FlashistFacade.copyText` (Yandex SDK clipboard first)

## ID
0414

> ℹ️ **ID allocation, checked 2026-10-08 before filing.** Allocated right after its split sibling `0413` (highest
> existing before both was `0412`). `grep -rn '0413\|0414' ai-agents/tasks ai-agents/sprints`: no hits before this
> filing.

## Sprint
Sprint 7

> 📌 **OWNER RULING, 2026-10-08, typed directly by the owner in the `fkit lead` session**, relayed verbatim by
> `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim:
> *"brief a task for "How it could be fixed" and add it to the current sprint."* Never filed on the Backlog board.
> The owner did **not** say this ships today — the weekend-slot deploy rule (2026-09-29) applies unless the owner says
> otherwise; the same-day exception for `0407`–`0409` does not extend to it.

## Priority
59

⚠️ **Priority 59 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 append position after
[Sprint 7](../../../sprints/done/plan-sprint-7.md)'s highest (58, `0413`); the owner named the sprint, not a rank.
**On merit this belongs directly below `0413`**, because it came from the same owner request, blocks nothing, and only
matters when a player hits the error window (rare) — so it is the less urgent of the two.

## Status
⛔ Cancelled (agent-closed — not owner-verified) (2026-10-08) — Merged into 0413 by owner ruling 2026-10-08 (owner, verbatim: "1. Merge."); the error window's copy-button scope is now 0413's Part B

## Owner
fkit-coder

## Context

### Why this exists

While looking at the join-modal paste bug (`0413`, found 2026-10-08 in production `0.0.157` inside the Yandex Games
iframe), `fkit-lead` checked the other clipboard calls in the client:

- The **copy** side was already fixed for the host's invite: task `0380` added `FlashistFacade.copyText()`
  (`src/client/flashist/FlashistFacade.ts`, around lines 1952–1990) — the Yandex SDK `clipboard.writeText` first,
  called inside the click before any `await`, then `navigator.clipboard.writeText` as a fallback; it returns `true`/
  `false` and never throws. `src/client/HostLobbyModal.ts` (around line 1060) uses it.
- **The remaining gap:** the error window built in `src/client/ClientGameRunner.ts` (around lines 1363–1367) has a
  "copy" button (`error_modal.copy_clipboard`) that still calls `navigator.clipboard.writeText` **directly**. Inside the
  Yandex iframe the clipboard is blocked by the permissions policy (the owner's console showed *"The Clipboard API has
  been blocked because of a permissions policy applied to the current document"* for the read), so this button **may**
  fail there too.
- ⚠️ **Not proven that it fails today** — nobody has pressed it inside Yandex. The fix is worth doing either way: it
  puts every copy in the game on the one path `0380` built.

### Owner ruling — scope (2026-10-08, typed live in the `fkit lead` session)

`fkit-lead`'s item 3, verbatim: *"3. Plus: move the error window's copy button to Yandex's clipboard method, like 0380
did for the host's copy button."* Owner, verbatim: *"brief a task for "How it could be fixed" and add it to the current
sprint."* Item 3 is in scope; it was split from the paste fix (`0413`) into this task — see *Notes*.

### Dependencies and conflicts

- No conflict with a locked decision. This follows ADR-119 / `0380` (SDK clipboard inside the click) exactly.
- ⚠️ `0380`'s own live check is still open: the wiki records it as **not verified in the Yandex iframe** whether the SDK
  clipboard or the fallback actually copies there — that is verify task `0381` (Backlog board, `🔲 Backlog` when this was
  filed). This task inherits that unknown; it does not add a new one, and it does not wait on `0381`.

## What to build

Client-only, small.

- The error window's copy button copies through `FlashistFacade.copyText(content)` instead of
  `navigator.clipboard.writeText`.
- **Inside the click, nothing awaited before the call** — `copyText` must start the SDK copy synchronously within the
  user's click (the SDK fails with "Document is not focused" otherwise; see `copyText`'s own comment).
- Button text follows `copyText`'s result: `true` → `error_modal.copied`, `false` → `error_modal.failed_copy` (the
  existing keys; no new text needed).
- The error window can appear early or while the SDK is degraded — `copyText` already falls back to the browser's
  clipboard when the SDK is absent; confirm in the plan that reaching the facade from `ClientGameRunner.ts` works in
  that state too (no throw, still falls back).
- Grep for any other direct `navigator.clipboard` call in `src/client/` and list it in the worklog. Moving the paste
  (read) side is `0413`'s job, not this task's; any other **write** call found is reported to the owner, not changed
  silently.

## Verification steps

1. **Unit test** for the error window's copy button:
   - pressing it calls `copyText` with the window's content, and the SDK path is reached without an earlier `await`
     (same style of assertion as the `0380` tests in `tests/client/FlashistFacade.test.ts` / the host-lobby tests);
   - `copyText` resolves `true` → button reads the "copied" text; resolves `false` → "failed to copy" text; no
     unhandled rejection;
   - `navigator.clipboard.writeText` is no longer called directly from `ClientGameRunner.ts`.
2. `npm test` and `npm run lint` pass.
3. **Live check — left OPEN, not filed now.** After the deploy, inside the Yandex Games iframe, force the error window
   (any safe way the coder documents) and press "copy": the text lands on the clipboard. Per the owner's build/verify
   split rule (2026-09-29), if this needs a deploy + owner check it becomes its own verify task at the top of the next
   sprint; **no verify task is filed now**.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Split from one owner request (2026-10-08):** the owner's "How it could be fixed" covered the join-modal paste fix
  **and** this copy button. Different files, separate tests, separately shippable — so the producer filed two tasks
  under the skill's smallest-shippable-unit rule: [`0413`](../../done/0413-join-private-lobby-modal-replace-the-paste-button-that-cannot-read-the-clipboard-inside-yandex/brief.md)
  and this one. Neither waits on the other. The owner's words were *"brief a task"*; if the owner wants them as one
  task, fold this one into `0413`.
- Related: `0380` (built `copyText`), `0381` (`0380`'s open live check), `0413` (paste side, same day), `0398` (the live check during which the paste bug
  was found).
- Deploy: weekend slot (owner rule 2026-09-29) unless the owner says otherwise.
- No ids, hosts, URLs or secrets belong in this brief or its follow-ups.
- Filed 2026-10-08 by a spawned `fkit-producer` on an owner ruling relayed by `fkit-lead`. ⛔ Not producer precedent.
