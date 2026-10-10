# Verify Private Lobbies in Production — a Citizen Hosts Inside Yandex Games, a Friend Joins (task 0376)

**Source**: `ai-agents/tasks/done/0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 27 (ADR-035 append rank; moved in from the Backlog board 2026-10-09) / task `0376`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-10 on the owner ruling **"Gate item 2 passed, close both
> (Recommended)"** (live `AskUserQuestion`; `0381` closed in the same ruling). **Release-gate item 2 PASSED** by owner
> statement. The owner ran every check; the close was written by a spawned agent.

## Goal

Item 2 of the private-lobby release gate ([[tasks/private-lobby-tester-default]]): a real citizen hosts **inside the
Yandex Games page**, a friend joins **inside Yandex Games** (never through a link to our own site — owner ruling on
`0199`), the match starts **and ends**. `0302`'s own step 2 was never run in the real Yandex page
([[tasks/private-lobby-citizen-perk]]).

## Key Changes

None — owner-run live check. First run 2026-10-09 (as `0420` item 1, together with `0383`); second run **2026-10-10,
~15:07–15:27 UTC, game `0.0.161`**. Host: paid citizen marked as a tester, computer, Chrome. Friend: non-citizen,
**non-tester**, iPhone — joined by the **Yandex invite link** (the `0382` route, [[tasks/yandex-invite-sdk-link]]).
Console (owner's screenshot): `citizenship_ui` = `enabled`; `private_lobbies` and `private_lobbies_all` **not set**;
flag conditions not visible.

## Outcome

| Step | Result |
|---|---|
| 1 — visibility (tester sees three tabs, non-tester two) | pass — cited from `0420` item 6, not re-run |
| 2 — Create, with the `0353` host-window check ([[tasks/host-window-poll-before-lobby]]) | **pass** — no repeating errors |
| 2 — `0389` (a): code shown as `XXXX XXXX`, no confusable characters ([[tasks/private-lobby-code-format]]) | **pass** |
| 3 — `0389` (b): friend types the code in **lowercase** | ⏭️ **not run** — owner ruling *"skip tester"* (the tester marker could not be set on the iPhone); moved to `0428` step 4b |
| 3 — join inside Yandex; host lists the friend | **pass** (by invite link) |
| 4 — start; both in one match | **pass** |
| 5 — end | **pass** — host played to the win screen; the friend quit to the start screen normally |

- Server log (read-only, owner-approved, counts only): 2 private create lines, both carrying the creator, **26 s apart —
  unexplained** (likely the host window opened twice; not asked); 0 "creator not a citizen" refusals; `start_game`
  1 × 200, 0 × 403.
- ⚠️ **Not proven:** lowercase code typing (until `0428` runs); the console flags' conditions.
- 🚦 With this and `0381` closed, **`0428`** (turn private lobbies on for everyone) waits only on **`0433`** (`0228`'s
  live check after its deploy).

## Related

- [[tasks/private-lobby-tester-default]] — task `0354`, the release gate (item 2)
- [[tasks/private-lobby-citizen-perk]] — the feature the gate guards
- [[tasks/yandex-invite-copies-code-live]] — task `0381`, closed in the same ruling
- [[tasks/yandex-invite-sdk-link-live]] — task `0383`, the first live run of the invite link
- [[tasks/host-window-poll-before-lobby]] — task `0353`, checked in step 2
- [[tasks/private-lobby-code-format]] — task `0389`, checks (a) and (b)
- [[tasks/join-lobby-race-fix]] — task `0228`, gate item 3, whose live check `0433` is what `0428` still waits on
- [[decisions/sprint-8]] — the board (rank 27)
- [[decisions/windoworigin-url-join-defect]] — the `windowOrigin` invite defect whose private-lobby production check this is
- [[decisions/yandex-invite-portal-boundary]] — why the friend had to join inside Yandex Games, never through our own site
