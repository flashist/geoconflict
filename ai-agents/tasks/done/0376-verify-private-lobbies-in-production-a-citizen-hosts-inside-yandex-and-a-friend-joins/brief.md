# Verify private lobbies in production — a real citizen hosts inside the Yandex Games page, a friend joins, the match starts and ends

## ID
0376

> ℹ️ **ID allocation, checked 2026-10-03 before filing.** Highest task folder and highest `## ID` across `backlog/`,
> `done/` and `cancelled/`: `0375`. `0376` and `0377` allocated in this run, in that order.

## Sprint
Sprint 8

> ➡️ **2026-10-09 — MOVED from the Backlog board to [Sprint 8](../../../sprints/plan-sprint-8.md).** OWNER RULING typed
> by the owner in the coordinating Claude Code session (the owner's own message), relayed to a spawned `fkit-producer`
> with no owner channel (ADR-021/037); ⛔ not producer precedent. Verbatim: *"1. Yes move to the Sprint 8 and brief a
> dedicated task for the Sprint 8 to turn the private lobbies on for everybody."* Was ~~Backlog~~. The flip itself is
> task `0428`, which depends on this one.

## Priority
27

⚠️ **Priority 27 is append rank, NOT a merit ranking — flagged for owner confirmation.** ADR-035 append position after
Sprint 8's highest (26, `0427`). **On merit this belongs directly below `0370`, at the top of the board**, because the
owner's build/verify rule (2026-09-29) puts a verify task at the top of the next sprint, and what is left of it is
small. Not inserted there: closed rows sit below the top, and ADR-035 never renumbers them. Was ~~Unscheduled~~.

> 📌 **Placement note.** *(History — superseded 2026-10-09 by the move above.)* No sprint was named, so this is on the Backlog board. The owner's standing build/verify rule
> (2026-09-29) puts a verify task at the top of the **next** sprint once its build task closes. When `0354` closes,
> that placement is the producer's to propose and the owner's to confirm — it is **not** made here.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-producer — ⚠️ **EXECUTED BY THE OWNER (human) and a second person.** It needs a real citizen account inside the
Yandex Games page, a second player, and the Yandex Games console. No agent can do those parts. Any read-only check
(server logs, the `/api/game/:id` poll) may be run by an agent session that has access (standing rule: read-only
checks are run, not handed over).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0370`.)*

## Context

**OWNER RULING, relayed by `fkit-lead`; ⛔ not producer precedent.** Filed 2026-10-03 by a spawned `fkit-producer` with
no owner channel (ADR-021/037), on an owner ruling given live via `AskUserQuestion` in the `fkit lead` session. Question:
*"What has to happen before private lobbies are turned on for regular players?"* Owner's pick, **"Hidden + test plan
first"**, verbatim:

> *"Keep it hidden. Do 0354 (testers see it by default, plus an 'everyone' switch that starts off), then a test where a
> real citizen hosts inside Yandex and a friend joins. Fix the join race (0228) and the 3-hour leftover lobbies, and ship
> the citizenship popup (0301), before turning it on for everyone."*

**This task is that test.** It is item 2 of the ~~five~~ six-item release gate recorded in
[`0354`'s *Release gate*](../../done/0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md) (item 6,
`0199`, added 2026-10-03). The everyone-flag stays off until all ~~five~~ six pass.

**Why it is needed.** [`0302`](../../done/0302-private-lobby-as-a-locked-citizen-perk/brief.md) (private lobbies as a
citizen perk) is in production `0.0.155`/`0.0.156`, hidden behind flags. Its verification step 2 — *"Citizen on the
Yandex build: the Create Lobby button opens the host modal; a private match starts and a friend joins"* — was never run
inside the real Yandex Games page; `0302` closed `(agent-closed — not owner-verified)`. It also shipped without `0301`,
breaking its own release rule (recorded in `0302`'s Notes, 2026-10-03).

**What the test runs against.** After `0354` ships, testers see the private-lobby row by default and the everyone-flag
is unset. So the host in this test is a **citizen who is also a tester** (per `0354`'s tester rule — today `0302`'s
`localStorage` marker, unless `0354`'s question 1 rules otherwise). Joining by invite is free and works whatever the
flags say. *(2026-10-03: but the friend must join inside Yandex Games — see below.)*

### ⚠️ Things that bear on the test

- 🚦 **The friend's join must happen INSIDE Yandex Games — by code, or by a fixed invite link. Never through a link
  to our own site.** (OWNER RULING 2026-10-03 on `0199`, owner's own words, relayed by `fkit-lead`; ⛔ not producer precedent.) Today's invite link opens our own site, outside the portal
  ([`0199`](../../done/0199-yandex-invite-link-leaves-portal-iframe/brief.md)); the owner ruled that a Yandex rules violation.
  So the friend either types or pastes the **lobby code** into the Join window inside Yandex (this exists today:
  `JoinPrivateLobbyModal`'s lobby-id field), or uses a fixed invite link if `0199`'s follow-up work has shipped by
  then. *~~Earlier wording, superseded the same day: "The owner's ruling says the citizen hosts inside Yandex; it does
  not say where the friend must land. Record exactly where the friend's join happened."~~*
- ⚠️ **Consequence — the friend must be able to see the Join button.** The Join button sits in the same hidden
  private-lobby row. Until the everyone-flag is on, only testers see it. So for a code join the friend must be a
  **tester** too (a non-citizen tester is fine — joining is free). *(Producer's reading of `0354`'s visibility rule;
  revisit if `0354`'s plan changes it.)*
  ✅ **Accepted — OWNER RULING 2026-10-03, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent:** asked *"is it fine that the friend must be a tester?"*, the owner chose **"Yes, a
  tester friend is fine"**. The friend is a **non-citizen tester**. Whether **a normal player can find Join** is
  **not** checked here; it is checked when the everyone-flag goes on.
- **Known glitches that may show up — note them, do not fail the test on them alone:** the host window's early polling
  error ([`0353`](../../done/0353-the-host-window-polls-for-players-before-a-lobby-exists-and-throws-every-second/brief.md),
  console noise only); a closed lobby window that keeps its "joining" mark
  ([`0374`](../../done/0374-lobby-windows-end-their-joining-mark-on-close-not-only-when-the-request-settles/brief.md)); the
  close-during-join race ([`0228`](../../done/0228-handlejoinlobby-stale-gamestop-race/brief.md)). If one of them breaks the
  flow, say so plainly — that is a finding, not a pass.
- **Console state.** ✅ **Hidden is CONFIRMED — OWNER-ATTESTED 2026-10-03, not agent-verified.** Owner's words,
  relayed by `fkit-lead`: *"the lobbies are switched off, nobody can use them"*. ~~The current values of
  `private_lobbies` and `citizenship_ui` are unknown as of 2026-10-03 (owner checking).~~ Record the exact values on
  the test day.

### 📌 2026-10-09 — live evidence: what already passed, and what is still to do (do not repeat the passed checks)

*Added 2026-10-09 by a spawned `fkit-producer` (no owner channel), from the results relayed by the coordinating
session. Sources: `ai-agents/tasks/backlog/0420-…/worklog.md` (item 1 and item 6) and
`ai-agents/tasks/done/0383-…/worklog.md` (run 1). Nothing below is new testing — it is a summary of those two worklogs.*

**The run.** 2026-10-09, game `0.0.161`, run by the owner as `0420` item 1 together with `0383`.
- **Host:** paid citizen account, marked as a tester, on the computer (Chrome), inside the Yandex Games page.
- **Friend:** a second account — the owner's own non-citizen login — on a **phone**, **not a tester** (no tester
  marker). This is **stronger** than precondition 3's non-citizen *tester* friend: since `0382` shipped, the
  interim tester-friend limit in step 3 is lifted, as step 3 said it would be.
- **Join route:** the Yandex Games invite link (`0382`), opened inside Yandex Games — **not** the old off-Yandex link
  (verification step 3 satisfied for this route).

| Step | Result 2026-10-09 | Source |
|---|---|---|
| Precondition 1 — `0354` deployed | **met** — version `0.0.161` | `0420` worklog |
| Precondition 2 — console values recorded | **not done** — no console values recorded on the day | — |
| Step 1 — visibility | **pass** — the tester sees three tabs *Мультиплеер \| Одиночная \| Приватная*; a flag-off non-tester sees two (`0420` item 6) | `0420` worklog |
| Step 2 — Create inside Yandex | **pass** — the host created a private lobby and copied the invite | `0420` item 1, `0383` |
| Step 2 — `0353` host-window check (no repeating `Uncaught (in promise)` while the lobby is created) | **not run / not recorded** | — |
| Steps 2–3 — `0389` code checks (a) two groups `XXXX XXXX`, (b) join by typing the code in lowercase | **not recorded** — the join was by link, not by typing the code. **Remaining — kept in this task by OWNER RULING 2026-10-09** (*"Keep them in 0376"*); for (b) the friend needs the tester marker to see Join until `0428` turns the switch on | — |
| Step 3 — join inside Yandex, host lists the friend | **pass** — by the Yandex invite link | `0383` step 3 |
| Step 4 — Start, both in the same match | **pass** — the match started for both; console: no `403`, no "Не удалось начать игру"; game-server log (read-only counts, last 60 min): 1 private create line, 1 of 1 carrying the creator, 0 "creator not a citizen" refusals | `0420` item 1 |
| Step 5 — play to a normal end, both see the end screen and return to the start screen | **not done** — the friend left the running match and returned to the menu (`0383` step 4), but the match was not played to its end and neither player's end-of-match screen nor the host's return was recorded | — |
| Verification step 6 — owner states gate item 2 passed / not passed | **not done** | — |

ℹ️ **Observation, not a fail:** after leaving the running match, opening the **same** invite link again put the friend
**back into that match**, with a fast-forward replay to catch up with the host (owner's report, in both worklogs).

**Still to do for this task:** (1) a match played to its **end** (step 5); (2) the `0353` host-window check in step 2;
(3) record the console values (precondition 2); (4) the `0389` code checks (a) and (b) — **kept, by ruling** (📌 *2026-10-09 — OWNER RULING 2026-10-09, given live via `AskUserQuestion` in the coordinating Claude Code session, relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent: "Keep them in 0376 (Recommended)"; option text: "Done during the same friend test: about 2 extra minutes. The friend needs the tester marker to see the Join button until the switch is on."*) — **remaining steps**; ~~the owner may rule them covered or not needed;~~ (5) the
owner's gate-item-2 statement. A second run can reuse the same host and phone friend for (1)–(3); for the
code-typing check (4)(b) the friend must see the Join button, so a **tester** friend until the everyone-flag is on
(`0428`). `0381`'s remaining code-join and old-link steps can share that run.

> 📌 **2026-10-10 — CLOSED `✅ Done (agent-closed — not owner-verified)`.** Second run done; steps 2–5, the `0353`
> check and `0389` (a) passed; console values recorded; `0389` (b) not run (OWNER RULING *"skip tester"*, typed — moved to
> `0428` step 4b). Gate item 2 **passed** — OWNER RULING verbatim **"Gate item 2 passed, close both (Recommended)"**,
> relayed by `fkit-lead` to a spawned `fkit-producer`; ⛔ not producer precedent. The *Still to do* list above is history.
> Full record: [`worklog.md`](worklog.md).

## What to build

Nothing is built. This is a live test, run by the owner with one other person.

**Preconditions:**
1. [`0354`](../../done/0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md) is done, committed and
   deployed to production (weekend slot). Record the version.
2. The everyone-flag is **unset** in the console. Record `private_lobbies`, `citizenship_ui` and the everyone-flag values.
3. Host: a real citizen account (earned or paid), marked as a tester by `0354`'s rule. Friend: a second account,
   **marked as a tester** if the join is by code (see *Context*). The friend is a **non-citizen tester** — owner
   ruling 2026-10-03, *"Yes, a tester friend is fine"* (see *Context*); this also proves joining stays free.
   ~~*Producer's suggestion, owner may change it:* the friend is a **non-citizen**.~~ ~~Earlier suggestion, superseded 2026-10-03 by
   the `0199` ruling: "a non-citizen, non-tester, which also proves … invite links work while the row is hidden."~~

**Steps:**
1. **Visibility.** Inside the Yandex Games page, the tester-citizen sees the private-lobby row with Create unlocked. A
   browser **without** the tester marker does not see the row. *(This is `0354`'s verification step 4.)*
2. **Create.** The host opens Create inside the Yandex page. A lobby id (code) appears.
   ✅ *(Added 2026-10-05.)* **Host-window check — this is the live check for
   [`0353`](../../done/0353-the-host-window-polls-for-players-before-a-lobby-exists-and-throws-every-second/brief.md).**
   With the browser DevTools console open while the lobby is being created: there must be **no repeating
   `Uncaught (in promise)` errors** (before the fix it was one per second while the create was pending). Once the lobby
   exists, the host window's player list fills and refreshes. Record pass or fail; a repeat of the errors is a `0353`
   regression, not a pass. **OWNER RULING 2026-10-05**, given live via `AskUserQuestion` in the `fkit lead` session,
   relayed by `fkit-lead`; ⛔ not producer precedent. Asked whether `0353` needs its own live check after deploy (the
   2026-09-29 build/verify rule), the owner chose **"Covered by 0376"**: this test already opens the host window on
   the real site, so one check line here replaces a separate verify task. *(The "known glitches" bullet in Context
   predates the fix; for `0353`, this check now applies.)*
3. **Join — inside Yandex Games.** The host sends the code; the friend, inside the Yandex Games page, enters it in the
   Join window and joins. *(Or, only if `0199`'s follow-up has shipped: the friend opens the fixed invite link and
   lands inside Yandex Games.)* **The current off-Yandex invite link is not used.** The host's window lists the friend.
   ⚠️ *(Added 2026-10-04.)* **How the friend becomes a tester:** before this step, the friend runs
   `localStorage.setItem("geoconflict_tester","1")` in the **game iframe** context (not the outer Yandex page) and
   reloads — otherwise they do not see the Join Lobby button and cannot enter the code. **Interim limit, accepted —
   OWNER RULING 2026-10-04**, given live via `AskUserQuestion` in the `fkit lead` session during `0380` review
   (finding R3), relayed by `fkit-lead`; ⛔ not producer precedent. Lifted when
   [`0382`](../../done/0382-yandex-build-invite-link-via-the-sdk-portal-url-and-payload-consumed-once/brief.md) ships or the
   `private_lobbies_all` console flag is turned on.
   ✅ *(Added 2026-10-05.)* **Lobby-code check, steps 2–3 — this is the live check for
   [`0389`](../../done/0389-make-the-private-lobby-code-easier-to-read-and-type/brief.md).**
   (a) In step 2, the host window shows the code as **two groups, `XXXX XXXX`** — 8 characters, none of
   `0 O 1 I L U`. (b) In this step, the friend joins by typing the code in **lowercase** (a space in the middle is
   fine). Record pass or fail for each. **Known accepted limit, not a failure:** a hand-typed website `#join=` link
   with a space in the code is ignored. **OWNER RULING 2026-10-05**, given live via `AskUserQuestion` in the
   `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent. Asked how `0389`'s live check after deploy
   should be covered (it passed a local browser check only), the owner chose **"Add to 0376"** — one check here
   instead of a separate verify task.
4. **Start.** The host starts the match. Both players are in the same match.
5. **End.** Play to a normal end (a win, a loss, or a leave). Both players get the normal end-of-match screen and can
   return to the start screen.
6. **Record** in `worklog.md`: date, version, console values, accounts used (described by role — never ids), where the
   friend's join happened (inside or outside Yandex), each step's result, and anything odd. Screenshots are welcome if
   they show no player id.

## Verification steps

1. `worklog.md` records preconditions 1–3: version, console values, and both accounts by role (citizen + tester host;
   friend's citizen/tester status).
2. Steps 1–5 each recorded **pass** or **fail**, in the owner's words. A step not run is written as *not run*, never as
   passed.
3. The friend's join is recorded as having happened **inside the Yandex Games page**, and by which route (code, or a
   fixed `0199` link). A join that happened outside Yandex Games does **not** pass this step.
4. Any glitch seen is recorded, with which known task it matches (`0353`, `0374`, `0228`) or *"new"*.
5. **If any step fails:** a new task is filed for the failure. The everyone-flag stays off. This task closes with the
   failure recorded, or stays open until a re-test passes — the owner decides which.
6. The owner states, in the worklog, that release-gate item 2 is **passed** or **not passed**.
7. No player id, Yandex id, host, IP, full URL, token or credential appears in any artifact.

## Notes

- **Depends on:** [`0354`](../../done/0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md) (done and deployed to production)
- **Blocks:** `0428` (turning the everyone-flag on — filed 2026-10-09). ~~nothing directly.~~ 🚦 It is item 2 of the release gate in `0354` — the everyone-flag is not set until it
  passes (OWNER RULING 2026-10-03, relayed by `fkit-lead`; ⛔ not producer precedent).
- **Not a dependency, by reading of the ruling:** `0228`, `0377` and `0301`. The ruling lists them as gate items, not
  as things the test must wait for. *Producer's reading, open to owner correction:* running this test before `0301`
  ships means the host sees `0302`'s interim popup, not the full explainer — that does not affect a citizen host.
  📌 *2026-10-03, OWNER RULING "Only if it's proven", relayed by `fkit-lead`; ⛔ not producer precedent:* `0228` is a
  gate item only if its investigation proves the race real; otherwise it drops off the gate. A race glitch seen in
  this test (Verification step 4) is evidence for that investigation, so record it carefully.
- **Not a dependency on `0199`:** the code join exists today, so this test can run before `0199`'s follow-up ships.
  If it has shipped, test the fixed link as well.
- **Related:** [`0302`](../../done/0302-private-lobby-as-a-locked-citizen-perk/brief.md) (the feature; its unrun
  verification step 2), [`0199`](../../done/0199-yandex-invite-link-leaves-portal-iframe/brief.md) (where the invite lands),
  [`0335`](../../done/0335-investigate-four-known-lobby-close-leftovers-left-by-0327/brief.md) (known lobby-close
  leftovers), `0353`, `0374`, `0228`.
- **Privacy:** describe accounts by role only. Never paste an id, host, IP, URL, token or credential.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
