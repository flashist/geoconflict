# Verify 0380 in Production — the Yandex Invite Shows the Code, Old `#join=` Links Ignored (task 0381)

**Source**: `ai-agents/tasks/done/0381-verify-0380-in-production-the-yandex-invite-copies-the-code-and-old-join-links-are-ignored/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 29 (ADR-035 append rank; moved in from the Backlog board 2026-10-09) / task `0381`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-10 on the owner ruling **"Gate item 2 passed, close both
> (Recommended)"**, together with `0376`. ⚠️ **Steps 3, 4 and 5 NOT run**, by owner rulings.

## Goal

The production check for `0380` ([[tasks/yandex-invite-copies-code]]), the code half of
[[decisions/adr-119-yandex-invite-sdk-link-plus-code]]: the host is shown the code, a friend can join by code inside
Yandex, and an old off-Yandex `#join=` link no longer opens a join window on the Yandex build. Steps 1 and 6 (the
clipboard copy) were already **superseded** by `0382` ([[tasks/yandex-invite-sdk-link]]).

## Key Changes

None — owner-run, in the same 2026-10-10 sitting as `0376` ([[tasks/private-lobby-production-test]]), game `0.0.161`.
The host saw the private-lobby row through `0354`'s tester rule; the everyone-flag was not set.

## Outcome

| Step | Result |
|---|---|
| 1, 6 — clipboard copy | superseded by `0382`, not run |
| 2 — the code is shown to the host | **pass** (`XXXX XXXX`) |
| 3 — a friend joins by code inside Yandex | ⏭️ **not run** — moved to `0428` step 4b (*"skip tester"*); the friend joined by link instead (`0383`'s route) |
| 4 — an old `#join=` link opens no join window | ⏭️ **not run** — owner ruling, typed: *"We didn't have private lobbies with private links before, so no links existed before"* |
| 5 — standalone build unchanged | ⏭️ **not run** |

- ⚠️ **Unproven live:** that the Yandex build ignores `#join=` (the code path was checked only before deploy); a code
  join inside Yandex (carried by `0428` step 4b); the standalone build's invite. The owner's reasoning for step 4: no
  such links were ever handed out, because private lobbies were hidden.
- 🚦 **Release-gate item 6** (invite links resolved, production checks passed) is closed: `0383` passed 2026-10-09
  ([[tasks/yandex-invite-sdk-link-live]]), and this task is closed on the ruling above.

## Related

- [[tasks/yandex-invite-copies-code]] — task `0380`, the build this checks
- [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] — link + code, the decision
- [[tasks/yandex-invite-sdk-link]] — task `0382`, which superseded steps 1 and 6
- [[tasks/yandex-invite-sdk-link-live]] — task `0383`, the other half of gate item 6
- [[tasks/private-lobby-production-test]] — task `0376`, the same sitting
- [[tasks/private-lobby-tester-default]] — task `0354`, the release gate
- [[decisions/yandex-invite-portal-boundary]] — why an invite must stay on the player's portal
- [[decisions/sprint-8]] — the board (rank 29)
- [[tasks/private-lobby-citizen-perk]] — the feature whose release gate item 6 this closes
