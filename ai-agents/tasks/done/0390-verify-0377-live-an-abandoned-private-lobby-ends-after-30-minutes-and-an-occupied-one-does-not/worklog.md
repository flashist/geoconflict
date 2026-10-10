# Worklog — 0390: Verify 0377 live — an abandoned private lobby ends after 30 minutes, and an occupied one does not

## 2026-10-10 — live check run; PASS on cases 1 and 3 and on "no collateral"; closed (agent-closed)

**Recorded by** a spawned `fkit-producer` (no owner channel, ADR-021/037), from the results relayed by `fkit-lead`.
**Close authority:** OWNER RULING 2026-10-10, given live via `AskUserQuestion` in the `fkit lead` session, verbatim
**"Close 0390 + file task for (A) (Recommended)"** — option text *"Producer closes 0390 (agent-closed) with these
results, and files a small backlog task: the host window should stop polling once its lobby is gone. (B) is noted
only."* ⛔ Not producer precedent.

No game ids, lobby codes, client ids, hosts, IPs or URLs are recorded here. The two test lobbies are called
**lobby #1** and **lobby #2**.

### Build and method

- **Build:** game `0.0.161`, live on production since **2026-10-09** (this is the deploy that carries `0377`).
- **Clicks:** the owner, in the Yandex Games page, Chrome on the computer, signed in with a **paid citizen tester
  account** (private lobbies are a citizen perk).
- **Log read:** `fkit-lead`, **read-only**, over SSH in the owner's session, reading the game container's log; the
  owner approved each command at the permission prompt.
  - A spawned coder had tried the same read first; Claude Code's permission filter refused it ("Production Reads").
    That refusal was **not** worked around — the read was redone in the owner-present session instead.
- All times UTC.

### Results

| Check | Result | Evidence |
|---|---|---|
| **Case 1 — abandoned after someone joined** (verification step 1) | ✅ **PASS** | Lobby #1 created **08:52:00Z**. The host left about **08:53:13Z** (the owner closed the window). Log line `private lobby ended, no client connected` at **09:23:13.901Z**, with `anyClientJoined: true`, `idleMs: 1800139` — just over 1 800 000, ending about 30 minutes after the host left, as specified. |
| **Lobby really gone — join the ended lobby** (verification step 2) | ⏭️ **Not run** | Nobody tried to join lobby #1 after it ended, so what a player sees there is not recorded. |
| **Case 3 — occupied** (verification step 3) | ✅ **PASS** | Lobby #2 created **08:53:19Z** in a second tab that was left open. **No** `private lobby ended` line for it at any time. It stayed open until **11:53:20Z**, when the pre-existing **3-hour cap** ended it (`game past max duration`, then `game not started, not archiving game`). That end is expected and outside this check — it is the old rule, not `0377`'s. See the side note on reconnects below. |
| **Case 2 — never joined** (verification step 4) | ⏭️ **Not run** | Optional by the brief; the "from creation" rule (`anyClientJoined: false`) stays covered by `0377`'s unit tests only. |
| **No collateral** (verification step 5) | ✅ **PASS** | From **08:40Z to 14:37Z** the only `private lobby ended` line in the log is lobby #1's. No public or started game was ended by the idle rule. |

**Note on case 3 — the hidden tab kept reconnecting.** From about **09:36Z** the background tab's connection dropped
and came back every 2–3 minutes (log: `client disconnected`, then `Lobby creator joined` / `client (re)joining
game`). Most likely Chrome throttling a hidden tab — **not confirmed**. Each rejoin reset the idle clock, so the
lobby counted as occupied the whole time and the case-3 result stands. It does mean case 3 was proved with a
connection that kept dropping, not a steady one.

### Side findings

- **(A) The host window keeps polling a lobby that no longer exists.** After lobby #2 ended at 11:53:20Z, the host
  window kept asking the server for that lobby about **once a second**, got `404` every time (server log: `lobby
  <id> not found`), and was **still doing so at 14:37Z — 2 h 44 min later**. It never noticed the lobby was gone.
  What the window showed on screen was **not checked**. → **Filed as
  [`0434`](../../backlog/0434-private-lobby-host-window-keeps-polling-a-lobby-that-no-longer-exists/brief.md)** (Backlog board,
  low priority), per the owner ruling above.
- **(B) Hidden-tab reconnect churn** (the case-3 note above). **Noted only — no task**, per the owner ruling above.

### Outcome

`0377`'s live behaviour is confirmed for the two cases that matter for the release gate: an abandoned lobby ends about
30 minutes after the last person leaves, and an occupied one is not ended. **Not covered:** the never-joined case
(unit tests only) and what a player sees when joining an ended lobby (step 2 not run). No case failed, so no fix task
for `0377` was needed. `0428` depended on this check; it has now passed — `0428`'s own status is unchanged.

Closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`. Nothing committed; nothing under
`ai-agents/wiki-vault/` touched.
