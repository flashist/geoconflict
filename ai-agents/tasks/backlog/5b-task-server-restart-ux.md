# Task 5b — Server Restart UX: Notification & Auto-Refresh

## Context

When the production server is updated and restarted, existing player connections drop silently. The game freezes with no message, no indication of what happened, and no recovery path. Players are left staring at a frozen screen until they manually refresh — if they even realize they need to.

This happens on every production deployment. The existing reconnection system (Task 2) has a 1-minute rejoin window, which is insufficient — server restarts typically take longer. The restart detection logic in this task must be separate from the existing reconnection flow and have no time limit.

**Relationship to HF-11 (stale build detection):** both tasks share a blocking modal component. The modal is built once and used by both flows — see the Shared Component section below. Coordinate implementation so the modal is not built twice.

---

## Flow 1 — Planned Deploy (this task)

**Trigger:** server admin signals an incoming deploy
**What the player sees:** a blocking modal informing them of the upcoming update, followed by auto-reload when the server recovers

### Part A — Pre-Restart Notification

Before deploying, trigger a shutdown signal on the server that broadcasts a warning to all connected clients.

**Admin trigger:** a protected HTTP endpoint (`/admin/restart-warning`) — when called, starts a server-wide broadcast and begins a countdown before shutdown. Call this manually as the first step of the deployment process. Automating it into the pipeline is a nice-to-have, not required for V1.

**Client behaviour on receiving the broadcast:**
- Show the blocking modal immediately with the message:
  > *"A new version of Geoconflict is being deployed. This will take approximately 10–15 seconds. Please wait — the game will reload automatically when it's ready."*
- The modal cannot be closed — it blocks all gameplay
- Start a visible countdown if desired, but see the edge case note below

**Edge case — deploy takes longer than expected:**
After the initial countdown expires (or after 30 seconds if no countdown), switch the modal message to:
> *"Update in progress, please wait..."*

This avoids the player seeing a frozen countdown that has long expired. The modal stays blocking and polling continues silently in the background.

### Part B — Auto-Refresh on Server Recovery (higher priority than Part A)

When the client loses connection — whether after a Part A warning or unexpectedly — enter a silent polling loop.

**How it works:**
- On WebSocket disconnect or connection loss, check whether this is a server-wide restart (server unreachable entirely) vs an individual disconnect (reconnect flow from Task 2)
- If server-wide: show the blocking modal with message: *"Update in progress, please wait..."*
- Poll the server health endpoint (`/health`) every 5–10 seconds
- When the server responds successfully, auto-reload the page immediately — no user action required
- No time limit on polling — keep checking until the server is back

**Important distinction from Task 2 reconnection:** Task 2 handles individual player disconnects with a 1-minute match-rejoin window. This flow handles server-wide restarts with no time limit and no match state restoration — just wait and reload. Heuristic for distinguishing them: if the server is completely unreachable, use this flow.

Part B can ship independently of Part A and should be prioritised first — it resolves the silent freeze with no deployment process changes required.

---

## Shared Modal Component

Both this task (Flow 1) and HF-11 (Flow 2 — stale build detection) use a blocking modal. An existing modal component is already used in the codebase (e.g. for tutorial popups) — find and reuse it rather than creating a new one.

**Required behaviour for this use case:**
- Full-screen overlay, non-dismissible (no close button, no clicking outside to dismiss)
- Single message area — copy varies by trigger (see each flow for copy)
- Supports two button states:
  - **Auto-reload mode** (Flow 1): no button — modal waits for server recovery and reloads automatically
  - **Manual refresh mode** (Flow 2): single prominent "REFRESH" button that calls `window.location.reload(true)`
- Secondary text link below the button (Flow 2 only): "Contact support" — same visual style as the inline tutorial skip button (plain underlined text, visually subordinate). Opens the feedback form inline without dismissing the modal.
- Calm, non-alarming visual design — this is an expected maintenance event, not a crash

---

## What "Done" Looks Like

- Server has an admin endpoint that triggers a pre-restart broadcast to all connected clients
- Clients display the blocking modal when a restart is imminent — gameplay is suspended
- Modal copy switches from countdown to "update in progress" if deploy takes longer than expected
- When connection is lost, clients enter a silent polling loop
- When the server recovers, clients reload automatically within one polling interval
- Players never see a frozen silent screen during a server restart
- The restart polling flow does not interfere with the Task 2 reconnection flow

## Notes

- **Part B first** — it resolves the current silent freeze immediately with no deployment process changes. Part A is a quality-of-life improvement on top of it.
- The "update in progress" message should be calm and reassuring — not an error. The player should feel like they are waiting, not that something broke.
- If Part A warning is shown and Part B polling begins, the modal copy should feel like a continuation of the same flow, not a new unexpected event.
- For V1, a full page reload to the home screen on recovery is acceptable — no need to restore match state.
- The existing modal component (already used for tutorial popups and other cases) should be reused for both this task and HF-11. Find the existing component in the codebase rather than creating a new one.
