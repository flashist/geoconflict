# Verify 0382 in Production — a Yandex Invite Link Opens the Join Window Once, on the Friend's Own Portal (task 0383)

**Source**: `ai-agents/tasks/done/0383-verify-0382-in-production-a-yandex-invite-link-opens-the-join-window-once-on-the-friends-portal/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 61 (ADR-035 append rank; moved in from the Backlog board 2026-10-08) / task `0383`

> 📌 *2026-10-10 sync: the "`0381` still open" line below is now history — `0381` closed 2026-10-10
> ([[tasks/yandex-invite-copies-code-live]]) with steps 3–5 not run, by owner rulings; gate item 6 is closed. In `0376`'s
> run the same day a **non-tester** friend on an iPhone again joined by the Yandex invite link
> ([[tasks/private-lobby-production-test]]).*

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-09. **Owner-run** live check, game `0.0.161`, run
> together with `0420` item 1 (private-lobby start). Nothing was built. Results relayed by the coordinating session.

## Goal

The production check for `0382` ([[tasks/yandex-invite-sdk-link]]) — the link half of
[[decisions/adr-119-yandex-invite-sdk-link-plus-code]]: our build, end to end, copies the game's own Yandex Games link
(from the SDK, on the host's portal) with the lobby code as `payload`; a friend who opens it lands **inside Yandex
Games**, the Join window opens **once**, and a **non-tester** friend can join (owner ruling 2026-10-04, *"Yes, link always
lets them in"*). The 2026-10-04 console probe ([[tasks/yandex-invite-link-decision]]) proved the platform parts by
hand; this proves our build.

## Key Changes

None — a live check. Host: paid tester account on the computer (Chrome, Yandex Games on `yandex.ru`, lobby buttons under
the Приватная tab). Friend: the owner's non-citizen login on the owner's **phone**, **not a tester**. URLs recorded as
shapes only.

## Outcome

| Step | Result |
|---|---|
| 1 — copy the link on `yandex.ru`, shape `…/games/app/<id>?payload=<code>`; code still on the host window | **pass** (owner: *"Part B: all good"*) |
| 2 — host on `yandex.com`: the link starts on `yandex.com` | **pass** (owner: *"the link is correct and is for the yandex.com domain"*) |
| 3 — non-tester friend opens the link, lands inside Yandex Games, Join opens with the code; host lists the friend | **pass** — friend on a phone |
| 4 — friend leaves the match, back to the menu: Join does **not** reopen | **pass** |
| 5 — new lobby + new link opens Join again in the same friend tab | **not recorded** (optional; "all good" did not say) |
| 6 — mobile | **partly run** — friend side on a phone (browser or Yandex app not recorded); host on the computer |
| 6 — third domain, slow boot | **not run** |

- All required steps pass (1, 3, 4; step 3 with a non-tester; step 2). No failure, so no follow-up task.
- ℹ️ **Observation, not a fail:** opening the **same** link again after leaving the running match put the friend back
  into **that** match, with a fast-forward replay to catch up (owner: *"the player joins the private lobby again and
  sees the "fast forward" history of the match, to catch up with the host"*).
- 🚦 **Release-gate item 6** for private lobbies ([[tasks/private-lobby-tester-default]],
  [[tasks/private-lobby-citizen-perk]]) needs **both** `0381` and `0383` passed in production. **`0383` has passed;
  `0381` ([[tasks/yandex-invite-copies-code]]) is still open on the Backlog board**, so item 6 is **not yet met**.
- Not checked: a third portal domain; the slow-boot case; whether the friend's phone used a browser or the Yandex app.

## Related

- [[tasks/yandex-invite-sdk-link]] — task `0382`, the build this checks
- [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] — the decision (link + code)
- [[tasks/yandex-invite-link-decision]] — task `0199`, the owner's console probe and ruling
- [[tasks/yandex-invite-copies-code]] — task `0380`; its check `0381` is the other half of gate item 6
- [[decisions/yandex-invite-portal-boundary]] — why an invite must stay on the player's own portal
- [[tasks/private-lobby-tester-default]] — task `0354`, the release gate (item 6)
- [[tasks/private-lobby-citizen-perk]] — the private-lobby feature the gate guards
- [[decisions/sprint-7]] — the board (rank 61)
- [[decisions/sprint-8]] — `0420`, whose item 1 ran in the same sitting
- [[tasks/yandex-invite-copies-code-live]] — task `0381`, closed 2026-10-10
- [[tasks/private-lobby-production-test]] — task `0376`, a second live join by the invite link
