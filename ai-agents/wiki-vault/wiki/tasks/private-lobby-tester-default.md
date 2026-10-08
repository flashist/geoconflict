# Show Private Lobbies to Testers by Default, Plus an "Everyone" Flag That Starts Empty (task 0354)

**Source**: `ai-agents/tasks/done/0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 37 (append rank; moved in from the Backlog board 2026-10-04) / task `0354`

> 🆕 **2026-10-08 sync — now deployed.** `8d74090` is in game **`0.0.157`** (deployed 2026-10-08; checked with
> `git tag --contains 8d74090`). No live check of this task's tester default is recorded in this window. `0401`'s
> Snippet B set the tester marker on production for its locked-tap check ([[tasks/citizenship-explainer-popup-live]]).
> Release-gate item 5 is now met (`0301` deployed). The *"Not deployed"* line below was true when written.
>
> ✅ Done (agent-closed — not owner-verified), closed 2026-10-05; committed in `8d74090` ("Sprint 7: private lobby tasks
> 0354 0380 0377 0353 0374 0389", 2026-10-05). ⚠️ **Not deployed** — client-only, and no game deploy has run since
> `0.0.156` (2026-10-03; checked: newest game tag). Nothing here is owner-verified.

## Goal

The owner's request (2026-09-30, verbatim): *"I suggest enabling it for testers only by default, but to add a feature
flag that can enable it for everyone else. The feature flag will be empty by default (I will only set it in
Yandex.Games Console when the feature is ready to be shipped to all users)."* Before this task the private-lobby row
showed only when the `private_lobbies` remote flag **and** the citizenship surfaces were on; "testers only" existed
only as a console condition. **The switch only hides the row — it secures nothing**: Create is locked in the UI for
non-citizens, and the server refuses to start a private match whose creator is not a citizen (`0302`).

## Key Changes

**Owner rulings at plan approval (2026-10-04):** Q1 who is a tester — the existing browser marker
(`localStorage` `geoconflict_tester` = `"1"`, set by hand in the console), nothing new built · Q2 the old
`private_lobbies` flag — **stop reading it** · Q3 degraded boot — **hidden for testers too** · Q4 flag name —
**`private_lobbies_all` = `enabled`**.

- `src/client/PrivateLobbyAccess.ts` — the row's rule is now **surfaces on AND (tester marker OR everyone-flag)**;
  surfaces are checked first, so a degraded boot hides the row from testers too.
- `src/client/flashist/FlashistFacade.ts` — new `isTesterMarkerSet()` (never throws), the `private_lobbies_all`
  constants and `isPrivateLobbiesForEveryoneEnabled()`; the old `private_lobbies` constants and reader removed.
- A leftover `private_lobbies` console value still fires an `Experiment:private_lobbies:*` cohort event, which now
  gates nothing ([[systems/analytics]]).
- **No server change.** Review: one finding (a missing fail-closed test for the first read) fixed with a test.

## Outcome

- 📌 *2026-10-08 sync:* `0382` is built (not deployed; [[tasks/yandex-invite-sdk-link]]) — gate item 6 now waits only on the
  live checks `0381` / `0383`. `0412` reuses this task's visibility rule for a new *Приватная* tab
  ([[tasks/start-screen-private-tab]]).

- **Console values (Q5), owner-stated 2026-10-05, not checked by anyone in the console:** *"private_lobbies - has
  never been set up, citizenship_ui - enabled"*. So the old flag never had any effect in production, and once `0354`
  deploys, **testers see the row and non-testers do not** (`private_lobbies_all` unset).
- **Run-sheet (worklog):** tester setup in the **game iframe's** console context; the **flip** is adding
  `private_lobbies_all` = `enabled` with no condition; the **kill switch** is deleting it — non-testers lose the row on
  their next page load (flags are read once per load).
- **The everyone-flag stays unset until all six release-gate items are true** — see
  [[tasks/private-lobby-citizen-perk]]: this task (✅), `0376` live test, `0228` if proven, `0377` (✅ built),
  `0301` popup, and `0380`/`0382` built with their checks `0381`/`0383` passed.

## Related

- [[tasks/private-lobby-citizen-perk]] — task `0302`, the locked perk and the six-item release gate
- [[tasks/yandex-invite-copies-code]] — task `0380`, built on top of this one
- [[tasks/private-lobby-idle-end]] — task `0377`, gate item 4
- [[tasks/lobby-close-leftovers-investigation]] — task `0335`, at whose close this was requested
- [[systems/flashist-init]] — the flag read and the degraded boot
- [[systems/analytics]] — the `Experiment:private_lobbies_all:*` cohort event
- [[decisions/sprint-7]] — the board (rank 37)
- [[tasks/citizenship-explainer-popup]] — task `0301`, release-gate item 5: built and committed (`fc3f539`) 2026-10-06; met only on deploy
- [[tasks/citizenship-explainer-popup-live]] — task `0401` (closed 2026-10-08): used the tester marker for its locked-tap check; gate item 5 met
- [[tasks/yandex-invite-sdk-link]] — task `0382`, the invite-link half of gate item 6 (built 2026-10-08)
- [[tasks/start-screen-private-tab]] — task `0412`, the Private tab shown under this task's rule
