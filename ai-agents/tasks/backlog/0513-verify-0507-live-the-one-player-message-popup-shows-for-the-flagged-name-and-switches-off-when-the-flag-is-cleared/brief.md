# Verify 0507 live: the one-player message popup shows for the flagged name, and switches off when the flag is cleared

## ID
0513

> ℹ️ **ID allocation, checked 2026-10-26 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names, base-10 arithmetic) was `0512`. `0513`: no task folder and no reference in `ai-agents/tasks/` or
> `ai-agents/sprints/`.

## Sprint
Sprint 9

> 📌 **Filed 2026-10-26 on an OWNER RULING**, given via `AskUserQuestion` in the `fkit-lead` session and relayed to a
> spawned `fkit-producer` (no owner channel; ADR-021/037). ⛔ Not producer precedent. Asked *"Where should the popup's
> live-check task go (no Sprint 10 exists yet)?"* → **"Sprint 9, after 0512 (Recommended)"** — option text: *"Like
> 0511/0512. Waits on 0510 + the held deploy, both Sprint 9. Sprint 9 can't close cleanly until the deploy happens or the
> row moves on."* This overrides the standing next-sprint verify rule (2026-09-29) for this task. If the held game deploy
> misses Sprint 9, this task cannot close in Sprint 9.

## Priority
40

> ⚠️ Priority 40 is append rank, NOT a merit ranking — flagged for owner confirmation.
> **On merit this belongs directly below `0512`** (where it sits), because it checks the same held game deploy that
> `0512` part (a) gates. Appended after the board's highest rank (39), never inserted (ADR-035); no row renumbered.

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

Live check of [`0507`](../../done/0507-one-player-message-popup-at-game-start-contact-links-for-a-targeted-player/brief.md)
(closed 2026-10-26, agent-closed — not owner-verified), split out at its close per the build-vs-verify rule (its
verification step 8). `0507` is a popup with our VK and Telegram contact links, shown to a player whose current in-game
name is listed in the Yandex Games flag `player_message_targets` (comma-separated, each entry trimmed, **case-sensitive
exact match**; start screen only, never over a Yandex payment or login dialog, **at most once per page load**). The
names reach every player's browser (accepted by the owner); they must never reach analytics (the flag is excluded from
the automatic `Experiment:*` events).

- **Entry gate:** the **held game deploy** that carries `0507` and `0510` is live. There is no separate deploy task: that
  deploy happens after `0512` part (a) passes (T3 is the release blocker), in a weekend slot unless urgent.
- **Why it waits on `0510`:** `0507` was built on `dev` and ships with the held game code; per the owner's ruling it does
  not ship before `0510`.
- **Who does what:** owned by the producer; **the owner runs every live step** (the Yandex console, the test loads, the
  real target). An agent may run read-only checks only where the owner allows it.

## What to build

Nothing. Owner-run live checks, recorded in this folder's `worklog.md`.

## Verification steps

**Part 1 — on the owner's own test name:**

1. The owner sets `player_message_targets` in the Yandex console to **his own test player's name** — optionally limited
   by a console condition on the existing `tester=1` client feature, so no other player is matched.
2. Loading the game as that player: the popup shows **once** on the start screen. Back on the start screen after a
   match in the same page load, it does **not** show again. A reload shows it again (once per load, while the flag is
   set).
3. A second test player with a different name never sees it.
4. Both links work: Telegram and VK each open (inside Yandex, as the Yandex rules allow external links) and lead
   somewhere the owner can be written to.
5. **No name reaches analytics.** In the network tab and in GameAnalytics: no `Experiment:*` event for
   `player_message_targets`; `PlayerMessage:Shown` / `Closed` / `ClickTelegram` / `ClickVk` carry no value; the test
   name appears in no analytics request.
6. **Switch-off time.** The owner clears the flag and measures how long until a fresh load no longer shows the popup
   (record the minutes). This is how fast the real target can be switched off later.

**Part 2 — on the real target:**

7. The owner sets `player_message_targets` to the real target name(s), **copied exactly** from the Telegram feedback
   message (copy-paste, not retyped — the match is case-sensitive and exact).
8. Once the player writes in, the owner clears the flag (the switch-off time from step 6 tells how soon it stops
   showing). Record the date the flag was set and the date it was cleared.
9. The worklog records dates, the deployed version, each result and the owner's words. **No player names, no test
   account names, no player ids**, no connection strings, endpoints or keys — "the affected player" and "the owner's
   test player" only.

## Notes

- **Depends on:** 0507, 0510
- **Blocks:** nothing
- **Ships by:** nothing ships; it follows the held game deploy (after `0512` part (a)).
- **Related:** `0512` (the same deploy; the owner may batch the sessions), `0504` (step 6, telling the player — does not
  wait on this), `0509` (the stable id in feedback — would make the next target unambiguous; not a dependency), `0502`.
- **Same-name risk stands:** any player showing the same name also sees the popup (accepted at `0507`; the content is
  public contact links).
- ⚠️ **Open, for the owner:** part 2 ends only when the player writes in. If he never does, when is the flag cleared and
  this task closed? Not ruled; the producer did not invent a deadline.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
- **No secrets, no personal data** in this folder.
