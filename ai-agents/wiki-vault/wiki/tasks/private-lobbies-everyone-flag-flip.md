# Turn Private Lobbies On for Everyone — the `private_lobbies_all` Console Flip (task 0428)

**Source**: `ai-agents/tasks/done/0428-turn-private-lobbies-on-for-everyone-in-the-yandex-games-console/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 30 (ADR-035 append rank; on merit directly below `0381`) / task `0428`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-13 by a spawned `fkit-producer` on the owner ruling
> *"Close it (Recommended)"* (live `AskUserQuestion` in the `fkit lead` session driving `fkit-sprint-ship-loop`, relayed
> by `fkit-lead`; ⛔ not producer precedent).
>
> 🚦 **Private lobbies are ON FOR EVERYONE since about 17:09–17:12 MSK (about 14:09–14:12 UTC), 2026-10-13**, game
> `0.0.163`. This is the last step of the release chain recorded on [[tasks/private-lobby-citizen-perk]].
>
> ⚠️ **Partial evidence:** checks 4a–4c pass **per owner statement "all good" — not itemised by the owner**; account
> roles and device were not stated. Check 4d (server-log counts) **not run**.

> 📌 *2026-10-14 sync:* task `0451` built the 16 `PrivateLobby:*` funnel events this rollout was missing (committed,
> not deployed; the GameAnalytics funnel is `0455`) — [[tasks/private-lobby-funnel-events]].

## Goal

Private lobbies (a citizen perk, `0302`) were live but shown only to **testers** (a browser marker) since `0354`
([[tasks/private-lobby-tester-default]]). The rule for the Приватная tab is *citizenship surfaces on*
(`citizenship_ui` = `enabled`) **AND** (tester marker **OR** `private_lobbies_all` = `enabled`). This task sets the
Yandex remote flag `private_lobbies_all` = `enabled` with no condition, checks the result live, and keeps a rollback
ready. **Nothing built, nothing deployed** — one owner-run console change plus checks.

Flag names live in `src/client/flashist/FlashistFacade.ts` — search for `PRIVATE_LOBBIES_ALL_FLAG_NAME`. The flag is
**visibility only**: the server never sees Yandex flags, so the server's citizens-only start check is the real lock,
on or off. Flags are read **once per page load**, both for the flip and for a rollback.

Gate (owner ruling 2026-10-03): the flag stayed unset until all six items of `0354`'s release gate were true. By
owner rulings the task also waited on `0390` (2026-10-09, *"Yes, 0390 must pass first (Recommended)"*) and `0433`
(2026-10-10, *"File it, before 0428 (Recommended)"*). Timing was ruled 2026-10-09: *"Before the final deploy
(Recommended)"* — flip as soon as the gate is clear, so the news window (`0426`) can announce it in the same release.

## Key Changes

None in the repo. Console values, owner-confirmed live (*"Yes, exactly as expected"*):

| Flag | Before | After |
|---|---|---|
| `private_lobbies_all` | not set | **`enabled`, no condition** (everyone) |
| `citizenship_ui` | `enabled`, everyone, no condition | unchanged |
| `private_lobbies` (old, not read by the game) | not set | unchanged |

## Outcome

| Check | Result |
|---|---|
| 4a — a non-tester sees three tabs | ✅ pass, per owner statement "all good" |
| 4b — a non-citizen joins a citizen's lobby by typing the code | ✅ pass, per owner statement "all good" — **includes the lowercase code join** (`0389` check (b), `0381` step 3) as the relay names it; not itemised by the owner; invite-link join not stated |
| 4c — Create stays citizen-only (explainer, no host window) | ✅ pass, per owner statement "all good" |
| 4d — server-log counts (read-only) | ⏭️ **not run** — Claude Code's permission filter ("Production Reads") refused the spawned coder's SSH read before any login; the owner then ruled *"Skip, record 'not run'"*. Can be re-done once key login works (`0445`, [[tasks/deploy-ssh-key-login]]) |

- **After the flip, on a non-tester page**, the read-only flag snippet printed `citizenship_ui = enabled` and
  `private_lobbies_all = enabled` (owner: *"Yes, both enabled"*).
- **Rollback not used** (delete the flag in the console; players lose the tab on their next page load).
- **Accepted risk kept, not reopened:** `0332` Q4 — a forged citizen id can still host. Before the flip only testers
  saw Create; now every player does.
- **For other tasks:** `0426` (news window) got the real values in its worklog — its Private-tab line may stay if the
  flag is still on at its deploy. `0435` got the flip time: from then on `Game:Mode:Multiplayer` counts private-lobby
  entries too. `0424`'s trigger (lost profile/progress after a Yandex incident) — owner: *"No reports"*.
- Run alongside the Yandex outage checklist [[tasks/yandex-outage-recovery-checklist]] (`0440`), whose item 1c (a
  console change really takes effect) this flip proved.

## Related

- [[tasks/private-lobby-citizen-perk]] — the perk and its six-item release gate; this is the flip it gated
- [[tasks/private-lobby-tester-default]] — task `0354`, the tester default, the everyone-flag and the gate table
- [[tasks/private-lobby-code-format]] — task `0389`; its lowercase-typing check (b) was carried by step 4b here
- [[tasks/private-lobby-production-test]] — task `0376`, gate item 2; moved the lowercase check here
- [[tasks/yandex-invite-copies-code-live]] — task `0381`; its step 3 (code join) moved here
- [[tasks/join-lobby-race-fix-live]] — task `0433`, the last dependency
- [[tasks/private-lobby-idle-end-live]] — task `0390`, a dependency by owner ruling
- [[tasks/yandex-outage-recovery-checklist]] — task `0440`, the outage tracker that pointed here
- [[systems/yandex-games-platform-rules]] — the Yandex console and remote flags
- [[decisions/sprint-8]] — the board (rank 30)
- [[decisions/sprint-backlog]] — where `0435` (the 1-minute lobby re-check that needs this flip time) sits
- [[systems/weekend-deploy-window]] — console flips are not deploys; the deploy queue this sat beside
- [[tasks/private-lobby-funnel-events]] — task `0451`: the funnel events for this rollout
- [[tasks/news-catch-up-2026-10-17]] — task `0426`: the news entry whose Private-tab line this flip allows (committed 2026-10-16, ships 2026-10-17)
