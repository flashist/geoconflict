# When Yandex Games Works Again — the Outage Checklist (task 0440)

**Source**: `ai-agents/tasks/done/0440-when-yandex-games-is-working-again-the-flag-change-and-checks-blocked-by-its-outage/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 37 (ADR-035 append rank; on merit directly above `0428`) / task `0440`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-13 by a spawned `fkit-producer` on the owner ruling
> *"Close; 0439 stands alone (Recommended)"* (live `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent).
> ⚠️ Items 1a, 1b, 1d pass **per owner statement "all good" — not itemised**; item 5 **not run**.

## Goal

A reminder list filed 2026-10-12 on an owner request (*"Yandex.Games still have problems with their services and
infrastructure, so I can't do all the needed checks and changes of flags. Can you brief a task for that…"*). From
2026-10-11 the Yandex Games console's flag changes did not take effect and other Yandex services were unreliable.
The tracker **points to** the task that owns each piece rather than copying its steps, so they cannot drift apart:

1. Is Yandex back? — (a) console works; (b) the game reads its flags (a read-only DevTools snippet, run in the game
   iframe's context, prints `citizenship_ui`, `private_lobbies_all`, `private_lobbies`); (c) a console change really
   takes effect; (d) game page loads, login works, an ad shows.
2. `0428`'s flag flip and checks. 3. `0426`'s flag gate (real values, not the 2026-10-10 screenshot). 4. `0439`, the
   exit-popup live check (also needs the deploy carrying `0437`). 5. Optional read-only server-log counts. 6. Watch
   items `0435`, `0411`, `0424`, `0394`.

Console changes are not deploys, so the weekend-deploy rule does not bind items 1–2.

## Key Changes

None — a recording-only checklist; no source written.

## Outcome

- **Yandex judged back 2026-10-13**; game `0.0.163` live in production (owner).
- **Item 1:** 1a, 1b, 1d pass per owner statement "all good"; 1c proven by `0428`'s flip. Printed snippet values were
  confirmed only for the non-tester page **after** the flip (*"Yes, both enabled"*); the before-flip and tester-page
  printouts were not read out — a known gap.
- **Item 2:** done in `0428` — [[tasks/private-lobbies-everyone-flag-flip]].
- **Item 3:** `citizenship_ui` and `private_lobbies_all` both `enabled` for everyone, recorded here and in `0426`'s
  worklog.
- **Item 4:** **re-planned by the owner** — `0439` carries the exit-popup check on its own; it still waits on the game
  deploy carrying `0437` ([[tasks/exit-confirm-popup]]).
- **Item 5:** **not run** — the permission filter refused a spawned coder's production SSH read; owner then ruled
  *"Skip, record 'not run'"*. ⚠️ The container log keeps at most 10 × 100 MB and is lost when a deploy recreates the
  container, so a pre-outage comparison day may already be gone (not checked).
- **Item 6:** **outage window 2026-10-11 → 2026-10-13** — flag-fetch timeouts in that window say nothing about normal
  days (for `0411` and `0435` readers). `0424`: *"No reports"* of lost profiles; trigger not fired.

## Related

- [[tasks/private-lobbies-everyone-flag-flip]] — task `0428`, item 2
- [[tasks/exit-confirm-popup]] — task `0437`, whose live check `0439` is item 4
- [[systems/yandex-games-platform-rules]] — the platform this outage was on
- [[decisions/sprint-8]] — the board (rank 37)
- [[tasks/yandex-player-id-change-message]] — task `0508`, 2026-10-27: a later message to Yandex Games support, about a player-ID change
