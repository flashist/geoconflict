# One-Player Message Popup at Game Start — Contact Links for a Targeted Player (task 0507)

**Source**: `ai-agents/tasks/done/0507-one-player-message-popup-at-game-start-contact-links-for-a-targeted-player/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified) — committed `baaf2f8`, **deployed 2026-10-27** (live game `0.0.167`; ~~not deployed~~)
**Sprint/Tag**: Sprint 9 — live player incident (rank 34, append rank flagged)

> 🚀 **2026-10-28 sync (`7a2ef92`) — DEPLOYED 2026-10-27**: live game **`0.0.167`** (`git tag --contains baaf2f8`
> includes it; live version read 2026-10-28 by `0511`). Live check `0513` is still `🔲 Backlog`. The "not deployed" text
> below is history.

## Goal

Reach the affected player, who wrote in only through the feedback form and whom the citizen-only inbox cannot reach
(`GET /v1/messages` is 403 for non-citizens). The owner's words (2026-10-26, verbatim, typos kept): *"…something, that
allows us to send some messages to specific users even if they don't have the "inbox" logic yet. I can be as simple as
the popup that is shown to the once a game starts, if their nickname matches the value that we're looking forward."*
Hub: [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]].

## Key Changes

- **Targeting — re-decided the same day.** First ruling: name match decided on the server (*"By current name,
  server-side (Recommended)"*). Superseded by the owner's typed words: *"We can bake it into the client-side code
  TEMPORARILY! It's an emergency situation … Also we can pass value or values via Yandex.Games flags (which probably is
  a better way to do it …"*. **Approved plan:** the Yandex Games remote flag **`player_message_targets`** — a
  comma-separated list of names set and cleared by the owner in the Yandex console; each entry trimmed, empty ones
  dropped; **case-sensitive exact match** against the current name; unset / empty / non-string → nothing shown and **no
  extra request** (the existing flags fetch is reused). **Flags only** — no name in code.
- ⚠️ **Accepted privacy cost:** the target names **reach every player's browser** (readable via F12) — owner: *"Accept,
  build it (Recommended)"*. They are never in git, code or analytics. A namesake would also see the popup (low harm —
  the content is public contact links).
- **One fixed message** — the VK and Telegram contact links (owner: *"Yes, both work"*), via `translateText` in
  `en.json` and `ru.json`. Shown on the **start screen**, with no Yandex payment/login dialog open, **at most once per
  page load**.
- Code at HEAD: `src/client/PlayerMessage.ts`, `src/client/PlayerMessageModal.ts` (`<player-message-modal>`).
- Analytics: `PlayerMessage:Shown`, `PlayerMessage:Closed`, `PlayerMessage:ClickTelegram`, `PlayerMessage:ClickVk` —
  none carries the name or flag value; `player_message_targets` is **excluded** from the automatic `Experiment:*`
  events (`EXPERIMENT_FLAGS_NOT_LOGGED` in `FlashistFacade.ts`). See [[systems/analytics]].

## Outcome

- Built on `dev`; the owner ruled it **ships with `0506`** (a release-timing tie, not a code dependency). ⚠️ It is
  client code, so it actually reaches players with the **game** deploy — which also carries `0510` and the held client
  purchase code; that deploy waits on `0512` part (a).
- **Not deployed** (`git tag --contains baaf2f8` → none, 2026-10-27).
- Live check `0513` (`🔲 Backlog`, Sprint 9): with the flag set to the owner's test player the popup shows to him and
  not to a second test player; then the flag names the affected player; clearing it switches the popup off.
- Related backlog task `0509`: put the player's stable id in the feedback message, so the next case is not a name hunt.

## Related

- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]] — the incident
- [[features/feedback-button]] — the only channel the report came through
- [[systems/flashist-init]] — the Yandex flags fetch it reuses
- [[systems/analytics]] — its events and the excluded flag
- [[tasks/stop-consuming-client-s2]] — task `0510`, same game deploy
- [[tasks/lost-citizenship-cause-checks]] — task `0502`
- [[decisions/sprint-9]]
