# Private Lobbies as a Locked Citizen Perk (task 0302)

**Source**: `ai-agents/tasks/done/0302-private-lobby-as-a-locked-citizen-perk/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 2 / task `0302`

> ✅ Done (agent-closed — not owner-verified). Code committed in `390c4b4`. **Unit tests only:** no browser
> check of the row, the lock or the popup, and no real citizen has created and started a private match.
>
> 🚢 ~~**Release coupling, owner-ruled:** ships in the **same deploy** as `0301` (the citizenship explainer
> popup), which waits on `0248` → `0250`. **Do not release it alone.**~~
>
> 🚨 **2026-10-03 — THAT COUPLING WAS BROKEN, AND IS NOW REPLACED BY A SIX-ITEM RELEASE GATE.** This task's code
> (`390c4b4`) went to production **alone** in game `0.0.155` (deploy commit `00825f0`, 2026-09-29) and is also in
> `0.0.156` — **without `0301`**, and nobody recorded it at the time. It sits behind the Yandex flags
> `private_lobbies` + `citizenship_ui`; ✅ **hidden — OWNER-ATTESTED 2026-10-03, not agent-verified** (*"the lobbies
> are switched off, nobody can use them"*); exact console values not yet recorded. ⚠️ An invite link (`#join=…`) opens
> the join window **whatever the flags say**. The record stays in `done/`; the task is **not** reopened.
>
> **OWNER RULING 2026-10-03, "Hidden + test plan first"** (live, relayed by `fkit-lead`; ⛔ not producer precedent):
> *"Keep it hidden. Do 0354 (testers see it by default, plus an 'everyone' switch that starts off), then a test where
> a real citizen hosts inside Yandex and a friend joins. Fix the join race (0228) and the 3-hour leftover lobbies, and
> ship the citizenship popup (0301), before turning it on for everyone."* The **everyone-flag stays OFF** until all six
> hold (gate recorded in `0354`'s brief):
>
> | # | Condition | Task |
> |---|---|---|
> | 1 | Testers see the row by default; everyone-flag added, unset | `0354` |
> | 2 | Production test passes: a real citizen hosts **inside the Yandex Games page**, a **non-citizen tester** friend joins (by code, inside Yandex), the match starts and ends | `0376` (owner + one other person) |
> | 3 | The join race — **investigated; fixed only if PROVEN real**, i.e. actually reproduced in a test or live (*"Only if it's proven"*, *"No, needs a real repro"*); if not proven it **drops off** the gate | `0228` |
> | 4 | Abandoned unstarted private lobbies no longer sit on the server for 3 hours (`0335` case 3) | `0377` |
> | 5 | The citizenship popup ships — ⚠️ **the long pole**: `0301` → `0248` → `0250` (`🚧 Blocked`) | `0301` |
> | 6 | Invites resolved per `0199`: SDK-built Yandex link + code ([[decisions/adr-119-yandex-invite-sdk-link-plus-code]]); **met only when built AND both production checks pass** (*"Prod checks must pass too"*) | `0380` + `0382`, verified by `0381` + `0383` |
>
> **Not decided:** the order of items 2–6 among themselves and their sprint placement. All of `0354`, `0376`, `0377`,
> `0380`–`0383` sit on the Backlog board, unscheduled. ⚠️ The Backlog board's own rows for `0376` / `0377` still say
> *"item … of 5"* — stale against the six-item gate in `0354`'s brief.

## Goal

The owner asked to show the private-lobby buttons **locked** to non-citizens, with a tap opening a
citizenship explainer. The owner's premise was that the row was hidden for non-citizens only; **the code
showed it hidden for everyone** in the Yandex template since the 2025 port (commit `18bb3e3`), with no
citizenship check anywhere. So the task became *"make private lobbies a citizen feature"*, not *"add a lock"*.
Owner, 2026-09-26: *"Yes, and it should be the 2nd priority for the Sprint 6, because the "funnel/explanation"
of the perks would depend on it."*

## Key Changes

**Owner rulings (2026-09-26 and 2026-09-27):**
- **Creating** a private lobby is the perk; **joining** by invite **stays free**. Only Create is locked (Q4).
- *"Citizens"* = **earned or paid** (`is_citizen`) — so **no dependency on `0250`**.
- Until `0301` exists, a locked tap opens a simple **"citizens only" info popup with no buy button**
  (temporary; `0301` removes it). Body text (review R1, *"Drop the name"*): *"This feature is available only
  to citizens." / «Эта возможность доступна только гражданам.»*
- Q1: page lock **plus a server start gate**; a refused start shows a generic error. Q2: profile unreadable
  or still loading → **locked**.
- Q3 — why it was hidden in 2025: player numbers were low (no longer a problem), and the owner was unsure the
  copy-a-URL invite works inside the Yandex iframe. Drafts cannot test that, so the row sits behind a remote
  switch the owner can turn on for themselves.

**Built:**
- **Switch:** Yandex remote flag `private_lobbies` = `enabled`, separate from `citizenship_ui`. The row shows
  only when **both** are on; either off → hidden exactly as before. A **tester marker**
  (`localStorage` `geoconflict_tester=1` → `getFlags` client feature `tester=1`) lets a console condition enable
  it for the owner only. ⚠️ Whether the console accepts a client-feature condition is **still to be confirmed**
  by the owner. The server cannot see Yandex flags; its gate runs whether the switch is on or off.
- **Server gate:** `POST /api/start_game/:id` answers `403 { error: "citizens_only" }` unless the lobby's
  **creator** is connected and a citizen (`GameServer.creatorMayStartPrivateLobby`, waiting up to 5 s for an
  in-flight resolve; fails closed; identity only through ADR-103's funnel). `create_game` is not gated — it
  carries no identity, and the start is the only way a private game begins.
- **Dev bypass (review R2, owner: *"Dev-only bypass"*):** the gate is skipped only when `GAME_ENV` is
  explicitly `dev`. ⚠️ Known property of the existing config mechanism: a server started with `GAME_ENV`
  **unset** falls back to the dev config and would skip the gate — `deploy.sh` always writes `GAME_ENV`.
- **Reusable locked-feature state** (`src/client/LockedFeature.ts`) for later perks, and a new event
  `LockedFeature:Tap:PrivateLobby` ([[systems/analytics]]).
- Review R3 fixed a double-tap on Start and made a missing game answer `404`.

## Outcome

- 🔓 **Accepted residual (owner, *"Accept for now"*):** the gate trusts the client-asserted id (ADR-103), so a
  cheater who asserts a citizen's id can create private lobbies; `isCitizen` on the unauthenticated lobby poll
  (`0068` R3) helps find one. Real fix: verified identity (`0267`). Re-raise if private lobbies gain value
  beyond convenience, or abuse is seen.
- **Evidence:** `npm test` 156 suites / 2412 tests at the last clean round (one later run hit a known
  supertest shape and was re-run — said so).
- **Not verified:** a real citizen creating and starting a private match (the standalone dev page has no
  Yandex identity); any browser check; every live Yandex item (the console condition, the tester marker in the
  iframe, copy-link inside the iframe, a purchase unlocking the button live).
- **Follow-ups found later:** closing a joined lobby window did not leave the lobby — fixed by `0327`
  ([[tasks/private-lobby-close-leaves-lobby]]); two host-side leftovers filed as `0333`/`0334` (Sprint 7).
  🆕 **Both closed 2026-09-30** — [[tasks/host-create-leaves-public-lobby]], [[tasks/host-start-stops-after-window-close]].
  ⚠️ `0335` ([[tasks/lobby-close-leftovers-investigation]]) sized its leftovers on the **assumption** that the
  `private_lobbies` flag is on for testers only — **the owner did not confirm the console state.** Follow-up
  **`0354`** (Backlog): testers see private lobbies by default, plus an "everyone" flag, empty by default.

## Related

- [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] — 🆕 release-gate item 6: how the invite works on the Yandex build
- [[tasks/yandex-invite-link-decision]] — 🆕 task `0199`, the ruling behind gate item 6
- [[decisions/sprint-backlog]] — 🆕 where every release-gate task (`0354`, `0376`, `0377`, `0228`, `0380`–`0383`) sits
- [[tasks/private-lobby-start-url]] — task `0198`, which fixed the private-lobby start URL on Yandex
- [[tasks/citizen-verified-icon]] — task `0068`: its cosmetic-only residuals are void for this path (a permission)
- [[decisions/adr-103-identity-trust-seam]] — the funnel; this gate is its second user
- [[decisions/adr-115-approved-name-in-matches]] — names this gate as the funnel's second user
- [[tasks/citizenship-kill-switch-coverage]] — task `0236`: the kill switch hides the row, never unlocks it
- [[tasks/citizenship-restart-prompt]] — task `0303`: a perk that reads status at load time
- [[tasks/private-lobby-close-leaves-lobby]] — task `0327`, the close-without-leave bug found in `0303`'s review
- [[tasks/host-create-leaves-public-lobby]] — task `0333` (2026-09-30): Create leaves the public lobby first
- [[tasks/host-start-stops-after-window-close]] — task `0334` (2026-09-30): Start stops once the host window closes
- [[tasks/lobby-close-leftovers-investigation]] — task `0335` (2026-09-30): production reach rests on this perk's citizen-only create and tester-only flag
- [[tasks/citizenship-card-late-recovery-recheck]] — task `0329`: a hidden card left the perk `unknown` → locked
- [[systems/analytics]] — `LockedFeature:Tap:{FeatureId}` and the `private_lobbies` flag
- [[decisions/sprint-6]] — the board carrying this task
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322` (2026-09-28): the game server swaps a citizen's approved name in for other players, at ADR-103 trust
- [[tasks/citizenship-card-newest-profile-read]] — task `0326` (2026-09-28): the citizenship card applies only the newest profile read
