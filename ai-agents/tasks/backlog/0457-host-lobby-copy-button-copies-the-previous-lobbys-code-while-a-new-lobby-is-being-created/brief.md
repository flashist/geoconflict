# Host lobby: the copy button copies the PREVIOUS lobby's code while a new lobby is being created

## ID
0457

> ℹ️ **ID allocation, checked 2026-10-14 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0456` (folder names and `## ID` fields agree, base-10 arithmetic). `0457`: no task folder, no
> `## ID` hit, no `tasks/*/0457*` path in any branch's history.

## Sprint
Backlog

> 📌 **OWNER RULING, 2026-10-14**, given live via `AskUserQuestion` in the `fkit lead` session (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037);
> ⛔ **not producer precedent.** Question: *"Old bug found by 0451's plan: while a private lobby is being created, the
> host's copy button can copy the PREVIOUS lobby's code. 0451 only stopped counting such copies; players can still hit
> it. File a task?"* Verbatim selection: **"File in Backlog (Recommended)"** — option text: *"Small task on the Backlog
> board, to fix when there is room."*

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**The bug, in one line:** when the host opens the private-lobby window a second time, the window shows and copies the
**previous** lobby's code until the new lobby's create request answers. A host who taps copy quickly sends friends a
dead code. On the very first opening the field is empty instead, so the copy copies nothing useful.

**Found by** [`0451`](../../done/0451-private-lobbies-add-the-missing-analytics-events-for-a-full-usage-funnel/brief.md)'s
plan (`plan.md`, Summary, *"Pre-existing issue found (not fixed here)"*). `0451` deliberately fixed only the analytics
side: its `PrivateLobby:InviteCopied:*` / `InviteCopyFailed` latch notes at copy start whether this opening's lobby
exists (`hasJoinedLobby`) and refuses to count a copy made before it. **Players can still hit the bug itself.**

**Code facts** (read 2026-10-14, `src/client/HostLobbyModal.ts` — line numbers drift, search by name):

- `open()` resets `clients`, `startFailed`, `isStarting` and the copy latches, bumps `openGeneration`, then calls
  `createLobby(...)`. It **does not clear `lobbyId`**. `lobbyId` is set only when the create answers OK, for the same
  opening.
- `reset()` (run on every close) also leaves `lobbyId` alone.
- The code on screen (`formatLobbyCodeForDisplay(this.lobbyId ?? "")`, behind the `lobbyIdVisible` toggle) and
  `copyToClipboard()` (`inviteCopyText(lobbyId, …)`) both read `lobbyId` directly, with no check that this opening's
  lobby exists. `copiesInviteLink()` (which hint text shows) reads it too.
- **If the create request fails, the stale code stays on screen and copyable for the whole opening**, not just for the
  create window.
- **Same root, worth checking in the plan:** `putGameConfig()` (called from every settings change — map, difficulty,
  team count, etc.) builds its URL from `this.lobbyId` with **no** `hasJoinedLobby` guard. A setting changed before the
  create answers is therefore sent to the **previous** lobby's ID (or to an empty ID on first opening). Whether the
  server accepts or rejects such a request was **not checked** (inference only), and whether the new lobby then starts
  with the setting the host picked was **not checked**. ⚠️ Clearing `lobbyId` in `open()` changes this call too — it
  would then send a request with an empty ID — so the fix must decide what happens to it, not leave it to chance.
- `startGame()` also reads `lobbyId`, but Start stays disabled until 2+ players are listed, and `open()` clears the
  list while the player poll waits for `hasJoinedLobby` — so Start is not reachable before create answers. Confirm,
  don't assume.
- `pollPlayers()` already returns early while `!hasJoinedLobby` (task `0353`) — the existing guard pattern to follow.

**Related history:** `0327` (window closed during create → no join), `0353` (poll waits for this opening's lobby),
`0374` (join mark ends on close), `0380` / `0382` (what the copy button copies on Yandex vs standalone), `0389`
(missing `gameID` must not throw in render), `0451` (copy analytics latch).

## What to build

1. **Never show or copy a code that is not this opening's.** Until this opening's create request answers OK:
   - the code field shows a neutral placeholder (or nothing), not the previous code;
   - the copy controls (the code span and the copy icon) do nothing, or are visibly disabled;
   - on a failed create, this stays true for the rest of the opening.
   Likely shape (the plan decides): clear `lobbyId` (and anything derived from it) in `open()`, and gate copy on
   `hasJoinedLobby` the way `pollPlayers()` already does.
2. **Decide `putGameConfig()`'s behaviour before create answers** (see Context) — e.g. skip the request until the lobby
   exists and send the current settings once it does, or keep today's behaviour with a reason. Record the choice and
   why in the plan. ⛔ Not an empty-ID request.
3. **Keep `0451`'s analytics unchanged:** `InviteCopied` / `InviteCopyFailed` still count at most once per opening and
   only for this opening's lobby; no event added, renamed or re-timed. If one is, update
   `ai-agents/knowledge-base/analytics-event-reference.md` and use the enum only.
4. **Keep `0380` / `0382` copy behaviour unchanged once the lobby exists** (Yandex: bare code or portal link with
   payload; standalone: `#join=` link), and keep `copyText()` the first call in the click (Yandex clipboard rule).
5. **Text:** only if a placeholder or disabled-state label becomes visible text — then `translateText()` keys added to
   **both** `resources/lang/en.json` and `resources/lang/ru.json`. No hardcoded strings.

## Verification steps

1. **Unit tests** (extend the existing `tests/client/HostLobby*.test.ts` suites, whichever fits):
   - open → create answers → close → open again with the create **still pending**: the rendered code is not the first
     lobby's code, and a copy tap does **not** call `copyText` with the first lobby's code.
   - same, with the second create **failing**: still no copy of the first code, for the rest of that opening.
   - first-ever opening, create pending: a copy tap does not copy an empty string as if it were a code.
   - once the create answers: the code shows and copies exactly as before (Yandex code, Yandex portal link, standalone
     link — the `0380` / `0382` cases still pass).
   - the `putGameConfig()` choice from step 2 is pinned by a test (no request to the previous or an empty lobby ID
     before create answers, or whatever the plan chose).
   - `0451`'s copy-analytics tests still pass unchanged.
2. Full `npm test` (through the npm script, one full run at a time) green; `npm run lint` clean.
3. **Local check by hand** (`npm run dev`): create a private lobby, close it, open a new one — while it is being
   created, the old code is not shown and copy does nothing; once it appears, copy gives the new code. On a throttled
   network (browser dev tools) the window is wide enough to see.
4. If any visible text was added: present in both `en.json` and `ru.json`.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Effort:** small — one client component and its tests.
- **One brief, not several:** the copy fix and the `putGameConfig()` decision share one root (stale `lobbyId` during
  create) and one change (clearing it in `open()` changes both), so they cannot ship apart safely.
- **Ships with the next game deploy** (weekend slot) once committed; no separate verify task is needed unless the owner
  asks — the bug and its fix are fully checkable locally.
- Filed 2026-10-14 by a spawned `fkit-producer` (no owner channel), relayed by `fkit-lead`.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
