# A server kick leaves `reconnect-session` in localStorage — the next page load offers "Rejoin" to a game the server silently refuses

## ID
0256

> ℹ️ **ID allocation, checked 2026-09-14 before filing. `0256` is free.** The four checks from
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), run this turn:
> **1.** `ls -d ai-agents/tasks/*/0256-*/` — no matches (highest ID on disk across all three boards was
> `0255`). **2.** `grep -rn "^0256$" ai-agents/tasks/ --include=brief.md` — zero hits. **3.**
> `grep -rn "0256" .claude/` — zero hits. **4.** repo-wide (`node_modules`, `.git`, `static` excluded,
> `.svg`/`.json`/lockfiles filtered) — zero hits other than the Sprint 4 close note that names this
> brief. Duplicate-ID check (`sort | uniq -d` over folder prefixes) — empty.

## Sprint
Backlog

## Priority
Unscheduled

**Producer's rank, if pulled into a sprint: Low-to-Medium** — not owner-ruled. Low because the
harm is bounded: one stale prompt, dismissable, and the session self-clears the moment the game
actually ends (`/api/game/<id>/active` → `false` → `clearReconnectSession()`,
`src/client/ReconnectSession.ts:54`). Medium because it was **seen intercepting the whole page** during
[`0233`](../../done/0233-server-error-and-desync-sites-leave-performancemonitor-running/brief.md)'s
measurement, and because it makes the reconnection analytics funnel lie (see Context). Cheap — the
fix is expected to be a one-line call at one or two sites.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-14 by a spawned `fkit-producer` at the close of
[`0233`](../../done/0233-server-error-and-desync-sites-leave-performancemonitor-running/brief.md)**, on the
driver's instruction to file the residual `0233` surfaced. **The producer had no owner channel** — the
rank above and the scope below are the producer's, not owner-ruled.

### What was observed (real, not reasoned)

During `0233`'s browser measurement of the mid-game kick (site 1), **the `<reconnect-modal>`
intercepted the whole page on one attempt**, offering *Rejoin* for the game the player had just been
kicked from. Recorded in `0233`'s `worklog.md`, *Residuals* item 1 ("seen for real during this
build"). Pre-existing behaviour; `0233`'s plan listed it as an edge (edge 4) and deliberately did not
touch it.

### Why it happens — code facts, each read in the working tree 2026-09-14

⚠️ **Re-verify every `file:line` before relying on it** — `src/client/ClientGameRunner.ts` was just
edited by `0233` and is also [`0252`](../0252-in-page-leave-wider-per-game-leak-renderer-transport-lobby-poll/brief.md)
territory.

