# Verify private lobbies in production — a real citizen hosts inside the Yandex Games page, a friend joins, the match starts and ends

## ID
0376

> ℹ️ **ID allocation, checked 2026-10-03 before filing.** Highest task folder and highest `## ID` across `backlog/`,
> `done/` and `cancelled/`: `0375`. `0376` and `0377` allocated in this run, in that order.

## Sprint
Backlog

## Priority
Unscheduled

> 📌 **Placement note.** No sprint was named, so this is on the Backlog board. The owner's standing build/verify rule
> (2026-09-29) puts a verify task at the top of the **next** sprint once its build task closes. When `0354` closes,
> that placement is the producer's to propose and the owner's to confirm — it is **not** made here.

## Status
🔲 Backlog

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
[`0354`'s *Release gate*](../0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md) (item 6,
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
  error ([`0353`](../0353-the-host-window-polls-for-players-before-a-lobby-exists-and-throws-every-second/brief.md),
  console noise only); a closed lobby window that keeps its "joining" mark
  ([`0374`](../0374-lobby-windows-end-their-joining-mark-on-close-not-only-when-the-request-settles/brief.md)); the
  close-during-join race ([`0228`](../0228-handlejoinlobby-stale-gamestop-race/brief.md)). If one of them breaks the
  flow, say so plainly — that is a finding, not a pass.
- **Console state.** ✅ **Hidden is CONFIRMED — OWNER-ATTESTED 2026-10-03, not agent-verified.** Owner's words,
  relayed by `fkit-lead`: *"the lobbies are switched off, nobody can use them"*. ~~The current values of
  `private_lobbies` and `citizenship_ui` are unknown as of 2026-10-03 (owner checking).~~ Record the exact values on
  the test day.

## What to build

Nothing is built. This is a live test, run by the owner with one other person.

**Preconditions:**
1. [`0354`](../0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md) is done, committed and
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
3. **Join — inside Yandex Games.** The host sends the code; the friend, inside the Yandex Games page, enters it in the
   Join window and joins. *(Or, only if `0199`'s follow-up has shipped: the friend opens the fixed invite link and
   lands inside Yandex Games.)* **The current off-Yandex invite link is not used.** The host's window lists the friend.
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

- **Depends on:** [`0354`](../0354-show-private-lobbies-to-testers-by-default-and-add-an-everyone-flag/brief.md) (done and deployed to production)
- **Blocks:** nothing directly. 🚦 It is item 2 of the release gate in `0354` — the everyone-flag is not set until it
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