| # | Where | What it does |
|---|---|---|
| 1 | `src/client/ClientGameRunner.ts:742` | `saveReconnectSession(gameID, clientID)` — the **only** writer of the `reconnect-session` localStorage key. |
| 2 | `src/client/ClientGameRunner.ts:783-798` — the runner's `onmessage` `error` branch (`0233`'s **D1**) | Shows the connection-error modal, then `this.stop()`. **Nothing here calls `clearReconnectSession()`.** The key survives the kick. |
| 3 | `src/client/ClientGameRunner.ts:253-272` — `joinLobby`'s own `error` branch (`0233`'s **D3**) | Same shape: modal, `left = true`, `transport.leaveGame()`, `onGameEnd()`. **No clear either** — but whether the key was ever *written* on this path depends on whether `start` arrived first (site 3a vs 3b in `0233`'s worklog). Verify, don't assume. |
| 4 | `src/client/Main.ts:958` (`handleLeaveLobby`) | The one place the client clears the key on a normal leave. A kicked player who never presses leave never reaches it. |
| 5 | `src/client/Main.ts:535-539` → `ReconnectSession.ts:34-56` (`checkReconnectSession`) | On the next page load the key is read and `/api/game/<id>/active` is asked. **A kicked player's game is usually still active for everyone else**, so the answer is `true` and the modal is shown (`Main.ts:572-577`). |
| 6 | `src/client/ReconnectModal.ts:149-187` (`_handleRejoin`) | Re-checks `active`, logs **`Reconnect:Succeeded`**, dispatches `join-lobby` with `isReconnect: true`. |
| 7 | `src/server/GameServer.ts:194-201` (`addClient`) | **Refuses a kicked `clientID` with a log line and a bare `return` — no message to the client.** The rejoin dies silently. |
| 8 | `src/client/ReconnectModal.ts:196-204` (`_onReconnectFailed`) | The only client-side "rejoin failed" surface, and it fires on the `reconnect-failed` event only — which the silent refusal in #7 never produces. |

**Net effect:** the player is offered a rejoin the server will never honour; pressing it produces no
error, no game, and a **false `Reconnect:Succeeded`** analytics event (#6 fires before the server has
said anything). ⚠️ The analytics-funnel consequence is **reasoned from code, not observed** — confirm
it in step 1 before writing it anywhere as fact.

### Relationship to accepted residuals — do not re-litigate

- **`0233` R1 (accepted, owner-ruled):** D1 treats a **1002** schema-close as terminal by choice. That
  is about the *in-game* socket close, not the localStorage key; this task does not reopen it. If the
  fix here clears the key on *every* runner `error`, note that a 1002 client would also lose its
  rejoin offer — say whether that is intended, in the plan.
- **`0233` residual 2:** `killExistingSocket()` nulls `onclose`, so a 1002 close after `stop()` no
  longer dispatches `reconnect-failed`. Fixing *that* touches `Transport.ts`, which is
  [`0252`](../0252-in-page-leave-wider-per-game-leak-renderer-transport-lobby-poll/brief.md)'s file —
  **out of scope here.** This task is expected to touch `ClientGameRunner.ts` and possibly `Main.ts`
  only, and **must not edit `Transport.ts`.**
- The wiki's [reconnection feature page](../../../wiki-vault/wiki/features/reconnection.md) states the
  design intent: *"only unexpected exits (tab close/crash) trigger the prompt."* A kick is not an
  unexpected exit — it is the server ending the player's participation — so clearing the key on a
  kick **follows** the recorded intent rather than changing it.

## What to build

Make a server kick clear the reconnect session, so the next page load does not offer a rejoin the
server will refuse.

1. **Reproduce first, in a real browser** (`0233`'s recipe: dev server + `POST /api/kick_player/…`
   with the dev admin header, Playwright or the Chrome tools). Confirm: after the kick modal, the
   `reconnect-session` key is still present; on reload the `<reconnect-modal>` appears; pressing
   *Rejoin* yields no game and no error. Record whether `Reconnect:Succeeded` is logged.
2. **Clear the key on the kick path.** The natural site is the runner's `error` branch (table #2),
   next to the `0233` D1 `stop()`. Decide and record whether `joinLobby`'s `error` branch (#3) needs
   it too — only if step 1 shows the key can be written before that branch fires.
3. **Decide, in writing, whether the clear is kick-only or every server `error`.** The client cannot
   currently distinguish the two (the `error` message is the same shape; the close code arrives later).
   If it clears on every `error`, say so and note the R1 interaction above. If it needs the close code,
   that is `Transport.ts` and this task stops and reports instead of widening.
4. **Pin it with jest** in `tests/client/ClientGameRunnerTeardown.test.ts` (the `0233` T7 shape —
   node environment, `document` stub): after a server `error`, `localStorage` no longer holds the key.
   Note the stub environment may need a `localStorage` shim; keep it in the test file.
5. **Do not touch** the normal-leave clear at `Main.ts:958`, `ReconnectModal.ts`, or `Transport.ts`.

## Verification steps

1. Step 1's reproduction is recorded with the observed key state before and after the kick, and the
   observed page on reload. ⛔ Code-reading alone does not satisfy this.
2. After the fix, the same recipe: key **absent** after the kick modal; reload shows **no**
   `<reconnect-modal>`; no `Reconnect:PromptShown` / `Reconnect:Succeeded` for the kicked game.
3. **A genuine crash-reconnect still works:** kill the tab mid-game (not a kick), reopen, the modal
   appears and *Rejoin* re-enters the game. This is the regression the change could cause.
4. A normal leave still clears the key (unchanged path, `Main.ts:958`) — checked, not assumed.
5. The kick-only vs every-`error` decision is written in the plan or worklog.
6. New jest case fails on HEAD without the fix and passes with it (state both).
7. `npm test` green (~22–35 s with the shell harnesses — expected); `npm run lint` clean;
   `tsc --noEmit` exit 0; `git diff --stat src/core/` empty; `Transport.ts` untouched.

## Notes

- **Depends on:** [`0233`](../../done/0233-server-error-and-desync-sites-leave-performancemonitor-running/brief.md)
  — closed 2026-09-14 `(agent-closed — not owner-verified)`; the fix site is the D1 branch it added.
  ⚠️ `0233` is **not yet committed or deployed** at filing time — start this only once `0233`'s
  `ClientGameRunner.ts` change is on the branch you build from.
- **Blocks:** nothing.
- **Related, not blocking:** [`0252`](../0252-in-page-leave-wider-per-game-leak-renderer-transport-lobby-poll/brief.md)
  owns `Transport.ts` and the wider per-game leak; `0233` residuals 2 and 3 (1002 `reconnect-failed`
  after `stop()`, no-backoff 1006 loop) live there and are **not** filed here.
- **Evidence provenance:** observation from `0233`'s `worklog.md` (Residuals item 1, "seen for
  real"); every `file:line` above read by the producer in the working tree on 2026-09-14.
- **Do not invoke the mover skills** — producer-only since ADR-033; route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Never commit or push unless the owner explicitly asks.**
- 🔒 **No secrets in any artifact** — `file:line` references only.
